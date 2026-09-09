export function fdrColor(fdr: number) {
  if (fdr < 0.01) return "#6C4CF5";
  if (fdr < 0.05) return "#2FBF71";
  return "#484c56";
}

export function fdrLabel(fdr: number) {
  if (fdr < 0.01) return "FDR < 0.01";
  if (fdr < 0.05) return "FDR < 0.05";
  return "FDR >= 0.05";
}
