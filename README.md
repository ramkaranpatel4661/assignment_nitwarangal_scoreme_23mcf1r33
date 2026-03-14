<h1 align="center">⚙️ Configurable Workflow Decision Platform</h1>

<p align="center">
  <strong>A production-quality, modular workflow processing system for automated decision-making</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi" />
  <img src="https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/CSS-Tailwind-38B2AC?style=for-the-badge&logo=tailwindcss" />
  <img src="https://img.shields.io/badge/Database-SQLite-003B57?style=for-the-badge&logo=sqlite" />
  <img src="https://img.shields.io/badge/Tests-Pytest-0A9EDC?style=for-the-badge&logo=pytest" />
</p>

<p align="center">
  <a href="https://drive.google.com/file/d/1uMmPsy82jSiLwpnGOlBdXynqXjgHfHWo/view" target="_blank">
    <img src="https://img.shields.io/badge/🎬_Project_Demo-Watch_Video-FF0000?style=for-the-badge&logo=googledrive&logoColor=white" />
  </a>
</p>

---

A **configurable, extensible workflow decision engine** that processes incoming requests, evaluates rules dynamically from JSON configuration, executes a multi-stage workflow pipeline, manages request lifecycle state, records a complete audit trail, and handles external service failures with retry logic — all without requiring code changes to modify business logic.

---

### UI Preview

<p align="center">
  <img src="assets/Screenshot%202026-03-14%20171230.png" width="48%" />
  <img src="assets/Screenshot%202026-03-14%20171350.png" width="48%" />
</p>

<p align="center">
  <a href="#screenshots"><strong>👉 View All Screenshots</strong></a>
</p>

---

## Table of Contents

- [Problem Overview](#problem-overview)
- [System Architecture](#system-architecture)
- [Core Components](#core-components)
- [Configuration Model](#configuration-model)
- [API Endpoints](#api-endpoints)
- [Explainability & Auditability](#explainability--auditability)
- [Engineering Robustness](#engineering-robustness)
- [Testing](#testing)
- [Running the Project](#running-the-project)
- [Frontend UI](#frontend-ui)
- [Scaling Considerations](#scaling-considerations)
- [Trade-offs](#trade-offs)
- [Project Structure](#project-structure)
- [Author](#author)

---

## Problem Overview

Enterprise workflows — from loan approvals to employee onboarding — are often built with **hardcoded business logic** that is difficult to modify, audit, or explain. When rules change, developers must rewrite and redeploy code.

**This platform solves that by making every aspect configurable:**

| Real-World Domain | What This Platform Demonstrates |
|---|---|
| **Loan / Credit Approvals** | Rule-based decisioning with credit score, income thresholds |
| **Insurance Claim Processing** | Multi-stage pipeline with document verification |
| **Employee Onboarding** | Configurable workflow stages that can be reordered |
| **Vendor Approvals** | External dependency checks with retry on failure |
| **Document Verification** | Simulated external service with graceful degradation |

**Key design goals:**
- Business users can modify rules and workflow stages via JSON — **zero code changes**
- Every decision is **explainable** with a full audit trail
- External service failures are handled with **automatic retries**
- Duplicate requests are protected by **idempotency**

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   CLIENT (React + Tailwind)                  │
│  Dashboard │ Submit Form │ Results │ Audit Logs │ Timeline   │
└──────────────────────────┬──────────────────────────────────┘
                           │  HTTP / REST
┌──────────────────────────▼──────────────────────────────────┐
│                   FASTAPI  API  LAYER                        │
│   POST /process   GET /audit   GET /stats   GET /decision    │
│   GET /request/{id}   GET /health                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   WORKFLOW CONTROLLER                         │
│         Coordinates services │ Builds explanations            │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   WORKFLOW ENGINE                             │
│   Loads stages from workflow_config.json                      │
│   Executes: validation → doc_verify → rules → decision → log │
└───┬──────────┬──────────┬───────────┬──────────┬────────────┘
    │          │          │           │          │
    ▼          ▼          ▼           ▼          ▼
┌────────┐┌────────┐┌─────────┐┌─────────┐┌──────────────┐
│  RULE  ││ STATE  ││ AUDIT   ││ RETRY   ││  EXTERNAL    │
│ ENGINE ││MANAGER ││ LOGGER  ││ HANDLER ││  SERVICE     │
│        ││        ││         ││ (3 max) ││  SIMULATOR   │
└───┬────┘└───┬────┘└────┬────┘└─────────┘└──────────────┘
    │         │          │
    └─────────┴──────────┘
              │
    ┌─────────▼──────────┐     ┌─────────────────────┐
    │   SQLite DATABASE   │     │  STRUCTURED LOGGER   │
    │  workflow_requests  │     │  (utils/logger.py)   │
    │  audit_logs         │     │  request_id, stage,  │
    │  state_history      │     │  decision tracking   │
    └────────────────────┘     └─────────────────────┘
```

**Data Flow:** Request → Idempotency Check → Create Record → Execute Pipeline (configurable stages) → Rule Evaluation → Decision → State Transition → Audit Log → Response

---

## Core Components

| Component | File | Responsibility |
|---|---|---|
| **Workflow Engine** | `services/workflow_engine.py` | Loads stages from `workflow_config.json` and executes them sequentially. Each stage is a pluggable handler function. Adding a new stage requires only a new handler + config entry. |
| **Rule Engine** | `services/rule_engine.py` | Dynamically evaluates rules from `rules.json` using an operator map (`>=`, `<`, `==`, etc.). Rules are prioritized: **REJECT > MANUAL_REVIEW > APPROVE**. |
| **State Manager** | `services/state_manager.py` | Maintains a strict state machine with valid transitions (e.g., PENDING→PROCESSING→APPROVED). Every transition is recorded in `state_history`. |
| **Audit Logger** | `services/audit_logger.py` | Records stage-level events with `request_id`, `input_data`, `rules_triggered`, `decision`, and `timestamp`. Provides filtered/paginated retrieval. |
| **Retry Handler** | `services/retry_handler.py` | Wraps external service calls with configurable retry logic (up to 3 attempts, 0.5s delay). Returns `(success, result, attempts)`. |
| **External Simulator** | `services/external_service_simulator.py` | Simulates a document verification service with **30% random failure rate** to test retry and failure handling paths. |
| **Idempotency Manager** | `utils/idempotency_manager.py` | Checks if `request_id` already exists before processing. Returns cached response for duplicates — guarantees exactly-once processing semantics. |
| **Structured Logger** | `utils/logger.py` | Centralized logging with structured output: `[timestamp] LEVEL module: message \| request_id="X" stage="Y"`. Integrated across engine and controller. |

### Separation of Concerns

```
Routes (HTTP)  →  Controller (orchestration)  →  Services (business logic)  →  Database (persistence)
     ↕                    ↕                            ↕
  Pydantic            Logger                    Config Files
  (validation)     (observability)            (rules.json, workflow_config.json)
```

Each layer has a single responsibility. Services are stateless and unit-testable. Configuration is externalized. No circular dependencies.

---

## Configuration Model

### Rules Configuration — `config/rules.json`

Rules are evaluated dynamically at runtime. **No code changes needed to add, modify, or remove rules.**

```json
{
  "rules": [
    {
      "field": "credit_score",
      "operator": ">=",
      "value": 700,
      "decision": "APPROVE"
    },
    {
      "field": "credit_score",
      "operator": "<",
      "value": 500,
      "decision": "REJECT"
    },
    {
      "field": "documents_verified",
      "operator": "==",
      "value": false,
      "decision": "MANUAL_REVIEW"
    },
    {
      "field": "income",
      "operator": "<",
      "value": 20000,
      "decision": "REJECT"
    }
  ]
}
```

**Supported operators:** `>=` `<=` `>` `<` `==` `!=`

**Decision Priority:** If multiple rules trigger, the highest-priority decision wins:
```
REJECT  >  MANUAL_REVIEW  >  APPROVE
```

### Workflow Stages — `config/workflow_config.json`

The pipeline stages are fully configurable. Reorder, add, or remove stages without touching code:

```json
{
  "stages": [
    "validation",
    "document_verification",
    "rule_evaluation",
    "decision",
    "audit_logging"
  ]
}
```

**Available stages:** `validation`, `document_verification`, `rule_evaluation`, `decision`, `audit_logging`

**To add a new stage:** (1) Write a handler function, (2) Register it in `STAGE_HANDLERS`, (3) Add the name to `workflow_config.json`.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/workflow/process` | Process a workflow request (idempotent) |
| `GET` | `/api/workflow/audit` | Retrieve audit logs with filtering & pagination |
| `GET` | `/api/workflow/stats` | Aggregated decision statistics |
| `GET` | `/api/workflow/decision/{request_id}` | Structured decision explanation |
| `GET` | `/api/workflow/request/{request_id}` | Full request lifecycle with state history |
| `GET` | `/api/health` | System health check |

### `POST /api/workflow/process`

**Request:**
```json
{
  "request_id": "REQ-2024-001",
  "applicant_name": "Rahul Sharma",
  "income": 85000,
  "credit_score": 750,
  "documents_verified": true
}
```

**Response (Approved):**
```json
{
  "request_id": "REQ-2024-001",
  "status": "APPROVED",
  "decision": "APPROVE",
  "message": "Workflow completed with decision: APPROVE",
  "retry_count": 0,
  "created_at": "2024-03-14T06:00:00"
}
```

### `GET /api/workflow/decision/{request_id}`

```json
{
  "request_id": "REQ-2024-001",
  "decision": "APPROVE",
  "rules_triggered": [
    "credit_score >= 700"
  ],
  "explanation": "Final decision: APPROVE",
  "stages_executed": [
    "validation",
    "document_verification",
    "rule_evaluation",
    "decision",
    "audit_logging"
  ]
}
```

### `GET /api/workflow/stats`

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

### `GET /api/workflow/request/{request_id}`

```json
{
  "request_id": "REQ-2024-001",
  "applicant_name": "Rahul Sharma",
  "income": 85000,
  "credit_score": 750,
  "documents_verified": true,
  "status": "APPROVED",
  "decision": "APPROVE",
  "retry_count": 0,
  "created_at": "2024-03-14T06:00:00",
  "updated_at": "2024-03-14T06:00:01",
  "state_history": [
    { "from_state": null, "to_state": "PENDING", "timestamp": "2024-03-14T06:00:00" },
    { "from_state": "PENDING", "to_state": "PROCESSING", "timestamp": "2024-03-14T06:00:00" },
    { "from_state": "PROCESSING", "to_state": "APPROVED", "timestamp": "2024-03-14T06:00:01" }
  ]
}
```

> 📖 **Interactive API docs** available at `http://localhost:8000/docs` (Swagger UI)

---

## Explainability & Auditability

### Decision Explanation

Every decision is **explainable**. The `/api/workflow/decision/{id}` endpoint reconstructs which rules fired and why:

```json
{
  "decision": "REJECT",
  "rules_triggered": [
    "credit_score < 500",
    "income < 20000"
  ],
  "explanation": "Final decision: REJECT"
}
```

This makes the system suitable for **regulated industries** where decision transparency is mandatory.

### Audit Trail

Every workflow stage is recorded in the `audit_logs` table:

| Field | Description |
|-------|-------------|
| `request_id` | Links the log to a specific request |
| `input_data` | Full input snapshot at time of processing |
| `rules_triggered` | JSON array of rules that matched |
| `decision` | Decision made at this stage |
| `stage` | Which pipeline stage generated this entry |
| `message` | Human-readable description |
| `timestamp` | When the event occurred |

### State Timeline

Full state transition history is recorded and queryable:

```
PENDING → PROCESSING → APPROVED
PENDING → PROCESSING → MANUAL_REVIEW  (when doc service fails)
PENDING → PROCESSING → REJECTED        (when credit_score < 500)
```

---

## Engineering Robustness

### Retry Mechanism
```
External Service Call
  ├── Attempt 1 → ❌ Failed (30% chance)
  ├── Attempt 2 → ❌ Failed
  └── Attempt 3 → ❌ Failed → Route to MANUAL_REVIEW
```
- Max **3 retries** with **0.5s delay** between attempts
- After exhausting retries, request gracefully degrades to `MANUAL_REVIEW`

### External Service Failure Simulation
- Document verification service has a **30% random failure rate**
- Tests both retry success (service recovers) and retry exhaustion paths

### Idempotency Protection
- Every `request_id` is checked before processing
- Duplicate submissions return the **cached original response**
- Guarantees **exactly-once processing** semantics

### Structured Logging
```
[2024-03-14T06:00:00Z] INFO    workflow_engine: Workflow started | request_id="REQ-001"
[2024-03-14T06:00:00Z] INFO    workflow_engine: Validation passed | request_id="REQ-001" stage="validation"
[2024-03-14T06:00:01Z] INFO    workflow_engine: Rule evaluation complete | request_id="REQ-001" stage="rule_evaluation" decision="APPROVE"
[2024-03-14T06:00:01Z] INFO    workflow_engine: Decision finalized | request_id="REQ-001" stage="decision" decision="APPROVE"
[2024-03-14T06:00:01Z] INFO    workflow_engine: Workflow finished | request_id="REQ-001" decision="APPROVE"
```

### Valid State Transitions
```python
VALID_TRANSITIONS = {
    "PENDING":     ["PROCESSING"],
    "PROCESSING":  ["APPROVED", "REJECTED", "MANUAL_REVIEW", "RETRY"],
    "RETRY":       ["PROCESSING", "MANUAL_REVIEW"],
    "APPROVED":    [],  # terminal
    "REJECTED":    [],  # terminal
    "MANUAL_REVIEW": [],  # terminal
}
```

---

## Testing

**Framework:** Pytest with `TestClient` (synchronous FastAPI testing)

**17 test cases** covering all critical paths:

| Category | Tests | What's Verified |
|----------|-------|-----------------|
| **Happy Path** | 4 | Approve (high credit), Reject (low credit), Manual Review (unverified docs), Deterministic approval |
| **Input Validation** | 4 | Missing fields, negative income, out-of-range credit score, empty name → all return 422 |
| **Idempotency** | 1 | Same `request_id` twice → returns cached response with "already processed" message |
| **Retry Logic** | 2 | Service always fails → MANUAL_REVIEW; Service recovers after retry → normal decision |
| **Rule Change** | 1 | Custom rules file → different decision (income-based REJECT instead of credit-based) |
| **API Endpoints** | 5 | Health check, audit logs, request detail, 404 for missing request, all audit logs |

**Run tests:**
```bash
cd backend
python -m pytest tests/ -v
```

**All tests use isolated temp databases** — no test pollution.

---

## Running the Project

### Prerequisites
- Python 3.10+
- Node.js 18+

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

📖 **API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

🖥️ **UI:** [http://localhost:3000](http://localhost:3000)

---

## Frontend UI

Built with **React + Tailwind CSS** — dark theme with glassmorphism design.

| Page | Description |
|------|-------------|
| **Dashboard** | System health cards + real-time workflow stats (approved, rejected, review counts) |
| **Submit Request** | Form with validation, auto-ID generation, and Yes/No document toggle |
| **Workflow Result** | Color-coded decision display with details |
| **Audit Logs** | Searchable, paginated audit table with decision badges |
| **Status Timeline** | Visual state transition timeline for any request |

<h3 id="screenshots">Screenshots</h3>

<details>
<summary><strong>👉 View All Screenshots (click to expand)</strong></summary>
<br>

#### Dashboard — System Health, Statistics & Analytics
![Dashboard](assets/Screenshot%202026-03-14%20171230.png)

#### Dashboard — Recent Activity, Active Rules & System Info
![Dashboard Activity](assets/Screenshot%202026-03-14%20171313.png)

#### Submit Request
![Submit Request](assets/Screenshot%202026-03-14%20171329.png)

#### Workflow Result
![Workflow Result](assets/Screenshot%202026-03-14%20171336.png)

#### Audit Logs
![Audit Logs](assets/Screenshot%202026-03-14%20171350.png)

#### Status Timeline
![Status Timeline](assets/Screenshot%202026-03-14%20171402.png)

#### Swagger API Docs — Endpoints
![API Docs](assets/Screenshot%202026-03-14%20171418.png)

#### Swagger API Docs — Schemas
![API Schemas](assets/Screenshot%202026-03-14%20171425.png)

</details>


---

## Scaling Considerations

| Current | Production Scale |
|---------|-----------------|
| SQLite | **PostgreSQL** with connection pooling |
| Synchronous processing | **Celery + RabbitMQ** for async workflow execution |
| In-memory idempotency | **Redis** for distributed idempotency & caching |
| Single process | **Gunicorn** (multi-worker) behind **Nginx** |
| Direct deployment | **Docker** + **Kubernetes** with HPA |
| Basic logging | **ELK Stack** or **Prometheus + Grafana** |
| No auth | **JWT authentication** + rate limiting |

---

## Trade-offs

| Decision | Rationale |
|----------|-----------|
| **SQLite** over PostgreSQL | Zero-config setup for hackathon — demonstrates the same patterns that translate to production databases |
| **JSON config** over database-stored rules | Enables version control of rules, easy to review in PRs, no admin UI needed for demo |
| **Simulated external service** | Allows controlled testing of failure paths; real integration would use the same retry handler interface |
| **Synchronous pipeline** | Simpler to reason about for reviewers; async (Celery) is a horizontal scaling concern, not an architecture concern |
| **Tailwind CSS** over component library | Full design control, smaller bundle, no opinionated styling constraints |

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                          # FastAPI app setup, CORS, startup
│   ├── routes/workflow_routes.py        # API endpoint definitions
│   ├── controllers/workflow_controller.py  # Service orchestration
│   ├── services/
│   │   ├── workflow_engine.py           # Configurable stage pipeline
│   │   ├── rule_engine.py               # Dynamic rule evaluation
│   │   ├── state_manager.py             # State machine + history
│   │   ├── audit_logger.py              # Audit event recording
│   │   ├── retry_handler.py             # Retry with backoff
│   │   └── external_service_simulator.py # Failure simulation
│   ├── utils/
│   │   ├── idempotency_manager.py       # Duplicate detection
│   │   └── logger.py                    # Structured logging
│   ├── config/
│   │   ├── rules.json                   # Business rules
│   │   └── workflow_config.json         # Stage pipeline config
│   ├── database/db.py                   # SQLite setup + schema
│   └── models/request_model.py          # Pydantic schemas
├── tests/test_workflow.py               # 17 test cases
└── requirements.txt

frontend/
├── src/
│   ├── App.jsx                          # Router + navigation
│   ├── api.js                           # API client
│   ├── pages/
│   │   ├── Dashboard.jsx                # Stats + health
│   │   ├── SubmitRequest.jsx            # Request form
│   │   ├── WorkflowResult.jsx           # Decision display
│   │   ├── AuditLogs.jsx                # Audit table
│   │   └── Timeline.jsx                 # State timeline
│   └── index.css                        # Tailwind + custom classes
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Author

**Ramkaran Patel**
NIT Warangal | 23MCF1R33

---

<p align="center">
  Built with ❤️ for the ScoreMe Assignment
</p>
