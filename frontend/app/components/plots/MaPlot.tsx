
"use client";

import { useMemo, useState } from "react";
import { SvgTooltip } from "@/app/components/plots/SvgTooltip";
import type { Gene } from "@/app/types/bioinformatics";
import { formatPValue } from "@/app/utils/format";
import { fdrColor } from "@/app/utils/significance";

type MaPlotProps = {
  genes: Gene[];
  onSelect: (gene: Gene) => void;
  selected: string;
};

type TooltipState = {
  x: number;
  y: number;
  rank: number;
  gene: Gene;
};

const WIDTH = 420;
const HEIGHT = 280;

const LEFT = 52;
const RIGHT = 390;
const TOP = 28;
const BOTTOM = 226;

const BAR_COUNT = 20;


const EXAGGERATION = 2.4;

function exaggerateFoldChange(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const sign = value < 0 ? -1 : 1;
  const magnitude = Math.abs(value);

  return (
    sign *
    Math.pow(magnitude, 1 / EXAGGERATION)
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function MaPlot({
  genes,
  selected,
  onSelect,
}: MaPlotProps) {
  const [tooltip, setTooltip] =
    useState<TooltipState | null>(null);

  const bars = useMemo(() => {
    const validGenes = genes.filter(
      (gene) =>
        Number.isFinite(gene.log2fc) &&
        Number.isFinite(gene.fdr) &&
        gene.fdr >= 0 &&
        gene.fdr <= 1
    );

    /*
     * Rank by FDR.
     * Lowest FDR first.
     */
    const sortedGenes = [...validGenes]
      .sort((a, b) => a.fdr - b.fdr)
      .slice(0, BAR_COUNT);

    if (sortedGenes.length === 0) {
      return [];
    }

    /*
     * Exaggerated display values.
     */
    const displayValues = sortedGenes.map(
      (gene) =>
        exaggerateFoldChange(
          gene.log2fc
        )
    );

    /*
     * Keep the chart visually useful even if
     * all fold changes are tiny.
     */
    const maxAbs = Math.max(
      1,
      ...displayValues.map((value) =>
        Math.abs(value)
      )
    );

    const plotHeight =
      BOTTOM - TOP;

    const zeroY =
      TOP + plotHeight / 2;

    const usableHalfHeight =
      plotHeight / 2 - 8;

    /*
     * Leave a small gap between bars.
     */
    const totalWidth =
      RIGHT - LEFT;

    const gap = 3;

    const barWidth = Math.max(
      5,
      (
        totalWidth -
        gap *
          Math.max(
            sortedGenes.length - 1,
            0
          )
      ) /
        Math.max(
          sortedGenes.length,
          1
        )
    );

    return sortedGenes.map(
      (gene, index) => {
        const displayValue =
          displayValues[index];

        const barHeight =
          (
            Math.abs(
              displayValue
            ) / maxAbs
          ) *
          usableHalfHeight;

        const height = clamp(
          barHeight,
          2,
          usableHalfHeight
        );

        const x =
          LEFT +
          index *
            (barWidth + gap);

        const y =
          displayValue >= 0
            ? zeroY - height
            : zeroY;

        return {
          gene,
          rank: index + 1,
          x,
          y,
          width: barWidth,
          height,
          zeroY,
        };
      }
    );
  }, [genes]);

  /*
   * Fixed visual scale makes positive and negative
   * bars immediately readable.
   */
  

  const zeroY =
    TOP +
    (BOTTOM - TOP) / 2;

  /*
   * Horizontal reference lines.
   */
  const positiveQuarter =
    zeroY -
    (zeroY - TOP) * 0.5;

  const negativeQuarter =
    zeroY +
    (BOTTOM - zeroY) * 0.5;

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Ranked MA fold change bar chart"
    >
      {/* 
          BACKGROUND REFERENCE
      */}

      <line
        x1={LEFT}
        y1={positiveQuarter}
        x2={RIGHT}
        y2={positiveQuarter}
        className="threshold-line"
        opacity="0.35"
      />

      <line
        x1={LEFT}
        y1={negativeQuarter}
        x2={RIGHT}
        y2={negativeQuarter}
        className="threshold-line"
        opacity="0.35"
      />

      {/*
          ZERO LINE
       */}

      <line
        x1={LEFT}
        y1={zeroY}
        x2={RIGHT}
        y2={zeroY}
        stroke="currentColor"
        strokeWidth="2"
      />

      {/* 
          Y AXIS
      */}

      <line
        x1={LEFT}
        y1={TOP}
        x2={LEFT}
        y2={BOTTOM}
      />

      {/* 
          Y LABELS
       */}

      <text
        x={LEFT - 8}
        y={TOP + 5}
        textAnchor="end"
      >
        +FC
      </text>

      <text
        x={LEFT - 8}
        y={zeroY + 4}
        textAnchor="end"
      >
        0
      </text>

      <text
        x={LEFT - 8}
        y={BOTTOM}
        textAnchor="end"
      >
        −FC
      </text>

      {/* 
          AXIS LABEL
       */}

      <text
        x={(LEFT + RIGHT) / 2}
        y="266"
        textAnchor="middle"
      >
        Top genes ranked by FDR
      </text>

      <text
        x="-135"
        y="16"
        transform="rotate(-90)"
      >
        log2FC
      </text>

      {/* 
          BARS
       */}

      {bars.map(
        ({
          gene,
          rank,
          x,
          y,
          width,
          height,
        }) => {
          const isSelected =
            selected === gene.id;

          const isSignificant =
            gene.fdr < 0.05;

          return (
            <g
              key={gene.id}
              className="point-group"
              onClick={() =>
                onSelect(gene)
              }
              onPointerEnter={() =>
                setTooltip({
                  x: x + width / 2,
                  y:
                    gene.log2fc >= 0
                      ? y
                      : y + height,
                  rank,
                  gene,
                })
              }
              onPointerLeave={() =>
                setTooltip(null)
              }
            >
              {/* Invisible hit area */}

              <rect
                x={x - 2}
                y={TOP}
                width={width + 4}
                height={
                  BOTTOM - TOP
                }
                fill="transparent"
              />

              {/* Selected outline */}

              {isSelected && (
                <rect
                  x={x - 1}
                  y={y - 1}
                  width={width + 2}
                  height={height + 2}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  rx="2"
                />
              )}

              {/* Main bar */}

              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx="2"
                fill={fdrColor(
                  gene.fdr
                )}
                opacity={
                  isSignificant
                    ? 1
                    : 0.8
                }
              />

              {/* Small highlight for significant genes */}

              {isSignificant && (
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height="3"
                  rx="1"
                  fill="currentColor"
                  opacity="0.35"
                />
              )}
            </g>
          );
        }
      )}

      {/* 
          TOOLTIP
       */}

      {tooltip && (
        <SvgTooltip
          x={tooltip.x}
          y={tooltip.y}
          lines={[
            tooltip.gene.name ||
              tooltip.gene.id,
            `Rank: ${tooltip.rank}`,
            `log2FC: ${tooltip.gene.log2fc.toFixed(
              2
            )}`,
            `p-value: ${formatPValue(
              tooltip.gene.pvalue
            )}`,
            `FDR: ${tooltip.gene.fdr.toExponential(
              3
            )}`,
          ]}
        />
      )}
    </svg>
  );
}

