from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ─── Enums ──────────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    TPO = "tpo"
    STUDENT = "student"
    RECRUITER = "recruiter"


class DriveStatus(str, Enum):
    UPCOMING = "upcoming"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ApplicationStatus(str, Enum):
    APPLIED = "applied"
    SHORTLISTED = "shortlisted"
    APTITUDE_CLEARED = "aptitude_cleared"
    CODING_CLEARED = "coding_cleared"
    INTERVIEW_SCHEDULED = "interview_scheduled"
    SELECTED = "selected"
    REJECTED = "rejected"


class AttemptStatus(str, Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DISQUALIFIED_MALPRACTICE = "disqualified_malpractice"
    TIMED_OUT = "timed_out"


class EntryType(str, Enum):
    REGULAR = "Regular"
    LATERAL = "Lateral"


# ─── User Schemas ───────────────────────────────────────────────────────────

class UserBase(BaseModel):
    uid: Optional[str] = None
    email: str
    role: UserRole
    displayName: str


class StudentCreate(BaseModel):
    rollNo: str
    name: str
    email: str
    branch: str
    section: str
    cgpa: float
    backlogs: int
    skills: str  # comma-separated
    phone: str
    gender: str
    tenthMarks: float = Field(alias="10thMarks", default=0.0)
    twelfthMarks: float = Field(alias="12thMarks", default=0.0)
    entryType: EntryType = EntryType.REGULAR
    password: Optional[str] = None

    class Config:
        populate_by_name = True


class StudentProfile(BaseModel):
    rollNo: str
    name: str
    email: str
    branch: str
    section: str
    cgpa: float
    backlogs: int
    skills: List[str] = []
    phone: str
    gender: str
    tenthMarks: float = 0.0
    twelfthMarks: float = 0.0
    entryType: str = "Regular"
    placementStatus: str = "unplaced"
    aptitudeScore: Optional[float] = None
    codingScore: Optional[float] = None
    readinessScore: Optional[float] = None
    createdAt: Optional[str] = None


class RecruiterCreate(BaseModel):
    email: str
    password: str
    displayName: str
    company: str
    designation: str
    companyDomain: str
    activeDriveId: Optional[str] = None
    phone: Optional[str] = None


class RecruiterProfile(BaseModel):
    uid: Optional[str] = None
    email: str
    displayName: str
    company: str
    designation: str
    companyDomain: str
    activeDriveId: Optional[str] = None
    phone: Optional[str] = None
    createdAt: Optional[str] = None


# ─── Drive Schemas ──────────────────────────────────────────────────────────

class DriveCreate(BaseModel):
    company: str
    role: str
    package: str  # e.g., "6.5 LPA"
    description: str
    eligibilityCriteria: dict = {}  # { minCGPA: 7.0, maxBacklogs: 0, branches: ["CSE","DS"] }
    requiredSkills: List[str] = []
    driveDate: str
    lastDateToApply: str
    totalRounds: int = 4
    status: DriveStatus = DriveStatus.UPCOMING


class DriveResponse(DriveCreate):
    id: str
    createdBy: Optional[str] = None
    createdAt: Optional[str] = None
    applicationCount: int = 0


# ─── Exam Schemas ───────────────────────────────────────────────────────────

class MCQQuestion(BaseModel):
    id: str
    question: str
    options: List[str]
    correctIndex: int
    topic: str
    difficulty: str  # easy, medium, hard


class CodingQuestion(BaseModel):
    id: str
    title: str
    description: str
    inputFormat: str
    outputFormat: str
    constraints: str
    testCases: List[dict] = []  # [{ input: "...", expectedOutput: "..." }]
    difficulty: str
    topic: str


class ExamAttemptCreate(BaseModel):
    driveId: str
    rollNo: str
    examType: str  # "aptitude" or "technical"
    answers: dict = {}  # { questionId: selectedIndex } or { questionId: code }


class ExamAttemptResponse(BaseModel):
    driveId: str
    rollNo: str
    examType: str
    status: AttemptStatus
    answers: dict = {}
    score: Optional[float] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    strikes: int = 0
    violations: List[dict] = []


# ─── Interview Schemas ──────────────────────────────────────────────────────

class InterviewRubric(BaseModel):
    driveId: str
    rollNo: str
    technical: int = Field(ge=1, le=10)
    problemSolving: int = Field(ge=1, le=10)
    communication: int = Field(ge=1, le=10)
    hr: int = Field(ge=1, le=10)
    privateNotes: str = ""
    averageScore: Optional[float] = None
    evaluatedBy: Optional[str] = None
    evaluatedAt: Optional[str] = None


# ─── Application Schemas ────────────────────────────────────────────────────

class ApplicationCreate(BaseModel):
    driveId: str
    rollNo: str


class ApplicationResponse(BaseModel):
    driveId: str
    rollNo: str
    status: ApplicationStatus = ApplicationStatus.APPLIED
    appliedAt: Optional[str] = None
    updatedAt: Optional[str] = None


# ─── Blockchain Schemas ─────────────────────────────────────────────────────

class AnchorCredentialRequest(BaseModel):
    rollNo: str
    documentHash: str
    credentialType: str  # offer_letter, internship_cert, skill_badge


class CredentialResponse(BaseModel):
    rollNo: str
    documentHash: str
    credentialType: str
    txHash: str
    explorerLink: str
    timestamp: Optional[str] = None


# ─── Analytics Schemas ──────────────────────────────────────────────────────

class DriveStats(BaseModel):
    totalStudents: int = 0
    eligible: int = 0
    applied: int = 0
    shortlisted: int = 0
    aptitudeCleared: int = 0
    codingCleared: int = 0
    interviewScheduled: int = 0
    selected: int = 0
    rejected: int = 0


class FunnelSimulation(BaseModel):
    totalEligible: int
    expectedTestTakers: float = 0
    expectedInterviewees: float = 0
    expectedOffers: float = 0


class TrendAlert(BaseModel):
    alertType: str
    message: str
    severity: str  # warning, critical
    metric: float
    threshold: float


# ─── Code Execution ─────────────────────────────────────────────────────────

class CodeExecutionRequest(BaseModel):
    language: str
    version: str
    code: str
    stdin: str = ""


class CodeExecutionResponse(BaseModel):
    stdout: str = ""
    stderr: str = ""
    exitCode: int = 0
    signal: Optional[str] = None
    executionTime: Optional[str] = None


# ─── Proctor Log ─────────────────────────────────────────────────────────────

class ProctorViolation(BaseModel):
    type: str  # tab_switch, fullscreen_exit, ai_extension, blur
    timestamp: str
    details: str = ""


class ProctorLog(BaseModel):
    driveId: str
    rollNo: str
    strikes: int = 0
    violations: List[ProctorViolation] = []
    status: str = "active"  # active, warned, disqualified


# ─── CSV Upload ──────────────────────────────────────────────────────────────

class CSVUploadResponse(BaseModel):
    totalRows: int
    successCount: int
    failedCount: int
    errors: List[str] = []
