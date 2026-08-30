import re
from typing import List, Dict, Any, Tuple
from unidiff import PatchSet, PatchedFile
from backend.models.schemas import DiffSummary

MAX_DIFF_LINES = 500

class DiffTooLargeError(Exception):
    pass

class InvalidDiffError(Exception):
    pass

def count_diff_lines(raw_diff: str) -> int:
    """Counts total lines in the raw diff string."""
    if not raw_diff:
        return 0
    return len(raw_diff.strip().splitlines())

def parse_diff_summary(raw_diff: str) -> Tuple[DiffSummary, List[Dict[str, Any]]]:
    """
    Parses a unified diff string, checks size constraints,
    and extracts summary stats along with hunk/line mapping.
    """
    if not raw_diff or not raw_diff.strip():
        raise InvalidDiffError("Diff text cannot be empty.")

    lines = raw_diff.strip().splitlines()
    total_lines = len(lines)
    if total_lines > MAX_DIFF_LINES:
        raise DiffTooLargeError(
            f"Diff too large: contains {total_lines} lines (maximum allowed is {MAX_DIFF_LINES}). "
            "Please provide a smaller diff or single-file changeset."
        )

    parsed_files_info: List[Dict[str, Any]] = []
    files_changed_set = set()
    total_additions = 0
    total_deletions = 0

    try:
        patch_set = PatchSet(raw_diff)
        for patched_file in patch_set:
            file_path = patched_file.target_file or patched_file.source_file or "unknown"
            if file_path.startswith("b/") or file_path.startswith("a/"):
                file_path = file_path[2:]
            
            # Skip dev/null or binary marker
            if file_path == "/dev/null" and patched_file.source_file:
                file_path = patched_file.source_file
                if file_path.startswith("a/"):
                    file_path = file_path[2:]

            files_changed_set.add(file_path)
            file_additions = patched_file.added
            file_deletions = patched_file.removed
            total_additions += file_additions
            total_deletions += file_deletions

            hunks_info = []
            for hunk in patched_file:
                hunk_lines = []
                for line in hunk:
                    hunk_lines.append({
                        "line_type": "added" if line.is_added else ("removed" if line.is_removed else "context"),
                        "source_line_no": line.source_line_no,
                        "target_line_no": line.target_line_no,
                        "value": line.value.rstrip("\r\n")
                    })
                hunks_info.append({
                    "section_header": hunk.section_header,
                    "source_start": hunk.source_start,
                    "source_length": hunk.source_length,
                    "target_start": hunk.target_start,
                    "target_length": hunk.target_length,
                    "lines": hunk_lines
                })

            parsed_files_info.append({
                "file_path": file_path,
                "additions": file_additions,
                "deletions": file_deletions,
                "is_binary": patched_file.is_binary_file,
                "hunks": hunks_info
            })

    except Exception:
        # Resilient fallback regex parser if patch_set format has git deviations
        parsed_files_info = _fallback_diff_parser(lines)
        for f in parsed_files_info:
            files_changed_set.add(f["file_path"])
            total_additions += f["additions"]
            total_deletions += f["deletions"]

    # If no files were detected (e.g. naked snippet), synthesize standard single-file wrapper
    if not parsed_files_info:
        parsed_files_info = _synthesize_from_lines(lines)
        for f in parsed_files_info:
            files_changed_set.add(f["file_path"])
            total_additions += f["additions"]
            total_deletions += f["deletions"]

    summary = DiffSummary(
        files_changed=len(files_changed_set),
        additions=total_additions,
        deletions=total_deletions,
        files=list(files_changed_set)
    )

    return summary, parsed_files_info


def _fallback_diff_parser(lines: List[str]) -> List[Dict[str, Any]]:
    files = []
    current_file = None
    current_hunks = []
    current_hunk = None
    file_path = "changes.py"
    target_line = 1

    for line in lines:
        if line.startswith("diff --git") or line.startswith("--- ") or line.startswith("+++ "):
            if line.startswith("+++ ") and not line.startswith("+++ /dev/null"):
                cleaned = line[4:].strip()
                if cleaned.startswith("b/"):
                    cleaned = cleaned[2:]
                file_path = cleaned
            elif line.startswith("diff --git"):
                parts = line.split(" ")
                if len(parts) >= 4 and parts[3].startswith("b/"):
                    file_path = parts[3][2:]
                elif len(parts) >= 3 and parts[2].startswith("a/"):
                    file_path = parts[2][2:]

            if current_file and current_file["file_path"] != file_path:
                if current_hunk:
                    current_hunks.append(current_hunk)
                    current_hunk = None
                current_file["hunks"] = current_hunks
                files.append(current_file)
                current_file = None
                current_hunks = []

            if not current_file:
                current_file = {
                    "file_path": file_path,
                    "additions": 0,
                    "deletions": 0,
                    "is_binary": False,
                    "hunks": []
                }
            continue

        if line.startswith("@@"):
            if current_hunk:
                current_hunks.append(current_hunk)
            # Parse @@ -1,5 +1,6 @@
            m = re.search(r"\+(\d+)(?:,(\d+))?", line)
            if m:
                target_line = int(m.group(1))
            else:
                target_line = 1
            current_hunk = {
                "section_header": line,
                "target_start": target_line,
                "lines": []
            }
            continue

        if current_file is None:
            current_file = {
                "file_path": file_path,
                "additions": 0,
                "deletions": 0,
                "is_binary": False,
                "hunks": []
            }
        if current_hunk is None:
            current_hunk = {
                "section_header": "@@",
                "target_start": 1,
                "lines": []
            }

        if line.startswith("+"):
            current_file["additions"] += 1
            current_hunk["lines"].append({
                "line_type": "added",
                "target_line_no": target_line,
                "value": line[1:]
            })
            target_line += 1
        elif line.startswith("-"):
            current_file["deletions"] += 1
            current_hunk["lines"].append({
                "line_type": "removed",
                "target_line_no": target_line,
                "value": line[1:]
            })
        else:
            val = line[1:] if line.startswith(" ") else line
            current_hunk["lines"].append({
                "line_type": "context",
                "target_line_no": target_line,
                "value": val
            })
            target_line += 1

    if current_hunk:
        current_hunks.append(current_hunk)
    if current_file:
        current_file["hunks"] = current_hunks
        files.append(current_file)

    return files


def _synthesize_from_lines(lines: List[str]) -> List[Dict[str, Any]]:
    additions = sum(1 for l in lines if l.startswith("+") and not l.startswith("+++"))
    deletions = sum(1 for l in lines if l.startswith("-") and not l.startswith("---"))
    
    hunk_lines = []
    line_num = 1
    for l in lines:
        if l.startswith("+"):
            hunk_lines.append({"line_type": "added", "target_line_no": line_num, "value": l[1:]})
            line_num += 1
        elif l.startswith("-"):
            hunk_lines.append({"line_type": "removed", "target_line_no": line_num, "value": l[1:]})
        else:
            val = l[1:] if l.startswith(" ") else l
            hunk_lines.append({"line_type": "context", "target_line_no": line_num, "value": val})
            line_num += 1

    return [{
        "file_path": "review_target.ts",
        "additions": additions if additions > 0 else len(lines),
        "deletions": deletions,
        "is_binary": False,
        "hunks": [{
            "section_header": "@@ -1,1 +1,1 @@",
            "target_start": 1,
            "lines": hunk_lines
        }]
    }]
