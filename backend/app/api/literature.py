from fastapi import APIRouter, HTTPException
import app.state as state

router = APIRouter(prefix="/report/literature")


@router.get("/{job_id}")
def get_literature(job_id: str):
    """
    Returns the full literature section from the report for a specific job_id:
    - genes
    - topics
    - raw_results (PubMed papers per gene)
    """

    report = state.get_report(job_id)
    if report is None:
        raise HTTPException(404, f"No report found for job_id {job_id}")

    literature = report.get("literature")
    if literature is None:
        raise HTTPException(404, "literature not found in report.")

    return {
        "job_id": job_id,
        "literature": literature
    }
