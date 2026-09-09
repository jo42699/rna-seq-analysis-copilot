from fastapi import APIRouter, HTTPException
import app.state as state

router = APIRouter(prefix="/report/plots")


@router.get("/{job_id}")
def get_deseq2_top20(job_id: str):
    """
    Returns only the DESeq2 top20 results (log2FC, pvalue, FDR)
    for a specific job_id.
    """

    report = state.get_report(job_id)
    if report is None:
        raise HTTPException(404, f"No report found for job_id {job_id}")

    deseq2 = report.get("deseq2_top20")
    if deseq2 is None:
        raise HTTPException(404, "deseq2_top20 not found in report.")

    return {
        "job_id": job_id,
        "deseq2_top20": deseq2
    }
