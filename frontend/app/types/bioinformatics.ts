export type SummaryIconName = "dna" | "sample" | "sigma" | "spark" | "tag" | "path";

export type SummaryMetric = readonly [
  title: string,
  value: string,
  subtitle: string,
  icon: SummaryIconName,
];

export type QcMetric = readonly [label: string, value: string];

export type WorkflowAgent = readonly [
  name: string,
  status: "complete" | "running" | "queued",
  percent: number,
  message: string,
];

export type Gene = {
  id: string;
  name: string;
  log2fc: number;
  pvalue: number;
  fdr: number;
  significant: boolean;
  type: string;
  biotype: string;
  chromosome: string;
  coordinates: string;
  label?: boolean;
};

export type GeneTypeCount = readonly [type: string, count: number];

export type Report = {
  name: string;
  generatedAt: string;
  summary: SummaryMetric[];
  qc: QcMetric[];
  agents: WorkflowAgent[];
  genes: Gene[];
};

export type PlotGeneDatum = Pick<Gene, "id" | "name" | "log2fc" | "pvalue" | "fdr" | "label">;
