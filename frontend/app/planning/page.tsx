"use client";

import { useEffect, useMemo, useState } from "react";

import { InboedelFormulier } from "@/app/components/InboedelFormulier";
import { Overlay } from "@/app/components/Overlay";
import { PlanningFormulier } from "@/app/components/PlanningFormulier";
import { TotalenChart } from "@/app/components/TotalenChart";
import {
  ApiError,
  getInboedelArtikelen,
  getInboedelOpties,
  getInstellingen,
  getPlanningItems,
  type InboedelArtikel,
  type PeriodeTotaal,
  type PlanningItem,
} from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const datumFormat = new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" });

// Alleen de 2 "verwacht"-lagen tonen — deze grafiek heeft geen echte
// bank-transacties (inkomsten/uitgaven), alleen geplande posten.
const ALLEEN_VERWACHT = { inkomsten: false, uitgaven: false, verwachte_inkomsten: true, verwachte_uitgaven: true };

function bucketPerMaand(items: PlanningItem[]): PeriodeTotaal[] {
  const buckets = new Map<string, { inkomsten: number; uitgaven: number }>();
  for (const item of items) {
    if (!item.datum) continue;
    const periodeStart = `${item.datum.slice(0, 7)}-01`;
    const slot = buckets.get(periodeStart) ?? { inkomsten: 0, uitgaven: 0 };
    if (item.bedrag >= 0) slot.inkomsten += item.bedrag;
    else slot.uitgaven += -item.bedrag;
    buckets.set(periodeStart, slot);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periode_start, v]) => ({
      periode_start,
      inkomsten: 0,
      uitgaven: 0,
      totaal: v.inkomsten - v.uitgaven,
      verwachte_inkomsten: v.inkomsten,
      verwachte_uitgaven: v.uitgaven,
    }));
}

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

export default function PlanningPagina() {
  const [items, setItems] = useState<PlanningItem[]>([]);
  const [artikelen, setArtikelen] = useState<InboedelArtikel[]>([]);
  const [merken, setMerken] = useState<string[]>([]);
  const [winkels, setWinkels] = useState<string[]>([]);
  const [laden, setLaden] = useState(true);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [toonNieuw, setToonNieuw] = useState(false);
  const [bewerktItem, setBewerktItem] = useState<PlanningItem | null>(null);
  const [bewerktArtikel, setBewerktArtikel] = useState<InboedelArtikel | null>(null);
  const [trendVenster, setTrendVenster] = useState(3);

  function laadAlles() {
    Promise.all([getPlanningItems(), getInboedelArtikelen(), getInboedelOpties()])
      .then(([planningRes, artikelenRes, optiesRes]) => {
        setItems(planningRes.items);
        setArtikelen(artikelenRes.artikelen);
        setMerken(optiesRes.merken);
        setWinkels(optiesRes.winkels);
      })
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon planning niet laden."))
      .finally(() => setLaden(false));
  }

  useEffect(laadAlles, []);
  useEffect(() => {
    getInstellingen()
      .then((res) => setTrendVenster(res.instellingen.trend_venster_maanden))
      .catch(() => {});
  }, []);

  function planningOpgeslagen() {
    setToonNieuw(false);
    setBewerktItem(null);
    laadAlles();
  }

  function planningVerwijderd() {
    setBewerktItem(null);
    laadAlles();
  }

  function artikelOpgeslagen() {
    setBewerktArtikel(null);
    laadAlles();
  }

  function artikelVerwijderd() {
    setBewerktArtikel(null);
    laadAlles();
  }

  function rijKlik(item: PlanningItem) {
    if (item.bron === "inboedel") {
      const artikel = artikelen.find((a) => a.id === item.artikel_id);
      if (artikel) setBewerktArtikel(artikel);
      return;
    }
    setBewerktItem(item);
  }

  const verwachteInkomsten = items.filter((i) => i.bedrag > 0).reduce((som, i) => som + i.bedrag, 0);
  const verwachteUitgaven = items.filter((i) => i.bedrag < 0).reduce((som, i) => som - i.bedrag, 0);
  const reeks = useMemo(() => bucketPerMaand(items), [items]);

  const afgeschreven = items.filter((i) => i.bron === "inboedel" && i.is_afgeschreven);
  const binnenkort = items.filter((i) => i.bron === "inboedel" && !i.is_afgeschreven);
  const handmatig = items.filter((i) => i.bron === "handmatig");

  function renderItem(item: PlanningItem) {
    return (
      <div
        key={item.id ?? `inboedel-${item.artikel_id}`}
        onClick={() => rijKlik(item)}
        className="flex cursor-pointer items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-900/60"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.omschrijving}</span>
            {item.bron === "inboedel" && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                Inboedel
              </span>
            )}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            {item.datum ? datumFormat.format(new Date(item.datum)) : "Geen datum"}
          </div>
        </div>
        <span
          className={
            "text-sm font-semibold tabular-nums " +
            (item.bedrag >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")
          }
        >
          {bedragFormat.format(item.bedrag)}
        </span>
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Planning</h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Geplande in-/uitgaven — handmatig ingevoerd of afgeleid van bijna-afgeschreven inboedel.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setToonNieuw(true)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          + Post toevoegen
        </button>
      </div>

      {!laden && !foutmelding && reeks.length > 0 && (
        <TotalenChart
          reeks={reeks}
          granulariteit="maand"
          toonVerwacht
          zichtbareSeries={ALLEEN_VERWACHT}
          trendVenster={trendVenster}
        />
      )}

      {!laden && !foutmelding && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Verwachte inkomsten</div>
            <div className="text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
              {bedragFormat.format(verwachteInkomsten)}
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Verwachte uitgaven</div>
            <div className="text-lg font-semibold tabular-nums text-red-700 dark:text-red-400">
              {bedragFormat.format(verwachteUitgaven)}
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Netto</div>
            <div className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
              {bedragFormat.format(verwachteInkomsten - verwachteUitgaven)}
            </div>
          </div>
        </div>
      )}

      {foutmelding && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {foutmelding}
        </p>
      )}

      <div className={laden ? "flex flex-col gap-6 opacity-50 transition-opacity" : "flex flex-col gap-6 transition-opacity"}>
        {items.length === 0 && (
          <p className="py-6 text-center text-sm text-neutral-400">Nog geen geplande posten.</p>
        )}

        {afgeschreven.length > 0 && (
          <Sectie titel="Al afgeschreven" aantal={afgeschreven.length} kleur="text-red-700 dark:text-red-400">
            {afgeschreven.map(renderItem)}
          </Sectie>
        )}

        {binnenkort.length > 0 && (
          <Sectie titel="Binnenkort afgeschreven" aantal={binnenkort.length} kleur="text-amber-700 dark:text-amber-400">
            {binnenkort.map(renderItem)}
          </Sectie>
        )}

        {handmatig.length > 0 && (
          <Sectie titel="Handmatig" aantal={handmatig.length}>
            {handmatig.map(renderItem)}
          </Sectie>
        )}
      </div>

      <Overlay open={toonNieuw} onClose={() => setToonNieuw(false)} titel="Post toevoegen">
        <PlanningFormulier onOpgeslagen={planningOpgeslagen} onAnnuleren={() => setToonNieuw(false)} />
      </Overlay>

      <Overlay open={bewerktItem !== null} onClose={() => setBewerktItem(null)} titel="Post bewerken">
        {bewerktItem && (
          <PlanningFormulier
            item={bewerktItem}
            onOpgeslagen={planningOpgeslagen}
            onAnnuleren={() => setBewerktItem(null)}
            onVerwijderd={planningVerwijderd}
          />
        )}
      </Overlay>

      <Overlay open={bewerktArtikel !== null} onClose={() => setBewerktArtikel(null)} titel="Artikel bewerken">
        {bewerktArtikel && (
          <InboedelFormulier
            artikel={bewerktArtikel}
            merken={merken}
            winkels={winkels}
            onOpgeslagen={artikelOpgeslagen}
            onAnnuleren={() => setBewerktArtikel(null)}
            onVerwijderd={artikelVerwijderd}
          />
        )}
      </Overlay>
    </main>
  );
}
