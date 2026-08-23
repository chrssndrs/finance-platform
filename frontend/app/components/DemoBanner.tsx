export function DemoBanner() {
  if (!process.env.NEXT_PUBLIC_DEMO) return null;

  return (
    <div className="bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
      Demo-omgeving met verzonnen data — geen echte financiën
    </div>
  );
}
