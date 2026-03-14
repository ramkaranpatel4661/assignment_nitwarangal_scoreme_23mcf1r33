# Configurable Workflow Decision Platform

A production-quality, modular workflow processing system built with **FastAPI** (backend), **React + Tailwind CSS** (frontend), and **SQLite** (database). The platform processes incoming requests, evaluates configurable rules, executes workflow stages, tracks state transitions, records audit logs, and handles failures with retry logic.

---

## Architecture

```
                    ┌──────────────────────────┐
                    │     React + Tailwind      │
                    │       Frontend UI         │
                    │  Dashboard │ Submit Form  │
                    │  Results │ Audit │ Timeline│
                    └────────────┬─────────────┘
                                 │ HTTP / REST
                    ┌────────────▼─────────────┐
                    │    FastAPI API Layer       │
                    │  /process  /audit  /stats  │
                    │  /decision /request /health│
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │    Workflow Controller     │
                    │ Orchestrates all services  │
                    └────────────┬─────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            ▼                    ▼                    ▼
  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
  │ Workflow Engine  │ │ Idempotency Mgr │ │ Structured      │
  │ (stage pipeline) │ │ (dedup check)   │ │ Logger          │
  └────────┬────────┘ └─────────────────┘ └─────────────────┘
           │
   ┌───────┼────────┬──────────┬──────────┐
   ▼       ▼        ▼          ▼          ▼
┌──────┐┌──────┐┌────────┐┌────────┐┌──────────┐
│Rule  ││State ││ Audit  ││ Retry  ││ External │
│Engine││Mgr   ││ Logger ││Handler ││ Service  │
│      ││      ││        ││(3 max) ││ Simulator│
└──┬───┘└──┬───┘└───┬────┘└────────┘└──────────┘
   │       │        │
   └───────┴────────┘
           │
   ┌───────▼────────┐
   │ SQLite Database │
   │ workflow_requests│
   │ audit_logs       │
   │ state_history    │
   └─────────────────┘
```

---

## Component Responsibilities

| Component | File | Responsibility |
|-----------|------|----------------|
| **Main App** | `app/main.py` | FastAPI setup, CORS, route registration, DB init on startup |
| **Routes** | `app/routes/workflow_routes.py` | API endpoint definitions and request/response mapping |
| **Controller** | `app/controllers/workflow_controller.py` | Coordinates services, builds decision explanations, aggregates stats |
| **Workflow Engine** | `app/services/workflow_engine.py` | Loads configurable stages and executes them as a pipeline |
| **Rule Engine** | `app/services/rule_engine.py` | Dynamically evaluates rules from `rules.json` with operator mapping |
| **State Manager** | `app/services/state_manager.py` | Validates and records state transitions with history |
| **Audit Logger** | `app/services/audit_logger.py` | Records stage-level audit events to SQLite |
| **Retry Handler** | `app/services/retry_handler.py` | Wraps external calls with configurable retry logic (max 3) |
| **External Simulator** | `app/services/external_service_simulator.py` | Simulates document verification with 30% random failure |
| **Idempotency Mgr** | `app/utils/idempotency_manager.py` | Prevents duplicate processing by checking `request_id` |
| **Structured Logger** | `app/utils/logger.py` | Centralized structured logging with context fields |
| **Database** | `app/database/db.py` | SQLite connection, schema init, WAL mode |
| **Models** | `app/models/request_model.py` | Pydantic schemas for validation and API contracts |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/workflow/process` | Process a workflow request (idempotent) |
| `GET` | `/api/workflow/audit` | Retrieve audit logs with filtering and pagination |
| `GET` | `/api/workflow/stats` | Get aggregated workflow statistics |
| `GET` | `/api/workflow/decision/{request_id}` | Get structured decision explanation with triggered rules |
| `GET` | `/api/workflow/request/{request_id}` | Get request lifecycle with full state history |
| `GET` | `/api/health` | System health check |

### POST /api/workflow/process

**Request:**
```json
{
  "request_id": "REQ-001",
  "applicant_name": "John Doe",
  "income": 80000,
  "credit_score": 750,
  "documents_verified": true
}
```

**Response:**
```json
{
  "request_id": "REQ-001",
  "status": "APPROVED",
  "decision": "APPROVE",
  "message": "Workflow completed with decision: APPROVE",
  "retry_count": 0,
  "created_at": "2024-01-01T00:00:00"
}
```

### GET /api/workflow/decision/{request_id}

**Response:**
```json
{
  "request_id": "REQ-001",
  "decision": "APPROVE",
  "rules_triggered": ["credit_score >= 700"],
  "explanation": "Final decision: APPROVE",
  "stages_executed": ["validation", "document_verification", "rule_evaluation", "decision", "audit_logging"]
}
```

### GET /api/workflow/stats

**Response:**
```json
{
  "total_requests": 120,
  "approved": 80,
  "rejected": 20,
  "manual_review": 15,
  "retry": 0,
  "pending": 0,
  "processing": 5
}
```

---

## Configuration Model

### `config/rules.json` — Rule Definitions

Rules are evaluated dynamically. Each rule specifies a field, comparison operator, threshold, and resulting decision.

```json
{
  "rules": [
    { "field": "credit_score", "operator": ">=", "value": 700, "decision": "APPROVE" },
    { "field": "credit_score", "operator": "<",  "value": 500, "decision": "REJECT" }
  ]
}
```

**Supported operators:** `>=`, `<=`, `>`, `<`, `==`, `!=`
**Decision priority:** REJECT > MANUAL_REVIEW > APPROVE

### `config/workflow_config.json` — Stage Pipeline

Defines which stages execute and in what order. Add or remove stages without code changes.

```json
{
  "stages": ["validation", "document_verification", "rule_evaluation", "decision", "audit_logging"]
}
```

**Available stages:** `validation`, `document_verification`, `rule_evaluation`, `decision`, `audit_logging`

---

## Failure Handling Strategy

| Scenario | Handling |
|----------|----------|
| **External service down** | Retry up to 3 times with 0.5s delay |
| **All retries exhausted** | Route to `MANUAL_REVIEW` |
| **Stage exception** | Catch error, log it, route to `MANUAL_REVIEW` |
| **Duplicate request** | Return cached response (idempotency) |
| **Invalid input** | Return 422 with Pydantic validation errors |
| **Invalid state transition** | Rejected by valid-transition map in state manager |

---

## Running the Project

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
# API docs: http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# UI: http://localhost:3000
```

### Tests
```bash
cd backend
python -m pytest tests/ -v
```

---

## Scaling Considerations

| Concern | Strategy |
|---------|----------|
| **Database** | Migrate SQLite → PostgreSQL; add connection pooling (e.g., `databases` or `SQLAlchemy`) |
| **Concurrency** | Deploy with Gunicorn (multiple workers) behind Nginx reverse proxy |
| **External Services** | Replace simulator with real HTTP calls + circuit breaker pattern |
| **Async Processing** | Add Celery + RabbitMQ/Redis for background workflow execution |
| **Caching** | Add Redis for idempotency checks, session data, and stats caching |
| **Observability** | Add Prometheus metrics + Grafana dashboards + structured log aggregation |
| **Horizontal Scale** | Dockerize + deploy on Kubernetes with Horizontal Pod Autoscaler |
| **API Security** | Add JWT authentication, rate limiting, and request signing |
