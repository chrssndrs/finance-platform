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
  id: number;
  naam: string;
  afzender: string | null;
  categorie: string | null;
  subcategorie: string | null;
  logo_url: string | null;
  bedrag: number;
  interval: string;
  eerstvolgende_afschrijving: string;
  dagen_tot_afschrijving: number;
  bron: string;
}

export interface AbonnementenResponse {
  abonnementen: Abonnement[];
  totaal_per_maand: number;
}

export interface AbonnementInvoer {
  naam: string;
  afzender: string | null;
  categorie: string | null;
  subcategorie: string | null;
  bedrag: number;
  interval: string;
  eerstvolgende_afschrijving: string;
  domein: string | null;
}

export interface Aanbeveling {
  id: number;
  type: "nieuw" | "prijswijziging";
  afzender: string;
  naam: string;
  categorie: string | null;
  subcategorie: string | null;
  logo_url: string | null;
  huidig_bedrag: number | null;
  voorgesteld_bedrag: number;
  interval: string | null;
  eerstvolgende_afschrijving: string | null;
  aantal_transacties: number | null;
}

export interface AanbevelingenResponse {
  aanbevelingen: Aanbeveling[];
}

export interface BeschikbareBank {
  bank: string;
  naam: string;
}

export interface Instellingen {
  bank: string;
  bank_naam: string;
  export_locatie: string;
}

export interface InstellingenInvoer {
  bank: string;
  export_locatie: string;
}

export interface InstellingenResponse {
  instellingen: Instellingen;
  beschikbare_banken: BeschikbareBank[];
}

export interface Woning {
  adres: string;
}

export interface WoningInvoer {
  adres: string;
}

export interface Waarde {
  id: number;
  datum: string;
  waarde: number;
  bron: string | null;
  opmerking: string | null;
}

export interface WaardeInvoer {
  datum: string;
  waarde: number;
  bron: string | null;
  opmerking: string | null;
}

export interface WaardenResponse {
  waardes: Waarde[];
}

export interface InboedelArtikel {
  id: number;
  omschrijving: string;
  merk: string | null;
  model: string | null;
  winkel: string | null;
  bedrag: number | null;
  datum: string | null;
  levensduur_maanden: number | null;
  serienummer: string | null;
  leeftijd_maanden: number | null;
  percentage_leven: number | null;
  restwaarde: number | null;
  is_afgeschreven: boolean;
  maanden_tot_afschrijving: number | null;
}

export interface InboedelArtikelenResponse {
  artikelen: InboedelArtikel[];
}

export interface InboedelOptiesResponse {
  merken: string[];
  winkels: string[];
}

export interface InboedelArtikelInvoer {
  omschrijving: string;
  merk: string | null;
  model: string | null;
  winkel: string | null;
  bedrag: number | null;
  datum: string | null;
  levensduur_maanden: number | null;
  serienummer: string | null;
}

export class ApiError extends Error {}

async function afhandelenResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? `API-fout (${response.status})`);
  }
  return response.json() as Promise<T>;
}

async function fetchJson<T>(pad: string): Promise<T> {
  const response = await fetch(`${API_BASE}${pad}`);
  return afhandelenResponse<T>(response);
}

async function zendJson<T>(pad: string, methode: "POST" | "PUT", body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${pad}`, {
    method: methode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return afhandelenResponse<T>(response);
}

async function verwijder(pad: string): Promise<void> {
  const response = await fetch(`${API_BASE}${pad}`, { method: "DELETE" });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? `API-fout (${response.status})`);
  }
}

async function postLeeg(pad: string): Promise<void> {
  const response = await fetch(`${API_BASE}${pad}`, { method: "POST" });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? `API-fout (${response.status})`);
  }
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
  return fetchJson<AbonnementenResponse>("/api/abonnementen");
}

export function postAbonnement(abonnement: AbonnementInvoer): Promise<Abonnement> {
  return zendJson<Abonnement>("/api/abonnementen", "POST", abonnement);
}

export function putAbonnement(id: number, abonnement: AbonnementInvoer): Promise<Abonnement> {
  return zendJson<Abonnement>(`/api/abonnementen/${id}`, "PUT", abonnement);
}

export function deleteAbonnement(id: number): Promise<void> {
  return verwijder(`/api/abonnementen/${id}`);
}

export function getAanbevelingen(): Promise<AanbevelingenResponse> {
  return fetchJson<AanbevelingenResponse>("/api/abonnementen/aanbevelingen");
}

export function accepteerAanbeveling(id: number): Promise<void> {
  return postLeeg(`/api/abonnementen/aanbevelingen/${id}/accepteren`);
}

export function weigerAanbeveling(id: number): Promise<void> {
  return postLeeg(`/api/abonnementen/aanbevelingen/${id}/weigeren`);
}

export async function postAbonnementLogo(id: number, bestand: File): Promise<Abonnement> {
  const formData = new FormData();
  formData.append("bestand", bestand);
  const response = await fetch(`${API_BASE}/api/abonnementen/${id}/logo`, { method: "POST", body: formData });
  return afhandelenResponse<Abonnement>(response);
}

export function getInstellingen(): Promise<InstellingenResponse> {
  return fetchJson<InstellingenResponse>("/api/instellingen");
}

export function putInstellingen(instellingen: InstellingenInvoer): Promise<InstellingenResponse> {
  return zendJson<InstellingenResponse>("/api/instellingen", "PUT", instellingen);
}

export function getWoning(): Promise<Woning> {
  return fetchJson<Woning>("/api/vastgoed/woning");
}

export function putWoning(woning: WoningInvoer): Promise<Woning> {
  return zendJson<Woning>("/api/vastgoed/woning", "PUT", woning);
}

export function getWaardes(): Promise<WaardenResponse> {
  return fetchJson<WaardenResponse>("/api/vastgoed/waardes");
}

export function postWaarde(waarde: WaardeInvoer): Promise<Waarde> {
  return zendJson<Waarde>("/api/vastgoed/waardes", "POST", waarde);
}

export function putWaarde(id: number, waarde: WaardeInvoer): Promise<Waarde> {
  return zendJson<Waarde>(`/api/vastgoed/waardes/${id}`, "PUT", waarde);
}

export function deleteWaarde(id: number): Promise<void> {
  return verwijder(`/api/vastgoed/waardes/${id}`);
}

export function getInboedelArtikelen(): Promise<InboedelArtikelenResponse> {
  return fetchJson<InboedelArtikelenResponse>("/api/inboedel/artikelen");
}

export function getInboedelOpties(): Promise<InboedelOptiesResponse> {
  return fetchJson<InboedelOptiesResponse>("/api/inboedel/opties");
}

export function postInboedelArtikel(artikel: InboedelArtikelInvoer): Promise<InboedelArtikel> {
  return zendJson<InboedelArtikel>("/api/inboedel/artikelen", "POST", artikel);
}

export function putInboedelArtikel(id: number, artikel: InboedelArtikelInvoer): Promise<InboedelArtikel> {
  return zendJson<InboedelArtikel>(`/api/inboedel/artikelen/${id}`, "PUT", artikel);
}

export function deleteInboedelArtikel(id: number): Promise<void> {
  return verwijder(`/api/inboedel/artikelen/${id}`);
}
