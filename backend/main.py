import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import init_db
from backend.models.inference import init_local_model
from backend.routers.review import router as review_router

# Ensure tables are created immediately
init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    init_local_model()
    yield

app = FastAPI(
    title="ReviewMate API",
    description="Human-style Code Review Comment Generator powered by Fine-Tuned CodeT5",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for local development and hosted frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(review_router)

@app.get("/")
def read_root():
    return {
        "app": "ReviewMate API",
        "status": "healthy",
        "docs": "/docs",
        "description": "Code Review Comment Generator powered by Fine-Tuned CodeT5"
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
