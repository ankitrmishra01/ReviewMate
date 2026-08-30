import re
import httpx
from typing import Tuple

class GitHubFetchError(Exception):
    pass

def parse_github_pr_url(url: str) -> Tuple[str, str, int]:
    """
    Extracts owner, repo, and pull_number from a GitHub PR URL.
    Example: https://github.com/facebook/react/pull/28000
    """
    cleaned = url.strip()
    pattern = r"github\.com/([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+)/pull/(\d+)"
    match = re.search(pattern, cleaned)
    if not match:
        raise GitHubFetchError(
            f"Invalid GitHub PR URL: '{url}'. Expected format: https://github.com/owner/repo/pull/123"
        )
    owner = match.group(1)
    repo = match.group(2)
    pull_number = int(match.group(3))
    return owner, repo, pull_number

async def fetch_github_pr_diff(pr_url: str) -> str:
    """
    Fetches raw unified diff for a public GitHub PR without requiring tokens.
    Tries GitHub's direct .diff endpoint, patch-diff raw proxy, and GitHub REST API.
    """
    owner, repo, pull_number = parse_github_pr_url(pr_url)

    urls_to_try = [
        f"https://patch-diff.githubusercontent.com/raw/{owner}/{repo}/pull/{pull_number}.diff",
        f"https://github.com/{owner}/{repo}/pull/{pull_number}.diff",
        f"https://api.github.com/repos/{owner}/{repo}/pulls/{pull_number}"
    ]

    headers = {
        "User-Agent": "ReviewMate-Bot/1.0",
        "Accept": "application/vnd.github.v3.diff"
    }

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        last_error = None
        for endpoint in urls_to_try:
            try:
                response = await client.get(endpoint, headers=headers)
                if response.status_code == 200 and response.text.strip():
                    diff_content = response.text
                    if diff_content.startswith("diff --git") or diff_content.startswith("---") or "@@" in diff_content:
                        return diff_content
                    # If JSON response with diff headers or text
                    return diff_content
                elif response.status_code == 404:
                    last_error = f"PR not found or repository '{owner}/{repo}' is private. Only public repositories are supported."
                elif response.status_code == 403:
                    last_error = "GitHub API rate limit exceeded or access forbidden."
                else:
                    last_error = f"GitHub returned status code {response.status_code}"
            except httpx.RequestError as exc:
                last_error = f"Network error contacting GitHub: {str(exc)}"

        raise GitHubFetchError(last_error or f"Could not fetch diff for {pr_url}")
