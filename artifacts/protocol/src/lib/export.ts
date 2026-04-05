import type { DoseLogEntry } from "@/store/protocolStore";

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAsCSV(entries: DoseLogEntry[]): void {
  const header = [
    "Timestamp",
    "Compound",
    "Dose",
    "Unit",
    "Draw (units)",
    "mcg/unit",
    "mg/mL",
  ].join(",");

  const rows = entries.map((e) =>
    [
      new Date(e.timestamp).toISOString(),
      `"${e.compound}"`,
      e.dose,
      e.doseUnit,
      e.units,
      e.concentrationMcgPerUnit,
      e.concentrationMgPerMl,
    ].join(",")
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `protocol-dose-log-${date}.csv`);
}

export function exportAsJSON(entries: DoseLogEntry[]): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    entries,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8;",
  });
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `protocol-dose-log-${date}.json`);
}
