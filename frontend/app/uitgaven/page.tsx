import { Suspense } from "react";

import { UitgavenInhoud } from "@/app/uitgaven/UitgavenInhoud";

export default function UitgavenPagina() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-3xl px-6 py-10">Laden...</div>}>
      <UitgavenInhoud />
    </Suspense>
  );
}
