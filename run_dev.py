import subprocess
import sys
import os
import signal
import time

def main():
    print("=" * 60)
    print("🚀 Starting ReviewMate Full-Stack Dev Environment...")
    print("=" * 60)

    root_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(root_dir, "frontend")

    # Start FastAPI Backend
    print("[1/2] Launching FastAPI Backend on http://localhost:8000 ...")
    backend_cmd = [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"]
    backend_proc = subprocess.Popen(backend_cmd, cwd=root_dir)

    time.sleep(1.5)

    # Start Vite Frontend
    print("[2/2] Launching Vite React Frontend on http://localhost:5173 ...")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_cmd = [npm_cmd, "run", "dev"]
    frontend_proc = subprocess.Popen(frontend_cmd, cwd=frontend_dir)

    print("\n✅ ReviewMate is running!")
    print("👉 Frontend: http://localhost:5173")
    print("👉 Backend API: http://localhost:8000")
    print("👉 API Docs: http://localhost:8000/docs")
    print("\nPress Ctrl+C to terminate both servers.\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping ReviewMate servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("Done.")

if __name__ == "__main__":
    main()
