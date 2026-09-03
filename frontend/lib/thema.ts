/** Gedeelde thema-store: licht/donker/systeem, met een module-singleton
 * zodat de zwevende thema-knop (AppSwitcher) en de knop in Instellingen
 * altijd exact dezelfde state tonen — twee losse implementaties met elk
 * hun eigen localStorage-read zouden elkaar niet zien reageren op een
 * klik in de ander tot er toevallig iets anders een re-render triggerde. */

export type Thema = "systeem" | "licht" | "donker";

const OPSLAGSLEUTEL = "thema";

export function leesOpgeslagenThema(): Thema {
  const waarde = localStorage.getItem(OPSLAGSLEUTEL);
  return waarde === "licht" || waarde === "donker" ? waarde : "systeem";
}

export function serverThema(): Thema {
  return "systeem";
}

const luisteraars = new Set<() => void>();

export function subscribeThema(callback: () => void) {
  luisteraars.add(callback);
  return () => luisteraars.delete(callback);
}

function meldWijziging() {
  luisteraars.forEach((cb) => cb());
}

export function pasThemaToe(thema: Thema) {
  const isDonker =
    thema === "donker" || (thema === "systeem" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDonker);
}

export const VOLGEND_THEMA: Record<Thema, Thema> = { systeem: "licht", licht: "donker", donker: "systeem" };
export const THEMA_ICOON: Record<Thema, string> = { systeem: "🖥️", licht: "☀️", donker: "🌙" };
export const THEMA_LABEL: Record<Thema, string> = { systeem: "Systeem", licht: "Licht", donker: "Donker" };

export function zetThema(thema: Thema) {
  localStorage.setItem(OPSLAGSLEUTEL, thema);
  meldWijziging();
}
