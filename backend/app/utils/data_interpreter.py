
def interpret_counts(df):
    """
    Interpret RNA-seq count data.
    Returns a dictionary of useful summaries.
    """

    summary = {}

    # Basic shape
    summary["num_genes"] = df.shape[0]
    summary["num_samples"] = df.shape[1]

    # Total counts per sample
    summary["sample_totals"] = df.sum().to_dict()

    # Mean expression per gene
    gene_means = df.mean(axis=1)
    summary["top_expressed_genes"] = gene_means.sort_values(ascending=False).head(10).to_dict()

    # Low-count genes (<10 total reads)
    low_count_genes = (df.sum(axis=1) < 10).sum()
    summary["low_count_genes"] = int(low_count_genes)

    # Zero-count samples
    zero_samples = [s for s in df.columns if df[s].sum() == 0]
    summary["zero_count_samples"] = zero_samples

    return summary
