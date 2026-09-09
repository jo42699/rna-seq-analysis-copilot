from fastapi import APIRouter, HTTPException
import app.state as state

router = APIRouter(prefix="/report/llm")


@router.get("/{job_id}")
def get_llm_output(job_id: str):
    """
    Returns the full LLM output section from the report for a specific job_id.
    """

    report = state.get_report(job_id)
    if report is None:
        raise HTTPException(404, f"No report found for job_id {job_id}")

    llm_output = report.get("llm_output")
    if llm_output is None:
        raise HTTPException(404, "llm_output not found in report.")

    return {"job_id": job_id, "llm_output": llm_output}
