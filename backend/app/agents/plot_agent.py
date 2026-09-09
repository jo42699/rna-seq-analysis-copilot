import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from app.agents.pathway_agent import run_pathway_agent



def run_plot_agent(deseq_results, norm_df, condition_map, pathways=None):
    """
    Returns JSON‑serializable plot data + ASCII summaries for terminal display.
    """

    pathway_output = run_pathway_agent(deseq_results)

    return {
        "volcano": volcano_plot_data(deseq_results),
        "volcano_ascii": volcano_ascii_summary(deseq_results),

        "pca": pca_plot_data(norm_df, condition_map),
        "pca_ascii": pca_ascii_summary(norm_df, condition_map),

        "heatmap": heatmap_plot_data(norm_df),
        "heatmap_ascii": heatmap_ascii_summary(norm_df),

        "pathway_network": pathway_output["network"],
        "pathway_ascii": pathway_output["ascii"]
    }



# VOLCANO PLOT
def volcano_plot_data(results):
    return {
        "log2fc": results["log2FC"].tolist(),
        "pvalue": results["pvalue"].tolist(),
        "fdr": results["FDR"].tolist(),
        "significant": (results["FDR"] < 0.05).tolist(),
        "gene_id": results.index.tolist()
    }


def volcano_ascii_summary(results):
    sig = (results["FDR"] < 0.05).sum()
    max_fc = results["log2FC"].max()
    min_fc = results["log2FC"].min()

    return (
        "Volcano Plot Summary\n"
        "---------------------\n"
        f"Significant genes (FDR < 0.05): {sig}\n"
        f"Max log2FC: {max_fc:.3f}\n"
        f"Min log2FC: {min_fc:.3f}\n"
    )



# PCA PLOT
def pca_plot_data(norm_df, condition_map):
    pca = PCA(n_components=2)
    coords = pca.fit_transform(norm_df.T)

    return {
        "pc1": coords[:, 0].tolist(),
        "pc2": coords[:, 1].tolist(),
        "variance": pca.explained_variance_ratio_.tolist(),
        "samples": norm_df.columns.tolist(),
        "conditions": [condition_map[s] for s in norm_df.columns]
    }


def pca_ascii_summary(norm_df, condition_map):
    pca = PCA(n_components=2)
    coords = pca.fit_transform(norm_df.T)
    var = pca.explained_variance_ratio_

    return (
        "PCA Summary\n"
        "-----------\n"
        f"PC1 variance: {var[0]*100:.2f}%\n"
        f"PC2 variance: {var[1]*100:.2f}%\n"
        f"Samples: {len(norm_df.columns)}\n"
        f"Conditions detected: {len(set(condition_map.values()))}\n"
    )


# HEATMAP
def heatmap_plot_data(norm_df, top_n=20):
    # Select top variable genes
    var = norm_df.var(axis=1)
    top_genes = var.sort_values(ascending=False).head(top_n).index

    matrix = norm_df.loc[top_genes]

    return {
        "matrix": matrix.values.tolist(),
        "genes": matrix.index.tolist(),
        "samples": matrix.columns.tolist()
    }


def heatmap_ascii_summary(norm_df):
    var = norm_df.var(axis=1)
    top_genes = var.sort_values(ascending=False).head(10).index

    return (
        "Heatmap Summary (Top 10 variable genes)\n"
        "----------------------------------------\n"
        + "\n".join(top_genes)
    )



# PATHWAY NETWORK
def pathway_network_data(pathways):
    if pathways is None:
        return {
            "nodes": [],
            "edges": [],
            "attributes": {}
        }

    return {
        "nodes": pathways.get("nodes", []),
        "edges": pathways.get("edges", []),
        "attributes": pathways.get("attributes", {})
    }


def pathway_ascii(network):
    top_pathway = network["attributes"]["top_pathway"]
    top_pvalue = network["attributes"]["top_pvalue"]
    total = network["attributes"]["total_pathways"]

    # If no pathways enriched => safe fallback
    if top_pathway is None or top_pvalue is None:
        return (
            "Pathway Enrichment Summary\n"
            "--------------------------\n"
            "No significant pathways found.\n"
            f"Nodes: {len(network['nodes'])}\n"
            f"Edges: {len(network['edges'])}\n"
        )

    # Normal case no err
    return (
        "Pathway Enrichment Summary\n"
        "--------------------------\n"
        f"Total pathways enriched: {total}\n"
        f"Top pathway: {top_pathway}\n"
        f"Top pathway FDR: {top_pvalue:.3e}\n"
        f"Nodes: {len(network['nodes'])}\n"
        f"Edges: {len(network['edges'])}\n"
    )
