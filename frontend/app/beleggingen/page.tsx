"use client";

import { useEffect, useState } from "react";

import { BeleggingenFormulier } from "@/app/components/BeleggingenFormulier";
import { BeleggingenGrafiek } from "@/app/components/BeleggingenGrafiek";
import { BeleggingenPositiesTabel } from "@/app/components/BeleggingenPositiesTabel";
import { BeleggingenTransactiesTabel } from "@/app/components/BeleggingenTransactiesTabel";
import { Overlay } from "@/app/components/Overlay";
import {
  ApiError,
  deletePortefeuille,
  getBeleggingTransacties,
  getPortefeuilles,
  getPosities,
  postPortefeuille,
  putPortefeuille,
  type BeleggingTransactie,
  type Portefeuille,
  type Positie,
} from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

export default function BeleggingenPagina() {
  const [portefeuilles, setPortefeuilles] = useState<Portefeuille[]>([]);
  const [geselecteerdeId, setGeselecteerdeId] = useState<number | null>(null);
  const [transacties, setTransacties] = useState<BeleggingTransactie[]>([]);
  const [posities, setPosities] = useState<Positie[]>([]);
  const [laden, setLaden] = useState(true);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [toonNieuw, setToonNieuw] = useState(false);
  const [bewerktTransactie, setBewerktTransactie] = useState<BeleggingTransactie | null>(null);
  const [nieuwePortefeuilleNaam, setNieuwePortefeuilleNaam] = useState("");
  const [toonNieuwePortefeuille, setToonNieuwePortefeuille] = useState(false);
  const [naamBewerken, setNaamBewerken] = useState(false);
  const [naamInvoer, setNaamInvoer] = useState("");

  useEffect(() => {
    getPortefeuilles()
      .then((res) => {
        setPortefeuilles(res.portefeuilles);
        if (res.portefeuilles.length > 0) {
          setGeselecteerdeId(res.portefeuilles[0].id);
        } else {
          setLaden(false);
        }
      })
      .catch((err) => {
        setFoutmelding(err instanceof ApiError ? err.message : "Kon portefeuilles niet laden.");
        setLaden(false);
      });
  }, []);

  useEffect(() => {
    if (geselecteerdeId === null) return;
    Promise.all([getBeleggingTransacties(geselecteerdeId), getPosities(geselecteerdeId)])
      .then(([transactiesRes, positiesRes]) => {
        setTransacties(transactiesRes.transacties);
        setPosities(positiesRes.posities);
      })
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon beleggingen niet laden."))
      .finally(() => setLaden(false));
  }, [geselecteerdeId]);

  const geselecteerdePortefeuille = portefeuilles.find((p) => p.id === geselecteerdeId) ?? null;

  function kiesPortefeuille(id: number) {
    setLaden(true);
    setGeselecteerdeId(id);
  }

  async function portefeuilleToevoegen(e: React.FormEvent) {
    e.preventDefault();
    if (!nieuwePortefeuilleNaam.trim()) return;
    try {
      const portefeuille = await postPortefeuille({ naam: nieuwePortefeuilleNaam.trim() });
      setPortefeuilles((huidig) => [...huidig, portefeuille]);
      setGeselecteerdeId(portefeuille.id);
      setNieuwePortefeuilleNaam("");
      setToonNieuwePortefeuille(false);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Portefeuille toevoegen mislukt.");
    }
  }

  async function naamOpslaan() {
    if (!geselecteerdePortefeuille) return;
    try {
      const bijgewerkt = await putPortefeuille(geselecteerdePortefeuille.id, { naam: naamInvoer.trim() });
      setPortefeuilles((huidig) => huidig.map((p) => (p.id === bijgewerkt.id ? bijgewerkt : p)));
      setNaamBewerken(false);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Naam opslaan mislukt.");
    }
  }

  async function portefeuilleVerwijderen() {
    if (!geselecteerdePortefeuille) return;
    if (!window.confirm(`"${geselecteerdePortefeuille.naam}" verwijderen? Alle transacties hierin gaan ook weg.`)) return;
    try {
      await deletePortefeuille(geselecteerdePortefeuille.id);
      const overgebleven = portefeuilles.filter((p) => p.id !== geselecteerdePortefeuille.id);
      setPortefeuilles(overgebleven);
      setGeselecteerdeId(overgebleven[0]?.id ?? null);
      if (overgebleven.length === 0) {
        setTransacties([]);
        setPosities([]);
      }
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Verwijderen mislukt.");
    }
  }

  function transactieOpgeslagen(transactie: BeleggingTransactie) {
    setTransacties((huidig) =>
      huidig.some((t) => t.id === transactie.id) ? huidig.map((t) => (t.id === transactie.id ? transactie : t)) : [...huidig, transactie]
    );
    setToonNieuw(false);
    setBewerktTransactie(null);
    // aantal-in-bezit en de eventueel net-ontdekte valuta raken de
    // posities-tabel — simpeler om die opnieuw op te halen dan de
    // berekening ook in de browser te dupliceren.
    if (geselecteerdeId !== null) {
      getPosities(geselecteerdeId).then((res) => setPosities(res.posities)).catch(() => {});
    }
  }

  function transactieVerwijderd(id: number) {
    setTransacties((huidig) => huidig.filter((t) => t.id !== id));
    setBewerktTransactie(null);
    if (geselecteerdeId !== null) {
      getPosities(geselecteerdeId).then((res) => setPosities(res.posities)).catch(() => {});
    }
  }

  const totaleWaarde = posities.reduce((som, p) => som + (p.huidige_waarde ?? 0), 0);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Beleggingen</h1>
        {geselecteerdePortefeuille && (
          <button
            type="button"
            onClick={() => setToonNieuw(true)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            + Transactie toevoegen
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
        {portefeuilles.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => kiesPortefeuille(p.id)}
            className={
              "rounded-full border px-2.5 py-1 text-xs " +
              (geselecteerdeId === p.id
                ? "border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
                : "border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800")
            }
          >
            {p.naam}
          </button>
        ))}
        {toonNieuwePortefeuille ? (
          <form onSubmit={portefeuilleToevoegen} className="flex items-center gap-1.5">
            <input
              type="text"
              autoFocus
              placeholder="Naam"
              value={nieuwePortefeuilleNaam}
              onChange={(e) => setNieuwePortefeuilleNaam(e.target.value)}
              className={`${inputKlasse} w-48 py-1 text-xs`}
            />
            <button type="submit" className="rounded-full border border-neutral-900 px-2.5 py-1 text-xs text-neutral-900 dark:border-neutral-100 dark:text-neutral-100">
              Toevoegen
            </button>
            <button type="button" onClick={() => setToonNieuwePortefeuille(false)} className="text-xs text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
              Annuleren
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setToonNieuwePortefeuille(true)}
            className="rounded-full border border-dashed border-neutral-300 px-2.5 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            + Portefeuille
          </button>
        )}
      </div>

      {foutmelding && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {foutmelding}
        </p>
      )}

      {portefeuilles.length === 0 && !laden && (
        <p className="py-10 text-center text-sm text-neutral-400">
          Nog geen portefeuilles toegevoegd. Voeg er hierboven eentje toe.
        </p>
      )}

      {geselecteerdePortefeuille && (
        <>
          <div className="flex items-center justify-between">
            {naamBewerken ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={naamInvoer}
                  onChange={(e) => setNaamInvoer(e.target.value)}
                  className={`${inputKlasse} max-w-xs`}
                />
                <button
                  type="button"
                  onClick={naamOpslaan}
                  className="rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900"
                >
                  Opslaan
                </button>
                <button
                  type="button"
                  onClick={() => setNaamBewerken(false)}
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400"
                >
                  Annuleren
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setNaamInvoer(geselecteerdePortefeuille.naam);
                    setNaamBewerken(true);
                  }}
                  className="text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                >
                  Naam bewerken
                </button>
                <button
                  type="button"
                  onClick={portefeuilleVerwijderen}
                  className="text-xs text-red-700 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                >
                  Portefeuille verwijderen
                </button>
              </div>
            )}
          </div>

          {!laden && !foutmelding && posities.length > 0 && (
            <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="text-sm text-neutral-500 dark:text-neutral-400">Totale waarde</div>
              <div className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                {bedragFormat.format(totaleWaarde)}
              </div>
            </div>
          )}

          <div className={laden ? "flex flex-col gap-6 opacity-50 transition-opacity" : "flex flex-col gap-6 transition-opacity"}>
            {!laden && transacties.length === 0 && !foutmelding ? (
              <p className="py-10 text-center text-sm text-neutral-400">
                Nog geen transacties in deze portefeuille. Voeg je eerste aan- of verkoop toe om de ontwikkeling te gaan bijhouden.
              </p>
            ) : (
              <>
                <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <BeleggingenGrafiek portefeuilleId={geselecteerdePortefeuille.id} posities={posities} />
                </div>
                <div>
                  <h2 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Huidige posities</h2>
                  <BeleggingenPositiesTabel posities={posities} />
                </div>
                <div>
                  <h2 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Transacties</h2>
                  <BeleggingenTransactiesTabel transacties={transacties} onRijKlik={setBewerktTransactie} />
                </div>
              </>
            )}
          </div>

          <Overlay open={toonNieuw} onClose={() => setToonNieuw(false)} titel="Transactie toevoegen">
            <BeleggingenFormulier
              portefeuilleId={geselecteerdePortefeuille.id}
              onOpgeslagen={transactieOpgeslagen}
              onAnnuleren={() => setToonNieuw(false)}
            />
          </Overlay>

          <Overlay open={bewerktTransactie !== null} onClose={() => setBewerktTransactie(null)} titel="Transactie bewerken">
            {bewerktTransactie && (
              <BeleggingenFormulier
                portefeuilleId={geselecteerdePortefeuille.id}
                transactie={bewerktTransactie}
                onOpgeslagen={transactieOpgeslagen}
                onAnnuleren={() => setBewerktTransactie(null)}
                onVerwijderd={transactieVerwijderd}
              />
            )}
          </Overlay>
        </>
      )}
    </main>
  );
}
