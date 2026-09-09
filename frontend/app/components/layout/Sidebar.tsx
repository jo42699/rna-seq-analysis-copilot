
"use client";

import { useEffect, useState } from "react";
import { FileText, UploadCloud } from "lucide-react";
import { useUploadedReport } from "@/app/hooks/useUploadedReport";
import { useJob } from "@/app/context/Jobcontext";
import Link from "next/link";

type WorkflowAgent = {
  status: string;
  message: string;
  progress: number;
};

type WorkflowResponse = {
  job_id: string;
  workflow: {
    statistics?: WorkflowAgent;
    deseq2?: WorkflowAgent;
    annotation?: WorkflowAgent;
    visualization?: WorkflowAgent;
    report?: WorkflowAgent;
    literature?: WorkflowAgent;
  };
  status: string;
};

export function Sidebar() {
  const { jobId } = useJob();
  const { uploadedFile, handleUpload } = useUploadedReport();

  const [workflow, setWorkflow] = useState<WorkflowResponse | null>(null);

  useEffect(() => {
    if (!jobId) return;

    let interval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    async function fetchWorkflow() {
      try {
        const res = await fetch(
          `http://localhost:8000/report/workflow/${jobId}`,
          { cache: "no-store" }
        );

        if (res.status === 404) {
          return;
        }

        if (!res.ok) {
          console.warn(`Workflow request failed: ${res.status}`);
          return;
        }

        const data: WorkflowResponse = await res.json();

        if (cancelled) return;

        setWorkflow(data);

        const status = data.status?.toLowerCase();

        const finishedStatuses = [
          "completed",
          "complete",
          "finished",
          "done",
          "success",
          "failed",
          "error",
        ];

        if (finishedStatuses.includes(status)) {
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("Workflow polling failed:", err);
        }
      }
    }

    fetchWorkflow();

    interval = setInterval(fetchWorkflow, 1000);

    return () => {
      cancelled = true;

      if (interval) {
        clearInterval(interval);
      }
    };
  }, [jobId]);

  const wf = workflow?.workflow;

  const safeAgents = [
    [
      "Statistics Agent",
      wf?.statistics?.status ?? "queued",
      wf?.statistics?.progress ?? 0,
      wf?.statistics?.message ?? "Awaiting data",
    ],
    [
      "DESeq2 Agent",
      wf?.deseq2?.status ?? "queued",
      wf?.deseq2?.progress ?? 0,
      wf?.deseq2?.message ?? "Awaiting data",
    ],
    [
      "Annotation Agent",
      wf?.annotation?.status ?? "queued",
      wf?.annotation?.progress ?? 0,
      wf?.annotation?.message ?? "Awaiting data",
    ],
    [
      "Visualization Agent",
      wf?.visualization?.status ?? "queued",
      wf?.visualization?.progress ?? 0,
      wf?.visualization?.message ?? "Awaiting data",
    ],
    [
      "Report Agent",
      wf?.report?.status ?? "queued",
      wf?.report?.progress ?? 0,
      wf?.report?.message ?? "Awaiting data",
    ],
    [
      "Literature Agent",
      wf?.literature?.status ?? "queued",
      wf?.literature?.progress ?? 0,
      wf?.literature?.message ?? "Awaiting data",
    ],
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <strong>Octavius</strong>
      </div>

      <div className="sidebar-scroll">

        {/* Upload / Input File */}
        {!uploadedFile ? (
          <label className="upload-card">
            <UploadCloud size={24} />
            <strong>Upload Input File</strong>
            <span>Upload your RNA-seq count matrix</span>

            <input
              type="file"
              hidden
              onChange={handleUpload}
            />
          </label>
        ) : (
          <section className="overview-card">
            <div className="file-info">
              <FileText size={18} />

              <div>
                <strong>{uploadedFile.name}</strong>
                <span>Input file</span>
              </div>
            </div>
          </section>
        )}

        <br />

        {/* Workflow */}
        <div className="side-section">
          <p className="eyebrow">Workflow Agents</p>

          {safeAgents.map(([name, status, percent, message]) => (
            <div className="agent-card" key={name}>
              <div className="agent-head">
                <strong>{name}</strong>
                <span className={`pill ${status}`}>
                  {status}
                </span>
              </div>

              <div className="progress">
                <span style={{ width: `${percent}%` }} />
              </div>

              <div className="agent-foot">
                <span>{message}</span>
                <b>{percent}%</b>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Link
        href={`/workflow?jobId=${jobId}`}
        className="yaml-button"
      >
        View Workflow (YAML)
      </Link>
    </aside>
  );
}

