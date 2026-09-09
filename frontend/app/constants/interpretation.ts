
export interface LLMOutput {
  technical_report: {
    title: string;
    date: string;

    summary: {
      total_genes: number;
      total_samples: number;
      top_expressed_genes: string[];
      low_count_genes: number;
      zero_count_samples: string[];

      differential_expression: {
        significant_genes: number;
        max_log2FC: number;
        min_log2FC: number;
      };

      gene_annotation: {
        total_genes: number;
        annotated_genes: number;
        missing_annotations: number;
        annotation_success_rate: string;
      };

      gene_type_distribution: {
        protein_coding: number;
        lncRNA: number;
        processed_pseudogene: number;
      };

      pca: {
        PC1_variance: string;
        PC2_variance: string;
        conditions_detected: number;
      };

      pathway_enrichment: {
        genes_tested: number;
        significant_genes: number;
        enriched_pathways: number;
      };
    };
  };



  clinical_summary: {
    significant_genes: number;
    enriched_pathways: number;
    interpretation: string;
  };

  lay_summary: string;

  highlights: {
    total_genes_analyzed: number;
    total_samples: number;
    significant_genes: number;
    top_expressed_gene: string;
    top_gene_type: string;
  };

  limitations: string | string[];

  next_steps: string | string[];
}

export interface LLMReportResponse {
  llm_output?: Partial<LLMOutput> | null;
}



export const savedAnalyses = [
  "Primary RNA-seq interpretation",
  "TP53 follow-up",
  "Publication summary",
] as const;



export const EMPTY_LLM_OUTPUT: LLMOutput = {
  technical_report: {
    title: "No analysis available",
    date: "",

    summary: {
      total_genes: 0,
      total_samples: 0,
      top_expressed_genes: [],
      low_count_genes: 0,
      zero_count_samples: [],

      differential_expression: {
        significant_genes: 0,
        max_log2FC: 0,
        min_log2FC: 0,
      },

      gene_annotation: {
        total_genes: 0,
        annotated_genes: 0,
        missing_annotations: 0,
        annotation_success_rate: "0%",
      },

      gene_type_distribution: {
        protein_coding: 0,
        lncRNA: 0,
        processed_pseudogene: 0,
      },

      pca: {
        PC1_variance: "0%",
        PC2_variance: "0%",
        conditions_detected: 0,
      },

      pathway_enrichment: {
        genes_tested: 0,
        significant_genes: 0,
        enriched_pathways: 0,
      },
    },
  },

  clinical_summary: {
    significant_genes: 0,
    enriched_pathways: 0,
    interpretation:
      "No clinical interpretation available.",
  },

  lay_summary:
    "Upload an RNA-seq report to begin.",

  highlights: {
    total_genes_analyzed: 0,
    total_samples: 0,
    significant_genes: 0,
    top_expressed_gene: "",
    top_gene_type: "",
  },

  limitations:
    "No limitations information available.",

  next_steps:
    "No next steps available.",
};



export function normalizeLLMOutput(
  input: Partial<LLMOutput> | null | undefined
): LLMOutput {
  const technical =
    input?.technical_report;

  const incomingSummary =
    technical?.summary;

  const incomingDE =
    incomingSummary?.differential_expression;

  const incomingAnnotation =
    incomingSummary?.gene_annotation;

  const incomingGeneTypes =
    incomingSummary?.gene_type_distribution;

  const incomingPCA =
    incomingSummary?.pca;

  const incomingPathway =
    incomingSummary?.pathway_enrichment;

  const incomingClinical =
    input?.clinical_summary;

  const incomingHighlights =
    input?.highlights;

  return {
  
    // TECHNICAL REPORT
    

    technical_report: {
      title:
        typeof technical?.title === "string"
          ? technical.title
          : EMPTY_LLM_OUTPUT
              .technical_report.title,

      date:
        typeof technical?.date === "string"
          ? technical.date
          : EMPTY_LLM_OUTPUT
              .technical_report.date,

      summary: {
        total_genes:
          typeof incomingSummary?.total_genes ===
          "number"
            ? incomingSummary.total_genes
            : 0,

        total_samples:
          typeof incomingSummary?.total_samples ===
          "number"
            ? incomingSummary.total_samples
            : 0,

        top_expressed_genes:
          Array.isArray(
            incomingSummary?.top_expressed_genes
          )
            ? incomingSummary.top_expressed_genes
            : [],

        low_count_genes:
          typeof incomingSummary?.low_count_genes ===
          "number"
            ? incomingSummary.low_count_genes
            : 0,

        zero_count_samples:
          Array.isArray(
            incomingSummary?.zero_count_samples
          )
            ? incomingSummary.zero_count_samples
            : [],

        differential_expression: {
          significant_genes:
            typeof incomingDE?.significant_genes ===
            "number"
              ? incomingDE.significant_genes
              : 0,

          max_log2FC:
            typeof incomingDE?.max_log2FC ===
            "number"
              ? incomingDE.max_log2FC
              : 0,

          min_log2FC:
            typeof incomingDE?.min_log2FC ===
            "number"
              ? incomingDE.min_log2FC
              : 0,
        },

        gene_annotation: {
          total_genes:
            typeof incomingAnnotation?.total_genes ===
            "number"
              ? incomingAnnotation.total_genes
              : 0,

          annotated_genes:
            typeof incomingAnnotation?.annotated_genes ===
            "number"
              ? incomingAnnotation.annotated_genes
              : 0,

          missing_annotations:
            typeof incomingAnnotation
              ?.missing_annotations ===
            "number"
              ? incomingAnnotation.missing_annotations
              : 0,

          annotation_success_rate:
            typeof incomingAnnotation
              ?.annotation_success_rate ===
            "string"
              ? incomingAnnotation.annotation_success_rate
              : "0%",
        },

        gene_type_distribution: {
          protein_coding:
            typeof incomingGeneTypes
              ?.protein_coding === "number"
              ? incomingGeneTypes.protein_coding
              : 0,

          lncRNA:
            typeof incomingGeneTypes?.lncRNA ===
            "number"
              ? incomingGeneTypes.lncRNA
              : 0,

          processed_pseudogene:
            typeof incomingGeneTypes
              ?.processed_pseudogene ===
            "number"
              ? incomingGeneTypes.processed_pseudogene
              : 0,
        },

        pca: {
          PC1_variance:
            typeof incomingPCA?.PC1_variance ===
            "string"
              ? incomingPCA.PC1_variance
              : "0%",

          PC2_variance:
            typeof incomingPCA?.PC2_variance ===
            "string"
              ? incomingPCA.PC2_variance
              : "0%",

          conditions_detected:
            typeof incomingPCA
              ?.conditions_detected ===
            "number"
              ? incomingPCA.conditions_detected
              : 0,
        },

        pathway_enrichment: {
          genes_tested:
            typeof incomingPathway
              ?.genes_tested === "number"
              ? incomingPathway.genes_tested
              : 0,

          significant_genes:
            typeof incomingPathway
              ?.significant_genes ===
            "number"
              ? incomingPathway.significant_genes
              : 0,

          enriched_pathways:
            typeof incomingPathway
              ?.enriched_pathways ===
            "number"
              ? incomingPathway.enriched_pathways
              : 0,
        },
      },
    },

   
    // CLINICAL SUMMARY
  

    clinical_summary: {
      significant_genes:
        typeof incomingClinical
          ?.significant_genes ===
        "number"
          ? incomingClinical.significant_genes
          : 0,

      enriched_pathways:
        typeof incomingClinical
          ?.enriched_pathways ===
        "number"
          ? incomingClinical.enriched_pathways
          : 0,

      interpretation:
        typeof incomingClinical
          ?.interpretation === "string"
          ? incomingClinical.interpretation
          : EMPTY_LLM_OUTPUT
              .clinical_summary
              .interpretation,
    },


    // LAY SUMMARY
  

    lay_summary:
      typeof input?.lay_summary === "string"
        ? input.lay_summary
        : EMPTY_LLM_OUTPUT.lay_summary,

   
    // HIGHLIGHTS
  

    highlights: {
      total_genes_analyzed:
        typeof incomingHighlights
          ?.total_genes_analyzed ===
        "number"
          ? incomingHighlights.total_genes_analyzed
          : 0,

      total_samples:
        typeof incomingHighlights
          ?.total_samples === "number"
          ? incomingHighlights.total_samples
          : 0,

      significant_genes:
        typeof incomingHighlights
          ?.significant_genes === "number"
          ? incomingHighlights.significant_genes
          : 0,

      top_expressed_gene:
        typeof incomingHighlights
          ?.top_expressed_gene ===
        "string"
          ? incomingHighlights.top_expressed_gene
          : "",

      top_gene_type:
        typeof incomingHighlights
          ?.top_gene_type === "string"
          ? incomingHighlights.top_gene_type
          : "",
    },

   
    // LIMITATIONS
    
  limitations:
  typeof input?.limitations === "string" ||
  Array.isArray(input?.limitations)
    ? input.limitations
    : EMPTY_LLM_OUTPUT.limitations,

   
    // NEXT STEPS
  

    next_steps:
      typeof input?.next_steps === "string"  ||
      Array.isArray(input?.next_steps)
        ? input.next_steps
        : EMPTY_LLM_OUTPUT.next_steps,
  };
}

/**
 * 
 * FETCH LLM REPORT
 * 
 */

export async function fetchLLMReport(
  jobId: string
): Promise<LLMOutput | null> {
  if (!jobId) {
    return null;
  }

  let attempt = 0;

  while (true) {
    attempt++;

    try {
      const response = await fetch(
        `http://localhost:8000/report/llm/${jobId}`,
        {
          cache: "no-store",

          headers: {
            Accept: "application/json",
          },
        }
      );

     

      if (!response.ok) {
        console.log(
          `LLM report not ready yet for ${jobId}. ` +
            `Attempt ${attempt}. Status: ${response.status}`
        );

        await new Promise((resolve) =>
          setTimeout(resolve, 1000)
        );

        continue;
      }

      const data: LLMReportResponse =
        await response.json();

      /**
       * Backend responded successfully but there
       * is no LLM output yet.
       */

      if (!data?.llm_output) {
        console.log(
          `LLM report response is empty for ${jobId}. ` +
            `Attempt ${attempt}.`
        );

        await new Promise((resolve) =>
          setTimeout(resolve, 1000)
        );

        continue;
      }

      /**
       * Normalize the backend response.
       */

      const normalized =
        normalizeLLMOutput(
          data.llm_output
        );

      console.log(
        `LLM report loaded successfully for ${jobId}.`
      );

      return normalized;
    } catch (error) {
      console.warn(
        `LLM report polling error for ${jobId}:`,
        error
      );

      await new Promise((resolve) =>
        setTimeout(resolve, 1500)
      );
    }
  }
}


export function buildInitialInterpretation(
  report: LLMOutput
): string {
  return (
    `## Overall Assessment\n` +
    `${report.clinical_summary.interpretation}\n\n` +

    `## Plain Language Summary\n` +
    `${report.lay_summary}\n\n` +

   
    `## Limitations\n` +
    `${report.limitations}\n\n` +

    `## Recommended Next Steps\n` +
    `${report.next_steps}`
  );
}

/**
 * ---------------------------------------------------------
 * BUILD AI INTERPRETATION CARDS
 * ---------------------------------------------------------
 */

export function buildAIInterpretationCards(
  report: LLMOutput
) {
  return [
    {
      title: "Overall Assessment",

      text:
        report.clinical_summary
          .interpretation,
    },

    {
      title: "Significant Genes",

      text:
        report.clinical_summary
          .significant_genes
          .toLocaleString(),
    },

    {
      title: "Enriched Pathways",

      text:
        report.clinical_summary
          .enriched_pathways
          .toLocaleString(),
    },

    {
      title: "Plain Language Summary",

      text:
        report.lay_summary,
    },

    
    {
      title: "Limitations",

      text:
        report.limitations,
    },

    {
      title: "Recommended Next Steps",

      text:
        report.next_steps,
    },
  ] as const;
}

