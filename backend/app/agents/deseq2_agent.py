import numpy as np
import pandas as pd
from scipy.stats import norm
from statsmodels.stats.multitest import multipletests
from app.utils.condition_detector import infer_conditions

'''
This is the DESeq2 
'''

def estimate_size_factors(df):
    """
    DESeq2-style median ratio normalization.

    """
    geometric_means = np.exp(np.log(df + 1).mean(axis=1))
    ratios = df.div(geometric_means, axis=0)
    size_factors = ratios.median()
    return size_factors


def normalize_counts(df, size_factors):
    """
    Normalize counts by size factors.
    """
    return df.div(size_factors, axis=1)


def wald_test(group1, group2):
    mean1 = group1.mean(axis=1)
    mean2 = group2.mean(axis=1)

    log2fc = np.log2((mean2 + 1) / (mean1 + 1))

    var1 = group1.var(axis=1)
    var2 = group2.var(axis=1)
    se = np.sqrt(var1 / group1.shape[1] + var2 / group2.shape[1])

    # avoid zero / NaN SE
    se = se.replace(0, np.nan)

    wald = log2fc / se
    pvals = 2 * norm.sf(np.abs(wald))

    return log2fc, pvals



def run_deseq2_agent(df, condition_map=None):
    """
    Run DESeq2-style differential expression.
    df: count matrix from statistics agent.
    condition_map: optional {sample -> condition}.
    """
    df = df[df.sum(axis=1) >= 10]
    ...
    # . Determine conditions
    if condition_map is None:
        condition_map = infer_conditions(df.columns)

    # Group samples by condition
    groups = {}
    for sample, cond in condition_map.items():
        if sample in df.columns:
            groups.setdefault(cond, []).append(sample)

    if len(groups) != 2:
        raise ValueError(
            f"DESeq2 agent requires exactly 2 conditions, found {len(groups)}: {list(groups.keys())}"
        )

    condA, condB = list(groups.keys())
    group1_samples = groups[condA]
    group2_samples = groups[condB]

    #  Size-factor normalization
    size_factors = estimate_size_factors(df)
    norm_df = normalize_counts(df, size_factors)

    #  Wald test
    group1 = norm_df[group1_samples]
    group2 = norm_df[group2_samples]
    log2fc, pvals = wald_test(group1, group2)

    valid = ~np.isnan(pvals)
    log2fc = log2fc[valid]  
    pvals = pvals[valid]

    # FDR correction
    _, fdr, _, _ = multipletests(pvals, method="fdr_bh")

    #  Build results table
    results = pd.DataFrame({
        "log2FC": log2fc,
        "pvalue": pvals,
        "FDR": fdr
    }, index=df.index)

    results = results.sort_values("FDR")

    return results
