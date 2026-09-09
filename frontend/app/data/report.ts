import type { GeneTypeCount, Report } from "@/app/types/bioinformatics";

type StatsPayload = {
  genes_analyzed: number;
  samples: number;
  significant_genes: number;
  annotated_genes: number;
  annotation_success_percent: number;
  pathways_enriched: number;
  low_count_genes: number;
  zero_count_samples: number;
  top_expressed_gene: string;
  pc1_variance: number;
  pc2_variance: number;
};

type AnnotationPayload = {
  gene_annotation_summary: string;
  annotated_deseq2_top20: {
    ensembl_gene_id: Record<string, string>;
    symbol: Record<string, string>;
    log2FC: Record<string, number>;
    pvalue: Record<string, number>;
    FDR: Record<string, number>;
    gene_type: Record<string, string>;
    chromosome: Record<string, string>;
    start: Record<string, number | string>;
    end: Record<string, number | string>;
  };
  gene_type_distribution: Record<string, number>;
};

async function safeFetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getReport(jobId: string) {
  const [stats, annotation] = await Promise.all([
    safeFetchJson<StatsPayload>(`http://localhost:8000/report/stats/${jobId}`),
    safeFetchJson<AnnotationPayload>(`http://localhost:8000/report/annotation/${jobId}`),
  ]);

  // ---------- NORMALIZATION ----------
  const safeStats: StatsPayload = {
    genes_analyzed: stats?.genes_analyzed ?? 0,
    samples: stats?.samples ?? 0,
    significant_genes: stats?.significant_genes ?? 0,
    annotated_genes: stats?.annotated_genes ?? 0,
    annotation_success_percent: stats?.annotation_success_percent ?? 0,
    pathways_enriched: stats?.pathways_enriched ?? 0,
    low_count_genes: stats?.low_count_genes ?? 0,
    zero_count_samples: stats?.zero_count_samples ?? 0,
    top_expressed_gene: stats?.top_expressed_gene ?? "—",
    pc1_variance: stats?.pc1_variance ?? 0,
    pc2_variance: stats?.pc2_variance ?? 0,
  };

  const safeAnnotation: AnnotationPayload = {
    gene_annotation_summary: annotation?.gene_annotation_summary ?? "",
    annotated_deseq2_top20: annotation?.annotated_deseq2_top20 ?? {
      ensembl_gene_id: {},
      symbol: {},
      log2FC: {},
      pvalue: {},
      FDR: {},
      gene_type: {},
      chromosome: {},
      start: {},
      end: {},
    },
    gene_type_distribution: annotation?.gene_type_distribution ?? {},
  };

  // ---------- DESeq2 GENE COUNT ----------
  const totalDESeq2Genes =
    safeAnnotation.gene_annotation_summary.match(/Total DESeq2 genes:\s*(\d+)/)?.[1] ?? "0";

  const top20 = safeAnnotation.annotated_deseq2_top20;

  // ---------- REPORT OBJECT ----------
  const report: Report = {
    name: stats || annotation ? "rna_seq_deseq2_report.json" : "No report",
    generatedAt: stats || annotation ? "Aug 2, 2026, 17:42" : "No report available",

    summary: [
      ["Genes Analyzed", safeStats.genes_analyzed.toLocaleString(), "after filtering", "dna"],
      ["Samples", safeStats.samples.toString(), "samples analyzed", "sample"],
      ["DESeq2 Genes", Number(totalDESeq2Genes).toLocaleString(), "tested for contrast", "sigma"],
      ["Significant Genes", safeStats.significant_genes.toLocaleString(), "FDR < 0.05", "spark"],
      ["Annotated Genes", safeStats.annotated_genes.toLocaleString(), `${safeStats.annotation_success_percent}% success`, "tag"],
      ["Pathways Enriched", safeStats.pathways_enriched.toString(), "enriched pathways", "path"],
    ],

    qc: [
      ["Low Count Genes", safeStats.low_count_genes.toLocaleString()],
      ["Zero Count Samples", safeStats.zero_count_samples.toString()],
      ["Top Expressed Gene", safeStats.top_expressed_gene],
      ["PC1 Variance", `${safeStats.pc1_variance}%`],
      ["PC2 Variance", `${safeStats.pc2_variance}%`],
    ],

    agents: [
      ["Statistics Agent", stats ? "complete" : "queued", stats ? 100 : 0, stats ? "DESeq2 analysis complete" : "Awaiting data"],
      ["Annotation Agent", annotation ? "complete" : "queued", annotation ? 100 : 0, annotation ? "Annotation loaded" : "Awaiting data"],
      ["Visualization Agent", stats ? "complete" : "queued", stats ? 100 : 0, stats ? "Generating interactive plots" : "Awaiting data"],
      ["Report Agent", "queued", stats && annotation ? 28 : 0, stats && annotation ? "Drafting final interpretation" : "Awaiting data"],
    ],

    genes: Object.keys(top20.ensembl_gene_id).map((key, index) => ({
      id: top20.ensembl_gene_id[key] ?? "",
      name: top20.symbol[key] ?? "",
      log2fc: top20.log2FC[key] ?? 0,
      pvalue: top20.pvalue[key] ?? 0,
      fdr: top20.FDR[key] ?? 0,
      significant: (top20.FDR[key] ?? 1) < 0.05,
      type: (top20.gene_type[key] ?? "").replace(/_/g, " "),
      biotype: (top20.gene_type[key] ?? "").replace(/_/g, " "),
      chromosome: top20.chromosome[key] ?? "",
      coordinates: `${Number(top20.start[key] ?? 0).toLocaleString()}-${Number(top20.end[key] ?? 0).toLocaleString()}`,
      label: index < 3,
    })),
  };

  // ---------- GENE TYPES ----------
  const geneTypeLabels: Record<string, string> = {
    protein_coding: "Protein Codings",
    lncRNA: "LncRNA",
    processed_pseudogene: "Processed Pseudogene",
    misc_RNA: "Misc RNA",
    transcribed_unprocessed_pseudogene: "Transcribed Unprocessed Pseudogene",
  };

  const geneTypes: GeneTypeCount[] = Object.entries(safeAnnotation.gene_type_distribution)
    .slice(0, 20)
    .map(([type, count]) => [geneTypeLabels[type] ?? type, count]);

  return { report, geneTypes };
}
