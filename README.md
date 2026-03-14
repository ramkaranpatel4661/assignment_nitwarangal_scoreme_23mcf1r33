# Configurable Workflow Decision Platform

A production-quality, modular workflow processing system built with **FastAPI** (backend), **React + Tailwind CSS** (frontend), and **SQLite** (database). The platform processes incoming requests, evaluates configurable rules, executes workflow stages, tracks state transitions, records audit logs, and handles failures with retry logic.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│  Dashboard │ Submit │ Result │ Audit Logs │ Timeline            │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP / REST
┌─────────────────────────▼───────────────────────────────────────┐
│                    FastAPI Backend                               │
│  ┌──────────┐  ┌──────────────────┐  ┌────────────────────┐    │
│  │  Routes   │→│    Controller     │→│   Workflow Engine   │    │
│  │          │  │                  │  │  (stage pipeline)   │    │
│  └──────────┘  └──────────────────┘  └─────────┬──────────┘    │
│                                        ┌───────┴────────┐      │
│                                        ▼                ▼      │
│  ┌──────────────┐ ┌────────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Rule Engine   │ │State Mgr   │ │Audit Log │ │Retry Handler│  │
│  │(rules.json)  │ │(transitions│ │(history) │ │(ext service)│  │
│  └──────────────┘ └────────────┘ └──────────┘ └────────────┘  │
│  ┌──────────────┐ ┌─────────────────────────────────────┐      │
│  │ Idempotency  │ │ External Service Simulator (30% fail)│      │
│  └──────────────┘ └─────────────────────────────────────┘      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                ┌─────────▼─────────┐
                │   SQLite Database  │
                │  workflow_requests │
                │  audit_logs        │
                │  state_history     │
                └───────────────────┘
```

---

## Module Explanation

| Module | File | Purpose |
|--------|------|---------|
| **Main App** | `app/main.py` | FastAPI setup, CORS, route registration, DB init |
| **Routes** | `app/routes/workflow_routes.py` | API endpoints definition |
| **Controller** | `app/controllers/workflow_controller.py` | Orchestrates services for each API call |
| **Workflow Engine** | `app/services/workflow_engine.py` | Loads stages from config and runs them in order |
| **Rule Engine** | `app/services/rule_engine.py` | Dynamic rule evaluation from `rules.json` |
| **State Manager** | `app/services/state_manager.py` | State transitions with validation and history |
| **Audit Logger** | `app/services/audit_logger.py` | Records audit events to database |
| **Retry Handler** | `app/services/retry_handler.py` | Retries failed external calls (max 3) |
| **External Simulator** | `app/services/external_service_simulator.py` | Simulates doc verification with 30% failure |
| **Idempotency** | `app/utils/idempotency_manager.py` | Prevents duplicate processing by `request_id` |
| **Database** | `app/database/db.py` | SQLite connection management and schema init |
| **Models** | `app/models/request_model.py` | Pydantic schemas for request/response validation |

---

## API Documentation

### `POST /api/workflow/process`

Process a workflow request. Idempotent — duplicate `request_id` returns cached result.

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

### `GET /api/workflow/audit`

Retrieve audit logs. Supports filtering and pagination.

| Parameter | Type | Description |
|-----------|------|-------------|
| `request_id` | string (optional) | Filter by request ID |
| `limit` | int (1-500) | Max records |
| `offset` | int | Pagination offset |

### `GET /api/workflow/request/{request_id}`

Get full request lifecycle with state history.

### `GET /api/health`

Health check — returns system status, DB connectivity, and version.

---

## Configuration

### `rules.json`

Define evaluation rules dynamically. Each rule specifies a field, operator, threshold value, and decision outcome.

Supported operators: `>=`, `<=`, `>`, `<`, `==`, `!=`

Priority: **REJECT > MANUAL_REVIEW > APPROVE**

### `workflow_config.json`

Define the stage pipeline. Stages execute in order:

```json
{ "stages": ["validation", "document_verification", "rule_evaluation", "decision", "audit_logging"] }
```

Add or remove stages without code changes. Available stages: `validation`, `document_verification`, `rule_evaluation`, `decision`, `audit_logging`.

---

## Failure Handling

1. **External Service Simulation** — Document verification has a 30% random failure rate
2. **Retry Logic** — Failed calls are retried up to 3 times with 0.5s delay
3. **Graceful Degradation** — After max retries, request moves to `MANUAL_REVIEW`
4. **State Safety** — All state transitions are validated against an allowed-transitions map

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

## Scaling Strategy

| Concern | Strategy |
|---------|----------|
| **Database** | Migrate from SQLite to PostgreSQL; add connection pooling |
| **Concurrency** | Deploy with Gunicorn workers behind Nginx |
| **External Services** | Replace simulator with real HTTP calls + circuit breaker |
| **Queue Processing** | Add Celery/RabbitMQ for async workflow execution |
| **Caching** | Add Redis for idempotency checks and session data |
| **Monitoring** | Add Prometheus metrics + Grafana dashboards |
| **Horizontal Scale** | Dockerize; deploy on Kubernetes with HPA |
