const legendItems = [
  { label: "FDR < 0.01", color: "#6C4CF5" },
  { label: "FDR < 0.05", color: "#2FBF71" },
  { label: "FDR >= 0.05", color: "#444a57" },
] as const;

export function PlotLegend() {
  return (
    <g className="plot-legend" transform="translate(250 20)">
      {legendItems.map((item, index) => (
        <g key={item.label} transform={`translate(0 ${index * 16})`}>
          <circle cx="0" cy="0" r="4" fill={item.color} />
          <text x="9" y="4">
            {item.label}
          </text>
        </g>
      ))}
    </g>
  );
}
