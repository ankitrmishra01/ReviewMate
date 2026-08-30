import re
from typing import Tuple
from backend.models.schemas import CommentCategory, CommentSeverity

CATEGORY_KEYWORDS = {
    "bug_risk": [
        "bug", "null", "undefined", "none", "nullpointer", "segfault", "leak", "race condition",
        "deadlock", "crash", "unhandled", "exception", "error", "fail", "vulnerability", "overflow",
        "underflow", "out of bounds", "infinite loop", "break", "corrupt", "thread-safety",
        "sql injection", "xss", "csrf", "bypass", "unauthorized", "unreachable", "off-by-one",
        "resource leak", "close()", "dispose", "unclosed", "dangling"
    ],
    "performance": [
        "performance", "slow", "complexity", "o(n^2)", "o(n)", "n+1", "memory", "cache",
        "caching", "heavy", "inefficient", "debounce", "throttle", "batch", "overhead",
        "async", "await", "parallel", "concurrency", "blocking", "lazy", "eager", "load",
        "optimize", "allocat", "render", "re-render", "memo", "usememo", "usecallback"
    ],
    "edge_case": [
        "edge case", "boundary", "empty", "zero", "negative", "max", "min", "missing check",
        "default", "fallback", "timeout", "exhaust", "corner case", "special case", "empty array",
        "empty string", "null check", "falsy", "validation", "sanitize", "truncate"
    ],
    "naming": [
        "naming", "rename", "variable name", "function name", "clarity", "misleading",
        "typo", "spelling", "convention", "camelcase", "snake_case", "pascalcase",
        "identifier", "ambiguous", "abbreviation", "meaningful", "descriptive"
    ],
    "style": [
        "style", "formatting", "indentation", "spacing", "lint", "clean", "readability",
        "redundant", "structure", "refactor", "import", "unused", "dead code", "comment",
        "docstring", "type hint", "types", "consistency", "idiomatic", "simpler"
    ],
    "nit": [
        "nit:", "nitpick", "minor:", "optional:", "small tweak", "cosmetic", "consider",
        "preference", "feel free to ignore", "super minor"
    ]
}

SEVERITY_KEYWORDS = {
    "important": [
        "critical", "fatal", "vulnerability", "security", "bug", "crash", "leak",
        "sql injection", "deadlock", "race condition", "data loss", "corrupt",
        "must fix", "severe", "blocking", "broken", "unhandled exception"
    ],
    "suggestion": [
        "should", "recommend", "consider", "optimize", "improve", "edge case",
        "performance", "refactor", "cleaner", "better", "potential", "inefficient",
        "missing check", "fallback"
    ],
    "minor": [
        "nit", "style", "formatting", "typo", "spelling", "naming", "spacing",
        "indentation", "optional", "cosmetic", "comment", "docstring"
    ]
}

def tag_comment(comment_text: str, default_category: CommentCategory = "bug_risk") -> Tuple[CommentCategory, CommentSeverity]:
    """
    Analyzes raw generated review comment text and assigns:
    1. Category: style | bug_risk | naming | performance | edge_case | nit
    2. Severity: minor | suggestion | important
    """
    text_lower = comment_text.lower()

    # Direct prefixes check (e.g. "[Style]", "[Bug Risk]", "Nit:", "Performance:")
    if text_lower.startswith("nit:") or text_lower.startswith("[nit]"):
        return "nit", "minor"
    if text_lower.startswith("[style]") or text_lower.startswith("style:"):
        return "style", "minor"
    if text_lower.startswith("[bug]") or text_lower.startswith("[bug risk]") or text_lower.startswith("bug:"):
        return "bug_risk", "important"
    if text_lower.startswith("[performance]") or text_lower.startswith("performance:"):
        return "performance", "suggestion"
    if text_lower.startswith("[edge case]") or text_lower.startswith("edge case:"):
        return "edge_case", "suggestion"
    if text_lower.startswith("[naming]") or text_lower.startswith("naming:"):
        return "naming", "minor"

    # Category keyword matching score
    cat_scores = {cat: 0 for cat in CATEGORY_KEYWORDS}
    for cat, kw_list in CATEGORY_KEYWORDS.items():
        for kw in kw_list:
            if kw in text_lower:
                # Give higher weight to exact word matches
                matches = len(re.findall(r"\b" + re.escape(kw) + r"\b", text_lower))
                cat_scores[cat] += matches * (2 if cat in ["bug_risk", "performance", "edge_case"] else 1)
                if matches == 0 and kw in text_lower:
                    cat_scores[cat] += 1

    best_category: CommentCategory = default_category
    best_cat_score = 0
    # Prefer non-default if score is tied or higher
    for cat, score in cat_scores.items():
        if score > best_cat_score:
            best_cat_score = score
            best_category = cat  # type: ignore

    if best_cat_score == 0:
        # Fallback heuristic based on generic heuristics
        if any(w in text_lower for w in ["format", "spacing", "line", "import"]):
            best_category = "style"
        elif any(w in text_lower for w in ["name", "rename"]):
            best_category = "naming"
        elif any(w in text_lower for w in ["speed", "slow", "time", "cache"]):
            best_category = "performance"
        else:
            best_category = "bug_risk"

    # Severity scoring
    sev_scores = {"important": 0, "suggestion": 0, "minor": 0}
    for sev, kw_list in SEVERITY_KEYWORDS.items():
        for kw in kw_list:
            if kw in text_lower:
                sev_scores[sev] += 1

    if best_category in ["bug_risk"] or sev_scores["important"] > 0:
        if sev_scores["important"] >= 1 or best_category == "bug_risk":
            severity: CommentSeverity = "important"
        else:
            severity = "suggestion"
    elif best_category in ["performance", "edge_case"]:
        if sev_scores["important"] > 0:
            severity = "important"
        else:
            severity = "suggestion"
    else:  # style, naming, nit
        if sev_scores["suggestion"] > 1:
            severity = "suggestion"
        else:
            severity = "minor"

    return best_category, severity
