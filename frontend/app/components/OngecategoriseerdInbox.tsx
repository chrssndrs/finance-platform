"use client";

import { useState } from "react";

import { Combobox } from "@/app/components/Combobox";
import {
  ApiError,
  putOngecategoriseerd,
  type CategorieGroep,
  type OngecategoriseerdAfzender,
} from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

interface RijProps {
  item: OngecategoriseerdAfzender;
  categorieen: CategorieGroep[];
  onToegewezen: (afzender: string) => void;
}

function OngecategoriseerdRij({ item, categorieen, onToegewezen }: RijProps) {
  const [categorie, setCategorie] = useState<string | null>(null);
  const [subcategorie, setSubcategorie] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  const subcategorieen = categorieen.find((g) => g.categorie === categorie)?.subcategorieen ?? [];

  async function toewijzen() {
    if (!categorie) {
      setFoutmelding("Kies (of typ) een categorie.");
      return;
    }
    setBezig(true);
    setFoutmelding(null);
    try {
      await putOngecategoriseerd(item.afzender, { categorie, subcategorie });
      onToegewezen(item.afzender);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Toewijzen mislukt.");
      setBezig(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-neutral-200 py-3 last:border-b-0 dark:border-neutral-800">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.afzender}</div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          {item.aantal} transacties · {bedragFormat.format(item.totaalbedrag)}
        </div>
        {foutmelding && <p className="mt-1 text-xs text-red-700 dark:text-red-400">{foutmelding}</p>}
      </div>
      <div className="w-40">
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
      <div className="w-40">
        <Combobox
          label=""
          opties={subcategorieen}
          waarde={subcategorie}
          onChange={setSubcategorie}
          vrijeInvoer
          placeholder="Subcategorie"
        />
      </div>
      <button
        type="button"
        disabled={bezig}
        onClick={toewijzen}
        className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
      >
        {bezig ? "Bezig..." : "Toewijzen"}
      </button>
    </div>
  );
}

interface OngecategoriseerdInboxProps {
  afzenders: OngecategoriseerdAfzender[];
  categorieen: CategorieGroep[];
  onToegewezen: (afzender: string) => void;
}

export function OngecategoriseerdInbox({ afzenders, categorieen, onToegewezen }: OngecategoriseerdInboxProps) {
  const [open, setOpen] = useState(false);

  if (afzenders.length === 0) return null;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          <span className="text-xs">{open ? "▼" : "▶"}</span>
          Inbox — ongecategoriseerde afzenders
        </span>
        <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
          {afzenders.length}
        </span>
      </button>
      {open && (
        <div className="border-t border-neutral-200 px-4 dark:border-neutral-800">
          {afzenders.map((item) => (
            <OngecategoriseerdRij key={item.afzender} item={item} categorieen={categorieen} onToegewezen={onToegewezen} />
          ))}
        </div>
      )}
    </div>
  );
}
