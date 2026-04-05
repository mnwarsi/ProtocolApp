const PALETTE = [
  { bg: "rgba(0,242,255,0.15)", border: "rgba(0,242,255,0.5)", dot: "#00f2ff", text: "rgb(0,242,255)" },   // cyan
  { bg: "rgba(251,191,36,0.15)", border: "rgba(251,191,36,0.5)", dot: "#fbbf24", text: "rgb(251,191,36)" }, // amber
  { bg: "rgba(167,139,250,0.15)", border: "rgba(167,139,250,0.5)", dot: "#a78bfa", text: "rgb(167,139,250)" }, // violet
  { bg: "rgba(52,211,153,0.15)", border: "rgba(52,211,153,0.5)", dot: "#34d399", text: "rgb(52,211,153)" }, // green
  { bg: "rgba(251,113,133,0.15)", border: "rgba(251,113,133,0.5)", dot: "#fb7185", text: "rgb(251,113,133)" }, // rose
  { bg: "rgba(251,146,60,0.15)", border: "rgba(251,146,60,0.5)", dot: "#fb923c", text: "rgb(251,146,60)" }, // orange
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function compoundColor(compoundId: string) {
  return PALETTE[hashId(compoundId) % PALETTE.length];
}

export type CompoundColorEntry = ReturnType<typeof compoundColor>;
