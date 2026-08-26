"use client";

import { useEffect, useMemo, useState } from "react";

import { AbonnementFormulier } from "@/app/components/AbonnementFormulier";
import { Combobox } from "@/app/components/Combobox";
import { InboedelFormulier } from "@/app/components/InboedelFormulier";
import { Overlay } from "@/app/components/Overlay";
import {
  ApiError,
  getAfzenders,
  getCategorieen,
  getInboedelOpties,
  getTransactieDetail,
  putTransactieCategorie,
  type Abonnement,
  type CategorieGroep,
  type InboedelArtikel,
  type Transactie,
  type TransactieDetail,
} from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const datumFormat = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" });

type SortKey = "datum" | "afzender" | "bedrag_eur";

const KOLOMMEN: { key: SortKey; label: string }[] = [
  { key: "datum", label: "Datum" },
  { key: "afzender", label: "Tegenpartij" },
  { key: "bedrag_eur", label: "Bedrag" },
];

const VELD_LABEL: Record<string, string> = {
  transactie_id: "Transactie-ID",
  datum: "Datum",
  naam_omschrijving: "Naam/omschrijving",
  afzender: "Tegenpartij",
  winkel: "Winkel",
  rekening: "Rekening",
  tegenrekening: "Tegenrekening",
  mededelingen: "Mededelingen",
  bedrag_eur: "Bedrag",
  saldo_na_mutatie: "Saldo na mutatie",
  categorie: "Categorie",
  subcategorie: "Subcategorie",
  handmatig_overschreven: "Handmatig overschreven",
  bronbestand: "Bronbestand",
};

function DetailRij({ label, waarde }: { label: string; waarde: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-neutral-100 py-1.5 text-sm last:border-b-0 dark:border-neutral-800">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="text-right text-neutral-900 dark:text-neutral-100">{waarde}</span>
    </div>
  );
}

function InboedelVanTransactieOverlay({
  detail,
  onClose,
}: {
  detail: TransactieDetail;
  onClose: () => void;
}) {
  const [merken, setMerken] = useState<string[]>([]);
  const [winkels, setWinkels] = useState<string[]>([]);
  const [aangemaakt, setAangemaakt] = useState<InboedelArtikel | null>(null);

  useEffect(() => {
    getInboedelOpties().then((res) => {
      setMerken(res.merken);
      setWinkels(res.winkels);
    });
  }, []);

  return (
    <Overlay open onClose={onClose} titel="Inboedel-artikel aanmaken">
      {aangemaakt ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          &ldquo;{aangemaakt.omschrijving}&rdquo; toegevoegd aan Inboedel.
        </p>
      ) : (
        <InboedelFormulier
          merken={merken}
          winkels={winkels}
          voorinvoer={{ winkel: detail.afzender, bedrag: Math.abs(detail.bedrag_eur), datum: detail.datum }}
          onOpgeslagen={setAangemaakt}
          onAnnuleren={onClose}
        />
      )}
    </Overlay>
  );
}

function AbonnementVanTransactieOverlay({
  detail,
  onClose,
}: {
  detail: TransactieDetail;
  onClose: () => void;
}) {
  const [afzenders, setAfzenders] = useState<string[]>([]);
  const [aangemaakt, setAangemaakt] = useState<Abonnement | null>(null);

  useEffect(() => {
    getAfzenders({ categorie: null, subcategorie: null }).then((res) => setAfzenders(res.afzenders));
  }, []);

  return (
    <Overlay open onClose={onClose} titel="Abonnement aanmaken">
      {aangemaakt ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          &ldquo;{aangemaakt.naam}&rdquo; toegevoegd aan Abonnementen.
        </p>
      ) : (
        <AbonnementFormulier
          afzenders={afzenders}
          voorinvoer={{
            naam: detail.afzender,
            afzender: detail.afzender,
            bedrag: Math.abs(detail.bedrag_eur),
            datum: detail.datum,
            categorie: detail.categorie,
            subcategorie: detail.subcategorie,
          }}
          onOpgeslagen={setAangemaakt}
          onAnnuleren={onClose}
        />
      )}
    </Overlay>
  );
}

function CategorieBewerker({
  detail,
  onOpgeslagen,
}: {
  detail: TransactieDetail;
  onOpgeslagen: (categorie: string, subcategorie: string | null) => void;
}) {
  const [categorieen, setCategorieen] = useState<CategorieGroep[]>([]);
  const [categorie, setCategorie] = useState<string | null>(detail.categorie);
  const [subcategorie, setSubcategorie] = useState<string | null>(detail.subcategorie);
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  useEffect(() => {
    getCategorieen().then((res) => setCategorieen(res.categorieen));
  }, []);

  const subcategorieen = categorieen.find((g) => g.categorie === categorie)?.subcategorieen ?? [];

  async function opslaan(nieuweCategorie: string | null, nieuweSubcategorie: string | null) {
    if (!nieuweCategorie) return;
    setBezig(true);
    setFoutmelding(null);
    try {
      await putTransactieCategorie(detail.transactie_id, { categorie: nieuweCategorie, subcategorie: nieuweSubcategorie });
      onOpgeslagen(nieuweCategorie, nieuweSubcategorie);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 border-b border-neutral-100 py-1.5 last:border-b-0 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-neutral-500 dark:text-neutral-400">Categorie</span>
        <div className="flex gap-2">
          <div className="w-36">
            <Combobox
              label=""
              opties={categorieen.map((g) => g.categorie)}
              waarde={categorie}
              onChange={(c) => {
                setCategorie(c);
                setSubcategorie(null);
                opslaan(c, null);
              }}
              vrijeInvoer
            />
          </div>
          <div className="w-36">
            <Combobox
              label=""
              opties={subcategorieen}
              waarde={subcategorie}
              onChange={(s) => {
                setSubcategorie(s);
                opslaan(categorie, s);
              }}
              vrijeInvoer
            />
          </div>
        </div>
      </div>
      {bezig && <p className="text-right text-xs text-neutral-400">Bezig...</p>}
      {foutmelding && <p className="text-right text-xs text-red-700 dark:text-red-400">{foutmelding}</p>}
    </div>
  );
}

function TransactieDetailOverlay({ transactieId, onClose }: { transactieId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<TransactieDetail | null>(null);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [toonInboedelFormulier, setToonInboedelFormulier] = useState(false);
  const [toonAbonnementFormulier, setToonAbonnementFormulier] = useState(false);

  useEffect(() => {
    getTransactieDetail(transactieId)
      .then(setDetail)
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon details niet laden."));
  }, [transactieId]);

  return (
    <Overlay open onClose={onClose} titel="Transactiedetails">
      {foutmelding && <p className="text-sm text-red-700 dark:text-red-400">{foutmelding}</p>}
      {!detail && !foutmelding && <p className="text-sm text-neutral-400">Laden...</p>}
      {detail && (
        <div className="flex flex-col gap-4">
          {detail.bedrag_eur < 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setToonInboedelFormulier(true)}
                className="self-start rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                + Inboedel-artikel aanmaken
              </button>
              <button
                type="button"
                onClick={() => setToonAbonnementFormulier(true)}
                className="self-start rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                + Abonnement aanmaken
              </button>
            </div>
          )}
          <div>
            <CategorieBewerker
              detail={detail}
              onOpgeslagen={(categorie, subcategorie) =>
                setDetail((huidig) =>
                  huidig ? { ...huidig, categorie, subcategorie: subcategorie ?? "Ongecategoriseerd" } : huidig
                )
              }
            />
            {(Object.keys(VELD_LABEL) as (keyof TransactieDetail)[]).map((veld) => {
              if (veld === "categorie" || veld === "subcategorie") return null;
              const waarde = detail[veld];
              if (waarde === null || waarde === undefined || veld === "ruwe_rij") return null;
              return (
                <DetailRij
                  key={veld}
                  label={VELD_LABEL[veld]}
                  waarde={
                    veld === "bedrag_eur" || veld === "saldo_na_mutatie"
                      ? bedragFormat.format(waarde as number)
                      : typeof waarde === "boolean"
                        ? waarde ? "Ja" : "Nee"
                        : String(waarde)
                  }
                />
              );
            })}
          </div>
          {detail.ruwe_rij && (
            <div>
              <div className="mb-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Ruwe CSV-rij
              </div>
              {Object.entries(detail.ruwe_rij).map(([key, waarde]) => (
                <DetailRij key={key} label={key} waarde={waarde ?? "—"} />
              ))}
            </div>
          )}
        </div>
      )}
      {toonInboedelFormulier && detail && (
        <InboedelVanTransactieOverlay detail={detail} onClose={() => setToonInboedelFormulier(false)} />
      )}
      {toonAbonnementFormulier && detail && (
        <AbonnementVanTransactieOverlay detail={detail} onClose={() => setToonAbonnementFormulier(false)} />
      )}
    </Overlay>
  );
}

interface TransactieTabelProps {
  titel: string;
  transacties: Transactie[];
  laden: boolean;
  onSluiten: () => void;
}

export function TransactieTabel({ titel, transacties, laden, onSluiten }: TransactieTabelProps) {
  const [sortKey, setSortKey] = useState<SortKey>("datum");
  const [aflopend, setAflopend] = useState(true);
  const [geselecteerdId, setGeselecteerdId] = useState<string | null>(null);

  const gesorteerd = useMemo(() => {
    const kopie = [...transacties];
    kopie.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const vergelijking = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return aflopend ? -vergelijking : vergelijking;
    });
    return kopie;
  }, [transacties, sortKey, aflopend]);

  function klikKolom(key: SortKey) {
    if (key === sortKey) {
      setAflopend((v) => !v);
    } else {
      setSortKey(key);
      setAflopend(true);
    }
  }

  return (
    <div className="rounded-md border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{titel}</h2>
        <button
          type="button"
          onClick={onSluiten}
          aria-label="Sluiten"
          className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
        >
          ×
        </button>
      </div>

      <div className={laden ? "opacity-50 transition-opacity" : "transition-opacity"}>
        {transacties.length === 0 && !laden ? (
          <p className="px-4 py-6 text-center text-sm text-neutral-400">Geen transacties in deze periode.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                  {KOLOMMEN.map((k) => (
                    <th key={k.key} className="px-4 py-2 font-medium">
                      <button
                        type="button"
                        onClick={() => klikKolom(k.key)}
                        className="flex items-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100"
                      >
                        {k.label}
                        {sortKey === k.key && <span className="text-xs">{aflopend ? "▼" : "▲"}</span>}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gesorteerd.map((t) => (
                  <tr
                    key={t.transactie_id}
                    onClick={() => setGeselecteerdId(t.transactie_id)}
                    className="cursor-pointer border-b border-neutral-100 hover:bg-neutral-50 dark:border-neutral-900 dark:hover:bg-neutral-900/60"
                  >
                    <td className="whitespace-nowrap px-4 py-2">{datumFormat.format(new Date(`${t.datum}T00:00:00`))}</td>
                    <td className="px-4 py-2">{t.afzender}</td>
                    <td
                      className={
                        "whitespace-nowrap px-4 py-2 tabular-nums " +
                        (t.bedrag_eur < 0 ? "text-neutral-900 dark:text-neutral-100" : "text-emerald-700 dark:text-emerald-400")
                      }
                    >
                      {bedragFormat.format(t.bedrag_eur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {geselecteerdId && (
        <TransactieDetailOverlay transactieId={geselecteerdId} onClose={() => setGeselecteerdId(null)} />
      )}
    </div>
  );
}
