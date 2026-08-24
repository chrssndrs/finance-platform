"use client";

import { useState } from "react";

import { Overlay } from "@/app/components/Overlay";
import { Widget as WidgetComponent } from "@/app/components/Widget";
import { WidgetFormulier } from "@/app/components/WidgetFormulier";
import { putWidget, type Widget as WidgetData } from "@/lib/api";

export function WidgetenSectie({ widgets, onWidgetsGewijzigd }: { widgets: WidgetData[]; onWidgetsGewijzigd: () => void }) {
  const [toonNieuw, setToonNieuw] = useState(false);
  const [bewerktWidget, setBewerktWidget] = useState<WidgetData | null>(null);

  function opgeslagen() {
    setToonNieuw(false);
    setBewerktWidget(null);
    onWidgetsGewijzigd();
  }

  function verwijderd() {
    setBewerktWidget(null);
    onWidgetsGewijzigd();
  }

  // widgets komt al gesorteerd op volgorde binnen (API: ORDER BY volgorde, id)
  // — omhoog/omlaag wisselt de volgorde-waarde met de buur en slaat beide op.
  async function verplaats(index: number, richting: -1 | 1) {
    const buurIndex = index + richting;
    if (buurIndex < 0 || buurIndex >= widgets.length) return;
    const huidige = widgets[index];
    const buur = widgets[buurIndex];
    const { id: huidigeId, ...huidigeInvoer } = huidige;
    const { id: buurId, ...buurInvoer } = buur;
    try {
      await Promise.all([
        putWidget(huidigeId, { ...huidigeInvoer, volgorde: buur.volgorde }),
        putWidget(buurId, { ...buurInvoer, volgorde: huidige.volgorde }),
      ]);
      onWidgetsGewijzigd();
    } catch {
      // reorder is een kleine interactie — bij een mislukking blijft de
      // volgorde gewoon zoals 'ie was, geen aparte foutmelding-UI nodig.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Widgets</h2>
        <button
          type="button"
          onClick={() => setToonNieuw(true)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          + Widget toevoegen
        </button>
      </div>

      {widgets.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-400">
          Nog geen widgets. Voeg er een toe om snel een categorie of tegenpartij te volgen.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {widgets.map((w, index) => (
            <WidgetComponent
              key={w.id}
              widget={w}
              onKlik={() => setBewerktWidget(w)}
              onOmhoog={index > 0 ? () => verplaats(index, -1) : undefined}
              onOmlaag={index < widgets.length - 1 ? () => verplaats(index, 1) : undefined}
            />
          ))}
        </div>
      )}

      <Overlay open={toonNieuw} onClose={() => setToonNieuw(false)} titel="Widget toevoegen">
        <WidgetFormulier volgendeVolgorde={widgets.length} onOpgeslagen={opgeslagen} onAnnuleren={() => setToonNieuw(false)} />
      </Overlay>

      <Overlay open={bewerktWidget !== null} onClose={() => setBewerktWidget(null)} titel="Widget bewerken">
        {bewerktWidget && (
          <WidgetFormulier
            widget={bewerktWidget}
            volgendeVolgorde={bewerktWidget.volgorde}
            onOpgeslagen={opgeslagen}
            onAnnuleren={() => setBewerktWidget(null)}
            onVerwijderd={verwijderd}
          />
        )}
      </Overlay>
    </div>
  );
}
