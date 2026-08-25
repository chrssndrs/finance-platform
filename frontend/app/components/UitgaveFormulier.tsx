"use client";

import { useEffect, useState } from "react";

import { Combobox } from "@/app/components/Combobox";
import { ContantGeldCoupureLijst } from "@/app/components/ContantGeldCoupureLijst";
import {
  ApiError,
  getCategorieen,
  postContantGeldUitgeven,
  type CategorieGroep,
  type ContantGeldResponse,
} from "@/lib/api";

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

export function UitgaveFormulier({
  data,
  onOpgeslagen,
  onAnnuleren,
}: {
  data: ContantGeldResponse;
  onOpgeslagen: (data: ContantGeldResponse) => void;
  onAnnuleren: () => void;
}) {
  const [locatieId, setLocatieId] = useState<number>(data.locaties[0]?.id ?? 0);
  const [datum, setDatum] = useState(new Date().toISOString().slice(0, 10));
  const [omschrijving, setOmschrijving] = useState("");
  const [categorie, setCategorie] = useState<string | null>(null);
  const [subcategorie, setSubcategorie] = useState<string | null>(null);
  const [categorieen, setCategorieen] = useState<CategorieGroep[]>([]);
  const [aantallen, setAantallen] = useState<Record<number, number>>({});
  const [bezig, setBezig] = useState(false);
  const [succes, setSucces] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  useEffect(() => {
    getCategorieen().then((res) => setCategorieen(res.categorieen));
  }, []);

  const locatie = data.locaties.find((l) => l.id === locatieId);
  const beschikbaar: Record<number, number> = {};
  locatie?.tellingen.forEach((t) => (beschikbaar[t.coupure] = t.aantal));
  const subcategorieen = categorieen.find((g) => g.categorie === categorie)?.subcategorieen ?? [];

  async function versturen(e: React.FormEvent) {
    e.preventDefault();
    if (!omschrijving.trim()) {
      setFoutmelding("Omschrijving is verplicht.");
      return;
    }
    const regels = Object.entries(aantallen)
      .map(([coupure, aantal]) => ({ coupure: Number(coupure), aantal }))
      .filter((r) => r.aantal > 0);
    if (regels.length === 0) {
      setFoutmelding("Geef aan hoeveel van welke coupure je uitgeeft.");
      return;
    }
    setBezig(true);
    setFoutmelding(null);
    try {
      const resultaat = await postContantGeldUitgeven({
        locatie_id: locatieId,
        datum,
        omschrijving: omschrijving.trim(),
        categorie,
        subcategorie,
        regels,
      });
      setSucces(true);
      setBezig(false);
      setTimeout(() => onOpgeslagen(resultaat), 900);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Uitgeven mislukt.");
      setBezig(false);
    }
  }

  return (
    <form onSubmit={versturen} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Uit locatie
        <select
          value={locatieId}
          disabled={bezig || succes}
          onChange={(e) => {
            setLocatieId(Number(e.target.value));
            setAantallen({});
          }}
          className={inputKlasse}
        >
          {data.locaties.map((l) => (
            <option key={l.id} value={l.id}>
              {l.naam}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Datum
        <input
          type="date"
          required
          disabled={bezig || succes}
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          className={inputKlasse}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Omschrijving
        <input
          type="text"
          required
          disabled={bezig || succes}
          placeholder="bijv. Boodschappen, Kroeg, Taxi"
          value={omschrijving}
          onChange={(e) => setOmschrijving(e.target.value)}
          className={inputKlasse}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <Combobox
          label="Categorie"
          opties={categorieen.map((g) => g.categorie)}
          waarde={categorie}
          onChange={(c) => {
            setCategorie(c);
            setSubcategorie(null);
          }}
          vrijeInvoer
        />
        <Combobox label="Subcategorie" opties={subcategorieen} waarde={subcategorie} onChange={setSubcategorie} vrijeInvoer />
      </div>

      <ContantGeldCoupureLijst
        coupures={data.coupures}
        beschikbaar={beschikbaar}
        waarden={aantallen}
        onChange={(coupure, aantal) => setAantallen((huidig) => ({ ...huidig, [coupure]: aantal }))}
      />

      {bezig && (
        <p className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600 dark:border-neutral-700 dark:border-t-neutral-300" />
          Bezig met verwerken... dit kan een paar seconden duren.
        </p>
      )}
      {succes && <p className="text-sm text-emerald-700 dark:text-emerald-400">✓ Verwerkt.</p>}
      {foutmelding && <p className="text-sm text-red-700 dark:text-red-400">{foutmelding}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={bezig || succes}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {bezig ? "Bezig met verwerken..." : succes ? "Verwerkt ✓" : "Uitgeven"}
        </button>
        <button
          type="button"
          disabled={bezig || succes}
          onClick={onAnnuleren}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}
