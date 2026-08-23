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

// --- Periode-selectie (deel van de filterstand): "laatste N eenheid", "alles",
// of een handmatig gekozen van/tot-datumbereik. ---

export type PeriodeSelectie =
  | { modus: "alles" }
  | { modus: "relatief"; aantal: number; eenheid: Granulariteit }
  | { modus: "aangepast"; vanaf: string; tot: string };

export const STANDAARD_PERIODE_SELECTIE: PeriodeSelectie = { modus: "relatief", aantal: 6, eenheid: "maand" };

export const SNELKEUZES: { aantal: number; eenheid: Granulariteit }[] = [
  { aantal: 7, eenheid: "dag" },
  { aantal: 30, eenheid: "dag" },
  { aantal: 3, eenheid: "maand" },
  { aantal: 6, eenheid: "maand" },
  { aantal: 12, eenheid: "maand" },
  { aantal: 3, eenheid: "jaar" },
];

// Gebruikt lokale datumcomponenten (niet .toISOString(), die naar UTC
// converteert en in NL rond middernacht een dag kan terugspringen).
function naarIsoDatum(d: Date): string {
  const jaar = d.getFullYear();
  const maand = String(d.getMonth() + 1).padStart(2, "0");
  const dag = String(d.getDate()).padStart(2, "0");
  return `${jaar}-${maand}-${dag}`;
}

export function berekenVanafDatum(aantal: number, eenheid: Granulariteit, vandaag: Date = new Date()): string {
  const d = new Date(vandaag);
  switch (eenheid) {
    case "dag":
      d.setDate(d.getDate() - aantal);
      break;
    case "week":
      d.setDate(d.getDate() - aantal * 7);
      break;
    case "maand":
      d.setMonth(d.getMonth() - aantal);
      break;
    case "jaar":
      d.setFullYear(d.getFullYear() - aantal);
      break;
  }
  return naarIsoDatum(d);
}

export function resolveerPeriodeSelectie(selectie: PeriodeSelectie): { vanaf: string | null; tot: string | null } {
  switch (selectie.modus) {
    case "alles":
      return { vanaf: null, tot: null };
    case "relatief":
      return { vanaf: berekenVanafDatum(selectie.aantal, selectie.eenheid), tot: null };
    case "aangepast":
      return { vanaf: selectie.vanaf, tot: selectie.tot };
  }
}

const datumKortFormat = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" });

export function formatteerDatumKort(iso: string): string {
  return datumKortFormat.format(new Date(`${iso}T00:00:00`));
}

export function labelPeriodeSelectie(selectie: PeriodeSelectie): string {
  switch (selectie.modus) {
    case "alles":
      return "Alles";
    case "relatief": {
      const eenheidLabel = selectie.aantal === 1 ? EENHEID_ENKELVOUD[selectie.eenheid] : EENHEID_MEERVOUD[selectie.eenheid];
      return `Laatste ${selectie.aantal} ${eenheidLabel}`;
    }
    case "aangepast":
      return `${formatteerDatumKort(selectie.vanaf)} – ${formatteerDatumKort(selectie.tot)}`;
  }
}

// Het volledige datumbereik van één periode-blok uit de totalen-reeks (bv. de hele
// maand van een aangeklikte rij), gebruikt om de onderliggende transacties op te halen.
export function berekenPeriodeBereik(periodeStart: string, granulariteit: Granulariteit): { vanaf: string; tot: string } {
  const eind = new Date(`${periodeStart}T00:00:00`);
  switch (granulariteit) {
    case "dag":
      eind.setDate(eind.getDate() + 1);
      break;
    case "week":
      eind.setDate(eind.getDate() + 7);
      break;
    case "maand":
      eind.setMonth(eind.getMonth() + 1);
      break;
    case "jaar":
      eind.setFullYear(eind.getFullYear() + 1);
      break;
  }
  eind.setDate(eind.getDate() - 1);
  return { vanaf: periodeStart, tot: naarIsoDatum(eind) };
}
