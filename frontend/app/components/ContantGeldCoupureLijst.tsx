"use client";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

export function ContantGeldCoupureLijst({
  coupures,
  beschikbaar,
  waarden,
  onChange,
}: {
  coupures: number[];
  /** Maximum per coupure (bv. de huidige voorraad op de bronlocatie) — als
   * dit niet is meegegeven, geen bovengrens. */
  beschikbaar: Record<number, number>;
  waarden: Record<number, number>;
  onChange: (coupure: number, aantal: number) => void;
}) {
  const relevant = coupures.filter((c) => (beschikbaar[c] ?? 0) > 0);
  const totaal = coupures.reduce((s, c) => s + c * (waarden[c] ?? 0), 0);

  if (relevant.length === 0) {
    return <p className="text-sm text-neutral-400">Geen coupures beschikbaar op deze locatie.</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {relevant.map((c) => (
        <div key={c} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">
            {bedragFormat.format(c)}
            <span className="ml-1.5 text-xs text-neutral-400 dark:text-neutral-500">(max {beschikbaar[c]})</span>
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={beschikbaar[c]}
            value={waarden[c] ?? 0}
            onChange={(e) => {
              const nieuw = Math.max(0, Math.min(beschikbaar[c], Math.round(Number(e.target.value) || 0)));
              onChange(c, nieuw);
            }}
            className="w-20 rounded-md border border-neutral-300 bg-white px-2 py-1 text-right text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-neutral-200 pt-2 text-sm font-medium text-neutral-900 dark:border-neutral-800 dark:text-neutral-100">
        <span>Totaal</span>
        <span className="tabular-nums">{bedragFormat.format(totaal)}</span>
      </div>
    </div>
  );
}
