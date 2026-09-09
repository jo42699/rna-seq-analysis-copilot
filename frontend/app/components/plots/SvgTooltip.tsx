type SvgTooltipProps = {
  x: number;
  y: number;
  lines: string[];
};

export function SvgTooltip({ x, y, lines }: SvgTooltipProps) {
  const tooltipWidth = 142;
  const tooltipHeight = 18 + lines.length * 14;
  const tooltipX = Math.min(x + 12, 420 - tooltipWidth - 8);
  const tooltipY = Math.max(y - tooltipHeight - 10, 8);

  return (
    <g className="chart-tooltip" transform={`translate(${tooltipX} ${tooltipY})`}>
      <rect width={tooltipWidth} height={tooltipHeight} rx="8" />
      {lines.map((line, index) => (
        <text x="10" y={18 + index * 14} key={line}>
          {line}
        </text>
      ))}
    </g>
  );
}
