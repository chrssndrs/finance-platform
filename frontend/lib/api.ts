export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type Granulariteit = "dag" | "week" | "maand" | "jaar";

export interface CategorieGroep {
  categorie: string;
  subcategorieen: string[];
}

export interface CategorieenResponse {
  categorieen: CategorieGroep[];
}

export interface AfzendersResponse {
  afzenders: string[];
}

export interface StatusResponse {
  laatste_refresh: string | null;
  laatste_transactie: string | null;
}

export interface PeriodeTotaal {
  periode_start: string;
  inkomsten: number;
  uitgaven: number;
  totaal: number;
}

export interface TotalenResponse {
  categorie: string | null;
  subcategorie: string | null;
  afzender: string | null;
  granulariteit: Granulariteit;
  vanaf: string | null;
  tot: string | null;
  reeks: PeriodeTotaal[];
}

export interface Transactie {
  transactie_id: string;
  datum: string;
  afzender: string;
  bedrag_eur: number;
  mededelingen: string | null;
}

export interface TransactiesResponse {
  transacties: Transactie[];
}

export interface Abonnement {
  naam: string;
  logo_url: string | null;
  bedrag: number;
  interval: string;
  eerstvolgende_afschrijving: string;
  dagen_tot_afschrijving: number;
}

export interface AbonnementenResponse {
  abonnementen: Abonnement[];
  totaal_per_maand: number;
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

export function getAfzenders(params: {
  categorie: string | null;
  subcategorie: string | null;
}): Promise<AfzendersResponse> {
  const zoekParams = new URLSearchParams();
  if (params.categorie) zoekParams.set("categorie", params.categorie);
  if (params.subcategorie) zoekParams.set("subcategorie", params.subcategorie);
  return fetchJson<AfzendersResponse>(`/api/rapportage/afzenders?${zoekParams}`);
}

export function getStatus(): Promise<StatusResponse> {
  return fetchJson<StatusResponse>("/api/rapportage/status");
}

export function getTotalen(params: {
  categorie: string | null;
  subcategorie: string | null;
  afzender: string | null;
  granulariteit: Granulariteit;
  vanaf: string | null;
  tot: string | null;
}): Promise<TotalenResponse> {
  const zoekParams = new URLSearchParams();
  if (params.categorie) zoekParams.set("categorie", params.categorie);
  if (params.subcategorie) zoekParams.set("subcategorie", params.subcategorie);
  if (params.afzender) zoekParams.set("afzender", params.afzender);
  zoekParams.set("granulariteit", params.granulariteit);
  if (params.vanaf) zoekParams.set("vanaf", params.vanaf);
  if (params.tot) zoekParams.set("tot", params.tot);
  return fetchJson<TotalenResponse>(`/api/rapportage/totalen?${zoekParams}`);
}

export function getTransacties(params: {
  categorie: string | null;
  subcategorie: string | null;
  afzender: string | null;
  vanaf: string;
  tot: string;
}): Promise<TransactiesResponse> {
  const zoekParams = new URLSearchParams();
  if (params.categorie) zoekParams.set("categorie", params.categorie);
  if (params.subcategorie) zoekParams.set("subcategorie", params.subcategorie);
  if (params.afzender) zoekParams.set("afzender", params.afzender);
  zoekParams.set("vanaf", params.vanaf);
  zoekParams.set("tot", params.tot);
  return fetchJson<TransactiesResponse>(`/api/rapportage/transacties?${zoekParams}`);
}

export function getAbonnementen(): Promise<AbonnementenResponse> {
  return fetchJson<AbonnementenResponse>("/api/rapportage/abonnementen");
}
