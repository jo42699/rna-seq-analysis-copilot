# app/pipeline.py

import json

from app.utils.statistics_agent import run_statistics_agent
from app.agents.deseq2_agent import run_deseq2_agent
from app.agents.annotation_agent import run_annotation_agent
from app.agents.plot_agent import run_plot_agent
from app.agents.report_agent import run_report_agent
from app.agents.llm_agent import run_llm_agent
from app.agents.literature_agent import run_literature_agent
from app.utils.condition_detector import infer_conditions
from app.config import PIPELINE_VERBOSE
import app.state as state


def run_pipeline(counts_path, job_id, verbose=None):
    """
    Full RNA-seq pipeline runner.
    Now job-aware:
      - updates workflow stages
      - handles failures
      - caches final report per job_id
    Scientific logic is unchanged.
    """

    if verbose is None:
        verbose = PIPELINE_VERBOSE

    # HEADER
    if verbose:
        print("\n====================================")
        print("        OCTAVIUS RNA-seq PIPELINE")
        print("====================================\n")

    # Mark job running
    state.mark_job_running(job_id)

    try:
        # ---------------------------------------------------------
        # 1. STATISTICS
        # ---------------------------------------------------------
        state.update_workflow(
            job_id,
            "statistics",
            "running",
            "Running RNA-seq statistics...",
            10,
        )

        if verbose:
            print("Running Statistics Agent...")

        stats = run_statistics_agent(counts_path, verbose=verbose)
        summary = stats["summary"]
        df = stats["df"]

        if verbose:
            print("\n=== RNA-seq Summary ===")
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

        state.update_workflow(
            job_id,
            "statistics",
            "completed",
            "Statistics analysis completed.",
            100,
        )

        # ---------------------------------------------------------
        # CONDITION DETECTION
        # ---------------------------------------------------------
        condition_map = infer_conditions(df.columns)

        if verbose:
            print("\nDetected conditions:", condition_map)

        # ---------------------------------------------------------
        # 2. DESeq2
        # ---------------------------------------------------------
        state.update_workflow(
            job_id,
            "deseq2",
            "running",
            "Running differential expression analysis...",
            10,
        )

        if verbose:
            print("\nRunning DESeq2 Agent...")

        if len(condition_map) < 2:
            if verbose:
                print("\n=== DESeq2 Skipped: Only one condition detected ===")
            results = None

            state.update_workflow(
                job_id,
                "deseq2",
                "completed",
                "DESeq2 skipped: only one condition detected.",
                100,
            )
        else:
            results = run_deseq2_agent(df)

            state.update_workflow(
                job_id,
                "deseq2",
                "completed",
                "Differential expression analysis completed.",
                100,
            )

        if verbose:
            print("\n=== DESeq2 Results (Top 20) ===")
            if results is not None:
                print(results.head(20))
            else:
                print("No DESeq2 results.")

        # ---------------------------------------------------------
        # 3. ANNOTATION
        # ---------------------------------------------------------
        state.update_workflow(
            job_id,
            "annotation",
            "running",
            "Running gene annotation...",
            10,
        )

        if verbose:
            print("\nRunning Annotation Agent...")

        annot_output = run_annotation_agent(
            deseq_results=results,
            annot_path="app/data/Homo_sapiens.GRCh38.116.gtf"
        )

        annotated_results = annot_output["annotated_table"]

        if verbose:
            print("\n=== Gene Annotation Summary ===")
            print(annot_output["ascii"])

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

        if verbose:
            print("\n=== Annotated DESeq2 Results (Top 20 Annotated Genes) ===")
            print(annotated_display)

            print("\n=== Gene Type Distribution ===")
            print(annotated_results["gene_type"].value_counts())

        state.update_workflow(
            job_id,
            "annotation",
            "completed",
            "Annotation completed.",
            100,
        )

        # ---------------------------------------------------------
        # 4. VISUALIZATION
        # ---------------------------------------------------------
        state.update_workflow(
            job_id,
            "visualization",
            "running",
            "Generating RNA-seq visualizations...",
            10,
        )

        if verbose:
            print("\nRunning Plot Agent...")

        plot_data = run_plot_agent(
            deseq_results=annotated_results,
            norm_df=df,
            condition_map=condition_map,
            pathways=None,
        )

        if verbose:
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

        state.update_workflow(
            job_id,
            "visualization",
            "completed",
            "Visualization completed.",
            100,
        )

        # ---------------------------------------------------------
        # 5. REPORT / AI
        # ---------------------------------------------------------
        state.update_workflow(
            job_id,
            "report",
            "running",
            "Generating final JSON report and AI summary...",
            10,
        )

        if verbose:
            print("\nGenerating final JSON report...")

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

        if verbose:
            print("\n=== FULL JSON REPORT ===")
            print(json.dumps(report, indent=4))

        # LLM Agent
        if verbose:
            print("\nCalling LLM agent...")

        llm_output = run_llm_agent(report)
        report["llm_output"] = llm_output

        if verbose:
            print("\n=== LLM OUTPUT ===")
            print(json.dumps(llm_output, indent=4))

        state.update_workflow(
            job_id,
            "report",
            "completed",
            "Report and AI summary completed.",
            100,
        )

        # ---------------------------------------------------------
        # 6. LITERATURE
        # ---------------------------------------------------------
        state.update_workflow(
            job_id,
            "literature",
            "running",
            "Searching literature and ranking relevant studies...",
            10,
        )

        if verbose:
            print("\nCalling Literature agent (PubMed + AI ranking)...")

        literature_output = run_literature_agent(report)
        report["literature"] = literature_output

        if verbose:
            print("\n=== LITERATURE OUTPUT (RANKED) ===")
            print(json.dumps(literature_output, indent=4))

        state.update_workflow(
            job_id,
            "literature",
            "completed",
            "Literature search completed.",
            100,
        )

        # ---------------------------------------------------------
        # FINALIZE
        # ---------------------------------------------------------
        if verbose:
            print("\nPipeline complete.\n")

        state.cache_report(job_id, report)
        return report

    except Exception as exc:
        print(f"Pipeline failed for job {job_id}: {exc}")

        # Mark failure
        state.update_workflow(
            job_id,
            "report",
            "failed",
            f"Pipeline failed: {exc}",
            0,
        )

        raise
