from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field

CommentCategory = Literal["style", "bug_risk", "naming", "performance", "edge_case", "nit"]
CommentSeverity = Literal["minor", "suggestion", "important"]

class CommentItem(BaseModel):
    id: str
    file_path: str
    line_number: int
    comment_text: str
    category: CommentCategory
    severity: CommentSeverity
    code_snippet: Optional[str] = None
    line_type: Optional[str] = "addition"

class DiffSummary(BaseModel):
    files_changed: int = 0
    additions: int = 0
    deletions: int = 0
    files: List[str] = Field(default_factory=list)

class ReviewRequest(BaseModel):
    diff_text: Optional[str] = None
    github_pr_url: Optional[str] = None
    session_id: Optional[str] = None

class ReviewResponse(BaseModel):
    id: str
    session_id: str
    created_at: str
    diff_summary: DiffSummary
    comments: List[CommentItem]
    diff_text: str

class HistorySummaryItem(BaseModel):
    id: str
    session_id: str
    created_at: str
    diff_summary: DiffSummary
    comment_count: int
    primary_file: Optional[str] = None

class CompareRequest(BaseModel):
    diff_text: Optional[str] = None
    github_pr_url: Optional[str] = None
    session_id: Optional[str] = None

class CompareResponse(BaseModel):
    id: Optional[str] = None
    diff_summary: DiffSummary
    diff_text: str
    baseline_comments: List[CommentItem]
    finetuned_comments: List[CommentItem]

class SampleDiffItem(BaseModel):
    id: str
    title: str
    category: str
    language: str
    description: str
    diff_text: str
