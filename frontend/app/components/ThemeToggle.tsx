"use client";

import { useEffect, useSyncExternalStore } from "react";

type Thema = "systeem" | "licht" | "donker";

const OPSLAGSLEUTEL = "thema";

function leesOpgeslagenThema(): Thema {
  const waarde = localStorage.getItem(OPSLAGSLEUTEL);
  return waarde === "licht" || waarde === "donker" ? waarde : "systeem";
}

function serverThema(): Thema {
  return "systeem";
}

const luisteraars = new Set<() => void>();

function subscribe(callback: () => void) {
  luisteraars.add(callback);
  return () => luisteraars.delete(callback);
}

function meldWijziging() {
  luisteraars.forEach((cb) => cb());
}

function pasThemaToe(thema: Thema) {
  const isDonker =
    thema === "donker" || (thema === "systeem" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDonker);
}

const VOLGENDE: Record<Thema, Thema> = {
  systeem: "licht",
  licht: "donker",
  donker: "systeem",
};

const ICOON: Record<Thema, string> = {
  systeem: "🖥️",
  licht: "☀️",
  donker: "🌙",
};

const LABEL: Record<Thema, string> = {
  systeem: "Systeem",
  licht: "Licht",
  donker: "Donker",
};

export function ThemeToggle() {
  const thema = useSyncExternalStore(subscribe, leesOpgeslagenThema, serverThema);

  useEffect(() => {
    pasThemaToe(thema);
    if (thema !== "systeem") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => pasThemaToe("systeem");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [thema]);

  function wissel() {
    localStorage.setItem(OPSLAGSLEUTEL, VOLGENDE[thema]);
    meldWijziging();
  }

  return (
    <button
      type="button"
      onClick={wissel}
      title={`Thema: ${LABEL[thema]} (klik om te wisselen)`}
      className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
    >
      <span aria-hidden="true">{ICOON[thema]}</span>
      <span className="hidden sm:inline">{LABEL[thema]}</span>
    </button>
  );
}
