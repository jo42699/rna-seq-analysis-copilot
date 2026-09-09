
"use client";

import { useEffect, useMemo, useState } from "react";

import { BookOpen, ExternalLink } from "lucide-react";

import { PanelNote } from "@/app/components/layout/PanelNote";
import { useJob } from "@/app/context/Jobcontext";


// TYPES


interface BackendReport {
  rna_seq_summary?: {
    low_count_genes?: number;
    zero_count_samples?: string[];
    [key: string]: unknown;
  };

  deseq2_top20?: {
    significant_genes?: number;
    log2FC?: Record<string, number>;
    [key: string]: unknown;
  };

  gene_annotation_summary?: string;

  gene_type_distribution?: Record<string, number>;

  [key: string]: unknown;
}

interface BackendTechnicalReport {
  total_genes?: number;
  total_samples?: number;

  total_counts_per_sample?: Record<string, number>;

  top_expressed_genes?: Record<string, number>;

  low_count_genes?: number;

  zero_count_samples?: string[];

  deseq2_top20?: {
    significant_genes?: number;
    max_log2FC?: number;
    min_log2FC?: number;
    [key: string]: unknown;
  };

  gene_annotation_summary?: {
    total_deseq2_genes?: number;
    annotated_genes?: number;
    missing_annotations?: number;
    annotation_success_rate?: number;
    missing_ercc_spike_ins?: number;
    other_missing_ids?: number;
  };

  gene_type_distribution?: Record<string, number>;

  plot_summaries?: {
    volcano?: string;
    pca?: string;
    heatmap?: string;
    pathway?: string;
  };

  [key: string]: unknown;
}

// LLM TYPES


interface BackendClinicalSummary {
  significant_genes?: number;

  enriched_pathways?: number;

  interpretation?: string;

  [key: string]: unknown;
}

type BackendLaySummary = string;

interface BackendHighlights {
  total_genes_analyzed?: number;

  total_samples?: number;

  significant_genes?: number;

  top_expressed_gene?: string;

  top_gene_type?: string;

  significant_gene?: string;

  pca_variance?: string;

  [key: string]: unknown;
}

type BackendLimitations = string | string[];

type BackendNextSteps = string | string[];

interface BackendLLMOutput {
  technical_report?: BackendTechnicalReport;

  clinical_summary?: BackendClinicalSummary;

  lay_summary?: BackendLaySummary;

  highlights?: BackendHighlights;

  limitations?: BackendLimitations;

  next_steps?: BackendNextSteps;

  [key: string]: unknown;
}

interface LLMReportResponse {
  llm_output?: BackendLLMOutput;
}


// LITERATURE TYPES


interface LiteraturePaper {
  pubmed_id?: string;
  title?: string;
  journal?: string;
  pubdate?: string;
  authors?: string[];
  link?: string;
  query?: string;
  summary?: string;
}

interface LiteratureGene {
  gene?: string;
  papers?: LiteraturePaper[];
}

interface LiteratureResponse {
  literature?: {
    raw_results?: LiteratureGene[];

    ranked_results?: LiteratureGene[];

    summary?: string;

    confidence?: string;

    genes?: LiteratureGene[];
  };

  raw_results?: LiteratureGene[];

  [key: string]: unknown;
}


// PROPS


type RightPanelProps = {
  collapsed: boolean;
  onToggle: () => void;
};


// COMPONENT


export function RightPanel({
  collapsed,
  onToggle,
}: RightPanelProps) {
  const { jobId } = useJob();

  const [tab, setTab] = useState<"gene" | "ai">("gene");

  const [llmOutput, setLlmOutput] =
    useState<BackendLLMOutput | null>(null);

  const [loadedJobId, setLoadedJobId] =
    useState<string | null>(null);

  const [analysisReport, setAnalysisReport] =
    useState<BackendReport | null>(null);

  const [literatureCount, setLiteratureCount] =
    useState<number | null>(null);

  const [literatureGenes, setLiteratureGenes] =
    useState<LiteratureGene[]>([]);

  const [literatureOpen, setLiteratureOpen] =
    useState(false);


  // LOADING STATES


  const hasLoadedLLM =
    jobId !== null &&
    loadedJobId === jobId &&
    llmOutput !== null;

  const analysisLoading =
    jobId !== null &&
    analysisReport === null;

  const llmLoading =
    jobId !== null &&
    !hasLoadedLLM;


  // LLM DATA


  const clinical =
    llmOutput?.clinical_summary &&
    typeof llmOutput.clinical_summary === "object" &&
    !Array.isArray(llmOutput.clinical_summary)
      ? llmOutput.clinical_summary
      : {};



 const limitations =
  Array.isArray(llmOutput?.limitations)
    ? llmOutput.limitations.join(" ")
    : typeof llmOutput?.limitations === "string"
      ? llmOutput.limitations
      : "";

  const nextSteps = Array.isArray(llmOutput?.next_steps)
  ? llmOutput.next_steps
  : typeof llmOutput?.next_steps === "string"
    ? [llmOutput.next_steps]
    : [];

  const laySummary =
    typeof llmOutput?.lay_summary === "string"
      ? llmOutput.lay_summary
      : typeof llmOutput?.lay_summary === "object" &&
          llmOutput?.lay_summary
        ? String(
            (
              llmOutput.lay_summary as Record<
                string,
                unknown
              >
            )?.overview ??
              ""
          )
        : "";

  
  // ANALYSIS REPORT DATA
  

  const rnaSummary =
    analysisReport?.rna_seq_summary ?? {};

  const deseq2 =
    analysisReport?.deseq2_top20 ?? {};

  const annotationText =
    analysisReport?.gene_annotation_summary ?? "";

  const geneTypes =
    analysisReport?.gene_type_distribution ?? {};

  
  // PARSE ANNOTATION SUMMARY


  const getAnnotationValue = (
    label: string
  ): number | null => {
    if (!annotationText) {
      return null;
    }

    const escapedLabel = label.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const match = annotationText.match(
      new RegExp(
        `${escapedLabel}\\s*[:=]\\s*([0-9]+(?:\\.[0-9]+)?)`,
        "i"
      )
    );

    return match
      ? Number(match[1])
      : null;
  };

  const totalDeseq2Genes =
    getAnnotationValue(
      "Total DESeq2 genes"
    );

  const annotatedGenes =
    getAnnotationValue(
      "Annotated genes"
    );

  const missingAnnotations =
    getAnnotationValue(
      "Missing annotations"
    );

  const annotationSuccessRate =
    getAnnotationValue(
      "Annotation success rate"
    );

  const missingErccSpikeIns =
    getAnnotationValue(
      "Missing ERCC spike-ins"
    );

  const otherMissingIds =
    getAnnotationValue(
      "Other missing IDs"
    );


  // DESEQ2 LOG2FC
 

  const log2FCValues =
    Object.values(
      deseq2.log2FC ?? {}
    ).filter(
      (value): value is number =>
        typeof value === "number" &&
        Number.isFinite(value)
    );

  const maxLog2FC =
    log2FCValues.length > 0
      ? Math.max(...log2FCValues)
      : null;

  const minLog2FC =
    log2FCValues.length > 0
      ? Math.min(...log2FCValues)
      : null;

  
  // FETCH MAIN ANALYSIS REPORT


  useEffect(() => {
    const currentJobId = jobId;

    if (!currentJobId) {
      return;
    }

    const controller =
      new AbortController();

    let interval:
      | ReturnType<typeof setInterval>
      | null = null;

    async function fetchAnalysisReport() {
      try {
        const res = await fetch(
          `http://localhost:8000/report/${currentJobId}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          if (res.status === 404) {
            return;
          }

          console.error(
            "Analysis report request failed:",
            res.status
          );

          return;
        }

        const data =
          await res.json();

        const report =
          data?.report ?? data;

        setAnalysisReport(
          report as BackendReport
        );

        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "Analysis report loading error:",
          error
        );
      }
    }

    fetchAnalysisReport();

    interval = setInterval(
      fetchAnalysisReport,
      1000
    );

    return () => {
      controller.abort();

      if (interval) {
        clearInterval(interval);
      }
    };
  }, [jobId]);

 
  // FETCH LLM REPORT
 

  useEffect(() => {
    const currentJobId = jobId;

    if (!currentJobId) {
      return;
    }

    let interval:
      | ReturnType<typeof setInterval>
      | null = null;

    const controller =
      new AbortController();

    async function fetchReport() {
      try {
        const res = await fetch(
          `http://localhost:8000/report/llm/${currentJobId}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          return;
        }

        const data: LLMReportResponse =
          await res.json();

        console.log(
          "LLM API response:",
          data
        );

        if (data?.llm_output) {
          setLlmOutput(
            data.llm_output
          );

          setLoadedJobId(
            currentJobId
          );

          if (interval) {
            clearInterval(interval);
            interval = null;
          }
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "LLM report loading error:",
          error
        );
      }
    }

    fetchReport();

    interval = setInterval(
      fetchReport,
      1000
    );

    return () => {
      controller.abort();

      if (interval) {
        clearInterval(interval);
      }
    };
  }, [jobId]);

  
  // FETCH LITERATURE


  // ==========================================================
  // FETCH LITERATURE
  // ==========================================================

  useEffect(() => {
    const currentJobId = jobId;

    // Do nothing until we have a job AND the main analysis
    // report has finished loading.
    if (!currentJobId || !analysisReport) {
      return;
    }

    const controller = new AbortController();

    async function fetchLiterature() {
      try {
        console.log(
          "[Literature] Starting literature fetch for job:",
          currentJobId
        );

        const res = await fetch(
          `http://localhost:8000/report/literature/${currentJobId}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          if (res.status === 404) {
            console.log(
              "[Literature] Literature not available yet."
            );
            return;
          }

          console.error(
            "[Literature] Request failed:",
            res.status
          );

          return;
        }

        const data: LiteratureResponse = await res.json();

        console.log(
          "[Literature] API response:",
          data
        );

        const rawResults =
          data?.literature?.raw_results ??
          data?.raw_results ??
          data?.literature?.genes ??
          [];

        // Store literature immediately.
        setLiteratureGenes(rawResults);

        // Count papers that actually have a literature link.
        const count = rawResults.reduce(
          (total, gene) =>
            total +
            (Array.isArray(gene?.papers)
              ? gene.papers.filter(
                  (paper) =>
                    typeof paper?.link === "string" &&
                    paper.link.trim().length > 0
                ).length
              : 0),
          0
        );

        setLiteratureCount(count);

        console.log(
          `[Literature] Loaded ${count} papers.`
        );
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "[Literature] Loading error:",
          error
        );
      }
    }

    fetchLiterature();

    return () => {
      controller.abort();
    };
  }, [jobId, analysisReport]);
  // LITERATURE BY GENE


  const literatureByGene =
    useMemo(() => {
      return literatureGenes.map(
        (gene) => ({
          gene:
            gene.gene ??
            "Unknown gene",

          papers:
            Array.isArray(
              gene.papers
            )
              ? gene.papers.filter(
                  (paper) =>
                    typeof paper?.link ===
                      "string" &&
                    paper.link
                      .trim()
                      .length > 0
                )
              : [],
        })
      );
    }, [literatureGenes]);


  // COLLAPSED PANEL


  if (collapsed) {
    return (
      <aside className="right-panel collapsed">
        <button
          className="panel-toggle"
          onClick={onToggle}
          aria-label="Expand analysis panel"
        >
          <svg viewBox="0 0 24 24">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>

        <span className="rail-label">
          Analysis Summary
        </span>
      </aside>
    );
  }


  // EXPANDED PANEL
  

  return (
    <aside className="right-panel">
      <button
        className="panel-toggle"
        onClick={onToggle}
        aria-label="Collapse analysis panel"
      >
        <svg viewBox="0 0 24 24">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {/* TABS */}

      <div className="panel-tabs">
        <button
          className={
            tab === "gene"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab("gene")
          }
        >
          Analysis Summary
        </button>

        <button
          className={
            tab === "ai"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab("ai")
          }
        >
          AI Insights
        </button>
      </div>

      {/* 
          ANALYSIS SUMMARY TAB
      */}

      {tab === "gene" ? (
        <>
          {analysisLoading ? (
            <section className="panel-card">
              <p>
                Loading report...
              </p>
            </section>
          ) : (
            <section className="panel-card">
              <p className="eyebrow">
                Analysis Summary
              </p>

              <h2>
                RNA-seq Analysis
              </h2>

              {/* 
                  RNA / DESEQ2
               */}

              <div className="detail-row">
                <span>
                  Low-count genes
                </span>

                <strong>
                  {typeof rnaSummary.low_count_genes ===
                  "number"
                    ? rnaSummary.low_count_genes.toLocaleString()
                    : "—"}
                </strong>
              </div>

              <div className="detail-row">
                <span>
                  Zero-count samples
                </span>

                <strong>
                  {Array.isArray(
                    rnaSummary.zero_count_samples
                  )
                    ? rnaSummary
                        .zero_count_samples
                        .length
                    : "—"}
                </strong>
              </div>

              <div className="detail-row">
                <span>
                  Max log2FC
                </span>

                <strong>
                  {maxLog2FC !== null
                    ? maxLog2FC
                    : "—"}
                </strong>
              </div>

              <div className="detail-row">
                <span>
                  Min log2FC
                </span>

                <strong>
                  {minLog2FC !== null
                    ? minLog2FC
                    : "—"}
                </strong>
              </div>

              <div className="detail-row">
                <span>
                  DESeq2 genes
                </span>

                <strong>
                  {totalDeseq2Genes !== null
                    ? totalDeseq2Genes.toLocaleString()
                    : "—"}
                </strong>
              </div>

              {/* 
                  ANNOTATION
              */}

              <div className="detail-row">
                <span>
                  Annotated genes
                </span>

                <strong>
                  {annotatedGenes !== null
                    ? annotatedGenes.toLocaleString()
                    : "—"}
                </strong>
              </div>

              <div className="detail-row">
                <span>
                  Missing annotations
                </span>

                <strong>
                  {missingAnnotations !== null
                    ? missingAnnotations.toLocaleString()
                    : "—"}
                </strong>
              </div>

              <div className="detail-row">
                <span>
                  Annotation success rate
                </span>

                <strong>
                  {annotationSuccessRate !==
                  null
                    ? `${annotationSuccessRate}%`
                    : "—"}
                </strong>
              </div>

              <div className="detail-row">
                <span>
                  Missing ERCC spike-ins
                </span>

                <strong>
                  {missingErccSpikeIns !==
                  null
                    ? missingErccSpikeIns.toLocaleString()
                    : "—"}
                </strong>
              </div>

              <div className="detail-row">
                <span>
                  Other missing IDs
                </span>

                <strong>
                  {otherMissingIds !== null
                    ? otherMissingIds.toLocaleString()
                    : "—"}
                </strong>
              </div>

              {/* 
                  GENE TYPE DISTRIBUTION
               */}

              <div className="detail-row">
                <span>
                  Protein coding
                </span>

                <strong>
                  {typeof geneTypes.protein_coding ===
                  "number"
                    ? geneTypes.protein_coding.toLocaleString()
                    : "—"}
                </strong>
              </div>

              <div className="detail-row">
                <span>
                  lncRNA
                </span>

                <strong>
                  {typeof geneTypes.lncRNA ===
                  "number"
                    ? geneTypes.lncRNA.toLocaleString()
                    : "—"}
                </strong>
              </div>

              <div className="detail-row">
                <span>
                  Processed pseudogene
                </span>

                <strong>
                  {typeof geneTypes.processed_pseudogene ===
                  "number"
                    ? geneTypes.processed_pseudogene.toLocaleString()
                    : "—"}
                </strong>
              </div>

              <div className="detail-row">
                <span>
                  misc RNA
                </span>

                <strong>
                  {typeof geneTypes.misc_RNA ===
                  "number"
                    ? geneTypes.misc_RNA.toLocaleString()
                    : "—"}
                </strong>
              </div>

              <div className="detail-row">
                <span>
                  Transcribed unprocessed
                  pseudogene
                </span>

                <strong>
                  {typeof geneTypes.transcribed_unprocessed_pseudogene ===
                  "number"
                    ? geneTypes.transcribed_unprocessed_pseudogene.toLocaleString()
                    : "—"}
                </strong>
              </div>

              {/* 
                  ANY ADDITIONAL GENE TYPE CATEGORIES
              */}

              {Object.entries(geneTypes)
                .filter(
                  ([key]) =>
                    ![
                      "protein_coding",
                      "lncRNA",
                      "processed_pseudogene",
                      "misc_RNA",
                      "transcribed_unprocessed_pseudogene",
                    ].includes(key)
                )
                .map(
                  ([key, value]) => (
                    <div
                      className="detail-row"
                      key={key}
                    >
                      <span>
                        {key
                          .replace(
                            /_/g,
                            " "
                          )
                          .replace(
                            /\b\w/g,
                            (letter) =>
                              letter.toUpperCase()
                          )}
                      </span>

                      <strong>
                        {typeof value ===
                        "number"
                          ? value.toLocaleString()
                          : String(
                              value
                            )}
                      </strong>
                    </div>
                  )
                )}
            </section>
          )}

          {/* 
              LITERATURE
           */}

          <div className="literature-mini">
            <BookOpen
              className="literature-icon"
              size={18}
            />

            <div className="literature-text">
              <span>
                Literature
              </span>

              <strong>
                {literatureCount ===
                null
                  ? "—"
                  : `${literatureCount} ${
                      literatureCount === 1
                        ? "paper"
                        : "papers"
                    }`}
              </strong>
            </div>

            <button
              className="literature-btn"
              onClick={() =>
                setLiteratureOpen(
                  (open) => !open
                )
              }
            >
              {literatureOpen
                ? "Hide Literature"
                : "View Literature"}
            </button>
          </div>

          {/* 
              COMPLETE LITERATURE LIST
           */}

          {literatureOpen && (
            <section className="panel-card literature-panel">
              <p className="eyebrow">
                Literature
              </p>

              <h2>
                {literatureCount ?? 0}{" "}
                literature links
              </h2>

              <p>
                Showing all literature
                links returned in{" "}
                <code>
                  raw_results
                </code>
                .
              </p>

              {literatureByGene.length ===
              0 ? (
                <p>
                  No literature found.
                </p>
              ) : (
                literatureByGene.map(
                  ({
                    gene,
                    papers,
                  }) => (
                    <div
                      key={gene}
                      className="literature-gene"
                    >
                      <h3>
                        {gene}{" "}
                        <span>
                          ({papers.length})
                        </span>
                      </h3>

                      {papers.map(
                        (
                          paper,
                          index
                        ) => (
                          <div
                            key={
                              paper.pubmed_id ??
                              `${gene}-${index}`
                            }
                            className="literature-paper"
                          >
                            <a
                              href={
                                paper.link
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <strong>
                                {paper.title ??
                                  "Untitled paper"}
                              </strong>

                              <ExternalLink
                                size={
                                  14
                                }
                              />
                            </a>

                            {paper.journal && (
                              <span>
                                {
                                  paper.journal
                                }
                              </span>
                            )}

                            {paper.pubdate && (
                              <span>
                                {
                                  paper.pubdate
                                }
                              </span>
                            )}

                            {paper.pubmed_id && (
                              <span>
                                PMID:{" "}
                                {
                                  paper.pubmed_id
                                }
                              </span>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  )
                )
              )}
            </section>
          )}

          {/* 
              LLM NOTES
           */}

          {llmOutput && (
            <>
              <PanelNote
                title="Clinical Interpretation"
                text={
                  clinical.interpretation ??
                  "No clinical interpretation available."
                }
              />

              <PanelNote
                title="Plain Language Summary"
                text={
                  laySummary ||
                  "No plain language summary available."
                }
              />

            

              <PanelNote
                title="Limitations"
                text={
                  limitations ||
                  "No limitation information available."
                }
              />

           <PanelNote
            title="Recommended Next Step"
            text={
              nextSteps.length > 0
                ? nextSteps.map((item) => `• ${item}`).join("\n")
                : "No next-step recommendation available."
            }
/>
            </>
          )}
        </>
      ) : (
        /* 
           AI TAB
        */

        <section className="panel-card">
          <p className="eyebrow">
            AI Insights
          </p>

          <h2>
            Context-aware insight
          </h2>

          {llmLoading ? (
            <p>
              Loading AI insights...
            </p>
          ) : llmOutput ? (
            <>
              <PanelNote
                title="Clinical Interpretation"
                text={
                  clinical.interpretation ??
                  "No clinical interpretation available."
                }
              />

              <PanelNote
                title="Significant Genes"
                text={
                  typeof clinical.significant_genes ===
                  "number"
                    ? clinical.significant_genes.toLocaleString()
                    : "No significant gene count available."
                }
              />

              <PanelNote
                title="Enriched Pathways"
                text={
                  typeof clinical.enriched_pathways ===
                  "number"
                    ? clinical.enriched_pathways.toLocaleString()
                    : "No enriched pathway count available."
                }
              />

      

 

              <PanelNote
                title="Plain Language Overview"
                text={
                  laySummary ||
                  "No plain language overview available."
                }
              />

              <PanelNote
                title="Limitations"
                text={
                  limitations ||
                  "No limitations available."
                }
              />

              <PanelNote
                title="Recommended Next Step"
                text={
                  nextSteps.length > 0
                    ? nextSteps.map((item) => `• ${item}`).join("\n")
                    : "No next-step recommendation available."
                }
              />
            </>
          ) : (
            <p>
              No AI insights available.
            </p>
          )}
        </section>
      )}
    </aside>
  );
}

