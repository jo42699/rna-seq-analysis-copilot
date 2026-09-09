
"use client";

import { useEffect, useState } from "react";
import { useJob } from "@/app/context/Jobcontext";
import { useSelectedGene } from "@/app/context/SelectedGeneContext";
import { getReport } from "@/app/data/report";

import { FdrSignificancePlot } from "@/app/components/plots/FdrSignificancePlot";
import { MaPlot } from "@/app/components/plots/MaPlot";
import {  LollipopPlot  } from "@/app/components/plots/VolcanoPlot";
import { AppShell } from "@/app/components/layout/AppShell";
import { AIInterpretation } from "@/app/components/ui/AIInterpretation";
import { DataTable } from "@/app/components/ui/DataTable";
import { GeneTypesCard } from "@/app/components/ui/GeneTypesCard";
import { GeneTypesModal } from "@/app/components/ui/GeneTypesModal";
import { InfoCard } from "@/app/components/ui/InfoCard";
import { PlotCard } from "@/app/components/ui/PlotCard";
import { StatCard } from "@/app/components/ui/StatCard";

import type {
  Gene,
  GeneTypeCount,
  QcMetric,
  Report,
  SummaryMetric,
} from "@/app/types/bioinformatics";

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
    start: Record<string, number>;
    end: Record<string, number>;
  };

  gene_type_distribution: Record<
    string,
    number
  >;
};

type WorkflowAgent = {
  status?: string;
  message?: string;
  progress?: number;
};

type WorkflowResponse = {
  job_id: string;

  status?: string;

  workflow?: {
    statistics?: WorkflowAgent;
    deseq2?: WorkflowAgent;
    annotation?: WorkflowAgent;
    visualization?: WorkflowAgent;
    report?: WorkflowAgent;
    literature?: WorkflowAgent;
  };
};

/*
 * Raw /report/{jobId} response used specifically
 * by the three DESeq2 plots.
 */
type Deseq2Top20 = {
  log2FC: Record<string, number>;
  pvalue: Record<string, number>;
  FDR: Record<string, number>;
};

type ReportEndpointResponse = {
  deseq2_top20?: Deseq2Top20;
};

export function DashboardPage() {
  const { jobId } = useJob();

  const {
    selectedGene,
    setSelectedGene,
  } = useSelectedGene();

  const [report, setReport] =
    useState<Report | null>(null);

  const [geneTypes, setGeneTypes] =
    useState<GeneTypeCount[]>([]);

  const [geneModal, setGeneModal] =
    useState(false);

  const [annotationRows, setAnnotationRows] =
    useState<[string, string][]>([]);

  /*
   * These genes are ONLY for the three plots.
   *
   * They come from:
   *
   * /report/{jobId}
   *      ↓
   * deseq2_top20
   */
  const [plotGenes, setPlotGenes] =
  useState<Gene[]>([]);
  console.log("plotGenes", plotGenes);

  const [readyJobId, setReadyJobId] =
    useState<string | null>(null);

  const workflowReady =
    jobId !== null &&
    readyJobId === jobId;

  const loading =
    Boolean(jobId) &&
    !workflowReady;

  // --------------------------------------------------
  // WATCH BACKEND WORKFLOW
  // --------------------------------------------------

useEffect(() => {
  const currentJobId = jobId;

  if (!currentJobId) {
    return;
  }

  let isActive = true;

  async function checkWorkflow() {
    try {
      const res = await fetch(
        `http://localhost:8000/report/workflow/${currentJobId}`,
        {
          cache: "no-store",
        }
      );

      if (!res.ok) {
        return;
      }

      const data: WorkflowResponse =
        await res.json();

      if (!isActive) {
        return;
      }

      const agents = Object.values(
        data.workflow ?? {}
      );

      if (agents.length === 0) {
        return;
      }

      const hasFailed = agents.some(
        (agent) => {
          const status =
            agent.status?.toLowerCase();

          return (
            status === "failed" ||
            status === "error"
          );
        }
      );

      if (hasFailed) {
        console.error(
          "Backend workflow failed:",
          data
        );

        return;
      }

      const allComplete =
        agents.every((agent) => {
          const status =
            agent.status?.toLowerCase();

          return (
            status === "completed" ||
            status === "complete" ||
            status === "done" ||
            status === "success" ||
            agent.progress === 100
          );
        });

      if (allComplete) {
        setReadyJobId(currentJobId);
      }
    } catch (error) {
      console.error(
        "Workflow polling error:",
        error
      );
    }
  }

  // Check immediately.
  checkWorkflow();

  // Poll every second.
  const interval = setInterval(
    checkWorkflow,
    1000
  );

  return () => {
    isActive = false;
    clearInterval(interval);
  };
}, [jobId]);

  // --------------------------------------------------
  // LOAD REPORT WHEN WORKFLOW IS READY
  // --------------------------------------------------

  useEffect(() => {
    if (!jobId || !workflowReady) {
      return;
    }

    const currentJobId = jobId;

    let isActive = true;

    async function loadReport() {
      try {
        const result =
          await getReport(currentJobId);

        if (!isActive) {
          return;
        }

        setReport(result.report);

        setGeneTypes(
          result.geneTypes
        );

        setSelectedGene(
          result.report.genes[0] ??
            null
        );
      } catch (error) {
        if (!isActive) {
          return;
        }

        console.error(
          "Report loading error:",
          error
        );

        setReport(null);

        setGeneTypes([]);

        setSelectedGene(null);
      }
    }

    loadReport();

    return () => {
      isActive = false;
    };
  }, [
    jobId,
    workflowReady,
    setSelectedGene,
  ]);

  // --------------------------------------------------
  // LOAD DESEQ2 DATA FOR PLOTS
  //
  // SOURCE:
  // /report/{jobId}
  //
  // DATA:
  // response.deseq2_top20
  // --------------------------------------------------

useEffect(() => {
  if (!jobId || !workflowReady) {
    return;
  }

  const currentJobId = jobId;
  let isActive = true;

  async function loadPlotData() {
    try {
      const res = await fetch(
        `http://localhost:8000/report/${currentJobId}`,
        {
          cache: "no-store",
        }
      );

      if (!res.ok) {
        throw new Error(
          `Failed to load /report/${currentJobId}`
        );
      }

      const data: ReportEndpointResponse =
        await res.json();

      if (!isActive) {
        return;
      }

      const top20 = data?.deseq2_top20;

      if (!top20) {
        console.warn(
          "No deseq2_top20 found in /report response"
        );

        setPlotGenes([]);
        return;
      }

      const ids = Object.keys(
        top20.log2FC ?? {}
      );

      const genes: Gene[] = ids.map(
        (id, index) => {
          const log2fc =
            top20.log2FC?.[id] ?? 0;

          const pvalue =
            top20.pvalue?.[id] ?? 1;

          const fdr =
            top20.FDR?.[id] ?? 1;

          return {
            id,
            name: id,

            log2fc,
            pvalue,
            fdr,

            significant:
              fdr < 0.05,

            type: "",
            biotype: "",
            chromosome: "",
            coordinates: "",

            label: index < 3,
          };
        }
      );

      setPlotGenes(genes);

      if (genes.length > 0) {
        setSelectedGene(
          genes[0]
        );
      }
    } catch (error) {
      if (!isActive) {
        return;
      }

      console.error(
        "Plot data loading error:",
        error
      );

      setPlotGenes([]);
    }
  }

  loadPlotData();

  return () => {
    isActive = false;
  };
}, [
  jobId,
  workflowReady,
  setSelectedGene,
]);

  // --------------------------------------------------
  // LOAD ANNOTATION WHEN REPORT IS READY
  // --------------------------------------------------

  useEffect(() => {
    if (!jobId || !workflowReady) {
      return;
    }

    const currentJobId = jobId;

    let isActive = true;

    async function loadAnnotation() {
      try {
        const res = await fetch(
          `http://localhost:8000/report/annotation/${currentJobId}`,
          {
            cache: "no-store",
          }
        );

        if (!res.ok) {
          throw new Error(
            "Failed to load annotation"
          );
        }

        const annotation: AnnotationPayload =
          await res.json();

        if (!isActive) {
          return;
        }

        const summary =
          annotation?.gene_annotation_summary ??
          "";

        const match = (
          regex: RegExp
        ) =>
          summary.match(regex)?.[1] ??
          "N/A";

        setAnnotationRows([
          [
            "DESeq2 genes",
            match(
              /Total DESeq2 genes:\s*(\d+)/
            ),
          ],

          [
            "Annotated genes",
            match(
              /Annotated genes:\s*(\d+)/
            ),
          ],

          [
            "Missing annotations",
            match(
              /Missing annotations:\s*(\d+)/
            ),
          ],

          [
            "Success rate",
            match(
              /Annotation success rate:\s*([\d.]+%)/
            ),
          ],

          [
            "Missing ERCC spike-ins",
            match(
              /Missing ERCC spike-ins:\s*(\d+)/
            ),
          ],

          [
            "Other missing IDs",
            match(
              /Other missing IDs:\s*(\d+)/
            ),
          ],

          [
            "Protein coding",
            match(
              /protein_coding:\s*(\d+)/
            ),
          ],

          [
            "LncRNA",
            match(
              /lncRNA:\s*(\d+)/
            ),
          ],

          [
            "Processed pseudogene",
            match(
              /processed_pseudogene:\s*(\d+)/
            ),
          ],

          [
            "Misc RNA",
            match(
              /misc_RNA:\s*(\d+)/
            ),
          ],

          [
            "Transcribed unprocessed pseudogene",
            match(
              /transcribed_unprocessed_pseudogene:\s*(\d+)/
            ),
          ],
        ]);
      } catch (error) {
        if (!isActive) {
          return;
        }

        console.error(
          "Annotation loading error:",
          error
        );

        setAnnotationRows([
          [
            "DESeq2 genes",
            "N/A",
          ],
          [
            "Annotated genes",
            "N/A",
          ],
          [
            "Missing annotations",
            "N/A",
          ],
          [
            "Success rate",
            "N/A",
          ],
          [
            "Missing ERCC spike-ins",
            "N/A",
          ],
          [
            "Other missing IDs",
            "N/A",
          ],
          [
            "Protein coding",
            "N/A",
          ],
          [
            "LncRNA",
            "N/A",
          ],
          [
            "Processed pseudogene",
            "N/A",
          ],
          [
            "Misc RNA",
            "N/A",
          ],
          [
            "Transcribed unprocessed pseudogene",
            "N/A",
          ],
        ]);
      }
    }

    loadAnnotation();

    return () => {
      isActive = false;
    };
  }, [
    jobId,
    workflowReady,
  ]);

  // --------------------------------------------------
  // SAFE DATA
  
  const safeGenes =
    report?.genes ?? [];

  /*
   * Plot data comes specifically from:
   *
   * /report/{jobId}
   *      ↓
   * deseq2_top20
   */
 

  const safeSummary: SummaryMetric[] =
    report?.summary ?? [];

  const safeQC: QcMetric[] =
    report?.qc ?? [];

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <AppShell>
      <main className="dashboard-scroll">

        {/* SUMMARY GRID */}

        <section className="summary-grid">
          {loading ? (
            <StatCard
              title="Processing…"
              value="…"
              subtitle="Analysis is running"
              icon="dna"
            />
          ) : safeSummary.length ===
            0 ? (
            <StatCard
              title="No analysis"
              value="0"
              subtitle="Upload a report"
              icon="dna"
            />
          ) : (
            safeSummary.map(
              ([
                title,
                value,
                sub,
                icon,
              ]) => (
                <StatCard
                  key={title}
                  title={title}
                  value={
                    value ?? "0"
                  }
                  subtitle={
                    sub ?? ""
                  }
                  icon={icon}
                />
              )
            )
          )}
        </section>

        {/* QC STRIP */}

        <section className="qc-strip">
          {loading ? (
            <div>
              <span>
                Processing QC…
              </span>

              <strong>
                —
              </strong>
            </div>
          ) : safeQC.length ===
            0 ? (
            <div>
              <span>
                No QC metrics
              </span>

              <strong>
                —
              </strong>
            </div>
          ) : (
            safeQC.map(
              ([
                label,
                value,
              ]) => (
                <div
                  key={label}
                >
                  <span>
                    {label}
                  </span>

                  <strong>
                    {value ??
                      "—"}
                  </strong>
                </div>
              )
            )
          )}
        </section>

        {/* PLOTS */}

        <section className="plot-grid">
          {loading ? (
            <div className="loading-plots">
              Waiting for analysis
              to finish…
            </div>
          ) : (
            <>
              {/* VOLCANO */}

              <PlotCard
                title="horizontal dot plot"
                subtitle="Gene vs −log10(FDR)."
              >
      <LollipopPlot
  genes={safeGenes}
  onSelect={setSelectedGene}
  selected={selectedGene?.id ?? ""}
/>
              </PlotCard>

              {/* MA */}

                
    <PlotCard
      title="Ranked log2FC bar chart"
      subtitle="Top genes ranked by FDR and displayed by log2 fold change"
    >
      <MaPlot
        genes={safeGenes}
        onSelect={setSelectedGene}
        selected={selectedGene?.id ?? ""}
      />
    </PlotCard>



              {/* FDR */}

             <PlotCard
              title="FDR Significance Plot"
              subtitle="genes ranked by adjusted significance"
            >
 
<FdrSignificancePlot
  genes={safeGenes}
  onSelect={setSelectedGene}
  selected={selectedGene?.id ?? ""}
/>


            </PlotCard>
            </>
          )}
        </section>

        {/* LOWER GRID */}

        <section className="lower-grid">
          {loading ? (
            <div>
              Waiting for analysis
              results…
            </div>
          ) : (
            <>
              <DataTable
                genes={safeGenes}
                onSelect={
                  setSelectedGene
                }
                selected={
                  selectedGene?.id ??
                  ""
                }
              />

              <InfoCard
                title="Gene Annotation Statistics"
                rows={
                  annotationRows
                }
              />

              <GeneTypesCard
                geneTypes={
                  geneTypes
                }
                onExpand={() =>
                  setGeneModal(
                    true
                  )
                }
              />
            </>
          )}
        </section>

        <AIInterpretation />
      </main>

      {geneModal ? (
        <GeneTypesModal
          geneTypes={
            geneTypes
          }
          onClose={() =>
            setGeneModal(
              false
            )
          }
        />
      ) : null}
    </AppShell>
  );
}

