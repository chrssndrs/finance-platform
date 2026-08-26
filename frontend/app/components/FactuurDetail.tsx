"use client";

import { useEffect, useMemo, useState } from "react";

import { Combobox } from "@/app/components/Combobox";
import {
  ApiError,
  deleteFactuur,
  deleteFactuurRegel,
  factuurBestandUrl,
  getCategorieen,
  getFactuur,
  getTransacties,
  postFactuurRegel,
  putFactuur,
  putFactuurRegel,
  type CategorieGroep,
  type FactuurMetRegels,
  type Regel,
  type RegelInvoer,
  type Transactie,
} from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const datumFormat = new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" });

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

function RegelRij({
  regel,
  categorieen,
  onOpgeslagen,
  onVerwijderd,
}: {
  regel: Regel;
  categorieen: CategorieGroep[];
  onOpgeslagen: (r: Regel) => void;
  onVerwijderd: (id: number) => void;
}) {
  const [omschrijving, setOmschrijving] = useState(regel.omschrijving);
  const [bedrag, setBedrag] = useState(String(Math.abs(regel.bedrag)));
  const [categorie, setCategorie] = useState<string | null>(regel.categorie);
  const [subcategorie, setSubcategorie] = useState<string | null>(regel.subcategorie);
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const subcategorieen = categorieen.find((g) => g.categorie === categorie)?.subcategorieen ?? [];

  async function bijwerken(overrides: Partial<{ categorie: string | null; subcategorie: string | null }> = {}) {
    setBezig(true);
    setFoutmelding(null);
    try {
      const bijgewerkt = await putFactuurRegel(regel.id, {
        omschrijving,
        bedrag: -Math.abs(Number(bedrag.replace(",", ".")) || 0),
        categorie: overrides.categorie !== undefined ? overrides.categorie : categorie,
        subcategorie: overrides.subcategorie !== undefined ? overrides.subcategorie : subcategorie,
      });
      onOpgeslagen(bijgewerkt);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2 border-b border-neutral-200 py-2 last:border-b-0 dark:border-neutral-800">
      <input
        type="text"
        value={omschrijving}
        onChange={(e) => setOmschrijving(e.target.value)}
        onBlur={() => bijwerken()}
        className={`${inputKlasse} min-w-[8rem] flex-1`}
        placeholder="Omschrijving"
      />
      <input
        type="text"
        inputMode="decimal"
        value={bedrag}
        onChange={(e) => setBedrag(e.target.value)}
        onBlur={() => bijwerken()}
        className={`${inputKlasse} w-24`}
      />
      <div className="w-36">
        <Combobox
          label=""
          opties={categorieen.map((g) => g.categorie)}
          waarde={categorie}
          onChange={(c) => {
            setCategorie(c);
            setSubcategorie(null);
            bijwerken({ categorie: c, subcategorie: null });
          }}
          vrijeInvoer
          placeholder="Categorie"
        />
      </div>
      <div className="w-36">
        <Combobox
          label=""
          opties={subcategorieen}
          waarde={subcategorie}
          onChange={(s) => {
            setSubcategorie(s);
            bijwerken({ subcategorie: s });
          }}
          vrijeInvoer
          placeholder="Subcategorie"
        />
      </div>
      <button
        type="button"
        disabled={bezig}
        onClick={() => deleteFactuurRegel(regel.id).then(() => onVerwijderd(regel.id))}
        className="text-sm text-red-700 hover:text-red-900 disabled:opacity-50 disabled:pointer-events-none dark:text-red-400 dark:hover:text-red-300"
      >
        Verwijderen
      </button>
      {foutmelding && <p className="w-full text-sm text-red-700 dark:text-red-400">{foutmelding}</p>}
    </div>
  );
}

function NieuweRegelFormulier({
  factuurId,
  categorieen,
  resterend,
  onToegevoegd,
}: {
  factuurId: number;
  categorieen: CategorieGroep[];
  resterend: number | null;
  onToegevoegd: (r: Regel) => void;
}) {
  const [omschrijving, setOmschrijving] = useState("");
  const [bedrag, setBedrag] = useState("");
  const [categorie, setCategorie] = useState<string | null>(null);
  const [subcategorie, setSubcategorie] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const subcategorieen = categorieen.find((g) => g.categorie === categorie)?.subcategorieen ?? [];

  async function toevoegen() {
    if (!omschrijving.trim() || !bedrag.trim()) {
      setFoutmelding("Omschrijving en bedrag zijn verplicht.");
      return;
    }
    setBezig(true);
    setFoutmelding(null);
    try {
      const invoer: RegelInvoer = {
        omschrijving: omschrijving.trim(),
        bedrag: -Math.abs(Number(bedrag.replace(",", "."))),
        categorie,
        subcategorie,
      };
      const regel = await postFactuurRegel(factuurId, invoer);
      onToegevoegd(regel);
      setOmschrijving("");
      setBedrag("");
      setCategorie(null);
      setSubcategorie(null);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Toevoegen mislukt.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2 pt-2">
      <input
        type="text"
        placeholder="Omschrijving"
        value={omschrijving}
        onChange={(e) => setOmschrijving(e.target.value)}
        className={`${inputKlasse} min-w-[8rem] flex-1`}
      />
      <input
        type="text"
        inputMode="decimal"
        placeholder="0,00"
        value={bedrag}
        onChange={(e) => setBedrag(e.target.value)}
        className={`${inputKlasse} w-24`}
      />
      <div className="w-36">
        <Combobox
          label=""
          opties={categorieen.map((g) => g.categorie)}
          waarde={categorie}
          onChange={(c) => {
            setCategorie(c);
            setSubcategorie(null);
          }}
          vrijeInvoer
          placeholder="Categorie"
        />
      </div>
      <div className="w-36">
        <Combobox label="" opties={subcategorieen} waarde={subcategorie} onChange={setSubcategorie} vrijeInvoer placeholder="Subcategorie" />
      </div>
      <button
        type="button"
        disabled={bezig}
        onClick={toevoegen}
        className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-100 dark:text-neutral-900"
      >
        + Regel
      </button>
      {resterend !== null && resterend > 0.01 && (
        <button
          type="button"
          onClick={() => setBedrag(String(resterend.toFixed(2)).replace(".", ","))}
          className="text-xs text-neutral-500 underline hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Vul resterend bedrag in ({bedragFormat.format(resterend)})
        </button>
      )}
      {foutmelding && <p className="w-full text-sm text-red-700 dark:text-red-400">{foutmelding}</p>}
    </div>
  );
}

function MatchSectie({ factuur, onGematcht }: { factuur: FactuurMetRegels; onGematcht: (f: FactuurMetRegels) => void }) {
  const [transacties, setTransacties] = useState<Transactie[]>([]);
  const [laden, setLaden] = useState(true);
  const [bezig, setBezig] = useState(false);

  useEffect(() => {
    const nu = new Date();
    const zesMaandenGeleden = new Date(nu.getFullYear(), nu.getMonth() - 6, nu.getDate());
    getTransacties({
      categorie: null,
      subcategorie: null,
      afzenders: [],
      vanaf: zesMaandenGeleden.toISOString().slice(0, 10),
      tot: nu.toISOString().slice(0, 10),
    })
      .then((res) => setTransacties(res.transacties))
      .finally(() => setLaden(false));
  }, []);

  const gesorteerd = useMemo(() => {
    if (!factuur.totaalbedrag) return transacties;
    return [...transacties].sort(
      (a, b) => Math.abs(Math.abs(a.bedrag_eur) - factuur.totaalbedrag!) - Math.abs(Math.abs(b.bedrag_eur) - factuur.totaalbedrag!)
    );
  }, [transacties, factuur.totaalbedrag]);

  async function koppelen(transactieId: string) {
    setBezig(true);
    try {
      await putFactuur(factuur.id, { bron: factuur.bron, totaalbedrag: factuur.totaalbedrag, transactie_id: transactieId });
      const bijgewerkt = await getFactuur(factuur.id);
      onGematcht(bijgewerkt);
    } finally {
      setBezig(false);
    }
  }

  if (laden) return <p className="text-sm text-neutral-400">Transacties laden...</p>;

  return (
    <div>
      <div className="mb-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
        Koppel aan een banktransactie
      </div>
      <div className="max-h-72 overflow-y-auto rounded-md border border-neutral-200 dark:border-neutral-800">
        {gesorteerd.slice(0, 30).map((t) => (
          <button
            key={t.transactie_id}
            type="button"
            disabled={bezig}
            onClick={() => koppelen(t.transactie_id)}
            className="flex w-full items-center justify-between border-b border-neutral-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-neutral-50 disabled:opacity-50 disabled:pointer-events-none dark:border-neutral-900 dark:hover:bg-neutral-900/60"
          >
            <span className="text-neutral-900 dark:text-neutral-100">
              {t.afzender} — {datumFormat.format(new Date(t.datum))}
            </span>
            <span className="tabular-nums text-neutral-600 dark:text-neutral-400">{bedragFormat.format(t.bedrag_eur)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function FactuurDetail({
  factuurId,
  onGewijzigd,
  onVerwijderd,
}: {
  factuurId: number;
  onGewijzigd: () => void;
  onVerwijderd: () => void;
}) {
  const [factuur, setFactuur] = useState<FactuurMetRegels | null>(null);
  const [categorieen, setCategorieen] = useState<CategorieGroep[]>([]);
  const [bron, setBron] = useState("");
  const [totaalbedrag, setTotaalbedrag] = useState("");
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  function laad() {
    getFactuur(factuurId).then((f) => {
      setFactuur(f);
      setBron(f.bron);
      setTotaalbedrag(f.totaalbedrag !== null ? String(f.totaalbedrag) : "");
    });
  }

  useEffect(() => {
    laad();
    getCategorieen().then((res) => setCategorieen(res.categorieen));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factuurId]);

  async function veldenOpslaan() {
    if (!factuur) return;
    try {
      await putFactuur(factuur.id, {
        bron,
        totaalbedrag: totaalbedrag.trim() ? Number(totaalbedrag.replace(",", ".")) : null,
        transactie_id: factuur.transactie_id,
      });
      laad();
      onGewijzigd();
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Opslaan mislukt.");
    }
  }

  async function ontkoppelen() {
    if (!factuur) return;
    await putFactuur(factuur.id, { bron: factuur.bron, totaalbedrag: factuur.totaalbedrag, transactie_id: null });
    laad();
    onGewijzigd();
  }

  async function verwijderenFactuur() {
    if (!factuur) return;
    if (!window.confirm("Deze verzamelfactuur (en eventuele regels) verwijderen?")) return;
    await deleteFactuur(factuur.id);
    onVerwijderd();
  }

  if (!factuur) return <p className="text-sm text-neutral-400">Laden...</p>;

  const somRegels = factuur.regels.reduce((s, r) => s + Math.abs(r.bedrag), 0);
  const doelBedrag = factuur.transactie_bedrag !== null ? Math.abs(factuur.transactie_bedrag) : null;
  const resterend = doelBedrag !== null ? Math.round((doelBedrag - somRegels) * 100) / 100 : null;
  const volledigGesplitst = doelBedrag !== null && Math.abs(somRegels - doelBedrag) < 0.01;
  const isPdf = factuur.bestandsnaam.toLowerCase().endsWith(".pdf");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
          Bron
          <input type="text" value={bron} onChange={(e) => setBron(e.target.value)} onBlur={veldenOpslaan} className={inputKlasse} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
          Totaalbedrag
          <input
            type="text"
            inputMode="decimal"
            value={totaalbedrag}
            onChange={(e) => setTotaalbedrag(e.target.value)}
            onBlur={veldenOpslaan}
            className={`${inputKlasse} w-32`}
          />
        </label>
        <a
          href={factuurBestandUrl(factuur.id)}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-neutral-500 underline hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Bestand openen ({factuur.origineel_bestandsnaam ?? factuur.bestandsnaam})
        </a>
      </div>

      {isPdf && (
        <iframe src={factuurBestandUrl(factuur.id)} className="h-96 w-full rounded-md border border-neutral-200 dark:border-neutral-800" />
      )}

      {foutmelding && <p className="text-sm text-red-700 dark:text-red-400">{foutmelding}</p>}

      {factuur.transactie_id === null ? (
        <MatchSectie factuur={factuur} onGematcht={setFactuur} />
      ) : (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Regels</div>
            <button type="button" onClick={ontkoppelen} className="text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
              Ontkoppelen van transactie
            </button>
          </div>
          {factuur.regels.map((r) => (
            <RegelRij
              key={r.id}
              regel={r}
              categorieen={categorieen}
              onOpgeslagen={(bijgewerkt) =>
                setFactuur((huidig) => (huidig ? { ...huidig, regels: huidig.regels.map((x) => (x.id === bijgewerkt.id ? bijgewerkt : x)) } : huidig))
              }
              onVerwijderd={(id) => {
                setFactuur((huidig) => (huidig ? { ...huidig, regels: huidig.regels.filter((x) => x.id !== id) } : huidig));
                onGewijzigd();
              }}
            />
          ))}
          <NieuweRegelFormulier
            factuurId={factuur.id}
            categorieen={categorieen}
            resterend={resterend}
            onToegevoegd={(r) => {
              setFactuur((huidig) => (huidig ? { ...huidig, regels: [...huidig.regels, r], status: "gesplitst" } : huidig));
              onGewijzigd();
            }}
          />
          {doelBedrag !== null && (
            <div className={`mt-2 text-xs ${volledigGesplitst ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
              {volledigGesplitst
                ? `✓ Volledig gesplitst — som regels: ${bedragFormat.format(somRegels)} van ${bedragFormat.format(doelBedrag)}`
                : `Som regels: ${bedragFormat.format(somRegels)} van ${bedragFormat.format(doelBedrag)} — nog ${bedragFormat.format(
                    resterend ?? 0
                  )} te verdelen. Tot dit klopt blijft de oorspronkelijke transactie in rapportages staan.`}
            </div>
          )}
        </div>
      )}

      <button type="button" onClick={verwijderenFactuur} className="self-start text-sm text-red-700 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
        Verzamelfactuur verwijderen
      </button>
    </div>
  );
}
