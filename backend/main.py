import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

from routers import auth, users, drives, exams, code_execution, interviews, blockchain, analytics

app = FastAPI(
    title="PlaceSmart Enterprise API",
    description="Blockchain-Enabled Placement Intelligence & Recruitment Management System",
    version="1.0.0"
)

# CORS — allow the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:5173"),
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["User Management"])
app.include_router(drives.router, prefix="/api/drives", tags=["Placement Drives"])
app.include_router(exams.router, prefix="/api/exams", tags=["Examinations"])
app.include_router(code_execution.router, prefix="/api/execute", tags=["Code Execution"])
app.include_router(interviews.router, prefix="/api/interviews", tags=["Interviews"])
app.include_router(blockchain.router, prefix="/api/blockchain", tags=["Blockchain"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "PlaceSmart Enterprise API"}
