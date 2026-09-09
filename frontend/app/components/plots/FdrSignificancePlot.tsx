"use client";

import { useMemo, useState } from "react";
import { PlotLegend } from "@/app/components/plots/PlotLegend";
import type { Gene } from "@/app/types/bioinformatics";
import { formatPValue } from "@/app/utils/format";
import { fdrColor } from "@/app/utils/significance";

type FdrSignificancePlotProps = {
  genes: Gene[];
  onSelect: (gene: Gene) => void;
  selected: string;
};

type TooltipState = {
  x: number;
  y: number;
  gene: Gene;
  rank: number;
};

const WIDTH = 420;
const HEIGHT = 280;

const LEFT = 52;
const RIGHT = 390;
const TOP = 30;
const BOTTOM = 226;

const MIN_FDR = 1e-10;

function negativeLog10(value: number) {
  return -Math.log10(
    Math.max(value, MIN_FDR)
  );
}

function xScale(
  index: number,
  total: number
) {
  if (total <= 1) {
    return (LEFT + RIGHT) / 2;
  }

  return (
    LEFT +
    (index / (total - 1)) *
      (RIGHT - LEFT)
  );
}

function yScale(
  value: number,
  maxValue: number
) {
  if (maxValue <= 0) {
    return BOTTOM;
  }

  return (
    BOTTOM -
    (value / maxValue) *
      (BOTTOM - TOP)
  );
}

export function FdrSignificancePlot({
  genes,
  selected,
  onSelect,
}: FdrSignificancePlotProps) {
  const [tooltip, setTooltip] =
    useState<TooltipState | null>(null);

  const points = useMemo(() => {
    const validGenes = genes.filter(
      (gene) =>
        Number.isFinite(gene.fdr) &&
        gene.fdr >= 0 &&
        gene.fdr <= 1
    );

    const sortedGenes = [...validGenes].sort(
      (a, b) => a.fdr - b.fdr
    );

    const values = sortedGenes.map(
      (gene) => negativeLog10(gene.fdr)
    );

    /*
     * Force a useful vertical range.
     *
     * Your actual data contains:
     *
     * significant gene:
     * FDR = 1.97e-9
     * -log10(FDR) ~= 8.71
     *
     * other genes:
     * FDR ~= 1
     * -log10(FDR) ~= 0
     */
    const maxValue = Math.max(
      10,
      ...values
    );

    return sortedGenes.map(
      (gene, index) => ({
        gene,
        rank: index + 1,
        x: xScale(
          index,
          sortedGenes.length
        ),
        y: yScale(
          negativeLog10(gene.fdr),
          maxValue
        ),
      })
    );
  }, [genes]);

  const maxValue = Math.max(
    10,
    ...points.map((point) =>
      negativeLog10(point.gene.fdr)
    )
  );

  /*
   * FDR = 0.05
   * -log10(0.05) ~= 1.30
   */
  const thresholdValue =
    -Math.log10(0.05);

  const thresholdY = yScale(
    thresholdValue,
    maxValue
  );

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="FDR significance plot"
    >
      {/* X AXIS */}

      <line
        x1={LEFT}
        y1={BOTTOM}
        x2={RIGHT}
        y2={BOTTOM}
      />

      {/* Y AXIS */}

      <line
        x1={LEFT}
        y1={TOP}
        x2={LEFT}
        y2={BOTTOM}
      />

      {/* FDR THRESHOLD */}

      <line
        x1={LEFT}
        y1={thresholdY}
        x2={RIGHT}
        y2={thresholdY}
        className="threshold-line"
      />

      <text
        x={RIGHT - 4}
        y={thresholdY - 7}
        textAnchor="end"
      >
        FDR &lt; 0.05
      </text>

      {/* Y TICKS */}

      {[0, 2, 4, 6, 8, 10].map(
        (tick) => {
          if (tick > maxValue) {
            return null;
          }

          const y = yScale(
            tick,
            maxValue
          );

          return (
            <g key={tick}>
              <line
                x1={LEFT - 4}
                y1={y}
                x2={LEFT}
                y2={y}
              />

              <text
                x={LEFT - 8}
                y={y + 4}
                textAnchor="end"
              >
                {tick}
              </text>
            </g>
          );
        }
      )}

      {/* LABELS */}

      <text
        x={(LEFT + RIGHT) / 2}
        y="266"
        textAnchor="middle"
      >
        Rank by FDR
      </text>

      <text
        x="-155"
        y="16"
        transform="rotate(-90)"
      >
        -log10(FDR)
      </text>

      <PlotLegend />

      {/* DATA POINTS */}

      {points.map(
        ({
          gene,
          rank,
          x,
          y,
        }) => {
          const significant =
            gene.fdr < 0.05;

          const isSelected =
            selected === gene.id;

          const isTop =
            rank <= 3;

          return (
            <g
              key={gene.id}
              className="point-group"
              onClick={() =>
                onSelect(gene)
              }
              onPointerEnter={() =>
                setTooltip({
                  x,
                  y,
                  gene,
                  rank,
                })
              }
              onPointerLeave={() =>
                setTooltip(null)
              }
            >
              {/* Invisible hit area */}

              <circle
                cx={x}
                cy={y}
                r="11"
                fill="transparent"
              />

              {/* Visible point */}

              <circle
                cx={x}
                cy={y}
                r={
                  isSelected
                    ? 9
                    : significant || isTop
                    ? 7
                    : 5
                }
                fill={fdrColor(
                  gene.fdr
                )}
                stroke={
                  isSelected
                    ? "currentColor"
                    : undefined
                }
                strokeWidth={
                  isSelected ? 2 : 0
                }
              />

              {/* Gene label */}

            
            </g>
          );
        }
      )}

      {/* INLINE TOOLTIP */}

      {tooltip && (
        <g
          pointerEvents="none"
          transform={`
            translate(
              ${Math.min(
                tooltip.x + 12,
                WIDTH - 168
              )}
              ${Math.max(
                tooltip.y - 88,
                8
              )}
            )
          `}
        >
          <rect
            width="160"
            height="80"
            rx="8"
          />

          <text
            x="10"
            y="17"
          >
            {tooltip.gene.name ||
              tooltip.gene.id}
          </text>

          <text
            x="10"
            y="32"
          >
            Rank: {tooltip.rank}
          </text>

          <text
            x="10"
            y="47"
          >
            FDR:{" "}
            {tooltip.gene.fdr.toExponential(
              3
            )}
          </text>

          <text
            x="10"
            y="62"
          >
            log2FC:{" "}
            {tooltip.gene.log2fc.toFixed(
              2
            )}
          </text>

          <text
            x="10"
            y="77"
          >
            p:{" "}
            {formatPValue(
              tooltip.gene.pvalue
            )}
          </text>
        </g>
      )}
    </svg>
  );
}

