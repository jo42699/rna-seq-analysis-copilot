from fastapi import APIRouter, HTTPException
import app.state as state

router = APIRouter(prefix="/report/workflow")

@router.get("/{job_id}")
def get_workflow_status(job_id: str):
    """
    Returns workflow agent progress for UI loading bars for a specific job_id.
    """

    workflow = state.get_workflow(job_id)
    if workflow is None:
        raise HTTPException(404, f"No workflow found for job_id {job_id}")

    return {
        "job_id": job_id,
        "workflow": workflow["workflow"],
        "status": workflow["status"]
    }
