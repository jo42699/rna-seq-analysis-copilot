"use client";

import { useMemo } from "react";
import { formatPValue } from "@/app/utils/format";
import type { Gene } from "@/app/types/bioinformatics";
import { useJob } from "@/app/context/Jobcontext";

type DataTableProps = {
  genes: Gene[];
  selected: string;
  onSelect: (gene: Gene) => void;
};

export function DataTable({ genes, selected, onSelect }: DataTableProps) {
  const sorted = useMemo(() => [...genes].sort((a, b) => a.fdr - b.fdr), [genes]);
  const { jobId } = useJob();   
  console.log("Job ID in DataTable:", jobId); // Log the jobId to verify it's being passed correctly

  return (
    <div className="card table-card">
      <div className="card-head">
        <div>
          <h3>Top 20 DESeq2 Results</h3>
          <p>Job ID: {jobId}</p>   
        </div>
        <button>{`1-${sorted.length}`}</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Gene ID</th>
            <th>Symbol</th>
            <th>Log2FC</th>
            <th>P-value</th>
            <th>FDR</th>
          </tr>
        </thead>

        <tbody>
          {sorted.map((gene, index) => (
            <tr
              key={gene.id}
              onClick={() => onSelect(gene)}
              className={selected === gene.id ? "selected" : ""}
            >
              <td>{index + 1}</td>
              <td>{gene.id.slice(0, 10)}...</td>
              <td>{gene.name}</td>
              <td>{gene.log2fc.toFixed(2)}</td>
              <td>{formatPValue(gene.pvalue)}</td>
              <td>{gene.fdr}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
