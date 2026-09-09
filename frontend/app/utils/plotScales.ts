export type PlotArea = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
};

export const defaultPlotArea: PlotArea = {
  left: 46,
  right: 390,
  top: 28,
  bottom: 226,
  width: 420,
  height: 280,
};

export function linearScale(domain: readonly [number, number], range: readonly [number, number]) {
  const [domainMin, domainMax] = domain;
  const [rangeMin, rangeMax] = range;
  const span = domainMax - domainMin || 1;

  return (value: number) => rangeMin + ((value - domainMin) / span) * (rangeMax - rangeMin);
}

export function paddedExtent(values: number[], paddingRatio = 0.12): [number, number] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * paddingRatio, 0.25);
  return [min - padding, max + padding];
}

export function svgNumber(value: number) {
  return Number(value.toFixed(4));
}
