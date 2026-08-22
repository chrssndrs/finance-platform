const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export interface CategorieGroep {
  categorie: string;
  subcategorieen: string[];
}

export interface CategorieenResponse {
  categorieen: CategorieGroep[];
}

export interface MaandTotaal {
  maand: string;
  inkomsten: number;
  uitgaven: number;
  totaal: number;
}

export interface MaandTotalenResponse {
  categorie: string | null;
  subcategorie: string | null;
  periode_maanden: number;
  reeks: MaandTotaal[];
}

export class ApiError extends Error {}

async function fetchJson<T>(pad: string): Promise<T> {
  const response = await fetch(`${API_BASE}${pad}`);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? `API-fout (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function getCategorieen(): Promise<CategorieenResponse> {
  return fetchJson<CategorieenResponse>("/api/rapportage/categorieen");
}

export function getMaandTotalen(params: {
  categorie: string | null;
  subcategorie: string | null;
  maanden: number;
}): Promise<MaandTotalenResponse> {
  const zoekParams = new URLSearchParams();
  if (params.categorie) zoekParams.set("categorie", params.categorie);
  if (params.subcategorie) zoekParams.set("subcategorie", params.subcategorie);
  zoekParams.set("maanden", String(params.maanden));
  return fetchJson<MaandTotalenResponse>(`/api/rapportage/maandtotalen?${zoekParams}`);
}
