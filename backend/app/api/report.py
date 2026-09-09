from fastapi import APIRouter, HTTPException
import app.state as state

router = APIRouter()

@router.get("/report/{job_id}")
def get_full_report(job_id: str):
    """
    Return the full RNA-seq report JSON for a specific job_id.
    """

    report = state.get_report(job_id)
    if report is None:
        raise HTTPException(status_code=404, detail=f"Report not found for job_id {job_id}")

    return {
        "job_id": job_id,
        "report": report
    }
