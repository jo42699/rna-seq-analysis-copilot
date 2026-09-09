# app/state.py

from threading import Lock

JOBS = {}
WORKFLOWS = {}
REPORT_CACHE = {}

_state_lock = Lock()


def create_job(job_id: str, filename: str) -> None:
    with _state_lock:
        JOBS[job_id] = {
            "job_id": job_id,
            "filename": filename,
            "status": "queued",
        }


def init_workflow(job_id: str) -> None:
    with _state_lock:
        WORKFLOWS[job_id] = {
            "job_id": job_id,
            "status": "queued",
            "workflow": {
                "statistics": {
                    "status": "queued",
                    "message": "Waiting to start",
                    "progress": 0,
                },
                "deseq2": {
                    "status": "queued",
                    "message": "Waiting to start",
                    "progress": 0,
                },
                "annotation": {
                    "status": "queued",
                    "message": "Waiting to start",
                    "progress": 0,
                },
                "visualization": {
                    "status": "queued",
                    "message": "Waiting to start",
                    "progress": 0,
                },
                "report": {
                    "status": "queued",
                    "message": "Waiting to start",
                    "progress": 0,
                },
                "literature": {
                    "status": "queued",
                    "message": "Waiting to start",
                    "progress": 0,
                },
            },
        }


def update_workflow(job_id: str, stage: str, status: str, message: str, progress: int) -> None:
    with _state_lock:
        wf = WORKFLOWS.get(job_id)
        if wf is None:
            return

        stage_state = wf["workflow"].get(stage)
        if stage_state is None:
            stage_state = {}
            wf["workflow"][stage] = stage_state

        stage_state["status"] = status
        stage_state["message"] = message
        stage_state["progress"] = progress

        if status == "failed":
            wf["status"] = "failed"
            job = JOBS.get(job_id)
            if job:
                job["status"] = "failed"
        elif status == "completed":
            if all(s["status"] == "completed" for s in wf["workflow"].values()):
                wf["status"] = "completed"
                job = JOBS.get(job_id)
                if job:
                    job["status"] = "completed"


def mark_job_running(job_id: str) -> None:
    with _state_lock:
        job = JOBS.get(job_id)
        wf = WORKFLOWS.get(job_id)
        if job:
            job["status"] = "running"
        if wf:
            wf["status"] = "running"


def cache_report(job_id: str, report: dict) -> None:
    with _state_lock:
        REPORT_CACHE[job_id] = report


def get_workflow(job_id: str):
    with _state_lock:
        return WORKFLOWS.get(job_id)


def get_job(job_id: str):
    with _state_lock:
        return JOBS.get(job_id)


def get_report(job_id: str):
    with _state_lock:
        return REPORT_CACHE.get(job_id)
