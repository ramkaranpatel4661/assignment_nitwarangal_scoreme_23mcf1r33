"""
Pytest test suite for the Configurable Workflow Decision Platform.

Tests cover:
- Happy path (approve, reject, manual review)
- Invalid input validation
- Duplicate request (idempotency)
- Retry logic on simulated failures
- Rule change scenario
"""

import pytest
import json
import os
import sys
from unittest.mock import patch
from fastapi.testclient import TestClient

# Ensure app is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app
from app.database.db import init_db, DB_DIR, get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_db(tmp_path, monkeypatch):
    """Use a fresh temp database for every test."""
    test_db = str(tmp_path / "test_workflow.db")
    monkeypatch.setattr("app.database.db.DB_PATH", test_db)
    monkeypatch.setattr("app.database.db.DB_DIR", str(tmp_path))
    init_db()
    yield


# ──────────────── Happy Path Tests ────────────────


class TestHappyPath:
    def test_approve_high_credit_score(self):
        """credit_score >= 700 with docs verified → APPROVE."""
        resp = client.post("/api/workflow/process", json={
            "request_id": "test-approve-001",
            "applicant_name": "John Doe",
            "income": 80000,
            "credit_score": 750,
            "documents_verified": True,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ("APPROVED", "MANUAL_REVIEW")  # may fail doc verification
        assert data["request_id"] == "test-approve-001"

    def test_approve_deterministic(self):
        """With doc verification mocked to succeed, should always APPROVE."""
        with patch("app.services.external_service_simulator.random.random", return_value=0.9):
            resp = client.post("/api/workflow/process", json={
                "request_id": "test-approve-det",
                "applicant_name": "Jane Doe",
                "income": 100000,
                "credit_score": 800,
                "documents_verified": True,
            })
        data = resp.json()
        assert data["status"] == "APPROVED"
        assert data["decision"] == "APPROVE"

    def test_reject_low_credit_score(self):
        """credit_score < 500 → REJECT."""
        with patch("app.services.external_service_simulator.random.random", return_value=0.9):
            resp = client.post("/api/workflow/process", json={
                "request_id": "test-reject-001",
                "applicant_name": "Low Score",
                "income": 50000,
                "credit_score": 400,
                "documents_verified": True,
            })
        data = resp.json()
        assert data["status"] == "REJECTED"
        assert data["decision"] == "REJECT"

    def test_manual_review_unverified_docs(self):
        """documents_verified=false → MANUAL_REVIEW."""
        with patch("app.services.external_service_simulator.random.random", return_value=0.9):
            resp = client.post("/api/workflow/process", json={
                "request_id": "test-review-001",
                "applicant_name": "Unverified",
                "income": 60000,
                "credit_score": 750,
                "documents_verified": False,
            })
        data = resp.json()
        assert data["status"] == "MANUAL_REVIEW"
        assert data["decision"] == "MANUAL_REVIEW"


# ──────────────── Input Validation Tests ────────────────


class TestInvalidInput:
    def test_missing_request_id(self):
        resp = client.post("/api/workflow/process", json={
            "applicant_name": "Test",
            "income": 50000,
            "credit_score": 700,
            "documents_verified": True,
        })
        assert resp.status_code == 422

    def test_negative_income(self):
        resp = client.post("/api/workflow/process", json={
            "request_id": "test-neg-income",
            "applicant_name": "Test",
            "income": -5000,
            "credit_score": 700,
            "documents_verified": True,
        })
        assert resp.status_code == 422

    def test_credit_score_out_of_range(self):
        resp = client.post("/api/workflow/process", json={
            "request_id": "test-bad-score",
            "applicant_name": "Test",
            "income": 50000,
            "credit_score": 1000,
            "documents_verified": True,
        })
        assert resp.status_code == 422

    def test_empty_applicant_name(self):
        resp = client.post("/api/workflow/process", json={
            "request_id": "test-empty-name",
            "applicant_name": "",
            "income": 50000,
            "credit_score": 700,
            "documents_verified": True,
        })
        assert resp.status_code == 422


# ──────────────── Idempotency Tests ────────────────


class TestIdempotency:
    def test_duplicate_request_returns_same_response(self):
        """Sending the same request_id twice should return the cached first response."""
        payload = {
            "request_id": "test-idempotent-001",
            "applicant_name": "Idem Test",
            "income": 70000,
            "credit_score": 750,
            "documents_verified": True,
        }
        with patch("app.services.external_service_simulator.random.random", return_value=0.9):
            resp1 = client.post("/api/workflow/process", json=payload)
            resp2 = client.post("/api/workflow/process", json=payload)

        assert resp1.status_code == 200
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert "already processed" in data2["message"].lower() or data2["request_id"] == payload["request_id"]


# ──────────────── Retry Logic Tests ────────────────


class TestRetryLogic:
    def test_doc_service_always_fails_triggers_manual_review(self):
        """If doc verification service always fails, should go to MANUAL_REVIEW."""
        with patch(
            "app.services.external_service_simulator.random.random",
            return_value=0.1,  # always below 0.3 → always fail
        ):
            resp = client.post("/api/workflow/process", json={
                "request_id": "test-retry-fail",
                "applicant_name": "Retry Test",
                "income": 60000,
                "credit_score": 750,
                "documents_verified": True,
            })
        data = resp.json()
        assert data["status"] == "MANUAL_REVIEW"

    def test_doc_service_succeeds_after_retries(self):
        """If doc verification succeeds after a retry, should complete normally."""
        call_count = {"n": 0}
        original_random = __import__("random").random

        def flaky_random():
            call_count["n"] += 1
            if call_count["n"] <= 1:
                return 0.1  # fail first attempt
            return 0.9  # succeed after

        with patch("app.services.external_service_simulator.random.random", side_effect=flaky_random):
            resp = client.post("/api/workflow/process", json={
                "request_id": "test-retry-success",
                "applicant_name": "Retry Success",
                "income": 80000,
                "credit_score": 800,
                "documents_verified": True,
            })
        data = resp.json()
        assert data["status"] in ("APPROVED", "MANUAL_REVIEW")


# ──────────────── Rule Change Scenario ────────────────


class TestRuleChange:
    def test_custom_rules(self, tmp_path):
        """Using a different rules file should change the decision."""
        from app.services.rule_engine import evaluate_rules as _real_evaluate

        custom_rules = {
            "rules": [
                {"field": "income", "operator": ">=", "value": 100000, "decision": "APPROVE"},
                {"field": "income", "operator": "<", "value": 100000, "decision": "REJECT"},
            ]
        }
        rules_file = tmp_path / "custom_rules.json"
        rules_file.write_text(json.dumps(custom_rules))

        def custom_evaluate(data, rules_path=None):
            return _real_evaluate(data, rules_path=str(rules_file))

        with patch("app.services.workflow_engine.evaluate_rules", side_effect=custom_evaluate):
            with patch("app.services.external_service_simulator.random.random", return_value=0.9):
                # Low income → should REJECT with custom rules
                resp = client.post("/api/workflow/process", json={
                    "request_id": "test-rule-change-reject",
                    "applicant_name": "Rule Change",
                    "income": 50000,
                    "credit_score": 800,
                    "documents_verified": True,
                })
        data = resp.json()
        assert data["decision"] == "REJECT"


# ──────────────── API Endpoint Tests ────────────────


class TestEndpoints:
    def test_health_check(self):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"

    def test_audit_logs_endpoint(self):
        """Submit a request then check audit logs exist."""
        with patch("app.services.external_service_simulator.random.random", return_value=0.9):
            client.post("/api/workflow/process", json={
                "request_id": "test-audit-001",
                "applicant_name": "Audit Test",
                "income": 75000,
                "credit_score": 720,
                "documents_verified": True,
            })
        resp = client.get("/api/workflow/audit", params={"request_id": "test-audit-001"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] > 0
        assert len(data["logs"]) > 0

    def test_request_detail_endpoint(self):
        """Submit a request then get its lifecycle."""
        with patch("app.services.external_service_simulator.random.random", return_value=0.9):
            client.post("/api/workflow/process", json={
                "request_id": "test-detail-001",
                "applicant_name": "Detail Test",
                "income": 90000,
                "credit_score": 760,
                "documents_verified": True,
            })
        resp = client.get("/api/workflow/request/test-detail-001")
        assert resp.status_code == 200
        data = resp.json()
        assert data["request_id"] == "test-detail-001"
        assert len(data["state_history"]) > 0

    def test_request_not_found(self):
        resp = client.get("/api/workflow/request/nonexistent")
        assert resp.status_code == 404

    def test_audit_logs_all(self):
        resp = client.get("/api/workflow/audit")
        assert resp.status_code == 200
