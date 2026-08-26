"use client";

import { useEffect, useState } from "react";

import { HypotheekFormulier } from "@/app/components/HypotheekFormulier";
import { HypotheekGrafiek } from "@/app/components/HypotheekGrafiek";
import { HypotheekLeningdelenTabel } from "@/app/components/HypotheekLeningdelenTabel";
import { Overlay } from "@/app/components/Overlay";
import { VastgoedFormulier } from "@/app/components/VastgoedFormulier";
import { VastgoedGrafiek } from "@/app/components/VastgoedGrafiek";
import { VastgoedTabel } from "@/app/components/VastgoedTabel";
import {
  ApiError,
  deleteVastgoedLocatie,
  getLeningdelen,
  getSchuldverloop,
  getVastgoedLocaties,
  getWaardes,
  postVastgoedLocatie,
  putVastgoedLocatie,
  type Leningdeel,
  type SchuldPunt,
  type VastgoedLocatie,
  type Waarde,
} from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

export default function WoningPagina() {
  const [locaties, setLocaties] = useState<VastgoedLocatie[]>([]);
  const [geselecteerdeId, setGeselecteerdeId] = useState<number | null>(null);
  const [waardes, setWaardes] = useState<Waarde[]>([]);
  const [leningdelen, setLeningdelen] = useState<Leningdeel[]>([]);
  const [schuldReeks, setSchuldReeks] = useState<SchuldPunt[]>([]);
  const [actueleSchuld, setActueleSchuld] = useState(0);
  const [laden, setLaden] = useState(true);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [toonNieuweWaarde, setToonNieuweWaarde] = useState(false);
  const [bewerktWaarde, setBewerktWaarde] = useState<Waarde | null>(null);
  const [toonNieuwLeningdeel, setToonNieuwLeningdeel] = useState(false);
  const [bewerktLeningdeel, setBewerktLeningdeel] = useState<Leningdeel | null>(null);
  const [nieuweLocatieAdres, setNieuweLocatieAdres] = useState("");
  const [toonNieuweLocatie, setToonNieuweLocatie] = useState(false);
  const [adresBewerken, setAdresBewerken] = useState(false);
  const [adresInvoer, setAdresInvoer] = useState("");

  useEffect(() => {
    getVastgoedLocaties()
      .then((res) => {
        setLocaties(res.locaties);
        if (res.locaties.length > 0) {
          setGeselecteerdeId(res.locaties[0].id);
        } else {
          setLaden(false);
        }
      })
      .catch((err) => {
        setFoutmelding(err instanceof ApiError ? err.message : "Kon woning niet laden.");
        setLaden(false);
      });
  }, []);

  useEffect(() => {
    if (geselecteerdeId === null) return;
    Promise.all([
      getWaardes(geselecteerdeId),
      getLeningdelen(geselecteerdeId),
      getSchuldverloop(geselecteerdeId),
    ])
      .then(([waardesRes, leningdelenRes, verloopRes]) => {
        setWaardes(waardesRes.waardes);
        setLeningdelen(leningdelenRes.leningdelen);
        setSchuldReeks(verloopRes.reeks);
        setActueleSchuld(verloopRes.actuele_schuld_totaal);
      })
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon woning niet laden."))
      .finally(() => setLaden(false));
  }, [geselecteerdeId]);

  const geselecteerdeLocatie = locaties.find((l) => l.id === geselecteerdeId) ?? null;

  function kiesLocatie(id: number) {
    setLaden(true);
    setGeselecteerdeId(id);
  }

  async function locatieToevoegen(e: React.FormEvent) {
    e.preventDefault();
    if (!nieuweLocatieAdres.trim()) return;
    try {
      const locatie = await postVastgoedLocatie({ adres: nieuweLocatieAdres.trim() });
      setLocaties((huidig) => [...huidig, locatie]);
      setGeselecteerdeId(locatie.id);
      setNieuweLocatieAdres("");
      setToonNieuweLocatie(false);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Locatie toevoegen mislukt.");
    }
  }

  async function adresOpslaan() {
    if (!geselecteerdeLocatie) return;
    try {
      const bijgewerkt = await putVastgoedLocatie(geselecteerdeLocatie.id, { adres: adresInvoer.trim() });
      setLocaties((huidig) => huidig.map((l) => (l.id === bijgewerkt.id ? bijgewerkt : l)));
      setAdresBewerken(false);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Adres opslaan mislukt.");
    }
  }

  async function locatieVerwijderen() {
    if (!geselecteerdeLocatie) return;
    if (
      !window.confirm(
        `"${geselecteerdeLocatie.adres}" verwijderen? Alle waardes en leningdelen hiervan gaan ook weg.`
      )
    )
      return;
    try {
      await deleteVastgoedLocatie(geselecteerdeLocatie.id);
      const overgebleven = locaties.filter((l) => l.id !== geselecteerdeLocatie.id);
      setLocaties(overgebleven);
      setGeselecteerdeId(overgebleven[0]?.id ?? null);
      if (overgebleven.length === 0) {
        setWaardes([]);
        setLeningdelen([]);
        setSchuldReeks([]);
      }
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Verwijderen mislukt.");
    }
  }

  function waardeOpgeslagen(waarde: Waarde) {
    setWaardes((huidig) =>
      huidig.some((w) => w.id === waarde.id) ? huidig.map((w) => (w.id === waarde.id ? waarde : w)) : [...huidig, waarde]
    );
    setToonNieuweWaarde(false);
    setBewerktWaarde(null);
  }

  function waardeVerwijderd(id: number) {
    setWaardes((huidig) => huidig.filter((w) => w.id !== id));
    setBewerktWaarde(null);
  }

  function herlaadHypotheek() {
    if (geselecteerdeId === null) return;
    Promise.all([getLeningdelen(geselecteerdeId), getSchuldverloop(geselecteerdeId)])
      .then(([leningdelenRes, verloopRes]) => {
        setLeningdelen(leningdelenRes.leningdelen);
        setSchuldReeks(verloopRes.reeks);
        setActueleSchuld(verloopRes.actuele_schuld_totaal);
      })
      .catch(() => {});
  }

  function leningdeelOpgeslagen() {
    setToonNieuwLeningdeel(false);
    setBewerktLeningdeel(null);
    herlaadHypotheek();
  }

  function leningdeelVerwijderd() {
    setBewerktLeningdeel(null);
    herlaadHypotheek();
  }

  const gesorteerdOpDatum = [...waardes].sort((a, b) => a.datum.localeCompare(b.datum));
  const laatsteWaarde = gesorteerdOpDatum.at(-1);
  const percentageAfbetaald = (() => {
    const totaalHoofdsom = leningdelen.reduce((s, l) => s + l.hoofdsom, 0);
    if (totaalHoofdsom <= 0) return null;
    return ((totaalHoofdsom - actueleSchuld) / totaalHoofdsom) * 100;
  })();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Woning</h1>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
        {locaties.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => kiesLocatie(l.id)}
            className={
              "rounded-full border px-2.5 py-1 text-xs " +
              (geselecteerdeId === l.id
                ? "border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
                : "border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800")
            }
          >
            {l.adres}
          </button>
        ))}
        {toonNieuweLocatie ? (
          <form onSubmit={locatieToevoegen} className="flex items-center gap-1.5">
            <input
              type="text"
              autoFocus
              placeholder="Adres"
              value={nieuweLocatieAdres}
              onChange={(e) => setNieuweLocatieAdres(e.target.value)}
              className={`${inputKlasse} w-48 py-1 text-xs`}
            />
            <button type="submit" className="rounded-full border border-neutral-900 px-2.5 py-1 text-xs text-neutral-900 dark:border-neutral-100 dark:text-neutral-100">
              Toevoegen
            </button>
            <button type="button" onClick={() => setToonNieuweLocatie(false)} className="text-xs text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
              Annuleren
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setToonNieuweLocatie(true)}
            className="rounded-full border border-dashed border-neutral-300 px-2.5 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            + Locatie
          </button>
        )}
      </div>

      {foutmelding && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {foutmelding}
        </p>
      )}

      {locaties.length === 0 && !laden && (
        <p className="py-10 text-center text-sm text-neutral-400">
          Nog geen locaties toegevoegd. Voeg er hierboven eentje toe.
        </p>
      )}

      {geselecteerdeLocatie && (
        <>
          <div className="flex items-center justify-between">
            {adresBewerken ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={adresInvoer}
                  onChange={(e) => setAdresInvoer(e.target.value)}
                  className={`${inputKlasse} max-w-xs`}
                />
                <button
                  type="button"
                  onClick={adresOpslaan}
                  className="rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900"
                >
                  Opslaan
                </button>
                <button
                  type="button"
                  onClick={() => setAdresBewerken(false)}
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
                    setAdresInvoer(geselecteerdeLocatie.adres);
                    setAdresBewerken(true);
                  }}
                  className="text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                >
                  Adres bewerken
                </button>
                <button
                  type="button"
                  onClick={locatieVerwijderen}
                  className="text-xs text-red-700 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                >
                  Locatie verwijderen
                </button>
              </div>
            )}
          </div>

          <div className={laden ? "flex flex-col gap-6 opacity-50 transition-opacity" : "flex flex-col gap-6 transition-opacity"}>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Woningwaarde</h2>
                <button
                  type="button"
                  onClick={() => setToonNieuweWaarde(true)}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  + Waarde toevoegen
                </button>
              </div>

              {!laden && laatsteWaarde && (
                <div className="mb-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">Meest recente waarde</div>
                  <div className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                    {bedragFormat.format(laatsteWaarde.waarde)}
                  </div>
                </div>
              )}

              {!laden && waardes.length === 0 && !foutmelding ? (
                <p className="py-6 text-center text-sm text-neutral-400">
                  Nog geen waardes ingevoerd. Voeg de eerste toe om de ontwikkeling te gaan bijhouden.
                </p>
              ) : (
                <>
                  {waardes.length > 1 && (
                    <div className="mb-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                      <VastgoedGrafiek waardes={gesorteerdOpDatum} />
                    </div>
                  )}
                  <VastgoedTabel waardes={waardes} onRijKlik={setBewerktWaarde} />
                </>
              )}
            </div>

            <div className="border-t border-neutral-200 pt-6 dark:border-neutral-800">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Hypotheek</h2>
                <button
                  type="button"
                  onClick={() => setToonNieuwLeningdeel(true)}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  + Leningdeel toevoegen
                </button>
              </div>

              {!laden && leningdelen.length > 0 && (
                <div className="mb-3 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">Actuele resterende schuld</div>
                    <div className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                      {bedragFormat.format(actueleSchuld)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">Percentage afbetaald</div>
                    <div className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                      {percentageAfbetaald !== null ? `${percentageAfbetaald.toFixed(1).replace(".", ",")}%` : "—"}
                    </div>
                  </div>
                </div>
              )}

              {!laden && leningdelen.length === 0 && !foutmelding ? (
                <p className="py-6 text-center text-sm text-neutral-400">
                  Nog geen leningdelen. Voeg je hypotheekgegevens toe om de resterende schuld en het verloop te zien.
                </p>
              ) : (
                <>
                  {schuldReeks.length > 0 && (
                    <div className="mb-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                      <HypotheekGrafiek reeks={schuldReeks} />
                    </div>
                  )}
                  <HypotheekLeningdelenTabel leningdelen={leningdelen} onRijKlik={setBewerktLeningdeel} />
                </>
              )}
            </div>
          </div>

          <Overlay open={toonNieuweWaarde} onClose={() => setToonNieuweWaarde(false)} titel="Waarde toevoegen">
            <VastgoedFormulier locatieId={geselecteerdeLocatie.id} onOpgeslagen={waardeOpgeslagen} onAnnuleren={() => setToonNieuweWaarde(false)} />
          </Overlay>

          <Overlay open={bewerktWaarde !== null} onClose={() => setBewerktWaarde(null)} titel="Waarde bewerken">
            {bewerktWaarde && (
              <VastgoedFormulier
                locatieId={geselecteerdeLocatie.id}
                waarde={bewerktWaarde}
                onOpgeslagen={waardeOpgeslagen}
                onAnnuleren={() => setBewerktWaarde(null)}
                onVerwijderd={waardeVerwijderd}
              />
            )}
          </Overlay>

          <Overlay open={toonNieuwLeningdeel} onClose={() => setToonNieuwLeningdeel(false)} titel="Leningdeel toevoegen">
            <HypotheekFormulier
              locatieId={geselecteerdeLocatie.id}
              onOpgeslagen={leningdeelOpgeslagen}
              onAnnuleren={() => setToonNieuwLeningdeel(false)}
            />
          </Overlay>

          <Overlay open={bewerktLeningdeel !== null} onClose={() => setBewerktLeningdeel(null)} titel="Leningdeel bewerken">
            {bewerktLeningdeel && (
              <HypotheekFormulier
                locatieId={geselecteerdeLocatie.id}
                leningdeel={bewerktLeningdeel}
                onOpgeslagen={leningdeelOpgeslagen}
                onAnnuleren={() => setBewerktLeningdeel(null)}
                onVerwijderd={leningdeelVerwijderd}
              />
            )}
          </Overlay>
        </>
      )}
    </main>
  );
}
