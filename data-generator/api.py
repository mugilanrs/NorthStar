"""
FastAPI control plane for the data generator.
Runs alongside generator.py in the same Railway service (background thread).
"""
import threading
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import chaos
import generator

app = FastAPI(title="NorthStar Data Generator", docs_url="/docs")

_generator_thread: threading.Thread | None = None


@app.on_event("startup")
def start_generator():
    global _generator_thread
    generator._init_providers()
    _generator_thread = threading.Thread(target=generator.run_live, daemon=True)
    _generator_thread.start()


@app.get("/health")
def health():
    alive = _generator_thread is not None and _generator_thread.is_alive()
    return {"status": "ok", "generator_running": alive}


@app.post("/generator/chaos/{mode}")
def set_chaos(mode: str):
    try:
        result = chaos.set_mode(mode)
        return {"ok": True, "active_mode": result["mode"]}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/generator/chaos")
def get_chaos():
    return {
        "active_mode": chaos.get_active_mode(),
        "overrides": chaos.get_overrides(),
    }


class BackfillRequest(BaseModel):
    days: int = 7


@app.post("/generator/backfill")
def trigger_backfill(req: BackfillRequest):
    """Kicks off backfill in a background thread. Non-blocking."""
    t = threading.Thread(target=generator.run_backfill, args=(req.days,), daemon=True)
    t.start()
    return {"ok": True, "message": f"Backfill started for {req.days} days"}
