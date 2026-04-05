const KNOWN: Record<string, string> = {
  "bpc-157":   "#00f2ff",
  "tb-500":    "#f59e0b",
  "ghk-cu":    "#a855f7",
  "igf-1":     "#22c55e",
  "cjc-1295":  "#f43f5e",
  "ipamorelin":"#fb923c",
  "ghrp-6":    "#38bdf8",
  "ghrp-2":    "#84cc16",
  "pt-141":    "#e879f9",
  "aod-9604":  "#34d399",
};

const PALETTE = [
  "#00f2ff",
  "#f59e0b",
  "#a855f7",
  "#22c55e",
  "#f43f5e",
  "#fb923c",
  "#38bdf8",
  "#84cc16",
  "#e879f9",
  "#34d399",
];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function compoundColor(compoundId: string): string {
  const known = KNOWN[compoundId.toLowerCase()];
  if (known) return known;
  return PALETTE[hashCode(compoundId) % PALETTE.length];
}

export function compoundColorAlpha(compoundId: string, alpha: number): string {
  const hex = compoundColor(compoundId);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
