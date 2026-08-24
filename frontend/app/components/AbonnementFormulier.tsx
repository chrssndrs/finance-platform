"use client";

import { useState } from "react";

import { Combobox } from "@/app/components/Combobox";
import {
  ApiError,
  deleteAbonnement,
  postAbonnement,
  postAbonnementLogo,
  putAbonnement,
  type Abonnement,
  type AbonnementInvoer,
} from "@/lib/api";

const INTERVAL_OPTIES: { waarde: string; label: string }[] = [
  { waarde: "wekelijks", label: "Wekelijks" },
  { waarde: "maandelijks", label: "Maandelijks" },
  { waarde: "tweemaandelijks", label: "Tweemaandelijks" },
  { waarde: "per_kwartaal", label: "Per kwartaal" },
  { waarde: "jaarlijks", label: "Jaarlijks" },
];

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

interface AbonnementFormulierProps {
  afzenders: string[];
  abonnement?: Abonnement;
  onOpgeslagen: (abonnement: Abonnement) => void;
  onAnnuleren?: () => void;
  onVerwijderd?: (id: number) => void;
}

export function AbonnementFormulier({ afzenders, abonnement, onOpgeslagen, onAnnuleren, onVerwijderd }: AbonnementFormulierProps) {
  const [naam, setNaam] = useState(abonnement?.naam ?? "");
  const [afzender, setAfzender] = useState<string | null>(abonnement?.afzender ?? null);
  const [bedrag, setBedrag] = useState(abonnement ? String(abonnement.bedrag).replace(".", ",") : "");
  const [interval, setInterval] = useState(abonnement?.interval ?? "maandelijks");
  const [eerstvolgende, setEerstvolgende] = useState(abonnement?.eerstvolgende_afschrijving ?? "");
  const [domein, setDomein] = useState("");
  const [bezig, setBezig] = useState(false);
  const [logoBezig, setLogoBezig] = useState(false);
  const [bezigMetVerwijderen, setBezigMetVerwijderen] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  async function logoGekozen(e: React.ChangeEvent<HTMLInputElement>) {
    const bestand = e.target.files?.[0];
    if (!bestand || !abonnement) return;
    setLogoBezig(true);
    setFoutmelding(null);
    try {
      const resultaat = await postAbonnementLogo(abonnement.id, bestand);
      onOpgeslagen(resultaat);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Logo uploaden mislukt.");
    } finally {
      setLogoBezig(false);
    }
  }

  async function versturen(e: React.FormEvent) {
    e.preventDefault();
    if (!naam.trim()) {
      setFoutmelding("Naam is verplicht.");
      return;
    }
    if (!bedrag.trim() || !eerstvolgende) {
      setFoutmelding("Bedrag en eerstvolgende afschrijving zijn verplicht.");
      return;
    }
    setBezig(true);
    setFoutmelding(null);
    const invoer: AbonnementInvoer = {
      naam: naam.trim(),
      afzender,
      categorie: abonnement?.categorie ?? null,
      subcategorie: abonnement?.subcategorie ?? null,
      bedrag: Number(bedrag.replace(",", ".")),
      interval,
      eerstvolgende_afschrijving: eerstvolgende,
      domein: domein.trim() || null,
    };
    try {
      const resultaat = abonnement ? await putAbonnement(abonnement.id, invoer) : await postAbonnement(invoer);
      onOpgeslagen(resultaat);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  }

  async function verwijderen() {
    if (!abonnement || !onVerwijderd) return;
    if (!window.confirm(`"${abonnement.naam}" verwijderen?`)) return;
    setBezigMetVerwijderen(true);
    try {
      await deleteAbonnement(abonnement.id);
      onVerwijderd(abonnement.id);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Verwijderen mislukt.");
      setBezigMetVerwijderen(false);
    }
  }

  return (
    <form onSubmit={versturen} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Naam
        <input type="text" required value={naam} onChange={(e) => setNaam(e.target.value)} className={inputKlasse} />
      </label>

      <Combobox
        label="Afzender (optioneel — koppelt aan banktransacties)"
        opties={afzenders}
        waarde={afzender}
        onChange={setAfzender}
        vrijeInvoer
        placeholder="Geen koppeling (puur handmatig)"
      />

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Bedrag
        <input
          type="text"
          inputMode="decimal"
          required
          placeholder="0,00"
          value={bedrag}
          onChange={(e) => setBedrag(e.target.value)}
          className={inputKlasse}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Interval
        <select value={interval} onChange={(e) => setInterval(e.target.value)} className={inputKlasse}>
          {INTERVAL_OPTIES.map((o) => (
            <option key={o.waarde} value={o.waarde}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Eerstvolgende afschrijving
        <input
          type="date"
          required
          value={eerstvolgende}
          onChange={(e) => setEerstvolgende(e.target.value)}
          className={inputKlasse}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Domein (voor logo, optioneel)
        <input
          type="text"
          placeholder="bijv. spotify.com"
          value={domein}
          onChange={(e) => setDomein(e.target.value)}
          className={inputKlasse}
        />
      </label>

      {abonnement && (
        <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
          Of upload een logo
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            disabled={logoBezig}
            onChange={logoGekozen}
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-200 dark:file:bg-neutral-800 dark:file:text-neutral-300"
          />
        </label>
      )}

      {foutmelding && <p className="text-sm text-red-700 dark:text-red-400 sm:col-span-2">{foutmelding}</p>}

      <div className="flex items-center gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={bezig}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {bezig ? "Bezig..." : abonnement ? "Opslaan" : "Abonnement toevoegen"}
        </button>
        {onAnnuleren && (
          <button
            type="button"
            onClick={onAnnuleren}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            Annuleren
          </button>
        )}
        {abonnement && onVerwijderd && (
          <button
            type="button"
            disabled={bezigMetVerwijderen}
            onClick={verwijderen}
            className="ml-auto text-sm text-red-700 hover:text-red-900 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
          >
            Verwijderen
          </button>
        )}
      </div>
    </form>
  );
}
