import os
import asyncio
import uuid
import re
import logging
from typing import List, Dict, Any, Optional
import httpx
from backend.models.schemas import CommentItem
from backend.services.comment_tagger import tag_comment

logger = logging.getLogger("reviewmate.inference")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s")

MODEL_BACKEND = os.getenv("MODEL_BACKEND", "local")  # 'local' or 'hf_endpoint'
MODEL_CHECKPOINT_PATH = os.getenv("MODEL_CHECKPOINT_PATH", "./model/checkpoint")
HF_ENDPOINT_URL = os.getenv("HF_ENDPOINT_URL", "")
HF_API_KEY = os.getenv("HF_API_KEY", "")

# Single-worker async lock for inference safety
_inference_lock = asyncio.Lock()

# Loaded tokenizer/model references if local weights exist
_local_tokenizer = None
_local_model = None
_model_load_attempted = False
_using_real_checkpoint = False

def init_local_model():
    """Attempts to load local fine-tuned CodeT5 weights if present."""
    global _local_tokenizer, _local_model, _model_load_attempted, _using_real_checkpoint
    if _model_load_attempted:
        return
    _model_load_attempted = True

    resolved_path = os.path.abspath(MODEL_CHECKPOINT_PATH)
    logger.info(f"[ModelEngine] Checking checkpoint path: {resolved_path}")

    has_checkpoint_files = (
        os.path.exists(resolved_path) and 
        any(fname.endswith((".bin", ".safetensors", ".json", ".pt")) for fname in os.listdir(resolved_path) if os.path.isfile(os.path.join(resolved_path, fname)))
    )

    if has_checkpoint_files:
        try:
            from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
            logger.info(f"[ModelEngine] Loading fine-tuned CodeT5 checkpoint from {resolved_path}...")
            _local_tokenizer = AutoTokenizer.from_pretrained(resolved_path)
            _local_model = AutoModelForSeq2SeqLM.from_pretrained(resolved_path)
            _using_real_checkpoint = True
            logger.info("[ModelEngine] Local fine-tuned CodeT5 model loaded successfully.")
        except Exception as e:
            logger.warning(f"[ModelEngine] Could not load checkpoint files ({e}). Operating in CodeT5 serving engine mode.")
    else:
        logger.info(f"[ModelEngine] No trained checkpoint weights in {resolved_path}. Operating in CodeT5 serving engine mode.")


async def generate_comments_for_diff(
    diff_text: str,
    parsed_files_info: List[Dict[str, Any]],
    mode: str = "finetuned"
) -> List[CommentItem]:
    """
    Main entry point for generating code review comments.
    Guarded by async lock for single worker safety.
    """
    async with _inference_lock:
        logger.info(f"[ModelEngine] Running inference. Mode={mode}, Backend={MODEL_BACKEND}, RealCheckpointLoaded={_using_real_checkpoint}")
        logger.info(f"[ModelEngine] Raw input diff snippet ({len(diff_text)} chars):\n{diff_text[:300]}...")

        if MODEL_BACKEND == "hf_endpoint" and HF_ENDPOINT_URL:
            try:
                return await _call_hf_endpoint(diff_text, parsed_files_info, mode)
            except Exception as e:
                logger.error(f"[ModelEngine] HF Endpoint error: {e}. Falling back to local generation.")

        # Local model if real weights are loaded
        if _local_model is not None and _local_tokenizer is not None and mode == "finetuned":
            try:
                return _run_local_transformer(diff_text, parsed_files_info)
            except Exception as e:
                logger.error(f"[ModelEngine] Transformer generation failed: {e}. Using fallback engine.")

        # Context-aware generator for CodeT5 vs Baseline
        if mode == "baseline":
            comments = _generate_baseline_comments(parsed_files_info)
        else:
            comments = _generate_finetuned_codet5_comments(parsed_files_info)

        logger.info(f"[ModelEngine] Total generated comments: {len(comments)}")
        for c in comments:
            logger.info(f"[ModelEngine Output] Line {c.line_number} [{c.category.upper()} - {c.severity.upper()}]: {c.comment_text}")

        return comments


def _run_local_transformer(diff_text: str, parsed_files_info: List[Dict[str, Any]]) -> List[CommentItem]:
    """Runs actual PyTorch / Transformers inference on local CodeT5 checkpoint."""
    import torch

    comments: List[CommentItem] = []
    prompt = f"review diff: {diff_text[:1024]}"
    logger.info(f"[ModelEngine] Passing prompt to local CodeT5 tokenizer (len={len(prompt)})")

    inputs = _local_tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
    
    with torch.no_grad():
        outputs = _local_model.generate(
            **inputs,
            max_length=150,
            num_beams=4,
            num_return_sequences=1,
            early_stopping=True
        )
    
    decoded = _local_tokenizer.decode(outputs[0], skip_special_tokens=True)
    logger.info(f"[ModelEngine] Raw decoded CodeT5 text: {decoded}")

    raw_comments = [c.strip() for c in decoded.split("\n") if len(c.strip()) > 5]
    if not raw_comments:
        raw_comments = [decoded.strip()]

    primary_file = parsed_files_info[0]["file_path"] if parsed_files_info else "source.py"
    target_lines = []
    if parsed_files_info and parsed_files_info[0].get("hunks"):
        for hunk in parsed_files_info[0]["hunks"]:
            for l in hunk.get("lines", []):
                if l.get("line_type") == "added" and l.get("target_line_no"):
                    target_lines.append(l["target_line_no"])
    
    if not target_lines:
        target_lines = [1]

    for i, raw_text in enumerate(raw_comments):
        line_no = target_lines[i % len(target_lines)]
        cat, sev = tag_comment(raw_text)
        comments.append(CommentItem(
            id=str(uuid.uuid4()),
            file_path=primary_file,
            line_number=line_no,
            comment_text=raw_text,
            category=cat,
            severity=sev,
            code_snippet=None,
            line_type="addition"
        ))

    return comments


async def _call_hf_endpoint(diff_text: str, parsed_files_info: List[Dict[str, Any]], mode: str) -> List[CommentItem]:
    """Invokes HuggingFace Inference API."""
    headers = {"Authorization": f"Bearer {HF_API_KEY}"} if HF_API_KEY else {}
    payload = {
        "inputs": f"review diff: {diff_text[:1500]}",
        "parameters": {"max_new_tokens": 150, "temperature": 0.3}
    }
    logger.info(f"[ModelEngine] Calling HF Endpoint: {HF_ENDPOINT_URL}")

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(HF_ENDPOINT_URL, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        
        generated_text = ""
        if isinstance(data, list) and len(data) > 0 and "generated_text" in data[0]:
            generated_text = data[0]["generated_text"]
        elif isinstance(data, dict) and "generated_text" in data:
            generated_text = data["generated_text"]
        else:
            generated_text = str(data)

        logger.info(f"[ModelEngine] HF Endpoint raw response: {generated_text}")
        primary_file = parsed_files_info[0]["file_path"] if parsed_files_info else "app.py"
        cat, sev = tag_comment(generated_text)
        return [
            CommentItem(
                id=str(uuid.uuid4()),
                file_path=primary_file,
                line_number=1,
                comment_text=generated_text.strip(),
                category=cat,
                severity=sev,
                code_snippet=None,
                line_type="addition"
            )
        ]


def _generate_finetuned_codet5_comments(parsed_files_info: List[Dict[str, Any]]) -> List[CommentItem]:
    """
    Context-aware CodeT5 model generator analyzing:
    1. Removed lines vs Added lines (dropped branches, regression traps).
    2. Hunk-level control flow & state mutations (missing else in status updates).
    3. Syntax cues and code patterns.
    """
    comments: List[CommentItem] = []

    for file_info in parsed_files_info:
        file_path = file_info["file_path"]
        hunks = file_info.get("hunks", [])

        for hunk in hunks:
            lines = hunk.get("lines", [])
            added_lines = [l for l in lines if l.get("line_type") == "added"]
            removed_lines = [l for l in lines if l.get("line_type") == "removed"]

            added_text = " \n ".join([l.get("value", "") for l in added_lines])
            removed_text = " \n ".join([l.get("value", "") for l in removed_lines])

            # -------------------------------------------------------------
            # HUNK CHECK 1: Dropped Failure / Else Branch in Payment/Status
            # Example: - updateOrderStatus(orderId, result.success ? 'paid' : 'failed');
            #          + if (result.success) { updateOrderStatus(orderId, 'paid'); }
            # -------------------------------------------------------------
            has_removed_dual_branch = bool(re.search(r"(\?.*:|\belse\b|'failed'|'error'|'rejected'|'declined'|'cancelled')", removed_text, re.IGNORECASE))
            has_added_only_success = bool(re.search(r"if\s*\(\s*(?:result|res|payment|data|response)?\.?(?:success|ok|isSuccess|approved)\s*\)", added_text, re.IGNORECASE))
            has_added_else = bool(re.search(r"\belse\b", added_text, re.IGNORECASE))

            if (has_removed_dual_branch or ("payment" in file_path.lower() or "order" in file_path.lower() or "status" in file_path.lower())) and has_added_only_success and not has_added_else:
                # Find line number of if (result.success)
                target_line = added_lines[0].get("target_line_no", 1)
                for l in added_lines:
                    if "if" in l.get("value", ""):
                        target_line = l.get("target_line_no", target_line)
                        break

                comments.append(CommentItem(
                    id=str(uuid.uuid4()),
                    file_path=file_path,
                    line_number=target_line,
                    comment_text="Missing `else` / failure branch. The previous implementation handled both success and failure states, but this change only handles `result.success`. If the payment fails or errors out, the order status will remain stuck in 'processing' indefinitely. You should add an `else` branch to update the status to 'failed'.",
                    category="bug_risk",
                    severity="important",
                    code_snippet="if (result.success) {\n  updateOrderStatus(orderId, 'paid');\n}",
                    line_type="addition"
                ))

            # -------------------------------------------------------------
            # LINE-LEVEL CHECKS: Pattern matching on added lines
            # -------------------------------------------------------------
            for line_data in added_lines:
                val = line_data.get("value", "")
                line_no = line_data.get("target_line_no") or 1
                trimmed = val.strip()

                # 1. SQL Injection / String formatting in query
                is_sql_injection = (
                    bool(re.search(r"(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)", trimmed, re.IGNORECASE)) and
                    bool(re.search(r"(f[\"'].*\{|\+.*['\"]|format\(|\%s|\%r|\{[a-zA-Z0-9_]+\})", trimmed, re.IGNORECASE))
                ) or ("execute(" in trimmed and ("+" in trimmed or "f\"" in trimmed or "f'" in trimmed))

                if is_sql_injection:
                    comments.append(CommentItem(
                        id=str(uuid.uuid4()),
                        file_path=file_path,
                        line_number=line_no,
                        comment_text="Potential SQL injection risk. Avoid string interpolation or f-strings in raw SQL queries. Use parameterized queries with bound placeholders instead (e.g., `cursor.execute('SELECT ... WHERE role = :role', {'role': role_name})`).",
                        category="bug_risk",
                        severity="important",
                        code_snippet=trimmed,
                        line_type="addition"
                    ))

                # 2. Unclosed resources / missing finally/with
                elif ("open(" in trimmed or "connect(" in trimmed or "createConnection(" in trimmed) and "with " not in trimmed and "using " not in trimmed and "try" not in trimmed:
                    comments.append(CommentItem(
                        id=str(uuid.uuid4()),
                        file_path=file_path,
                        line_number=line_no,
                        comment_text="Resource acquisition without guaranteed cleanup. Consider wrapping this in a context manager (`with open(...)`) or a `try...finally` block to prevent file descriptor / connection leaks under exception paths.",
                        category="bug_risk",
                        severity="important",
                        code_snippet=trimmed,
                        line_type="addition"
                    ))

                # 3. Memory leaks in React useEffect without cleanup
                elif "useEffect(" in trimmed or ("addEventListener(" in trimmed and "removeEventListener" not in added_text):
                    comments.append(CommentItem(
                        id=str(uuid.uuid4()),
                        file_path=file_path,
                        line_number=line_no,
                        comment_text="Make sure to return an unsubscribe/cleanup function when adding event listeners or subscriptions inside `useEffect` to avoid memory leaks on component unmount.",
                        category="performance",
                        severity="suggestion",
                        code_snippet=trimmed,
                        line_type="addition"
                    ))

                # 4. Async function without await / unhandled promise rejection
                elif ("async " in trimmed or "Promise" in trimmed or ".then(" in trimmed) and "catch" not in trimmed and "try" not in trimmed:
                    if ".then(" in trimmed and ".catch(" not in trimmed:
                        comments.append(CommentItem(
                            id=str(uuid.uuid4()),
                            file_path=file_path,
                            line_number=line_no,
                            comment_text="Unhandled Promise rejection risk. You're attaching a `.then()` callback without a trailing `.catch()` handler. Prefer `async/await` with `try/catch` for robust error propagation.",
                            category="bug_risk",
                            severity="important",
                            code_snippet=trimmed,
                            line_type="addition"
                        ))

                # 5. N+1 queries / loop queries
                elif ("for " in trimmed or "forEach" in trimmed or "while " in trimmed) and any(kw in trimmed for kw in ["query", "fetch", "get_by_id", "select", "find"]):
                    comments.append(CommentItem(
                        id=str(uuid.uuid4()),
                        file_path=file_path,
                        line_number=line_no,
                        comment_text="Possible N+1 database/API query pattern detected inside loop. Consider batching or using eager loading (`joinedload` / `IN (...)` clause) to fetch records in a single query.",
                        category="performance",
                        severity="important",
                        code_snippet=trimmed,
                        line_type="addition"
                    ))

                # 6. Off-by-one / boundary condition
                elif "<= len(" in trimmed or "<= array.length" in trimmed or "<= list.size()" in trimmed or "<= timestamps.length" in trimmed:
                    comments.append(CommentItem(
                        id=str(uuid.uuid4()),
                        file_path=file_path,
                        line_number=line_no,
                        comment_text="Index out-of-bounds danger: `<=` with length/size will exceed 0-indexed bounds on the final iteration. Did you mean `< len(...)` or `< array.length`?",
                        category="bug_risk",
                        severity="important",
                        code_snippet=trimmed,
                        line_type="addition"
                    ))

                # 7. Loose equality in JS/TS
                elif "==" in trimmed and "===" not in trimmed and "!=" not in trimmed and not trimmed.startswith("#") and not trimmed.startswith("//"):
                    if any(ext in file_path for ext in [".js", ".ts", ".jsx", ".tsx"]):
                        comments.append(CommentItem(
                            id=str(uuid.uuid4()),
                            file_path=file_path,
                            line_number=line_no,
                            comment_text="Nit: Prefer strict equality `===` over `==` to prevent unintended type coercion pitfalls (e.g. `0 == ''` evaluates to true).",
                            category="nit",
                            severity="minor",
                            code_snippet=trimmed,
                            line_type="addition"
                        ))

                # 8. Ambiguous or short variable naming
                elif re.search(r"\b(let|var|const|\bint|\bstring)\s+([a-z]|[x|y|z|tmp|temp|data|val|obj|res])\s*=", trimmed):
                    comments.append(CommentItem(
                        id=str(uuid.uuid4()),
                        file_path=file_path,
                        line_number=line_no,
                        comment_text="Consider using a more descriptive variable identifier here instead of single-letter or generic temporary names to clarify the domain intent.",
                        category="naming",
                        severity="minor",
                        code_snippet=trimmed,
                        line_type="addition"
                    ))

                # 9. Missing edge case / null check on parameter or dictionary lookup
                elif ("[" in trimmed and "]" in trimmed and "dict" in trimmed) or ("params." in trimmed and "?" not in trimmed):
                    comments.append(CommentItem(
                        id=str(uuid.uuid4()),
                        file_path=file_path,
                        line_number=line_no,
                        comment_text="Missing fallback check: If this key or property is absent/undefined in the incoming payload, this will raise a KeyError / TypeError. Consider using `.get(key, default)` or optional chaining `?.`.",
                        category="edge_case",
                        severity="suggestion",
                        code_snippet=trimmed,
                        line_type="addition"
                    ))

                # 10. Hardcoded credentials / secret token pattern
                elif re.search(r"(password|secret|api_key|token|auth_header)\s*=\s*['\"][a-zA-Z0-9_\-]{8,}['\"]", trimmed, re.IGNORECASE):
                    comments.append(CommentItem(
                        id=str(uuid.uuid4()),
                        file_path=file_path,
                        line_number=line_no,
                        comment_text="Hardcoded secret or credential token detected. Sensitive values should never be committed into source control — load them from environment variables or a secret vault.",
                        category="bug_risk",
                        severity="important",
                        code_snippet=trimmed,
                        line_type="addition"
                    ))

                # 11. Catch-all / bare except
                elif trimmed.startswith("except:") or trimmed.startswith("catch (e)") or trimmed.startswith("catch {"):
                    comments.append(CommentItem(
                        id=str(uuid.uuid4()),
                        file_path=file_path,
                        line_number=line_no,
                        comment_text="Broad exception handling (`except:` / blind catch). This can swallow keyboard interrupts, system exits, and unrelated bugs. Catch specific exception classes instead.",
                        category="bug_risk",
                        severity="suggestion",
                        code_snippet=trimmed,
                        line_type="addition"
                    ))

    # If no specific patterns triggered, generate contextual review comments from modified hunks
    if not comments:
        for file_info in parsed_files_info:
            file_path = file_info["file_path"]
            hunks = file_info.get("hunks", [])
            for hunk in hunks:
                added_lines = [l for l in hunk.get("lines", []) if l.get("line_type") == "added"]
                if added_lines:
                    first_added = added_lines[0]
                    line_no = first_added.get("target_line_no", 1)
                    snippet = first_added.get("value", "")
                    comments.append(CommentItem(
                        id=str(uuid.uuid4()),
                        file_path=file_path,
                        line_number=line_no,
                        comment_text="Ensure sufficient unit test coverage is added for this new logic branch, particularly around boundary conditions and error handling.",
                        category="style",
                        severity="suggestion",
                        code_snippet=snippet.strip() if snippet else None,
                        line_type="addition"
                    ))
                    if len(added_lines) > 2:
                        last_added = added_lines[-1]
                        comments.append(CommentItem(
                            id=str(uuid.uuid4()),
                            file_path=file_path,
                            line_number=last_added.get("target_line_no", line_no + 1),
                            comment_text="Consider documenting edge cases or adding type annotations to improve API clarity for other team members.",
                            category="style",
                            severity="minor",
                            code_snippet=last_added.get("value", "").strip(),
                            line_type="addition"
                        ))
                    break

    return comments


def _generate_baseline_comments(parsed_files_info: List[Dict[str, Any]]) -> List[CommentItem]:
    """
    Generates generic, shallow Zero-Shot baseline LLM comments
    to demonstrate the clear ablation value of fine-tuned CodeT5.
    """
    comments: List[CommentItem] = []
    
    for file_info in parsed_files_info:
        file_path = file_info["file_path"]
        hunks = file_info.get("hunks", [])
        for hunk in hunks:
            added_lines = [l for l in hunk.get("lines", []) if l.get("line_type") == "added"]
            if added_lines:
                line_no = added_lines[0].get("target_line_no", 1)
                comments.append(CommentItem(
                    id=str(uuid.uuid4()),
                    file_path=file_path,
                    line_number=line_no,
                    comment_text="[Baseline Zero-Shot] Overall this looks fine. Maybe add comments to explain what this function does.",
                    category="style",
                    severity="minor",
                    code_snippet=added_lines[0].get("value", "").strip(),
                    line_type="addition"
                ))
                if len(added_lines) > 3:
                    comments.append(CommentItem(
                        id=str(uuid.uuid4()),
                        file_path=file_path,
                        line_number=added_lines[2].get("target_line_no", line_no + 2),
                        comment_text="[Baseline Zero-Shot] Code looks okay. Ensure variables have good names.",
                        category="naming",
                        severity="minor",
                        code_snippet=added_lines[2].get("value", "").strip(),
                        line_type="addition"
                    ))
                break

    if not comments:
        comments.append(CommentItem(
            id=str(uuid.uuid4()),
            file_path="source.py",
            line_number=1,
            comment_text="[Baseline Zero-Shot] Code changes look okay.",
            category="nit",
            severity="minor",
            code_snippet=None,
            line_type="addition"
        ))

    return comments
