export function formatPValue(value: number) {
  return value.toExponential(1);
}

export function formatPrecisePValue(value: number) {
  return value.toExponential(2);
}

export function negativeLog10(value: number) {
  return -Math.log10(Math.max(value, Number.MIN_VALUE));
}
