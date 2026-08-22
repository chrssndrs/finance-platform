interface PlaceholderPaginaProps {
  titel: string;
  beschrijving: string;
}

export function PlaceholderPagina({ titel, beschrijving }: PlaceholderPaginaProps) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{titel}</h1>
      <p className="max-w-md text-neutral-500 dark:text-neutral-400">{beschrijving}</p>
      <span className="mt-2 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        Binnenkort beschikbaar
      </span>
    </main>
  );
}
