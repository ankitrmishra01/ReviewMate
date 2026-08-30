import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.diff_parser import parse_diff_summary, DiffTooLargeError, InvalidDiffError
from backend.services.comment_tagger import tag_comment
from backend.services.github_fetch import parse_github_pr_url
from backend.sample_diffs import SAMPLE_DIFFS

client = TestClient(app)

def test_health_and_root():
    res = client.get("/")
    assert res.status_code == 200
    assert "ReviewMate API" in res.json()["app"]

    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}

def test_samples_endpoint():
    res = client.get("/api/samples")
    assert res.status_code == 200
    samples = res.json()
    assert len(samples) >= 3
    assert any(s["id"] == "payment-missing-else" for s in samples)
    assert any(s["id"] == "sql-injection-vuln" for s in samples)

def test_diff_parser_valid():
    sql_sample = next(s for s in SAMPLE_DIFFS if s.id == "sql-injection-vuln")
    summary, files = parse_diff_summary(sql_sample.diff_text)
    assert summary.files_changed == 1
    assert summary.additions > 0
    assert "services/user_service.py" in summary.files

def test_diff_parser_too_large():
    huge_diff = "\n".join(["+ line " + str(i) for i in range(600)])
    with pytest.raises(DiffTooLargeError):
        parse_diff_summary(huge_diff)

def test_diff_parser_empty():
    with pytest.raises(InvalidDiffError):
        parse_diff_summary("   ")

def test_comment_tagger_heuristics():
    cat, sev = tag_comment("Potential SQL injection vulnerability. Never concatenate user input into queries.")
    assert cat == "bug_risk"
    assert sev == "important"

    cat, sev = tag_comment("This for loop causes an N+1 query performance slowdown.")
    assert cat == "performance"
    assert sev in ["important", "suggestion"]

    cat, sev = tag_comment("Rename variable x to user_record for better clarity.")
    assert cat == "naming"
    assert sev in ["minor", "suggestion"]

    cat, sev = tag_comment("Nit: please add spacing between functions.")
    assert cat == "nit"
    assert sev == "minor"

    cat, sev = tag_comment("Missing check for empty array boundary condition.")
    assert cat == "edge_case"

def test_github_pr_url_parser():
    owner, repo, pr_num = parse_github_pr_url("https://github.com/facebook/react/pull/28000")
    assert owner == "facebook"
    assert repo == "react"
    assert pr_num == 28000

def test_create_review_and_history():
    payment_sample = next(s for s in SAMPLE_DIFFS if s.id == "payment-missing-else")
    session_id = "test-session-payment-123"

    # POST /api/review
    res = client.post("/api/review", json={
        "diff_text": payment_sample.diff_text,
        "session_id": session_id
    })
    assert res.status_code == 200
    data = res.json()
    assert data["session_id"] == session_id
    assert len(data["comments"]) > 0
    assert data["diff_summary"]["files_changed"] >= 1
    # Check that payment missing else is tagged as bug_risk & important
    assert data["comments"][0]["category"] == "bug_risk"
    assert data["comments"][0]["severity"] == "important"
    review_id = data["id"]

    # GET /api/history
    res_hist = client.get(f"/api/history?session_id={session_id}")
    assert res_hist.status_code == 200
    hist = res_hist.json()
    assert len(hist) >= 1
    assert hist[0]["id"] == review_id

    # GET /api/history/{review_id}
    res_single = client.get(f"/api/history/{review_id}")
    assert res_single.status_code == 200
    single_data = res_single.json()
    assert single_data["id"] == review_id
    assert len(single_data["comments"]) == len(data["comments"])

def test_compare_endpoint():
    sql_sample = next(s for s in SAMPLE_DIFFS if s.id == "sql-injection-vuln")
    res = client.post("/api/compare", json={"diff_text": sql_sample.diff_text})
    assert res.status_code == 200
    data = res.json()
    assert "baseline_comments" in data
    assert "finetuned_comments" in data
    assert len(data["baseline_comments"]) > 0
    assert len(data["finetuned_comments"]) > 0
