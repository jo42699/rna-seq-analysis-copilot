"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { hrefForTab, navigationTabs } from "@/app/constants/navigation";
import { useJob } from "@/app/context/Jobcontext";
import { dump } from "js-yaml";

export function TopNav() {
  const pathname = usePathname();
  const { jobId } = useJob();

  const handleExportResults = async () => {
    if (!jobId) {
      console.warn("No job ID available for export.");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/report/${jobId}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch report: ${response.status}`
        );
      }

      const data = await response.json();

      // Convert the complete backend response to YAML
      const yaml = dump(data, {
        noRefs: true,
        lineWidth: -1,
      });

      // Create downloadable file
      const blob = new Blob([yaml], {
        type: "application/x-yaml;charset=utf-8",
      });

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `analysis-report-${jobId}.yaml`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export report:", error);
    }
  };

  return (
    <header className="top-nav">
      <nav>
        {navigationTabs.map((tab) => {
          const href = hrefForTab(tab);

          return (
            <Link
              className={
                pathname === href
                  ? "nav-tab active"
                  : "nav-tab"
              }
              href={href}
              key={tab}
            >
              {tab}
            </Link>
          );
        })}
      </nav>

      <div className="top-actions">
        <button
          onClick={handleExportResults}
          disabled={!jobId}
        >
          Export Results
        </button>

        <div className="avatar">JI</div>
      </div>
    </header>
  );
}