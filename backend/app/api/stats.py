from fastapi import APIRouter, HTTPException
import app.state as state
import re

router = APIRouter()

@router.get("/report/stats/{job_id}")
def get_report_stats(job_id: str):
    report = state.get_report(job_id)
    if report is None:
        raise HTTPException(404, f"No report found for job_id {job_id}")

    # RNA SUMMARY
    rna = report.get("rna_seq_summary", {})
    genes_analyzed = rna.get("genes")
    samples = rna.get("samples")
    low_count_genes = rna.get("low_count_genes")
    zero_count_samples = len(rna.get("zero_count_samples", []))

    top_expressed_gene = next(iter(rna.get("top_expressed_genes", {})), None)

    # DESEQ2 SUMMARY
    de = report.get("deseq2_top20", {})
    fdr_values = de.get("FDR", {})
    significant_genes = sum(
        1 for v in fdr_values.values()
        if isinstance(v, (int, float)) and v < 0.05
    )

    # ANNOTATION SUMMARY
    ann_text = report.get("gene_annotation_summary", "")
    annotated_genes = None
    annotation_success_percent = None

    m = re.search(r"Annotated genes:\s*(\d+)", ann_text)
    if m:
        annotated_genes = int(m.group(1))

    m = re.search(r"Annotation success rate:\s*([\d.]+)%", ann_text)
    if m:
        annotation_success_percent = float(m.group(1))

    # PCA VARIANCE
    pca_text = report.get("plot_summaries", {}).get("pca", "")
    pc1 = pc2 = None

    m = re.search(r"PC1 variance:\s*([\d.]+)%", pca_text)
    if m:
        pc1 = float(m.group(1))

    m = re.search(r"PC2 variance:\s*([\d.]+)%", pca_text)
    if m:
        pc2 = float(m.group(1))

    # PATHWAY ENRICHMENT
    pathway_text = report.get("plot_summaries", {}).get("pathway", "")
    pathways_enriched = None

    m = re.search(r"Enriched pathways:\s*(\d+)", pathway_text)
    if m:
        pathways_enriched = int(m.group(1))

    return {
        "job_id": job_id,
        "genes_analyzed": genes_analyzed,
        "samples": samples,
        "significant_genes": significant_genes,
        "annotated_genes": annotated_genes,
        "annotation_success_percent": annotation_success_percent,
        "pathways_enriched": pathways_enriched,
        "low_count_genes": low_count_genes,
        "zero_count_samples": zero_count_samples,
        "top_expressed_gene": top_expressed_gene,
        "pc1_variance": pc1,
        "pc2_variance": pc2,
    }
