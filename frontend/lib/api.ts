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

export interface Banksaldo {
  bedrag: number | null;
  datum: string | null;
  geschat_bedrag: number | null;
}

export interface PeriodeTotaal {
  periode_start: string;
  inkomsten: number;
  uitgaven: number;
  totaal: number;
  verwachte_inkomsten: number;
  verwachte_uitgaven: number;
}

export interface TotalenResponse {
  categorie: string | null;
  subcategorie: string | null;
  afzenders: string[];
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

export interface TransactieDetail {
  transactie_id: string;
  datum: string;
  naam_omschrijving: string;
  afzender: string;
  winkel: string | null;
  rekening: string | null;
  tegenrekening: string | null;
  mededelingen: string | null;
  bedrag_eur: number;
  saldo_na_mutatie: number | null;
  categorie: string;
  subcategorie: string;
  handmatig_overschreven: boolean;
  bronbestand: string | null;
  ruwe_rij: Record<string, string | null> | null;
}

export interface OngecategoriseerdAfzender {
  afzender: string;
  aantal: number;
  totaalbedrag: number;
}

export interface OngecategoriseerdResponse {
  afzenders: OngecategoriseerdAfzender[];
}

export interface AfzenderCategorieInvoer {
  categorie: string;
  subcategorie: string | null;
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

export type PlanningDrempelModus = "maanden" | "percentage";

export interface Instellingen {
  planning_drempel_modus: PlanningDrempelModus;
  planning_drempel_waarde: number;
  verzamelfacturen_locatie: string;
  data_te_oud_na_dagen: number;
  trend_venster_maanden: number;
}

export interface InstellingenInvoer {
  planning_drempel_modus: PlanningDrempelModus;
  planning_drempel_waarde: number;
  verzamelfacturen_locatie: string;
  data_te_oud_na_dagen: number;
  trend_venster_maanden: number;
}

export interface InstellingenResponse {
  instellingen: Instellingen;
}

export interface VastgoedLocatie {
  id: number;
  adres: string;
}

export interface VastgoedLocatieInvoer {
  adres: string;
}

export interface VastgoedLocatiesResponse {
  locaties: VastgoedLocatie[];
}

export interface Waarde {
  id: number;
  locatie_id: number;
  datum: string;
  waarde: number;
  bron: string | null;
  opmerking: string | null;
}

export interface WaardeInvoer {
  locatie_id: number;
  datum: string;
  waarde: number;
  bron: string | null;
  opmerking: string | null;
}

export interface WaardenResponse {
  waardes: Waarde[];
}

export interface Portefeuille {
  id: number;
  naam: string;
}

export interface PortefeuilleInvoer {
  naam: string;
}

export interface PortefeuillesResponse {
  portefeuilles: Portefeuille[];
}

export interface BeleggingTransactieInvoer {
  portefeuille_id: number;
  datum: string;
  type: "koop" | "verkoop";
  code: string;
  naam: string | null;
  aantal: number;
  prijs_per_stuk: number;
  valuta: string;
  kosten: number | null;
}

export interface BeleggingTransactie {
  id: number;
  portefeuille_id: number;
  datum: string;
  type: "koop" | "verkoop";
  code: string;
  naam: string | null;
  aantal: number;
  prijs_per_stuk: number;
  valuta: string;
  kosten: number | null;
}

export interface BeleggingTransactiesResponse {
  transacties: BeleggingTransactie[];
}

export interface TickerZoekResultaat {
  symbol: string;
  naam: string;
  beurs: string;
}

export interface TickerZoekResponse {
  resultaten: TickerZoekResultaat[];
}

export interface PortfolioPunt {
  datum: string;
  waarde: number;
}

export interface PortfolioResponse {
  code: string | null;
  reeks: PortfolioPunt[];
}

export interface Positie {
  code: string;
  naam: string;
  aantal: number;
  gem_aankoopprijs: number;
  valuta: string;
  laatste_koers: number | null;
  huidige_waarde: number | null;
  resultaat: number | null;
}

export interface PositiesResponse {
  posities: Positie[];
}

export type HypotheekType = "annuiteit" | "lineair" | "aflossingsvrij";

export interface LeningdeelInvoer {
  naam: string;
  type: HypotheekType;
  hoofdsom: number;
  rente_percentage: number;
  startdatum: string;
  looptijd_maanden: number;
  rentevast_tot: string | null;
}

export interface Leningdeel {
  id: number;
  naam: string;
  type: HypotheekType;
  hoofdsom: number;
  rente_percentage: number;
  startdatum: string;
  looptijd_maanden: number;
  rentevast_tot: string | null;
  actuele_schuld: number;
}

export interface LeningdelenResponse {
  leningdelen: Leningdeel[];
}

export interface SchuldPunt {
  datum: string;
  schuld: number;
}

export interface SchuldResponse {
  reeks: SchuldPunt[];
  actuele_schuld_totaal: number;
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
  wordt_vervangen: boolean;
  leeftijd_maanden: number | null;
  percentage_leven: number | null;
  restwaarde: number | null;
  is_afgeschreven: boolean;
  maanden_tot_afschrijving: number | null;
  kosten_per_dag: number | null;
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
  wordt_vervangen: boolean;
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

async function zendJsonLeeg(pad: string, methode: "POST" | "PUT", body: unknown): Promise<void> {
  const response = await fetch(`${API_BASE}${pad}`, {
    method: methode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const foutBody = await response.json().catch(() => null);
    throw new ApiError(foutBody?.detail ?? `API-fout (${response.status})`);
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

export function getBanksaldo(): Promise<Banksaldo> {
  return fetchJson<Banksaldo>("/api/rapportage/banksaldo");
}

export function getTotalen(params: {
  categorie: string | null;
  subcategorie: string | null;
  afzenders: string[];
  granulariteit: Granulariteit;
  vanaf: string | null;
  tot: string | null;
  verbergEigenRekeningen?: boolean;
}): Promise<TotalenResponse> {
  const zoekParams = new URLSearchParams();
  if (params.categorie) zoekParams.set("categorie", params.categorie);
  if (params.subcategorie) zoekParams.set("subcategorie", params.subcategorie);
  for (const a of params.afzenders) zoekParams.append("afzenders", a);
  zoekParams.set("granulariteit", params.granulariteit);
  if (params.vanaf) zoekParams.set("vanaf", params.vanaf);
  if (params.tot) zoekParams.set("tot", params.tot);
  if (params.verbergEigenRekeningen) zoekParams.set("verberg_eigen_rekeningen", "true");
  return fetchJson<TotalenResponse>(`/api/rapportage/totalen?${zoekParams}`);
}

export function getTransacties(params: {
  categorie: string | null;
  subcategorie: string | null;
  afzenders: string[];
  vanaf: string;
  tot: string;
  verbergEigenRekeningen?: boolean;
}): Promise<TransactiesResponse> {
  const zoekParams = new URLSearchParams();
  if (params.categorie) zoekParams.set("categorie", params.categorie);
  if (params.subcategorie) zoekParams.set("subcategorie", params.subcategorie);
  for (const a of params.afzenders) zoekParams.append("afzenders", a);
  zoekParams.set("vanaf", params.vanaf);
  zoekParams.set("tot", params.tot);
  if (params.verbergEigenRekeningen) zoekParams.set("verberg_eigen_rekeningen", "true");
  return fetchJson<TransactiesResponse>(`/api/rapportage/transacties?${zoekParams}`);
}

export function getTransactieDetail(transactieId: string): Promise<TransactieDetail> {
  return fetchJson<TransactieDetail>(`/api/rapportage/transacties/${encodeURIComponent(transactieId)}/detail`);
}

export function getOngecategoriseerd(): Promise<OngecategoriseerdResponse> {
  return fetchJson<OngecategoriseerdResponse>("/api/rapportage/ongecategoriseerd");
}

export function putOngecategoriseerd(afzender: string, invoer: AfzenderCategorieInvoer): Promise<void> {
  return zendJsonLeeg(`/api/rapportage/ongecategoriseerd/${encodeURIComponent(afzender)}`, "PUT", invoer);
}

export function putTransactieCategorie(transactieId: string, invoer: AfzenderCategorieInvoer): Promise<void> {
  return zendJsonLeeg(`/api/rapportage/transacties/${encodeURIComponent(transactieId)}/categorie`, "PUT", invoer);
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

export function getVastgoedLocaties(): Promise<VastgoedLocatiesResponse> {
  return fetchJson<VastgoedLocatiesResponse>("/api/vastgoed/locaties");
}

export function postVastgoedLocatie(locatie: VastgoedLocatieInvoer): Promise<VastgoedLocatie> {
  return zendJson<VastgoedLocatie>("/api/vastgoed/locaties", "POST", locatie);
}

export function putVastgoedLocatie(id: number, locatie: VastgoedLocatieInvoer): Promise<VastgoedLocatie> {
  return zendJson<VastgoedLocatie>(`/api/vastgoed/locaties/${id}`, "PUT", locatie);
}

export function deleteVastgoedLocatie(id: number): Promise<void> {
  return verwijder(`/api/vastgoed/locaties/${id}`);
}

export function getWaardes(locatieId: number): Promise<WaardenResponse> {
  return fetchJson<WaardenResponse>(`/api/vastgoed/waardes?locatie_id=${locatieId}`);
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

export function getPortefeuilles(): Promise<PortefeuillesResponse> {
  return fetchJson<PortefeuillesResponse>("/api/beleggingen/portefeuilles");
}

export function postPortefeuille(portefeuille: PortefeuilleInvoer): Promise<Portefeuille> {
  return zendJson<Portefeuille>("/api/beleggingen/portefeuilles", "POST", portefeuille);
}

export function putPortefeuille(id: number, portefeuille: PortefeuilleInvoer): Promise<Portefeuille> {
  return zendJson<Portefeuille>(`/api/beleggingen/portefeuilles/${id}`, "PUT", portefeuille);
}

export function deletePortefeuille(id: number): Promise<void> {
  return verwijder(`/api/beleggingen/portefeuilles/${id}`);
}

export function getBeleggingTransacties(portefeuilleId: number): Promise<BeleggingTransactiesResponse> {
  return fetchJson<BeleggingTransactiesResponse>(`/api/beleggingen/transacties?portefeuille_id=${portefeuilleId}`);
}

export function postBeleggingTransactie(transactie: BeleggingTransactieInvoer): Promise<BeleggingTransactie> {
  return zendJson<BeleggingTransactie>("/api/beleggingen/transacties", "POST", transactie);
}

export function putBeleggingTransactie(id: number, transactie: BeleggingTransactieInvoer): Promise<BeleggingTransactie> {
  return zendJson<BeleggingTransactie>(`/api/beleggingen/transacties/${id}`, "PUT", transactie);
}

export function deleteBeleggingTransactie(id: number): Promise<void> {
  return verwijder(`/api/beleggingen/transacties/${id}`);
}

export function zoekTicker(q: string): Promise<TickerZoekResponse> {
  return fetchJson<TickerZoekResponse>(`/api/beleggingen/zoek?q=${encodeURIComponent(q)}`);
}

export function getPortfolio(
  portefeuilleId: number,
  code: string | null,
  vanaf?: string | null,
  tot?: string | null
): Promise<PortfolioResponse> {
  const zoekParams = new URLSearchParams();
  zoekParams.set("portefeuille_id", String(portefeuilleId));
  if (code) zoekParams.set("code", code);
  if (vanaf) zoekParams.set("vanaf", vanaf);
  if (tot) zoekParams.set("tot", tot);
  return fetchJson<PortfolioResponse>(`/api/beleggingen/portfolio?${zoekParams}`);
}

export function getPosities(portefeuilleId?: number | null): Promise<PositiesResponse> {
  const zoekParams = new URLSearchParams();
  if (portefeuilleId != null) zoekParams.set("portefeuille_id", String(portefeuilleId));
  return fetchJson<PositiesResponse>(`/api/beleggingen/posities?${zoekParams}`);
}

export function getLeningdelen(): Promise<LeningdelenResponse> {
  return fetchJson<LeningdelenResponse>("/api/hypotheek/leningdelen");
}

export function postLeningdeel(leningdeel: LeningdeelInvoer): Promise<Leningdeel> {
  return zendJson<Leningdeel>("/api/hypotheek/leningdelen", "POST", leningdeel);
}

export function putLeningdeel(id: number, leningdeel: LeningdeelInvoer): Promise<Leningdeel> {
  return zendJson<Leningdeel>(`/api/hypotheek/leningdelen/${id}`, "PUT", leningdeel);
}

export function deleteLeningdeel(id: number): Promise<void> {
  return verwijder(`/api/hypotheek/leningdelen/${id}`);
}

export function getSchuldverloop(): Promise<SchuldResponse> {
  return fetchJson<SchuldResponse>("/api/hypotheek/verloop");
}

export interface VermogenOnderdeel {
  label: string;
  bedrag: number;
  laatst_bijgewerkt: string | null;
  type: "bezit" | "schuld";
  is_geschat: boolean;
}

export interface VermogenResponse {
  totaal: number;
  onderdelen: VermogenOnderdeel[];
}

export type WidgetWeergave = "totaal" | "grafiek" | "transacties";
export type WidgetPeriodeModus = "relatief" | "alles" | "aangepast";

export interface WidgetInvoer {
  titel: string | null;
  categorie: string | null;
  subcategorie: string | null;
  afzender: string | null;
  granulariteit: Granulariteit;
  periode_modus: WidgetPeriodeModus;
  periode_aantal: number | null;
  periode_eenheid: Granulariteit | null;
  periode_vanaf: string | null;
  periode_tot: string | null;
  weergave: WidgetWeergave;
  volgorde: number;
}

export interface Widget extends WidgetInvoer {
  id: number;
}

export interface WidgetenResponse {
  widgets: Widget[];
}

export function getVermogen(): Promise<VermogenResponse> {
  return fetchJson<VermogenResponse>("/api/overzicht/vermogen");
}

export function getWidgets(): Promise<WidgetenResponse> {
  return fetchJson<WidgetenResponse>("/api/overzicht/widgets");
}

export function postWidget(widget: WidgetInvoer): Promise<Widget> {
  return zendJson<Widget>("/api/overzicht/widgets", "POST", widget);
}

export function putWidget(id: number, widget: WidgetInvoer): Promise<Widget> {
  return zendJson<Widget>(`/api/overzicht/widgets/${id}`, "PUT", widget);
}

export function deleteWidget(id: number): Promise<void> {
  return verwijder(`/api/overzicht/widgets/${id}`);
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

export interface PlanningItemInvoer {
  omschrijving: string;
  bedrag: number;
  datum: string | null;
}

export interface PlanningItem extends PlanningItemInvoer {
  id: number | null;
  bron: "handmatig" | "inboedel";
  artikel_id: number | null;
  is_afgeschreven: boolean;
}

export interface PlanningResponse {
  items: PlanningItem[];
}

export interface MagicDatumResponse {
  haalbaar_op: string | null;
  nu_al_haalbaar: boolean;
  huidig_liquide_vermogen: number;
  gemiddeld_netto_maandelijks: number;
}

export function getPlanningItems(): Promise<PlanningResponse> {
  return fetchJson<PlanningResponse>("/api/planning/items");
}

export function getMagicDatum(itemId: number): Promise<MagicDatumResponse> {
  return fetchJson<MagicDatumResponse>(`/api/planning/items/${itemId}/magic-datum`);
}

export function postPlanningItem(item: PlanningItemInvoer): Promise<PlanningItem> {
  return zendJson<PlanningItem>("/api/planning/items", "POST", item);
}

export function putPlanningItem(id: number, item: PlanningItemInvoer): Promise<PlanningItem> {
  return zendJson<PlanningItem>(`/api/planning/items/${id}`, "PUT", item);
}

export function deletePlanningItem(id: number): Promise<void> {
  return verwijder(`/api/planning/items/${id}`);
}

export type FactuurStatus = "nieuw" | "gematcht" | "gesplitst";

export interface Factuur {
  id: number;
  bestandsnaam: string;
  origineel_bestandsnaam: string | null;
  bron: string;
  totaalbedrag: number | null;
  transactie_id: string | null;
  status: FactuurStatus;
  geupload_op: string;
  transactie_bedrag: number | null;
}

export interface FactuurBijwerken {
  bron: string;
  totaalbedrag: number | null;
  transactie_id: string | null;
}

export interface RegelInvoer {
  omschrijving: string;
  bedrag: number;
  categorie: string | null;
  subcategorie: string | null;
}

export interface Regel extends RegelInvoer {
  id: number;
  factuur_id: number;
}

export interface FactuurMetRegels extends Factuur {
  regels: Regel[];
}

export interface FacturenResponse {
  facturen: Factuur[];
}

export function getFacturen(): Promise<FacturenResponse> {
  return fetchJson<FacturenResponse>("/api/verzamelfacturen/facturen");
}

export function getFactuur(id: number): Promise<FactuurMetRegels> {
  return fetchJson<FactuurMetRegels>(`/api/verzamelfacturen/facturen/${id}`);
}

export function factuurBestandUrl(id: number): string {
  return `${API_BASE}/api/verzamelfacturen/facturen/${id}/bestand`;
}

export async function postFactuur(bestand: File, bron: string, totaalbedrag: number | null): Promise<Factuur> {
  const formData = new FormData();
  formData.append("bestand", bestand);
  formData.append("bron", bron);
  if (totaalbedrag !== null) formData.append("totaalbedrag", String(totaalbedrag));
  const response = await fetch(`${API_BASE}/api/verzamelfacturen/facturen`, { method: "POST", body: formData });
  return afhandelenResponse<Factuur>(response);
}

export function putFactuur(id: number, invoer: FactuurBijwerken): Promise<Factuur> {
  return zendJson<Factuur>(`/api/verzamelfacturen/facturen/${id}`, "PUT", invoer);
}

export function deleteFactuur(id: number): Promise<void> {
  return verwijder(`/api/verzamelfacturen/facturen/${id}`);
}

export function postFactuurRegel(factuurId: number, regel: RegelInvoer): Promise<Regel> {
  return zendJson<Regel>(`/api/verzamelfacturen/facturen/${factuurId}/regels`, "POST", regel);
}

export function putFactuurRegel(id: number, regel: RegelInvoer): Promise<Regel> {
  return zendJson<Regel>(`/api/verzamelfacturen/regels/${id}`, "PUT", regel);
}

export function deleteFactuurRegel(id: number): Promise<void> {
  return verwijder(`/api/verzamelfacturen/regels/${id}`);
}

export interface BankRegistratie {
  bank: string;
  naam: string;
  separator: string;
  datum_kolom: string;
  datum_formaat: string;
  omschrijving_kolom: string;
  rekening_kolom: string;
  tegenrekening_kolom: string | null;
  bedrag_kolom: string;
  bedrag_decimaal_teken: string;
  richting_kolom: string | null;
  richting_negatief_waarde: string | null;
  mededelingen_kolom: string | null;
  saldo_kolom: string | null;
  rekening_type: "betaalrekening" | "spaarrekening";
}

export interface Bank extends BankRegistratie {
  locatie: string;
  laatst_gebruikt_op: string | null;
}

export interface BankenResponse {
  banken: Bank[];
}

export interface KolomDetectie {
  kolommen: string[];
}

export interface SpaarRekening {
  bank: string;
  naam: string;
  rekening: string;
  saldo: number;
  datum: string;
}

export interface SparenResponse {
  rekeningen: SpaarRekening[];
  handmatig_saldo: number;
  handmatig_aangepast_op: string | null;
  totaal: number;
}

export function getSparen(): Promise<SparenResponse> {
  return fetchJson<SparenResponse>("/api/sparen");
}

export function putHandmatigSpaarsaldo(bedrag: number): Promise<SparenResponse> {
  return zendJson<SparenResponse>("/api/sparen/handmatig", "PUT", { bedrag });
}

export function getBanken(): Promise<BankenResponse> {
  return fetchJson<BankenResponse>("/api/banken");
}

export async function detecteerBankKolommen(bestand: File, separator: string): Promise<KolomDetectie> {
  const formData = new FormData();
  formData.append("bestand", bestand);
  formData.append("separator", separator);
  const response = await fetch(`${API_BASE}/api/banken/detecteer-kolommen`, { method: "POST", body: formData });
  return afhandelenResponse<KolomDetectie>(response);
}

export function postBank(bank: BankRegistratie): Promise<Bank> {
  return zendJson<Bank>("/api/banken", "POST", bank);
}

export async function postBankUpload(bank: string, bestand: File): Promise<Bank> {
  const formData = new FormData();
  formData.append("bestand", bestand);
  const response = await fetch(`${API_BASE}/api/banken/${encodeURIComponent(bank)}/upload`, {
    method: "POST",
    body: formData,
  });
  return afhandelenResponse<Bank>(response);
}

export interface Telling {
  coupure: number;
  aantal: number;
}

export interface ContantGeldLocatie {
  id: number;
  naam: string;
  tellingen: Telling[];
  totaal: number;
}

export interface ContantGeldResponse {
  coupures: number[];
  locaties: ContantGeldLocatie[];
  totaal_algemeen: number;
}

export interface LocatieInvoer {
  naam: string;
}

export interface CoupureRegel {
  coupure: number;
  aantal: number;
}

export interface VerplaatsingInvoer {
  van_locatie_id: number;
  naar_locatie_id: number;
  datum: string;
  omschrijving: string | null;
  regels: CoupureRegel[];
}

export interface UitgaveInvoer {
  locatie_id: number;
  datum: string;
  omschrijving: string;
  categorie: string | null;
  subcategorie: string | null;
  regels: CoupureRegel[];
}

export interface ContantGeldMutatie {
  id: number;
  type: "telling" | "verplaatsing" | "uitgave";
  datum: string;
  locatie_naam: string | null;
  van_locatie_naam: string | null;
  naar_locatie_naam: string | null;
  omschrijving: string | null;
  categorie: string | null;
  subcategorie: string | null;
  bedrag: number;
  aangemaakt_op: string;
  regels: CoupureRegel[];
}

export interface ContantGeldHistorieResponse {
  mutaties: ContantGeldMutatie[];
}

export function getContantGeld(): Promise<ContantGeldResponse> {
  return fetchJson<ContantGeldResponse>("/api/contantgeld");
}

export function getContantGeldHistorie(): Promise<ContantGeldHistorieResponse> {
  return fetchJson<ContantGeldHistorieResponse>("/api/contantgeld/historie");
}

export function postContantGeldLocatie(locatie: LocatieInvoer): Promise<ContantGeldResponse> {
  return zendJson<ContantGeldResponse>("/api/contantgeld/locaties", "POST", locatie);
}

export function putContantGeldLocatie(id: number, locatie: LocatieInvoer): Promise<ContantGeldResponse> {
  return zendJson<ContantGeldResponse>(`/api/contantgeld/locaties/${id}`, "PUT", locatie);
}

export function deleteContantGeldLocatie(id: number): Promise<void> {
  return verwijder(`/api/contantgeld/locaties/${id}`);
}

export function putContantGeldTelling(id: number, telling: Telling): Promise<ContantGeldResponse> {
  return zendJson<ContantGeldResponse>(`/api/contantgeld/locaties/${id}/telling`, "PUT", telling);
}

export function postContantGeldVerplaatsen(invoer: VerplaatsingInvoer): Promise<ContantGeldResponse> {
  return zendJson<ContantGeldResponse>("/api/contantgeld/verplaatsen", "POST", invoer);
}

export function postContantGeldUitgeven(invoer: UitgaveInvoer): Promise<ContantGeldResponse> {
  return zendJson<ContantGeldResponse>("/api/contantgeld/uitgeven", "POST", invoer);
}
