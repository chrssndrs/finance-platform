import type { Granulariteit } from "@/lib/api";

const dagFormat = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" });
const maandFormat = new Intl.DateTimeFormat("nl-NL", { month: "short", year: "numeric" });

function isoWeekNummer(d: Date): number {
  const datum = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dagNum = (datum.getUTCDay() + 6) % 7;
  datum.setUTCDate(datum.getUTCDate() - dagNum + 3);
  const eersteDonderdag = new Date(Date.UTC(datum.getUTCFullYear(), 0, 4));
  const eersteDagNum = (eersteDonderdag.getUTCDay() + 6) % 7;
  eersteDonderdag.setUTCDate(eersteDonderdag.getUTCDate() - eersteDagNum + 3);
  return 1 + Math.round((datum.getTime() - eersteDonderdag.getTime()) / (7 * 24 * 3600 * 1000));
}

export function formatteerPeriode(periodeStart: string, granulariteit: Granulariteit): string {
  const datum = new Date(`${periodeStart}T00:00:00`);
  switch (granulariteit) {
    case "dag":
      return dagFormat.format(datum);
    case "week":
      return `Week ${isoWeekNummer(datum)}, ${datum.getFullYear()}`;
    case "maand":
      return maandFormat.format(datum);
    case "jaar":
      return String(datum.getFullYear());
  }
}

export const EENHEID_ENKELVOUD: Record<Granulariteit, string> = {
  dag: "dag",
  week: "week",
  maand: "mnd",
  jaar: "jaar",
};

export const EENHEID_MEERVOUD: Record<Granulariteit, string> = {
  dag: "dagen",
  week: "weken",
  maand: "maanden",
  jaar: "jaar",
};

export const PERIODE_PRESETS: Record<Granulariteit, number[]> = {
  dag: [7, 14, 30, 60],
  week: [4, 8, 12, 26],
  maand: [3, 6, 12, 24],
  jaar: [1, 2, 3, 5],
};
