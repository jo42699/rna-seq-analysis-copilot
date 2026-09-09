"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/app/components/layout/AppShell";
import { useJob } from "@/app/context/Jobcontext";

type ReportData = Record<string, unknown>;

function jsonToYaml(
  value: unknown,
  indent = 0
): string {
  const spaces = " ".repeat(indent);

  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "null";
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }

    return value
      .map((item) => {
        if (
          item !== null &&
          typeof item === "object"
        ) {
          const nested = jsonToYaml(
            item,
            indent + 2
          );

          const lines = nested.split("\n");

          return [
            `${spaces}- ${lines[0]}`,
            ...lines
              .slice(1)
              .map(
                (line) =>
                  `${" ".repeat(indent + 2)}${line}`
              ),
          ].join("\n");
        }

        return `${spaces}- ${jsonToYaml(item)}`;
      })
      .join("\n");
  }

  if (typeof value === "object") {
    const entries = Object.entries(
      value as Record<string, unknown>
    );

    if (entries.length === 0) {
      return "{}";
    }

    return entries
      .map(([key, item]) => {
        const safeKey =
          /^[A-Za-z0-9_-]+$/.test(key)
            ? key
            : JSON.stringify(key);

        if (
          item !== null &&
          typeof item === "object"
        ) {
          const nested = jsonToYaml(
            item,
            indent + 2
          );

          return [
            `${spaces}${safeKey}:`,
            ...nested
              .split("\n")
              .map(
                (line) =>
                  `${" ".repeat(indent + 2)}${line}`
              ),
          ].join("\n");
        }

        return `${spaces}${safeKey}: ${jsonToYaml(
          item
        )}`;
      })
      .join("\n");
  }

  return String(value);
}

export default function ReportPage() {
  const { jobId } = useJob();

  const [report, setReport] =
    useState<ReportData | null>(null);

  const [yaml, setYaml] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      /*
       * Reset everything when the job changes.
       */
      setReport(null);
      setYaml("");
      setError(null);

      /*
       * No job = nothing to fetch.
       */
      if (!jobId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(
          `http://localhost:8000/report/${jobId}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            `Request failed with status ${response.status}`
          );
        }

        const data: unknown =
          await response.json();

        if (cancelled) {
          return;
        }

        /*
         * Backend returned null/undefined.
         */
        if (
          data === null ||
          data === undefined
        ) {
          setReport(null);
          setYaml("");
          return;
        }

        /*
         * Make sure we received an object.
         */
        if (
          typeof data !== "object" ||
          Array.isArray(data)
        ) {
          console.warn(
            "Unexpected report response:",
            data
          );

          setReport(null);
          setYaml("");
          setError(
            "The backend returned an unexpected report format."
          );

          return;
        }

        const reportData =
          data as ReportData;

        /*
         * Empty report object.
         */
        if (
          Object.keys(reportData).length === 0
        ) {
          setReport(null);
          setYaml("");
          return;
        }

        setReport(reportData);
        setYaml(jsonToYaml(reportData));
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Failed to load full report:",
          err
        );

        setReport(null);
        setYaml("");

        setError(
          "Unable to load the report. The analysis may still be processing."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const hasReport =
    report !== null &&
    yaml.trim().length > 0;
    

  return (
    <AppShell rightPanel={false}>
      <main className="report-page">

        {/* HEADER */}

        <header className="report-header">
          <div>
            <p className="report-label">
              ANALYSIS REPORT
            </p>

            <h1>
              Full Report
            </h1>

            <p className="report-description">
              Complete analysis output rendered
              as YAML.
            </p>
          </div>

          {jobId && (
            <div className="job-id">
              <span>JOB ID</span>

              <code>{jobId}</code>
            </div>
          )}
        </header>

        {/* CONTENT */}

        <section className="report-card">

          <div className="report-card-header">
            <div>
              <h2>
                Report data
              </h2>

              <p>
                GET /report/{jobId ?? "—"}
              </p>
            </div>

            {hasReport && (
              <span className="loaded">
                Loaded
              </span>
            )}
          </div>

          {/* NO JOB */}

          {!jobId && !loading && (
            <div className="empty-state">
              <div className="empty-icon">
                —
              </div>

              <h3>
                No analysis selected
              </h3>

              <p>
                Upload or select an analysis
                before viewing its report.
              </p>
            </div>
          )}

          {/* LOADING */}

          {jobId && loading && (
            <div className="empty-state">
              <div className="spinner" />

              <h3>
                Loading report…
              </h3>

              <p>
                Fetching the full analysis
                results.
              </p>
            </div>
          )}

          {/* ERROR */}

          {jobId &&
            !loading &&
            error && (
              <div className="error-state">
                <h3>
                  Report unavailable
                </h3>

                <p>
                  {error}
                </p>
              </div>
            )}

          {/* EMPTY */}

          {jobId &&
            !loading &&
            !error &&
            !hasReport && (
              <div className="empty-state">
                <div className="empty-icon">
                  ∅
                </div>

                <h3>
                  No report data
                </h3>

                <p>
                  The analysis does not have
                  report data available yet.
                </p>
              </div>
            )}

          {/* YAML */}

          {jobId &&
            !loading &&
            !error &&
            hasReport && (
              <div className="yaml-wrapper">

                <div className="yaml-toolbar">
                  <span>
                    YAML
                  </span>

                  <span>
                    {Object.keys(report).length}{" "}
                    top-level fields
                  </span>
                </div>

                <pre className="yaml">
                  <code>{yaml}</code>
                </pre>

              </div>
            )}

        </section>

        <style jsx>{`
          .report-page {
            min-height: 100%;
            padding: 32px;
            box-sizing: border-box;
            overflow-y: auto;
          }

          .report-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
            margin-bottom: 24px;
          }

          .report-label {
            margin: 0 0 6px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.12em;
            opacity: 0.5;
          }

          .report-header h1 {
            margin: 0;
            font-size: 30px;
            line-height: 1.15;
          }

          .report-description {
            margin: 8px 0 0;
            font-size: 14px;
            opacity: 0.6;
          }

          .job-id {
            display: flex;
            flex-direction: column;
            gap: 5px;
            padding: 10px 14px;
            border: 1px solid
              rgba(127, 127, 127, 0.2);
            border-radius: 9px;
            background: rgba(127, 127, 127, 0.05);
          }

          .job-id span {
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 0.1em;
            opacity: 0.5;
          }

          .job-id code {
            max-width: 260px;
            font-size: 12px;
            word-break: break-all;
            font-family:
              ui-monospace,
              SFMono-Regular,
              Menlo,
              Monaco,
              Consolas,
              monospace;
          }

          .report-card {
            overflow: hidden;
            border: 1px solid
              rgba(127, 127, 127, 0.2);
            border-radius: 14px;
            background: rgba(127, 127, 127, 0.03);
          }

          .report-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            padding: 18px 20px;
            border-bottom: 1px solid
              rgba(127, 127, 127, 0.15);
          }

          .report-card-header h2 {
            margin: 0;
            font-size: 14px;
          }

          .report-card-header p {
            margin: 5px 0 0;
            font-size: 11px;
            opacity: 0.5;
            font-family:
              ui-monospace,
              SFMono-Regular,
              Menlo,
              Monaco,
              Consolas,
              monospace;
          }

          .loaded {
            padding: 5px 9px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 700;
            background: rgba(70, 160, 90, 0.12);
          }

          .yaml-wrapper {
            width: 100%;
          }

          .yaml-toolbar {
            display: flex;
            justify-content: space-between;
            padding: 9px 16px;
            border-bottom: 1px solid
              rgba(127, 127, 127, 0.1);
            font-family:
              ui-monospace,
              SFMono-Regular,
              Menlo,
              Monaco,
              Consolas,
              monospace;
            font-size: 10px;
            opacity: 0.55;
          }

          .yaml {
            margin: 0;
            padding: 24px;
            max-height: calc(100vh - 260px);
            overflow: auto;
            font-family:
              ui-monospace,
              SFMono-Regular,
              Menlo,
              Monaco,
              Consolas,
              monospace;
            font-size: 12px;
            line-height: 1.7;
            white-space: pre;
            tab-size: 2;
          }

          .yaml code {
            font-family: inherit;
          }

          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 320px;
            padding: 40px;
            text-align: center;
          }

          .empty-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            margin-bottom: 16px;
            border-radius: 50%;
            background: rgba(127, 127, 127, 0.08);
            font-size: 20px;
            opacity: 0.55;
          }

          .empty-state h3,
          .error-state h3 {
            margin: 0;
            font-size: 15px;
          }

          .empty-state p,
          .error-state p {
            max-width: 420px;
            margin: 7px 0 0;
            font-size: 13px;
            line-height: 1.5;
            opacity: 0.55;
          }

          .error-state {
            margin: 20px;
            padding: 18px;
            border: 1px solid
              rgba(190, 70, 70, 0.25);
            border-radius: 10px;
            background: rgba(190, 70, 70, 0.06);
          }

          .spinner {
            width: 22px;
            height: 22px;
            margin-bottom: 18px;
            border: 2px solid
              rgba(127, 127, 127, 0.25);
            border-top-color: currentColor;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          @media (max-width: 700px) {
            .report-page {
              padding: 18px;
            }

            .report-header {
              flex-direction: column;
            }

            .job-id {
              width: 100%;
              box-sizing: border-box;
            }

            .yaml {
              padding: 16px;
              font-size: 11px;
            }
          }
        `}</style>
      </main>
    </AppShell>
  );
}