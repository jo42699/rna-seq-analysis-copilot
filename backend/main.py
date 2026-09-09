import sys
import os
import pyfiglet
import json
import app.state as state
from fastapi import FastAPI 
from fastapi.middleware.cors import CORSMiddleware

sys.path.append(os.path.dirname(__file__))

from app.utils.statistics_agent import run_statistics_agent
from app.agents.deseq2_agent import run_deseq2_agent
from app.agents.plot_agent import run_plot_agent
from app.utils.condition_detector import infer_conditions
from app.agents.annotation_agent import run_annotation_agent
from app.agents.report_agent import run_report_agent
from app.agents.llm_agent import run_llm_agent
from app.agents.literature_agent import run_literature_agent
from app.pipeline import run_pipeline




#routes
from app.api.report import router as report_router
from app.api.stats import router as stats_router
from app.api.run import router as run_router
from app.api.plots import router as plots_router
from app.api.annotation import router as annotation_router
from app.api.llm import router as llm_router
from app.api.upload import router as upload_router
from app.api.workflow import router as workflow_router
from app.api.literature import router as literature_router
from app.api.llm_chat import router as llm_chat_router
from app.api.websocket import router as websocket_router


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register API endpoints

app.include_router(report_router)
app.include_router(stats_router)
app.include_router(run_router)
app.include_router(plots_router)
app.include_router(annotation_router)
app.include_router(llm_router)
app.include_router(upload_router)
app.include_router(workflow_router)
app.include_router(literature_router)
app.include_router(llm_chat_router)
app.include_router(websocket_router)

def main():

    # ASCII title
    slant_art = pyfiglet.figlet_format("OCTAVIUS", font="slant")
    print(slant_art)
    print("Running Multi-Agent Bioinformatics Pipeline...\n")

  
    # Statistics Agent
  
    stats = run_statistics_agent()

    summary = stats["summary"]
    df = stats["df"]

    print("=== RNA-seq Summary ===")
    print(f"Genes: {summary['num_genes']}")
    print(f"Samples: {summary['num_samples']}")

    print("\nTotal counts per sample:")
    for sample, total in summary["sample_totals"].items():
        print(f"  {sample}: {total}")

    print("\nTop expressed genes:")
    for gene, value in summary["top_expressed_genes"].items():
        print(f"  {gene}: {value}")

    print(f"\nLow-count genes (<10 reads): {summary['low_count_genes']}")
    print(f"Zero-count samples: {summary['zero_count_samples']}")

    # Infer experimental conditions
    condition_map = infer_conditions(df.columns)


    # DESeq2 Agent (safe skip)

    if len(condition_map) < 2:
        print("\n=== DESeq2 Skipped: Only one condition detected ===")
        results = None
    else:
        results = run_deseq2_agent(df)

    slant_art = pyfiglet.figlet_format("DESeq2", font="slant")
    print(slant_art)

    print("\n=== DESeq2 Results (Top 20) ===")
    if results is not None:
        print(results.head(20))
    else:
        print("DESeq2 skipped — no results available.")

 
    # Gene Annotation Agent

    annot_output = run_annotation_agent(
        deseq_results=results,
        annot_path="app/data/Homo_sapiens.GRCh38.116.gtf"
    )

    annotated_results = annot_output["annotated_table"]

    print("\n=== Gene Annotation Summary ===")
    print(annot_output["ascii"])

    print("\n=== Annotated DESeq2 Results (Top 20) ===")

    annotation_columns = [
        "ensembl_gene_id",
        "symbol",
        "gene_type",
        "chromosome",
        "start",
        "end",
        "log2FC",
        "pvalue",
        "FDR"
    ]

    annotated_display = annotated_results[
        annotated_results["annotation_status"] == "annotated"
    ][annotation_columns].head(20)

    print("\n=== Annotated DESeq2 Results (Top 20 Annotated Genes) ===")
    print(annotated_display)

    print("\n=== Gene Type Distribution ===")
    print(annotated_results["gene_type"].value_counts())

    
    # Plot Agent
   
    plot_data = run_plot_agent(
        deseq_results=annotated_results,
        norm_df=df,
        condition_map=condition_map,
        pathways=None,
    )

    print("\n=== Plot Summaries ===")
    print(plot_data["volcano_ascii"])
    print(plot_data["pca_ascii"])
    print(plot_data["heatmap_ascii"])
    print(plot_data["pathway_ascii"])

    pathway_output = {
        "network": plot_data.get("pathway_network", {
            "nodes": [],
            "edges": [],
            "attributes": {
                "top_pathway": None,
                "top_pvalue": None,
                "total_pathways": 0,
            },
        }),
        "ascii": plot_data["pathway_ascii"],
    }

    
   
    #REPORT AGENT 
   
    report = run_report_agent(
        summary=summary,
        sample_totals=summary["sample_totals"],
        top_expressed_genes=summary["top_expressed_genes"],
        low_count_genes=summary["low_count_genes"],
        zero_count_samples=summary["zero_count_samples"],
        deseq_top20=results.head(20).to_dict() if results is not None else {},
        annotation_ascii=annot_output["ascii"],
        annotated_top20=annotated_display.to_dict(),
        gene_type_distribution=annotated_results["gene_type"].value_counts().to_dict(),
        volcano_ascii=plot_data["volcano_ascii"],
        pca_ascii=plot_data["pca_ascii"],
        heatmap_ascii=plot_data["heatmap_ascii"],
        pathway_ascii=plot_data["pathway_ascii"],
        pathway_network=pathway_output["network"]
    )

    print("\n=== FULL JSON REPORT ===")
    print(json.dumps(report, indent=4))

  
    # LLM Agent (ALWAYS RUNS)
   
    print("Calling LLM agent...")
    llm_output = run_llm_agent(report)
    print("LLM agent finished.")

    # LLM output in the report
    report["llm_output"] = llm_output

    print("\n=== LLM OUTPUT ===")
    print(json.dumps(report["llm_output"], indent=4))


    
    # Literature Agent (WEB + AI) -- pubmed
   
    print("\nCalling Literature agent (PubMed + AI ranking)...")
    literature_output = run_literature_agent(report)
    print("Literature agent finished.")

    report["literature"] = literature_output    
    print("\n=== LITERATURE OUTPUT (RANKED) ===")
    print(json.dumps(report["literature"], indent=4))


    return report


if __name__ == "__main__":
    main()



# Source of the data:
# https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE116267

# Dataset:
# C9orf72-amyotrophic lateral sclerosis




# RUN MAIN
# python -u "c:\Users\pc\Desktop\octavius\backend\main.py"

