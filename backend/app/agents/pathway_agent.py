import pandas as pd
import numpy as np
import gseapy as gp
from itertools import combinations


# PUBLIC ENTRYPOINT

def run_pathway_agent(
    deseq_results: pd.DataFrame,
    organism: str = "Human",
    gene_sets=None,
    max_terms: int = 25,
    method: str = "auto",      # "auto", "ORA", "GSEA"
    min_gene_count: int = 10,
    fdr_cutoff: float = 0.05,
):
    """
    Pathway enrichment agent using gseapy.
    """

   
    # 1. Validate input & basic stats
  
    if deseq_results is None or len(deseq_results) == 0:
        return _empty_result("No DESeq2 results provided.")

    # detect FDR column
    fdr_col = None
    for candidate in ["FDR", "padj", "adj.P.Val"]:
        if candidate in deseq_results.columns:
            fdr_col = candidate
            break

    if fdr_col is None:
        return _empty_result("No FDR/padj column found in DESeq2 results.")

    genes_tested = len(deseq_results)

    # Extract significant genes (for ORA) and ranking (for GSEA)

    sig_mask = deseq_results[fdr_col] < fdr_cutoff
    sig_df = deseq_results.loc[sig_mask].copy()
    significant_genes = len(sig_df)

    # gene identifiers: prefer symbol, else index
    if "symbol" in deseq_results.columns:
        sig_genes = (
            sig_df["symbol"]
            .dropna()
            .astype(str)
            .tolist()
        )
    else:
        sig_genes = (
            sig_df.index
            .astype(str)
            .tolist()
        )

    sig_genes = [
        g for g in sig_genes
        if isinstance(g, str) and g.strip() != "" and g.lower() != "nan"
    ]

    # ranking for GSEA
    ranking = None
    if "stat" in deseq_results.columns:
        if "symbol" in deseq_results.columns:
            ranking = (
                deseq_results
                .dropna(subset=["stat", "symbol"])
                .sort_values("stat", ascending=False)
                [["symbol", "stat"]]
            )
        else:
            ranking = (
                deseq_results
                .dropna(subset=["stat"])
                .sort_values("stat", ascending=False)
                .reset_index()[["gene_id", "stat"]]
            )

    # SAFE gene lookup even with duplicate symbols
    gene_lookup = {}
    if "symbol" in deseq_results.columns:
        for _, row in deseq_results.iterrows():
            sym = str(row["symbol"])
            if sym not in gene_lookup:
                gene_lookup[sym] = {
                    "log2FC": float(row.get("log2FC", row.get("log2FoldChange", np.nan))),
                    "FDR": float(row.get("FDR", np.nan)),
                    "stat": float(row.get("stat", np.nan)),
                }
    else:
        for idx, row in deseq_results.iterrows():
            gid = str(idx)
            if gid not in gene_lookup:
                gene_lookup[gid] = {
                    "log2FC": float(row.get("log2FC", row.get("log2FoldChange", np.nan))),
                    "FDR": float(row.get("FDR", np.nan)),
                    "stat": float(row.get("stat", np.nan)),
                }


    #  Choose method (ORA vs GSEA)
  
    if gene_sets is None:
        gene_sets = _default_gene_sets(organism)

    chosen_method = method.lower()

    # AUTO MODE
    if chosen_method == "auto":
        if ranking is not None and len(sig_genes) >= min_gene_count:
            chosen_method = "gsea"
        else:
            chosen_method = "ora"

    enr_results = None
    enrichment_error = None

    # ORA ALWAYS ALLOWED
    if chosen_method == "ora":
        try:
            enr = gp.enrichr(
                gene_list=sig_genes,
                gene_sets=gene_sets,
                cutoff=0.5,
            )
            enr_results = enr.results
        except Exception as e:
            enrichment_error = f"Enrichr failed: {e}"

    # GSEA ONLY IF RANKING EXISTS
    elif chosen_method == "gsea":
        if ranking is None:
            enrichment_error = "GSEA requested but no ranking available."
        else:
            try:
                enr = gp.prerank(
                    rnk=ranking,
                    gene_sets=gene_sets,
                    min_size=15,
                    max_size=500,
                )
                enr_results = enr.res2d
            except Exception as e:
                enrichment_error = f"GSEA prerank failed: {e}"

   
    #  Handle failed enrichment (_err handling)
   
    if enr_results is None or len(enr_results) == 0:
        ascii_summary = _ascii_no_enrichment(
            genes_tested=genes_tested,
            significant_genes=significant_genes,
            error=enrichment_error,
        )
        return {
            "network": empty_network(),
            "statistics": {
                "genes_tested": genes_tested,
                "significant_genes": significant_genes,
                "enriched_pathways": 0,
            },
            "top_pathways": [],
            "ascii": ascii_summary,
            "confidence": 0.0,
        }

    #  Filter significant pathways
 
    results = enr_results.copy()

    adj_col = None
    comb_col = None
    genes_col = None
    term_col = None
    db_col = None

    for c in results.columns:
        lc = c.lower()
        if "adjusted" in lc and "p" in lc:
            adj_col = c
        elif "combined" in lc and "score" in lc:
            comb_col = c
        elif lc == "genes":
            genes_col = c
        elif lc in ["term", "name", "pathway"]:
            term_col = c
        elif "gene_set" in lc or "library" in lc:
            db_col = c

    if adj_col is None or genes_col is None or term_col is None:
        ascii_summary = _ascii_no_enrichment(
            genes_tested=genes_tested,
            significant_genes=significant_genes,
            error="Missing required columns in enrichment results.",
        )
        return {
            "network": empty_network(),
            "statistics": {
                "genes_tested": genes_tested,
                "significant_genes": significant_genes,
                "enriched_pathways": 0,
            },
            "top_pathways": [],
            "ascii": ascii_summary,
            "confidence": 0.0,
        }

    results = results[results[adj_col] < fdr_cutoff]
    if len(results) == 0:
        ascii_summary = _ascii_no_enrichment(
            genes_tested=genes_tested,
            significant_genes=significant_genes,
            error="No pathways passed FDR cutoff.",
        )
        return {
            "network": empty_network(),
            "statistics": {
                "genes_tested": genes_tested,
                "significant_genes": significant_genes,
                "enriched_pathways": 0,
            },
            "top_pathways": [],
            "ascii": ascii_summary,
            "confidence": 0.0,
        }

    sort_cols = [adj_col]
    sort_asc = [True]
    if comb_col is not None:
        sort_cols.append(comb_col)
        sort_asc.append(False)

    results = results.sort_values(sort_cols, ascending=sort_asc)
    results = results.head(max_terms)


    #  Build network

    network, pathway_stats, top_pathways = _build_network(
        results=results,
        adj_col=adj_col,
        comb_col=comb_col,
        genes_col=genes_col,
        term_col=term_col,
        db_col=db_col,
        gene_lookup=gene_lookup,
    )

    #  ASCII summary
  
    ascii_summary = _ascii_summary(
        genes_tested=genes_tested,
        significant_genes=significant_genes,
        pathway_stats=pathway_stats,
        top_pathways=top_pathways,
        network=network,
    )


    #  Confidence score

    confidence = _confidence_score(results, adj_col)

    return {
        "network": network,
        "statistics": {
            "genes_tested": genes_tested,
            "significant_genes": significant_genes,
            "enriched_pathways": pathway_stats["enriched_pathways"],
        },
        "top_pathways": top_pathways,
        "ascii": ascii_summary,
        "confidence": confidence,
    }



# DEFAULT GENE SETS


def _default_gene_sets(organism: str):
    gene_sets = {
        "Human": [
            "GO_Biological_Process_2023",
            "KEGG_2021_Human",
            "Reactome_2022",
        ],
        "Mouse": [
            "GO_Biological_Process_2023",
            "KEGG_2021_Mouse",
        ],
    }
    return gene_sets.get(organism, gene_sets["Human"])


# NETWORK BUILDING



def _build_network(
    results: pd.DataFrame,
    adj_col: str,
    comb_col: str | None,
    genes_col: str,
    term_col: str,
    db_col: str | None,
    gene_lookup: dict | None,
):

    gene_nodes = {}
    pathway_nodes = {}
    edges = []
    pathway_genes = {}

    # IMPORTANT:
    # Use iterrows() rather than itertuples().
    #
    # itertuples() can rename columns that are not valid Python
    # identifiers. For example:
    #
    # "Old Adjusted P-value"
    #
    # may not remain accessible under that exact name.
    #
    # iterrows() preserves the real DataFrame column names.

    for _, row in results.iterrows():

        pathway = row[term_col]

        # ---------------------------------------------
        # Adjusted p-value
        # ---------------------------------------------

        try:
            padj = float(row[adj_col])
        except (TypeError, ValueError):
            continue

        # ---------------------------------------------
        # Combined score
        # ---------------------------------------------

        combined_score = None

        if comb_col is not None:

            try:
                combined_score = float(row[comb_col])
            except (TypeError, ValueError):
                combined_score = None

        # ---------------------------------------------
        # Genes
        # ---------------------------------------------

        genes_str = row[genes_col]

        if pd.isna(genes_str):
            genes_str = ""

        genes = [
            g.strip()
            for g in str(genes_str).split(";")
            if g.strip() != ""
        ]

        # ---------------------------------------------
        # Database
        # ---------------------------------------------

        database = None

        if db_col is not None:

            value = row[db_col]

            if not pd.isna(value):
                database = str(value)

        # ---------------------------------------------
        # Pathway node
        # ---------------------------------------------

        pathway_nodes[pathway] = {
            "id": pathway,
            "type": "pathway",
            "padj": padj,
            "combined_score": combined_score,
            "odds_ratio": None,
            "gene_count": len(genes),
            "database": database,
            "pathway_type": _infer_pathway_type(database),
        }

        pathway_genes[pathway] = set(genes)

        # ---------------------------------------------
        # Gene nodes + edges
        # ---------------------------------------------

        for gene in genes:

            if (
                gene_lookup is not None
                and gene in gene_lookup
            ):

                info = gene_lookup[gene]

                gene_nodes.setdefault(
                    gene,
                    {
                        "id": gene,
                        "type": "gene",
                        "log2FC": info.get("log2FC"),
                        "FDR": info.get("FDR"),
                        "stat": info.get("stat"),
                    },
                )

            else:

                gene_nodes.setdefault(
                    gene,
                    {
                        "id": gene,
                        "type": "gene",
                        "log2FC": None,
                        "FDR": None,
                        "stat": None,
                    },
                )

            edges.append({
                "source": gene,
                "target": pathway,
                "weight": 1,
                "direction": "member",
            })

    # ---------------------------------------------
    # Pathway overlap edges
    # ---------------------------------------------

    pathways = list(pathway_nodes.keys())

    for p1, p2 in combinations(pathways, 2):

        overlap = len(
            pathway_genes[p1]
            & pathway_genes[p2]
        )

        if overlap >= 3:

            edges.append({
                "source": p1,
                "target": p2,
                "weight": overlap,
                "type": "overlap",
            })

    # ---------------------------------------------
    # Nodes
    # ---------------------------------------------

    nodes = (
        list(pathway_nodes.values())
        + list(gene_nodes.values())
    )

    # ---------------------------------------------
    # Statistics
    # ---------------------------------------------

    pathway_stats = {
        "enriched_pathways": len(pathway_nodes),
        "genes_in_network": len(gene_nodes),
        "edges_in_network": len(edges),
    }

    # ---------------------------------------------
    # Sort pathways by adjusted p-value
    # ---------------------------------------------

    sorted_pathways = sorted(
        pathway_nodes.values(),
        key=lambda x: x["padj"],
    )

    # ---------------------------------------------
    # Top pathways
    # ---------------------------------------------

    top_pathways = [
        {
            "term": p["id"],
            "padj": p["padj"],
            "database": p["database"],
        }
        for p in sorted_pathways[:5]
    ]

    # ---------------------------------------------
    # Network
    # ---------------------------------------------

    network = {
        "nodes": nodes,
        "edges": edges,
        "attributes": {
            "top_pathway": (
                sorted_pathways[0]["id"]
                if sorted_pathways
                else None
            ),
            "top_pvalue": (
                sorted_pathways[0]["padj"]
                if sorted_pathways
                else None
            ),
            "total_pathways": len(pathway_nodes),
        },
    }

    return (
        network,
        pathway_stats,
        top_pathways,
    )



def _infer_pathway_type(database: str | None):
    if database is None:
        return None
    db = database.lower()
    if "go_" in db:
        return "GO"
    if "kegg" in db:
        return "KEGG"
    if "reactome" in db:
        return "Reactome"
    return None



# ASCII SUMMARIES


def _ascii_summary(
    genes_tested: int,
    significant_genes: int,
    pathway_stats: dict,
    top_pathways: list,
    network: dict,
):
    enriched = pathway_stats.get("enriched_pathways", 0)
    nodes = len(network.get("nodes", []))
    edges = len(network.get("edges", []))

    lines = []
    lines.append("Pathway Enrichment Summary")
    lines.append("============================")
    lines.append("")
    lines.append(f"Genes tested: {genes_tested}")
    lines.append(f"Significant genes: {significant_genes}")
    lines.append(f"Enriched pathways: {enriched}")
    lines.append("")
    lines.append("Top pathways")
    lines.append("------------")

    if len(top_pathways) == 0:
        lines.append("None (no pathways passed FDR cutoff).")
    else:
        for i, p in enumerate(top_pathways, start=1):
            lines.append(
                f"{i}. {p['term']:<25} FDR={p['padj']:.2e}"
            )

    lines.append("")
    lines.append("Network")
    lines.append("-------")
    lines.append(f"Genes: {pathway_stats.get('genes_in_network', 0)}")
    lines.append(f"Pathways: {enriched}")
    lines.append(f"Edges: {edges}")

    return "\n".join(lines)


def _ascii_no_enrichment(
    genes_tested: int,
    significant_genes: int,
    error: str | None = None,
):
    lines = []
    lines.append("Pathway Enrichment Summary")
    lines.append("==========================")
    lines.append("")
    lines.append(f"Genes tested: {genes_tested}")
    lines.append(f"Significant genes: {significant_genes}")
    lines.append("Enriched pathways: 0")
    lines.append("")
    lines.append("No enriched pathways were detected.")
    lines.append("This is common when very few genes pass the FDR threshold.")
    if error:
        lines.append(f"Technical note: {error}")
    return "\n".join(lines)



# CONFIDENCE

def _confidence_score(results: pd.DataFrame, adj_col: str):
    if results is None or len(results) == 0:
        return 0.0

    base_conf = min(1.0, len(results) / 20)
    top_p = float(results.iloc[0][adj_col])
    sig_conf = (-np.log10(top_p)) / 20.0
    sig_conf = max(0.0, min(1.0, sig_conf))

    return max(base_conf, sig_conf)



# EMPTY NETWORK / RESULT
def empty_network():
    return {
        "nodes": [],
        "edges": [],
        "attributes": {
            "top_pathway": None,
            "top_pvalue": None,
            "total_pathways": 0,
        },
    }


def _empty_result(reason: str):
    return {
        "network": empty_network(),
        "statistics": {
            "genes_tested": 0,
            "significant_genes": 0,
            "enriched_pathways": 0,
        },
        "top_pathways": [],
        "ascii": _ascii_no_enrichment(
            genes_tested=0,
            significant_genes=0,
            error=reason,
        ),
        "confidence": 0.0,
    }
