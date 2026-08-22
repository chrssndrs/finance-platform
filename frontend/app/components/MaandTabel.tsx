import type { MaandTotaal } from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

export function MaandTabel({ reeks }: { reeks: MaandTotaal[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-neutral-300 dark:border-neutral-700">
          <th className="py-2 font-medium text-neutral-600 dark:text-neutral-400">Maand</th>
          <th className="py-2 font-medium text-neutral-600 dark:text-neutral-400">Inkomsten</th>
          <th className="py-2 font-medium text-neutral-600 dark:text-neutral-400">Uitgaven</th>
          <th className="py-2 font-medium text-neutral-600 dark:text-neutral-400">Totaal</th>
        </tr>
      </thead>
      <tbody>
        {reeks.map((r) => (
          <tr key={r.maand} className="border-b border-neutral-200 dark:border-neutral-800">
            <td className="py-2">{r.maand}</td>
            <td className="py-2 tabular-nums">{bedragFormat.format(r.inkomsten)}</td>
            <td className="py-2 tabular-nums">{bedragFormat.format(r.uitgaven)}</td>
            <td className="py-2 tabular-nums">{bedragFormat.format(r.totaal)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
