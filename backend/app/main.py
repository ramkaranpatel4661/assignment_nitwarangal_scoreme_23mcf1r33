"""
Configurable Workflow Decision Platform — Main FastAPI Application
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.db import init_db
from app.routes.workflow_routes import router

app = FastAPI(
    title="Configurable Workflow Decision Platform",
    description="Processes requests, evaluates rules, executes workflow stages, tracks state, records audit logs, and handles failures with retries.",
    version="1.0.0",
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(router)

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()
