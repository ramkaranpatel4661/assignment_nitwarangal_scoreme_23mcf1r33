# Architecture Document — Configurable Workflow Decision Platform

> **Version:** 1.0.0
> **Author:** Ramkaran Patel — NIT Warangal (23MCF1R33)
> **Last Updated:** March 2026

---

## 1. System Overview

The Configurable Workflow Decision Platform is a **multi-layer decision engine** designed to process structured business requests through configurable rules and workflow stages. It supports real-world patterns such as loan approvals, claim processing, vendor verification, and document workflows.

**Design Philosophy:**
- **Configuration over code** — Business logic lives in JSON files, not source code
- **Explainability first** — Every decision is traceable to the exact rules that fired
- **Graceful degradation** — External failures never crash the system; they route to manual review
- **Separation of concerns** — Each module has exactly one responsibility

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
│                                                                   │
│   React + Tailwind CSS │ Dashboard │ Forms │ Audit │ Timeline     │
│   ────────────────────────────────────────────────────────────── │
│   Recharts (Analytics) │ API Client (fetch) │ React Router        │
└────────────────────────────────┬────────────────────────────────┘
                                 │ HTTP / REST (JSON)
                                 │ Proxied via Vite (dev)
┌────────────────────────────────▼────────────────────────────────┐
│                         API LAYER (FastAPI)                       │
│                                                                   │
│   Routes ──→ Request Validation (Pydantic) ──→ Response Models    │
│   CORS Middleware │ Auto-generated Swagger/OpenAPI docs            │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│                      ORCHESTRATION LAYER                          │
│                                                                   │
│   Workflow Controller                                             │
│   ├── Idempotency check (before processing)                      │
│   ├── Request record creation                                    │
│   ├── Workflow engine invocation                                 │
│   ├── Decision explanation builder                               │
│   └── Stats aggregation                                          │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│                       BUSINESS LOGIC LAYER                       │
│                                                                   │
│   ┌──────────────┐   ┌────────────┐   ┌──────────────────────┐  │
│   │ Workflow      │   │ Rule       │   │ External Service     │  │
│   │ Engine        │──▶│ Engine     │   │ Simulator            │  │
│   │ (pipeline)    │   │ (evaluator)│   │ (30% failure rate)   │  │
│   └──────┬───────┘   └────────────┘   └──────────┬───────────┘  │
│          │                                        │               │
│   ┌──────▼───────┐   ┌────────────┐   ┌──────────▼───────────┐  │
│   │ State        │   │ Audit      │   │ Retry               │  │
│   │ Manager      │   │ Logger     │   │ Handler             │  │
│   │ (FSM)        │   │ (events)   │   │ (3 max, 0.5s delay) │  │
│   └──────────────┘   └────────────┘   └──────────────────────┘  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│                       PERSISTENCE LAYER                          │
│                                                                   │
│   SQLite (WAL mode, foreign keys enabled)                        │
│   ├── workflow_requests   (request data + status + decision)     │
│   ├── audit_logs          (stage events + rules + timestamp)     │
│   └── state_history       (from_state → to_state transitions)   │
│                                                                   │
│   Configuration Files (version-controlled)                       │
│   ├── config/rules.json          (business rules)                │
│   └── config/workflow_config.json (pipeline stages)              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Interaction & Data Flow

### 3.1 Request Processing Flow

```
Client ──POST /api/workflow/process──▶ Routes
                                        │
                                        ▼
                                   Controller
                                        │
                        ┌───────────────┤
                        ▼               │
                  Idempotency           │
                  Manager               │
                        │               │
               ┌────────┴────────┐      │
               │  Duplicate?     │      │
               ├── YES: return   │      │
               │   cached result │      │
               └── NO: continue ─┘      │
                                        ▼
                              Create DB Record
                              (status: PENDING)
                                        │
                                        ▼
                              Workflow Engine
                              Load stages from config
                                        │
                    ┌───────────────────┤
                    ▼                   │
            Stage: validation           │
            ├── Validate data           │
            └── Log audit event         │
                    │                   │
                    ▼                   │
            Stage: document_verification│
            ├── Call external service    │
            ├── If fails: retry (3x)    │
            ├── If all fail: MANUAL_REVIEW
            └── Log audit event         │
                    │                   │
                    ▼                   │
            Stage: rule_evaluation      │
            ├── Load rules from JSON    │
            ├── Evaluate each rule      │
            ├── Priority: REJECT > MANUAL_REVIEW > APPROVE
            └── Log audit event + decision
                    │                   │
                    ▼                   │
            Stage: decision             │
            ├── Finalize decision       │
            ├── Transition state        │
            └── Log audit event         │
                    │                   │
                    ▼                   │
            Stage: audit_logging        │
            └── Final summary event     │
                    │                   ▲
                    └───────────────────┘
                                        │
                                        ▼
                              Return Response
                              {status, decision, message}
```

### 3.2 State Machine

```
                    ┌─────────┐
                    │ PENDING │ (initial state)
                    └────┬────┘
                         │ start processing
                    ┌────▼────────┐
                    │ PROCESSING  │
                    └──┬────┬───┬─┘
                       │    │   │
          ┌────────────┘    │   └────────────┐
          ▼                 ▼                ▼
    ┌──────────┐    ┌──────────────┐   ┌──────────┐
    │ APPROVED │    │ MANUAL_REVIEW│   │ REJECTED │
    │(terminal)│    │  (terminal)  │   │(terminal)│
    └──────────┘    └──────────────┘   └──────────┘

    Invalid transitions are REJECTED by the state manager.
    Every transition is recorded in state_history table.
```

### 3.3 Rule Evaluation Logic

```
Input Data ──▶ Load rules.json
                    │
                    ▼
              For each rule:
              ├── Extract field value from data
              ├── Apply operator (>=, <, ==, !=, etc.)
              ├── If match: add to triggered_rules
              └── Record decision (APPROVE/REJECT/MANUAL_REVIEW)
                    │
                    ▼
              Priority Resolution:
              ├── Any REJECT?      → Final = REJECT
              ├── Any MANUAL_REVIEW? → Final = MANUAL_REVIEW
              └── Otherwise        → Final = APPROVE
```

---

## 4. Component Responsibilities

### 4.1 API Layer

| Component | File | Responsibility |
|---|---|---|
| **Main App** | `main.py` | FastAPI initialization, CORS middleware, route mounting, DB init on startup |
| **Routes** | `routes/workflow_routes.py` | HTTP endpoint definition, request/response mapping, error handling |
| **Models** | `models/request_model.py` | Pydantic schemas enforcing input validation and response contracts |

### 4.2 Business Logic Layer

| Component | File | Responsibility |
|---|---|---|
| **Workflow Controller** | `controllers/workflow_controller.py` | Orchestrates the full request lifecycle: idempotency → create → execute → respond |
| **Workflow Engine** | `services/workflow_engine.py` | Loads stage pipeline from config, executes handlers in sequence, accumulates context |
| **Rule Engine** | `services/rule_engine.py` | Evaluates business rules from JSON using operator mapping, returns decision + triggered rules |
| **State Manager** | `services/state_manager.py` | Enforces valid state transitions, records history, manages retry counters |
| **Audit Logger** | `services/audit_logger.py` | Records stage-level events with full context (input, rules, decision, timestamp) |
| **Retry Handler** | `services/retry_handler.py` | Wraps external calls with retry logic (configurable max retries + delay) |
| **External Simulator** | `services/external_service_simulator.py` | Simulates document verification with 30% random failure for testing resilience |

### 4.3 Cross-Cutting Concerns

| Component | File | Responsibility |
|---|---|---|
| **Idempotency Manager** | `utils/idempotency_manager.py` | Prevents duplicate processing by checking request_id existence before execution |
| **Structured Logger** | `utils/logger.py` | Centralized logging with request_id, stage, and decision context fields |

---

## 5. Data Model

### 5.1 Database Schema

```sql
-- Core request record
CREATE TABLE workflow_requests (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id      TEXT UNIQUE NOT NULL,
    applicant_name  TEXT NOT NULL,
    income          REAL NOT NULL,
    credit_score    INTEGER NOT NULL,
    documents_verified BOOLEAN DEFAULT 0,
    status          TEXT DEFAULT 'PENDING',
    decision        TEXT,
    retry_count     INTEGER DEFAULT 0,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

-- Full audit trail
CREATE TABLE audit_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id      TEXT NOT NULL,
    stage           TEXT NOT NULL,
    input_data      TEXT,          -- JSON snapshot
    rules_triggered TEXT,          -- JSON array
    decision        TEXT,
    message         TEXT,
    timestamp       TEXT NOT NULL,
    FOREIGN KEY (request_id) REFERENCES workflow_requests(request_id)
);

-- State transition history
CREATE TABLE state_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id      TEXT NOT NULL,
    from_state      TEXT,
    to_state        TEXT NOT NULL,
    timestamp       TEXT NOT NULL,
    FOREIGN KEY (request_id) REFERENCES workflow_requests(request_id)
);
```

### 5.2 Indexes

```sql
CREATE INDEX idx_audit_request ON audit_logs(request_id);
CREATE INDEX idx_state_request ON state_history(request_id);
CREATE INDEX idx_request_status ON workflow_requests(status);
```

---

## 6. Configuration Model

### 6.1 Rules Configuration

Rules are **hot-swappable** — modify `rules.json` and new requests use the updated rules immediately. No restart required.

```json
{
  "rules": [
    { "field": "credit_score",       "operator": ">=", "value": 700,   "decision": "APPROVE" },
    { "field": "credit_score",       "operator": "<",  "value": 500,   "decision": "REJECT" },
    { "field": "documents_verified", "operator": "==", "value": false, "decision": "MANUAL_REVIEW" },
    { "field": "income",             "operator": "<",  "value": 20000, "decision": "REJECT" }
  ]
}
```

**Extensibility:** To add a new rule (e.g., age check), add one JSON object — zero code changes.

### 6.2 Workflow Stages Configuration

Stages execute in the order defined. Reorder, add, or remove stages by editing the JSON.

```json
{
  "stages": ["validation", "document_verification", "rule_evaluation", "decision", "audit_logging"]
}
```

**Extensibility:** To add a new stage (e.g., `fraud_detection`):
1. Write a handler function in `workflow_engine.py`
2. Register it in `STAGE_HANDLERS` dict
3. Add `"fraud_detection"` to the stages array

---

## 7. API Design

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| `POST` | `/api/workflow/process` | Process request (idempotent) | — |
| `GET` | `/api/workflow/audit` | Query audit logs (filterable, paginated) | — |
| `GET` | `/api/workflow/stats` | Aggregated statistics | — |
| `GET` | `/api/workflow/decision/{id}` | Decision explanation with triggered rules | — |
| `GET` | `/api/workflow/request/{id}` | Full lifecycle with state history | — |
| `GET` | `/api/workflow/rules` | Active rule configuration | — |
| `GET` | `/api/health` | Health check (DB connectivity) | — |

**Design Decision:** All endpoints are synchronous. For this scale (SQLite, single process), synchronous execution is simpler and equally performant. Async would add complexity without benefit.

---

## 8. Failure Handling Strategy

### 8.1 External Dependency Failure

```
Call external service
├── Attempt 1 → ❌ Failed (random 30%)
│   └── Wait 0.5s
├── Attempt 2 → ❌ Failed
│   └── Wait 0.5s
├── Attempt 3 → ❌ Failed
│   └── ALL RETRIES EXHAUSTED
│       └── Route to MANUAL_REVIEW (graceful degradation)
└── Attempt N → ✅ Success
    └── Continue pipeline normally
```

**Key Principle:** The system never crashes on external failure. It always produces a valid decision.

### 8.2 Stage Exception Handling

If any pipeline stage throws an unexpected exception:
1. Error is logged with full context (request_id, stage, error message)
2. State transitions to `MANUAL_REVIEW`
3. Audit log records the failure
4. Response is still returned to the client

### 8.3 Idempotency

```
Request arrives ──▶ Check request_id in DB
                        │
                   ┌────┴────┐
                   │ Exists? │
                   ├── YES   │──▶ Return cached response ("Already processed")
                   └── NO    │──▶ Process normally
                             └
```

This prevents:
- Duplicate charges in payment workflows
- Redundant approvals in loan processing
- Data inconsistency from network retries

### 8.4 Invalid State Transitions

```python
VALID_TRANSITIONS = {
    "PENDING":        ["PROCESSING"],
    "PROCESSING":     ["APPROVED", "REJECTED", "MANUAL_REVIEW", "RETRY"],
    "RETRY":          ["PROCESSING", "MANUAL_REVIEW"],
    "APPROVED":       [],   # terminal — no further transitions
    "REJECTED":       [],   # terminal
    "MANUAL_REVIEW":  [],   # terminal
}
```

Attempting an invalid transition (e.g., APPROVED → REJECTED) is silently rejected and logged.

---

## 9. Assumptions

| Assumption | Rationale |
|---|---|
| **Single-process deployment** | Suitable for demo/hackathon; production would use Gunicorn workers |
| **SQLite is sufficient** | Zero-config, embedded, supports WAL mode for concurrent reads |
| **Rules are evaluated synchronously** | Rule count is small (< 100); no need for parallel evaluation |
| **External service failure is random** | 30% failure rate simulates realistic intermittent failures |
| **All decisions are final** | No appeal/re-evaluation flow (could be added as a new stage) |
| **Request data is immutable** | Once submitted, input data does not change |
| **UTC timestamps** | All timestamps stored in ISO 8601 UTC format |

---

## 10. Trade-off Analysis

| Decision | Alternative | Why This Choice |
|---|---|---|
| **SQLite** | PostgreSQL, MySQL | Zero-config setup, no separate server process, demonstrates same SQL patterns |
| **JSON config files** | Rules in database, admin UI | Version-controllable, reviewable in PRs, no admin UI needed for demo |
| **Synchronous pipeline** | Celery + message queue | Simpler to debug and reason about; async is a scaling concern, not an architecture concern |
| **Simulated external service** | Real HTTP API | Controlled failure rate for deterministic testing; real service would use the same `retry_handler` interface |
| **Monolithic FastAPI app** | Microservices | Appropriate for this scale; clean module boundaries allow easy extraction into services later |
| **Pydantic validation** | Manual validation | Type-safe, auto-generates OpenAPI docs, better error messages |
| **File-based config** | Environment variables, database | Supports complex nested structures (rules array), easy to version control |

---

## 11. Scaling Roadmap

```
CURRENT STATE                         PRODUCTION SCALE
─────────────                         ─────────────────
SQLite                          ──▶   PostgreSQL + connection pooling
Single process                  ──▶   Gunicorn (4-8 workers) + Nginx
Synchronous pipeline            ──▶   Celery + RabbitMQ (async execution)
In-memory idempotency check     ──▶   Redis (distributed idempotency)
File-based config               ──▶   Config service or database-backed rules
Direct deployment               ──▶   Docker + Kubernetes (HPA)
stdout logging                  ──▶   ELK Stack / Prometheus + Grafana
No authentication               ──▶   JWT + OAuth 2.0 + rate limiting
No caching                      ──▶   Redis cache for stats, health, rules
```

### Scaling Steps (Priority Order)

1. **Database migration** — SQLite → PostgreSQL (1-2 day effort, schema is compatible)
2. **Containerization** — Add Dockerfile + docker-compose for backend + frontend + DB
3. **Background processing** — Add Celery workers for long-running workflows
4. **Caching layer** — Redis for idempotency checks and stats aggregation
5. **Observability** — Prometheus metrics + structured log aggregation
6. **Auth & security** — JWT tokens, API key management, rate limiting

---

## 12. Security Considerations

| Concern | Current State | Production Recommendation |
|---|---|---|
| **Authentication** | None (demo) | JWT + OAuth 2.0 |
| **Authorization** | None | Role-based access (admin, reviewer, viewer) |
| **Input validation** | Pydantic schemas | Add rate limiting + request signing |
| **SQL injection** | Parameterized queries (safe) | ✅ Already handled |
| **CORS** | Open (`*`) | Restrict to specific origins |
| **Data encryption** | None | TLS in transit, encryption at rest |

---

## 13. Testing Strategy

| Test Category | Count | What's Tested |
|---|---|---|
| **Happy Path** | 4 | Approve, reject, manual review, deterministic scenarios |
| **Input Validation** | 4 | Missing fields, negative values, out-of-range, empty strings |
| **Idempotency** | 1 | Duplicate request_id returns cached result |
| **Retry Logic** | 2 | All retries fail → MANUAL_REVIEW; service recovers → normal flow |
| **Rule Change** | 1 | Custom rules file changes the decision outcome |
| **API Endpoints** | 5 | Health, audit logs, request detail, 404, all logs query |
| **Total** | **17** | All tests use isolated temp databases — zero test pollution |

```bash
# Run all tests
cd backend
python -m pytest tests/ -v

# Run specific category
python -m pytest tests/test_workflow.py::TestHappyPath -v
python -m pytest tests/test_workflow.py::TestRetryLogic -v
```

---

## 14. Directory Structure Rationale

```
backend/
├── app/
│   ├── main.py                    ← Entry point (thin — only setup)
│   ├── routes/                    ← HTTP layer (no business logic)
│   ├── controllers/               ← Orchestration layer (coordinates services)
│   ├── services/                  ← Business logic (stateless, testable)
│   ├── utils/                     ← Cross-cutting utilities
│   ├── config/                    ← Externalized configuration
│   ├── database/                  ← Persistence layer
│   └── models/                    ← Data contracts (Pydantic)
└── tests/                         ← Isolated test suite

frontend/
├── src/
│   ├── components/                ← Reusable UI components
│   ├── pages/                     ← Route-level page components
│   ├── api.js                     ← Centralized API client
│   └── App.jsx                    ← Router + navigation shell
```

**Why this structure?**
- Each layer depends only on the layer below it (no upward dependencies)
- Services are stateless — easy to unit test without mocking HTTP
- Config is externalized — rules and workflow stages can change independently
- Clear entry points — reviewer can navigate top-down from `main.py`
