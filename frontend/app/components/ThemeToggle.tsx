"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  leesOpgeslagenThema,
  pasThemaToe,
  serverThema,
  subscribeThema,
  THEMA_ICOON,
  THEMA_LABEL,
  VOLGEND_THEMA,
  zetThema,
} from "@/lib/thema";

export function ThemeToggle() {
  const thema = useSyncExternalStore(subscribeThema, leesOpgeslagenThema, serverThema);

  useEffect(() => {
    pasThemaToe(thema);
    if (thema !== "systeem") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => pasThemaToe("systeem");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [thema]);

  return (
    <button
      type="button"
      onClick={() => zetThema(VOLGEND_THEMA[thema])}
      title={`Thema: ${THEMA_LABEL[thema]} (klik om te wisselen)`}
      className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
    >
      <span aria-hidden="true">{THEMA_ICOON[thema]}</span>
      <span className="hidden sm:inline">{THEMA_LABEL[thema]}</span>
    </button>
  );
}
