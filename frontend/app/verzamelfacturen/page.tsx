"use client";

import { useEffect, useState } from "react";

import { FactuurDetail } from "@/app/components/FactuurDetail";
import { FactuurUploadFormulier } from "@/app/components/FactuurUploadFormulier";
import { Overlay } from "@/app/components/Overlay";
import { ApiError, getFacturen, type Factuur } from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const datumFormat = new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" });

interface SectieProps {
  titel: string;
  aantal: number;
  kleur?: string;
  children: React.ReactNode;
}

function Sectie({ titel, aantal, kleur, children }: SectieProps) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`mb-2 flex items-center gap-1.5 text-sm font-semibold ${kleur ?? "text-neutral-900 dark:text-neutral-100"}`}
      >
        <span className="text-xs">{open ? "▼" : "▶"}</span>
        {titel} ({aantal})
      </button>
      {open && <div className="flex flex-col gap-2">{children}</div>}
    </div>
  );
}

function FactuurRij({ factuur, onKlik }: { factuur: Factuur; onKlik: () => void }) {
  return (
    <div
      onClick={onKlik}
      className="flex cursor-pointer items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-900/60"
    >
      <div>
        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {factuur.bron} — {factuur.origineel_bestandsnaam ?? factuur.bestandsnaam}
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          Geüpload {datumFormat.format(new Date(factuur.geupload_op))}
        </div>
      </div>
      <span className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
        {factuur.totaalbedrag !== null ? bedragFormat.format(factuur.totaalbedrag) : "—"}
      </span>
    </div>
  );
}

export default function VerzamelfacturenPagina() {
  const [facturen, setFacturen] = useState<Factuur[]>([]);
  const [laden, setLaden] = useState(true);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [toonUpload, setToonUpload] = useState(false);
  const [geselecteerdId, setGeselecteerdId] = useState<number | null>(null);

  function laadFacturen() {
    getFacturen()
      .then((res) => setFacturen(res.facturen))
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon verzamelfacturen niet laden."))
      .finally(() => setLaden(false));
  }

  useEffect(laadFacturen, []);

  const nieuw = facturen.filter((f) => f.status === "nieuw");
  const gematcht = facturen.filter((f) => f.status === "gematcht");
  const gesplitst = facturen.filter((f) => f.status === "gesplitst");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Verzamelfacturen</h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Creditcard- of bol.com-overzichten koppelen aan een banktransactie en handmatig opsplitsen
            in losse regels met een eigen categorie.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setToonUpload(true)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          + Factuur uploaden
        </button>
      </div>

      {foutmelding && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {foutmelding}
        </p>
      )}

      <div className={laden ? "flex flex-col gap-6 opacity-50 transition-opacity" : "flex flex-col gap-6 transition-opacity"}>
        {facturen.length === 0 && (
          <p className="py-10 text-center text-sm text-neutral-400">
            Nog geen verzamelfacturen. Upload er een om te beginnen met matchen en splitsen.
          </p>
        )}

        {nieuw.length > 0 && (
          <Sectie titel="Nog te koppelen" aantal={nieuw.length} kleur="text-amber-700 dark:text-amber-400">
            {nieuw.map((f) => (
              <FactuurRij key={f.id} factuur={f} onKlik={() => setGeselecteerdId(f.id)} />
            ))}
          </Sectie>
        )}

        {gematcht.length > 0 && (
          <Sectie titel="Gekoppeld, nog te splitsen" aantal={gematcht.length} kleur="text-sky-700 dark:text-sky-400">
            {gematcht.map((f) => (
              <FactuurRij key={f.id} factuur={f} onKlik={() => setGeselecteerdId(f.id)} />
            ))}
          </Sectie>
        )}

        {gesplitst.length > 0 && (
          <Sectie titel="Gesplitst" aantal={gesplitst.length}>
            {gesplitst.map((f) => (
              <FactuurRij key={f.id} factuur={f} onKlik={() => setGeselecteerdId(f.id)} />
            ))}
          </Sectie>
        )}
      </div>

      <Overlay open={toonUpload} onClose={() => setToonUpload(false)} titel="Factuur uploaden">
        <FactuurUploadFormulier
          onGeupload={() => {
            setToonUpload(false);
            laadFacturen();
          }}
          onAnnuleren={() => setToonUpload(false)}
        />
      </Overlay>

      <Overlay open={geselecteerdId !== null} onClose={() => setGeselecteerdId(null)} titel="Verzamelfactuur">
        {geselecteerdId !== null && (
          <FactuurDetail
            factuurId={geselecteerdId}
            onGewijzigd={laadFacturen}
            onVerwijderd={() => {
              setGeselecteerdId(null);
              laadFacturen();
            }}
          />
        )}
      </Overlay>
    </main>
  );
}
