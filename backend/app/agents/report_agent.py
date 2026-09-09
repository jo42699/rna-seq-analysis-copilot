import datetime

def run_report_agent(
    summary,
    sample_totals,
    top_expressed_genes,
    low_count_genes,
    zero_count_samples,
    deseq_top20,
    annotation_ascii,
    annotated_top20,
    gene_type_distribution,
    volcano_ascii,
    pca_ascii,
    heatmap_ascii,
    pathway_ascii,
    pathway_network
):
    """Build JSON report containing exactly what main.py prints."""

    report = {
        "title": "RNA-seq Analysis Report",
        "generated_at": datetime.datetime.now().isoformat(),

        # RNA-seq summary
        "rna_seq_summary": {
            "genes": summary["num_genes"],
            "samples": summary["num_samples"],
            "total_counts_per_sample": sample_totals,
            "top_expressed_genes": top_expressed_genes,
            "low_count_genes": low_count_genes,
            "zero_count_samples": zero_count_samples
        },

        # DESeq2 top 20
        "deseq2_top20": deseq_top20,

        # Gene annotation summary
        "gene_annotation_summary": annotation_ascii,

        # Annotated DESeq2 top 20
        "annotated_deseq2_top20": annotated_top20,

        # Gene type distribution
        "gene_type_distribution": gene_type_distribution,

        # Plot summaries
        "plot_summaries": {
            "volcano": volcano_ascii,
            "pca": pca_ascii,
            "heatmap": heatmap_ascii,
            "pathway": pathway_ascii
        },

        # Pathway enrichment summary
        "pathway_enrichment_summary": pathway_ascii,

        # Interpretation
        "interpretation": generate_interpretation(
            summary,
            deseq_top20,
            annotation_ascii,
            volcano_ascii,
            pathway_network
        )
    }

    return report


def generate_interpretation(summary, deseq_top20, annotation_ascii, volcano_ascii, pathway_network):
    """Generate human-readable interpretation."""
    lines = []

    # DE strength
    try:
        sig = sum(1 for gene in deseq_top20.values() if gene.get("FDR", 1) < 0.05)
    except:
        sig = 0

    if sig == 0:
        lines.append("No genes pass the FDR threshold, suggesting subtle differences or limited statistical power.")
    elif sig < 10:
        lines.append(f"{sig} genes pass the FDR threshold, indicating modest but detectable differential expression.")
    else:
        lines.append(f"{sig} genes are significantly differentially expressed, indicating strong transcriptional changes.")

    # Annotation completeness
    if "Missing annotations" in annotation_ascii:
        lines.append("Annotation summary indicates incomplete coverage, which may reduce interpretability.")

    # Pathways
    attrs = pathway_network.get("attributes", {})
    total_pathways = attrs.get("total_pathways", 0)

    if total_pathways == 0:
        lines.append("No enriched pathways were detected; consider GSEA or relaxed thresholds for exploratory analysis.")
    else:
        top_pathway = attrs.get("top_pathway")
        lines.append(f"{total_pathways} pathways are enriched. Top pathway: {top_pathway}.")

    return "\n".join(lines)
