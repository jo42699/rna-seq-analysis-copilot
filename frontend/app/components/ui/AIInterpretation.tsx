"use client";

import { useEffect, useState } from "react";
import {
  buildAIInterpretationCards,
  fetchLLMReport,
  type LLMOutput,
} from "@/app/constants/interpretation";
import { useJob } from "@/app/context/Jobcontext";

export function AIInterpretation() {
  const { jobId } = useJob();

  const [report, setReport] = useState<LLMOutput | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      if (!jobId) {
        setLoading(false);
        return;
      }

      try {
        const data = await fetchLLMReport(jobId);
        setReport(data);
      } catch (error) {
        console.error(
          "Failed to load AI interpretation:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [jobId]);

  const aiInterpretationCards = report
    ? buildAIInterpretationCards(report)
    : [];

  return (
    <section className="ai-section">
      <div className="section-head">
        <h2>AI Interpretation</h2>

        <p>
          Generated from the uploaded RNA-seq analysis report.
        </p>
      </div>

      {!jobId ? (
        <div className="ai-grid">
          <article className="ai-card">
            <p>No report uploaded yet.</p>
          </article>
        </div>
      ) : loading ? (
        <div className="ai-grid">
          <article className="ai-card">
            <p>Loading AI interpretation...</p>
          </article>
        </div>
      ) : (
        <div className="ai-grid">
          {aiInterpretationCards.map(({ title, text }) => (
            <article className="ai-card" key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      )}

      {/* Placeholder for future AI chat interface */}
      {/*

      <form className="prompt-bar">
        <input placeholder="Ask the Copilot about these results..." />
        <button type="submit">Send</button>
      </form>
      
      */}
    </section>
  );
}