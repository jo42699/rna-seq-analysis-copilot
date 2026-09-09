from fastapi import APIRouter, HTTPException
import app.state as state

router = APIRouter(prefix="/report/annotation")


@router.get("/{job_id}")
def get_full_annotation(job_id: str):
    """
    Returns the full annotation section from the report for a specific job_id:
    - gene_annotation_summary (ASCII)
    - annotated_deseq2_top20 (table)
    - gene_type_distribution (counts)
    """

    report = state.get_report(job_id)
    if report is None:
        raise HTTPException(404, f"Report not found for job_id {job_id}")

    summary = report.get("gene_annotation_summary")
    annotated = report.get("annotated_deseq2_top20")
    gene_types = report.get("gene_type_distribution")

    if summary is None and annotated is None and gene_types is None:
        raise HTTPException(404, "Annotation data not found in report.")

    return {
        "job_id": job_id,
        "gene_annotation_summary": summary,
        "annotated_deseq2_top20": annotated,
        "gene_type_distribution": gene_types
    }
