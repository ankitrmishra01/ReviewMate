# ReviewMate — AI Code Review Comment Generator

ReviewMate is a full-stack, developer-first web application that analyzes code diffs and public GitHub Pull Requests to generate human-style, line-anchored code review comments. It is powered by a fine-tuned **CodeT5** model served behind a high-performance **FastAPI** backend and an interactive **React + Vite** frontend.

---

## 🌟 Key Features

1. **Dual Diff Input Methods**:
   - **Unified Diff Paste**: Paste raw git diffs with instant line counting and a 500-line safety cap.
   - **Public GitHub PR Fetcher**: Paste any public pull request URL (e.g. `https://github.com/facebook/react/pull/28000`) without requiring authentication tokens.
2. **Interactive Syntax-Highlighted Diff Viewer**:
   - Split (Side-by-Side) and Unified views.
   - Line numbers, additions (`+`), and deletions (`-`).
   - Line hover synchronization and smooth-scrolling pulse highlight when jumping to a line from a comment.
3. **Automated Categorization & Severity Badging**:
   - **Categories**: `Style`, `Bug Risk`, `Naming`, `Performance`, `Edge Case`, `Nit`.
   - **Severity Indicators**: `Important` (pulsing glowing border), `Suggestion` (amber), `Minor` (neutral gray).
4. **Model Comparison / Ablation Mode**:
   - Side-by-side comparison between **Fine-Tuned CodeT5** (deep, context-aware heuristics) and **Baseline Zero-Shot LLM** to visually showcase model ablation.
5. **Zero-Auth Session Review History**:
   - Automatically tracks reviews per session in `localStorage` and SQLite/Postgres.
   - 1-click reload of past reviews from a slide-out drawer.
6. **PR-Ready Markdown Export**:
   - 1-click "Copy all as Markdown" for pasting directly into GitHub PR comments.

---

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, Framer Motion, Lucide Icons, Axios
- **Backend**: Python 3.10+, FastAPI, Uvicorn, SQLAlchemy, SQLite (local) / PostgreSQL (production), Unidiff, Httpx, Pytest
- **Model Serving**: HuggingFace `transformers` (fine-tuned CodeT5 checkpoint), HuggingFace Inference Endpoints, with fallback contextual generator

---

## 🚀 Quick Start (Local Development)

### 1. Backend Setup

```bash
# Navigate to project root
cd ReviewMate

# Install backend dependencies
python -m pip install -r backend/requirements.txt

# Run backend API server on http://localhost:8000
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup

```bash
# In a new terminal, navigate to the frontend folder
cd ReviewMate/frontend

# Install dependencies
npm install

# Start Vite dev server on http://localhost:5173
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ⚙️ Environment Variables

### Backend (`.env` or Render environment):

| Variable | Default | Description |
| :--- | :--- | :--- |
| `MODEL_BACKEND` | `local` | `local` (loads `./model/checkpoint` weights) or `hf_endpoint` |
| `MODEL_CHECKPOINT_PATH` | `./model/checkpoint` | Path to fine-tuned CodeT5 checkpoint files |
| `HF_ENDPOINT_URL` | `""` | Hugging Face Dedicated Inference Endpoint URL (if using `hf_endpoint`) |
| `HF_API_KEY` | `""` | Hugging Face Bearer Token |
| `DATABASE_URL` | `sqlite:///./reviewmate.db` | Database URL (Render automatically injects `postgresql://`) |
| `PORT` | `8000` | Port for the FastAPI server |

### Frontend (`frontend/.env` or Vercel environment):

| Variable | Default | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `http://localhost:8000` | Backend API URL (set to your Render backend in production) |

---

## 🧪 Running Automated Tests

Run backend unit and integration tests with pytest:

```bash
python -m pytest backend/tests/test_backend.py -v
```

---

## 🚢 Deployment Guide

### Backend → Render
1. Connect your repository to Render as a **Web Service**.
2. **Environment**: `Python 3`
3. **Build Command**: `pip install -r backend/requirements.txt`
4. **Start Command**: `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
5. Add a free Render PostgreSQL database and set `DATABASE_URL`.

### Frontend → Vercel
1. Connect repository to Vercel.
2. **Root Directory**: `frontend`
3. **Framework Preset**: `Vite`
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`
6. Add environment variable `VITE_API_URL` pointing to your Render backend service URL.
