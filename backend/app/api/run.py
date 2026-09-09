from fastapi import APIRouter, BackgroundTasks, HTTPException
import uuid
import app.state as state
from app.pipeline import run_pipeline

router = APIRouter()

def run_pipeline_background(job_id: str, counts_path: str):
    run_pipeline(counts_path=counts_path, job_id=job_id, verbose=True)

@router.post("/run")
def run_default_pipeline(background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())

    # Initialize job + workflow
    state.create_job(job_id, "GSE116267_SUPT4H1_HEK293.tab")
    state.init_workflow(job_id)

    counts_path = "app/data/GSE116267_SUPT4H1_HEK293.tab"

    background_tasks.add_task(run_pipeline_background, job_id, counts_path)

    return {
        "message": "Pipeline started.",
        "job_id": job_id,
        "workflow": f"/report/workflow/{job_id}",
    }
