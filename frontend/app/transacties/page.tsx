import { Suspense } from "react";

import { TransactiesInhoud } from "@/app/transacties/TransactiesInhoud";

export default function TransactiesPagina() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-3xl px-6 py-10">Laden...</div>}>
      <TransactiesInhoud />
    </Suspense>
  );
}
