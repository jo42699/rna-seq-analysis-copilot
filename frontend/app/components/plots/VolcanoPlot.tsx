
"use client";

import { useMemo, useState } from "react";
import { PlotLegend } from "@/app/components/plots/PlotLegend";
import type { Gene } from "@/app/types/bioinformatics";
import { formatPValue } from "@/app/utils/format";
import { fdrColor } from "@/app/utils/significance";

type LollipopPlotProps = {
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
const HEIGHT = 360;

const LEFT = 105;
const RIGHT = 390;
const TOP = 35;
const BOTTOM = 315;

const MIN_FDR = 1e-10;
const MAX_GENES = 20;

function negativeLog10(value: number) {
  return -Math.log10(
    Math.max(value, MIN_FDR)
  );
}

function xScale(
  value: number,
  minValue: number,
  maxValue: number
) {
  if (minValue === maxValue) {
    return (LEFT + RIGHT) / 2;
  }

  return (
    LEFT +
    ((value - minValue) /
      (maxValue - minValue)) *
      (RIGHT - LEFT)
  );
}

function yScale(
  index: number,
  total: number
) {
  if (total <= 1) {
    return (TOP + BOTTOM) / 2;
  }

  return (
    TOP +
    (index / (total - 1)) *
      (BOTTOM - TOP)
  );
}

export function LollipopPlot({
  genes,
  selected,
  onSelect,
}: LollipopPlotProps) {
  const [tooltip, setTooltip] =
    useState<TooltipState | null>(null);

  /*
   * Prepare the top 20 genes ranked by FDR.
   */
  const points = useMemo(() => {
    const validGenes = genes.filter(
      (gene) =>
        Number.isFinite(gene.fdr) &&
        gene.fdr >= 0 &&
        gene.fdr <= 1 &&
        Number.isFinite(gene.log2fc)
    );

    const sortedGenes = [...validGenes]
      .sort((a, b) => a.fdr - b.fdr)
      .slice(0, MAX_GENES);

    if (sortedGenes.length === 0) {
      return [];
    }

   
    const values = sortedGenes.map(
      (gene) => gene.log2fc
    );

    const dataMin = Math.min(
      0,
      ...values
    );

    const dataMax = Math.max(
      0,
      ...values
    );

  
    const range = Math.max(
      dataMax - dataMin,
      1
    );

    const minLog2FC =
      dataMin - range * 0.08;

    const maxLog2FC =
      dataMax + range * 0.08;

    return sortedGenes.map(
      (gene, index) => {
        const significance =
          negativeLog10(gene.fdr);

        return {
          gene,
          rank: index + 1,

          x: xScale(
            gene.log2fc,
            minLog2FC,
            maxLog2FC
          ),

          y: yScale(
            index,
            sortedGenes.length
          ),

          significance,

          minLog2FC,
          maxLog2FC,
        };
      }
    );
  }, [genes]);

  /*
   * If there are no valid genes, still render
   * the chart frame.
   */
  const minLog2FC =
    points.length > 0
      ? points[0].minLog2FC
      : -1;

  const maxLog2FC =
    points.length > 0
      ? points[0].maxLog2FC
      : 1;

  /*
   * FDR 0.05 significance threshold.
   */
  const thresholdValue =
    negativeLog10(0.05);

  /*
   * Map FDR significance to dot radius.
   */
  function dotRadius(
    significance: number,
    selected: boolean
  ) {
    if (selected) {
      return 8;
    }

    if (significance >= 10) {
      return 8;
    }

    if (significance >= 5) {
      return 7;
    }

    if (significance >= thresholdValue) {
      return 6;
    }

    return 5;
  }

  /*
   * X-axis ticks.
   */
  const xTicks = useMemo(() => {
    if (
      !Number.isFinite(minLog2FC) ||
      !Number.isFinite(maxLog2FC)
    ) {
      return [];
    }

    const range =
      maxLog2FC - minLog2FC;

    const step =
      range <= 2
        ? 0.5
        : range <= 5
        ? 1
        : 2;

    const start =
      Math.ceil(
        minLog2FC / step
      ) * step;

    const ticks: number[] = [];

    for (
      let value = start;
      value <= maxLog2FC;
      value += step
    ) {
      ticks.push(
        Number(value.toFixed(2))
      );
    }

    /*
     * Make sure zero is visible.
     */
    if (
      minLog2FC <= 0 &&
      maxLog2FC >= 0 &&
      !ticks.includes(0)
    ) {
      ticks.push(0);
      ticks.sort((a, b) => a - b);
    }

    return ticks;
  }, [minLog2FC, maxLog2FC]);

  /*
   * X coordinate for log2FC = 0.
   */
  const zeroX = xScale(
    0,
    minLog2FC,
    maxLog2FC
  );

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Top genes by differential expression and FDR"
    >
      {/* 
          AXES
       */}

      <line
        x1={LEFT}
        y1={BOTTOM}
        x2={RIGHT}
        y2={BOTTOM}
      />

      <line
        x1={LEFT}
        y1={TOP}
        x2={LEFT}
        y2={BOTTOM}
      />

      {/* 
          ZERO LOG2FC LINE
       */}

      <line
        x1={zeroX}
        y1={TOP}
        x2={zeroX}
        y2={BOTTOM}
        className="threshold-line"
        opacity="0.5"
      />

      <text
        x={zeroX + 4}
        y={TOP - 8}
      >
        .
      </text>

      {/* 
          X TICKS
       */}

      {xTicks.map((tick) => {
        const x = xScale(
          tick,
          minLog2FC,
          maxLog2FC
        );

        return (
          <g key={tick}>
            <line
              x1={x}
              y1={BOTTOM}
              x2={x}
              y2={BOTTOM + 5}
            />

            <text
              x={x}
              y={BOTTOM + 20}
              textAnchor="middle"
            >
              {tick}
            </text>
          </g>
        );
      })}

      {/* 
          AXIS LABEL
       */}

      <text
        x={(LEFT + RIGHT) / 2}
        y="350"
        textAnchor="middle"
      >
        log2 fold change
      </text>

      <text
        x="18"
        y={(TOP + BOTTOM) / 2}
        transform={`rotate(-90 18 ${
          (TOP + BOTTOM) / 2
        })`}
        textAnchor="middle"
      >
        Genes
      </text>

      <PlotLegend />

      {/* 
          GENE ROWS
       */}

      {points.map(
        ({
          gene,
          rank,
          x,
          y,
          significance,
        }) => {
          const significant =
            gene.fdr < 0.05;

          const highlySignificant =
            gene.fdr < 0.001;

          const isSelected =
            selected === gene.id;

          const radius =
            dotRadius(
              significance,
              isSelected
            );

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
              {/* 
                  ROW GUIDE
               */}

              <line
                x1={LEFT}
                y1={y}
                x2={RIGHT}
                y2={y}
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.08"
              />

              {/* 
                  GENE NAME
               */}

              <text
                x={LEFT - 10}
                y={y + 4}
                textAnchor="end"
                fontWeight={
                  isSelected
                    ? "bold"
                    : undefined
                }
              >
                {gene.name ||
                  gene.id}
              </text>

              {/* 
                  FDR SIGNIFICANCE RING
               */}

              {(highlySignificant ||
                isSelected) && (
                <circle
                  cx={x}
                  cy={y}
                  r={radius + 4}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  opacity="0.3"
                />
              )}

              {/* 
                  INVISIBLE HIT AREA
               */}

              <circle
                cx={x}
                cy={y}
                r="14"
                fill="transparent"
              />

              {/* 
                  DOT
               */}

              <circle
                cx={x}
                cy={y}
                r={radius}
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
                opacity={
                  significant
                    ? 1
                    : 0.65
                }
              />

              {/* 
                  LOG2FC VALUE
               */}

              <text
                x={
                  gene.log2fc >= 0
                    ? x + radius + 5
                    : x - radius - 5
                }
                y={y + 4}
                textAnchor={
                  gene.log2fc >= 0
                    ? "start"
                    : "end"
                }
                opacity="0.7"
              >
                {gene.log2fc.toFixed(
                  2
                )}
              </text>
            </g>
          );
        }
      )}

      {/* 
          TOOLTIP
       */}

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

