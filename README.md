# ReviewMate — AI-Powered Code Review Comment Generator

> Automatically generate human-style code review comments for any diff, powered by a CodeT5 model fine-tuned on real GitHub pull request reviews.

[![Live Demo](https://img.shields.io/badge/demo-live-6366F1)](#) [![Model](https://img.shields.io/badge/model-CodeT5--small-blue)](#) [![License: MIT](https://img.shields.io/badge/license-MIT-green)](#)

<img width="1721" height="885" alt="ReviewMate landing page" src="https://github.com/user-attachments/assets/5ed2295a-7bff-4bc3-a401-62582668f3c3" />

## What it does

Code review is slow because it needs an experienced human to read a diff and spot issues — bugs, bad naming, missing edge cases, style problems. ReviewMate automates the first pass: paste a code diff or a public GitHub PR URL, and it generates categorized, severity-tagged review comments, the same way a human reviewer would leave them.

Under the hood, it's not a generic prompt to a chatbot — it's a **CodeT5 model fine-tuned on the [CodeReviewer dataset](https://github.com/microsoft/CodeBERT/tree/master/CodeReviewer)** (Microsoft), which contains real diffs paired with real human review comments mined from open-source GitHub projects.

## Features

- 📋 Paste a raw unified diff, or a public GitHub PR URL — diffs are fetched live via the GitHub API
- 🏷️ Auto-categorized comments: Bug Risk, Performance, Naming, Style, Edge Case, Nit
- 🚦 Severity tagging: Minor / Suggestion / Important
- 🔍 Click-to-jump: comment cards link directly to the relevant diff line
- ⚖️ **Model Ablation Mode** — side-by-side comparison of the fine-tuned model vs. a zero-shot baseline, demonstrating the real impact of fine-tuning
- 📊 Model Stats panel showing BLEU / ROUGE-L evaluation scores from training
- 🕘 Review history, session-based (no login required)
- 📋 One-click "Copy for PR" — export all comments as Markdown, ready to paste into a real GitHub review

## Screenshots

**Review screen — line-anchored, categorized comments**

CodeT5 correctly flags an unhandled Promise rejection and a `useEffect` cleanup/memory-leak risk, each tagged by category and severity and anchored to the exact diff line.

![Review screen with categorized comments](https://github.com/user-attachments/assets/f94e8243-6ea9-4edd-9eca-ebfee676676c)

**Model Ablation Mode — fine-tuned vs. zero-shot baseline**

Same diff, side by side. The fine-tuned model produces a specific, technically grounded comment; the untrained baseline produces generic, non-specific feedback — this is the core evidence that fine-tuning improved output quality.

![Model ablation comparison](https://github.com/user-attachments/assets/7d8c4a3f-16c5-4f26-b031-3aa12ff4a657)

## Tech Stack

**Frontend:** React (Vite) · TailwindCSS · Framer Motion
**Backend:** FastAPI (Python) · SQLAlchemy · `unidiff`
**Model:** CodeT5-small, fine-tuned with HuggingFace `transformers`
**Dataset:** [CodeReviewer](https://github.com/microsoft/CodeBERT/tree/master/CodeReviewer) (Microsoft) — real GitHub PR diffs + review comments
**Deployment:** Backend on Render · Frontend on Vercel

## Architecture

```
┌─────────────┐      diff / PR URL      ┌──────────────┐
│   React UI  │ ───────────────────────▶│   FastAPI    │
│  (Vercel)   │                          │   (Render)   │
└─────────────┘◀───────────────────────  └──────┬───────┘
   comments +                                    │
   categories                          diff parsing (unidiff)
                                                  │
                                                  ▼
                                     ┌────────────────────────┐
                                     │  Fine-tuned CodeT5      │
                                     │  (local or HF Endpoint) │
                                     └────────────────────────┘
```

## Model Training

The fine-tuning pipeline lives in [`training/`](./training) as a standalone notebook — it is **not** part of the running web app, since training is a one-time offline step.

- **Base model:** `Salesforce/codet5-small`
- **Dataset:** CodeReviewer (`msg` / comment-generation subtask), filtered to Python + JavaScript
- **Task framing:** sequence-to-sequence — input is a code diff hunk (with surrounding context), output is a natural-language review comment
- **Evaluation:** BLEU and ROUGE-L against held-out human-written comments, plus a zero-shot baseline comparison (see Model Ablation Mode in the app)

| Metric | Fine-Tuned CodeT5 | Zero-Shot Baseline |
|---|---|---|
| BLEU | _fill in after training_ | _fill in_ |
| ROUGE-L | _fill in after training_ | _fill in_ |

## Getting Started (local development)

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_URL=http://localhost:8000` in `frontend/.env.local` to point the UI at your local backend.

## Project Structure

```
review-mate/
├── backend/          # FastAPI app, diff parsing, model inference, comment tagging
├── frontend/          # React app
├── training/          # Fine-tuning notebook, dataset prep, evaluation
└── model/checkpoint/   # Fine-tuned model (not committed — hosted on HuggingFace Hub)
```

## Known Limitations

- Only supports public GitHub repositories (no authentication)
- Diffs capped at 500 lines
- Category and severity tagging use keyword-based heuristics, not a separate trained classifier
- Fine-tuned on a subset of CodeReviewer (Python + JavaScript) for training-time feasibility, not the full multi-language dataset

## Acknowledgments

- [CodeT5](https://github.com/salesforce/CodeT5) — Salesforce Research
- [CodeReviewer dataset](https://arxiv.org/abs/2203.09095) — Li et al., Microsoft
- Built as a DLNLP mini-project

## License

MIT
