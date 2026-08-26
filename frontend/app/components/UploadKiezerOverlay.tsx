"use client";

import Link from "next/link";
import { useState } from "react";

import { BankUploadFormulier } from "@/app/components/BankUploadFormulier";
import { FactuurUploadFormulier } from "@/app/components/FactuurUploadFormulier";
import { Overlay } from "@/app/components/Overlay";
import { UploadsBeherenFormulier } from "@/app/components/UploadsBeherenFormulier";

type Keuze = "menu" | "bank" | "factuur" | "factuur-klaar" | "beheren";

const keuzeKnopKlasse =
  "flex flex-col items-start gap-1 rounded-lg border border-neutral-200 p-4 text-left hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:border-neutral-600 dark:hover:bg-neutral-800";

export function UploadKiezerOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [keuze, setKeuze] = useState<Keuze>("menu");

  function sluiten() {
    onClose();
    setTimeout(() => setKeuze("menu"), 200);
  }

  const titel =
    keuze === "menu"
      ? "Uploaden"
      : keuze === "bank"
        ? "Bankexport uploaden"
        : keuze === "factuur"
          ? "Verzamelfactuur uploaden"
          : keuze === "beheren"
            ? "Geüploade bestanden beheren"
            : "Geüpload";

  return (
    <Overlay open={open} onClose={sluiten} titel={titel}>
      {keuze === "menu" && (
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => setKeuze("bank")} className={keuzeKnopKlasse}>
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Bankexport</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              CSV-export van je bank — kies de bank, of registreer een nieuwe.
            </span>
          </button>
          <button type="button" onClick={() => setKeuze("factuur")} className={keuzeKnopKlasse}>
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Verzamelfactuur</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Eén factuur met meerdere posten, later handmatig te splitsen.
            </span>
          </button>
          <button type="button" onClick={() => setKeuze("beheren")} className={keuzeKnopKlasse}>
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Geüploade bestanden beheren</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Bekijk of verwijder eerder geüploade bankexports, bv. na een foute upload.
            </span>
          </button>
          <Link href="/verzamelfacturen" onClick={sluiten} className={keuzeKnopKlasse}>
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Verzamelfacturen bekijken</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Eerder geüploade verzamelfacturen inzien of alsnog splitsen in posten.
            </span>
          </Link>
        </div>
      )}

      {keuze === "bank" && <BankUploadFormulier onAnnuleren={() => setKeuze("menu")} />}

      {keuze === "beheren" && <UploadsBeherenFormulier onAnnuleren={() => setKeuze("menu")} />}

      {keuze === "factuur" && (
        <FactuurUploadFormulier onGeupload={() => setKeuze("factuur-klaar")} onAnnuleren={() => setKeuze("menu")} />
      )}

      {keuze === "factuur-klaar" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            Factuur geüpload. Splits &apos;m in posten op de Verzamelfacturen-pagina.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/verzamelfacturen"
              onClick={sluiten}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            >
              Naar Verzamelfacturen
            </Link>
            <button
              type="button"
              onClick={sluiten}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Sluiten
            </button>
          </div>
        </div>
      )}
    </Overlay>
  );
}
