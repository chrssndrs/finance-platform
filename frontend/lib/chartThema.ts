export type ChartThema = "standaard" | "warm" | "koel";

export const CHART_THEMA_OPSLAGSLEUTEL = "chart-thema";

export const CHART_THEMA_OPTIES: { waarde: ChartThema; label: string; voorbeeld: [string, string, string] }[] = [
  { waarde: "standaard", label: "Standaard", voorbeeld: ["#2a78d6", "#eb6834", "#1baf7a"] },
  { waarde: "warm", label: "Warm", voorbeeld: ["#c0392b", "#e08e0b", "#8e44ad"] },
  { waarde: "koel", label: "Koel", voorbeeld: ["#1b6ca8", "#16a3b8", "#5b6ee1"] },
];

const GELDIGE_THEMAS = new Set<string>(CHART_THEMA_OPTIES.map((o) => o.waarde));

export function leesOpgeslagenChartThema(): ChartThema {
  if (typeof localStorage === "undefined") return "standaard";
  const waarde = localStorage.getItem(CHART_THEMA_OPSLAGSLEUTEL);
  return waarde && GELDIGE_THEMAS.has(waarde) ? (waarde as ChartThema) : "standaard";
}

export function pasChartThemaToe(thema: ChartThema) {
  const root = document.documentElement;
  for (const optie of CHART_THEMA_OPTIES) {
    root.classList.toggle(`chart-thema-${optie.waarde}`, optie.waarde === thema);
  }
}
