# Hoe dit platform werkt

Dit document legt uit **wat het platform doet en waarom het zo werkt** — niet
regel voor regel code, maar de redenering erachter. Doel: dat iemand die geen
regel Python of TypeScript kent, kan volgen hoe een bankregel via upload
uiteindelijk als "Boodschappen — €23,40" op je scherm verschijnt, en waarom
bepaalde keuzes gemaakt zijn zoals ze gemaakt zijn.

Voor installatie-instructies: zie [README.md](../README.md). Dit document
gaat puur over de inhoudelijke logica.

## Inhoud

- [Het grote plaatje](#het-grote-plaatje)
- [De data-pipeline: van CSV naar overzicht](#de-data-pipeline-van-csv-naar-overzicht)
- [Uitgaven & Rapportage](#uitgaven--rapportage)
- [Spullen (voorheen Inboedel)](#spullen-voorheen-inboedel)
- [Vaste lasten (voorheen Abonnementen)](#vaste-lasten-voorheen-abonnementen)
- [Beleggingen](#beleggingen)
- [Woning (Vastgoed + Hypotheek)](#woning-vastgoed--hypotheek)
- [Planning](#planning)
- [Cash (contant geld)](#cash-contant-geld)
- [Verzamelfacturen](#verzamelfacturen)
- [Sparen](#sparen)
- [Overzicht & Vermogen](#overzicht--vermogen)
- [Instellingen](#instellingen)
- [Terugkerende technische trucs](#terugkerende-technische-trucs)

---

## Het grote plaatje

Het platform bestaat uit drie lagen:

1. **DuckDB** — één databankbestand op schijf (`db/finance.duckdb`). Geen
   losse server, geen gebruikersbeheer: het is gewoon een bestand, net als
   een Excel-sheet, maar dan met echte tabellen en query's.
2. **De pipeline + API** (Python/FastAPI) — leest CSV's in, rekent dingen
   uit, en biedt dat aan als JSON op poort 8000.
3. **De webinterface** (Next.js/TypeScript) — de schermen die je in je
   browser ziet, op poort 3000.

Alles draait bij jou thuis (of op je eigen server/NAS) — er gaat niets naar
een externe partij, behalve twee bewuste uitzonderingen: koersen ophalen bij
Yahoo Finance (voor Beleggingen) en logo's ophalen bij DuckDuckGo (voor
Vaste lasten). Beide zijn puur uitlezen, er gaat geen eigen data heen.

DuckDB kan maar **één schrijver tegelijk** aan. Daarom heeft elke pagina die
iets opslaat een kort-levende schrijf-connectie die meteen weer sluit, en
krijg je een nette foutmelding ("database is momenteel bezig") in plaats van
een crash als er toevallig twee dingen tegelijk gebeuren.

## De data-pipeline: van CSV naar overzicht

Dit is het hart van het platform. Elke bankregel doorloopt vier stappen,
"bronze → silver → gold" genoemd (een gangbare naam in data-engineering voor
"steeds een beetje schoner").

### Stap 1 — Bronze: gewoon binnenhalen

Een geüploade CSV wordt regel voor regel ingelezen en **letterlijk, ruw**
opgeslagen — elke rij als een blokje JSON (kolomnaam → waarde), samen met
welke bank het is en een hash (vingerafdruk) van de rij-inhoud.

Waarom ruwe JSON en geen vaste kolommen? Omdat elke bank andere
kolomnamen gebruikt. Door de ruwe rij te bewaren en pas in de volgende stap
te interpreteren, kan een nieuwe bank worden toegevoegd zonder de tabel-
structuur te hoeven aanpassen.

**Dubbele bestanden worden herkend**, niet aan de bestandsnaam maar aan een
hash van de volledige bestandsinhoud. Upload je per ongeluk twee keer
dezelfde export (bijvoorbeeld omdat de nieuwe download een overlappende
periode heeft met de vorige), dan wordt die simpelweg overgeslagen — er
ontstaan nooit dubbele transacties.

### Stap 2 — Silver: interpreteren

Nu wordt de ruwe JSON per bank omgezet naar echte velden: datum, bedrag,
rekening, tegenrekening, omschrijving, eventueel saldo-na-mutatie. Elke bank
heeft zijn eigen "vertaaltabel" (welke kolom is de datum, in welk formaat,
welk teken is de komma in een bedrag, etc.) — die stel je zelf in bij het
toevoegen van een bank.

Deze stap **herbouwt zichzelf altijd volledig** vanuit bronze (niet
stapsgewijs aanvullen) — dat is expres: zo kan een bank-configuratie achteraf
gecorrigeerd worden ("oh, die kolom heette toch anders") en klopt de hele
geschiedenis daarna weer, in plaats van dat oude foute interpretaties
blijven hangen.

### Stap 3 — Gold: categoriseren en opschonen

Dit is de stap waar de meeste "slimme" logica zit.

**Categoriseren.** Elke regel wordt getoetst aan een lijst eigen regels
(`config/categorisatie_regels.yaml`) — een regex-patroon zoals
`albert heijn|jumbo|lidl` met een categorie en subcategorie erbij. De regel
met de laagste prioriteit die matcht, wint. Een regel kan ook beperkt worden
tot alleen inkomsten of alleen uitgaven (bijvoorbeeld: "ING" als
tegenpartij is bij een uitgave een hypotheekbetaling, bij een inkomst
misschien een terugstorting — twee heel verschillende dingen).

Matcht niets, dan krijgt de regel categorie **"Overig / Ongecategoriseerd"**
en verschijnt hij in de "ongecategoriseerde afzenders"-inbox, waar je 'm met
één klik een vaste categorie kan geven — die keuze wordt onthouden voor alle
toekomstige regels van diezelfde afzender.

**Wie is de afzender?** Een bankregel heeft een rommelige, soms cryptische
omschrijving. Het platform probeert daar een nette, herkenbare naam uit te
halen:

- Als een categorisatie-regel een "winkel"-naam meegeeft en die naam
  daadwerkelijk in de omschrijving zelf voorkomt (niet toevallig ergens in
  een los mededelingenveld), wordt die winkelnaam de afzender.
- Anders wordt gekeken naar het IBAN van de tegenpartij: dezelfde IBAN =
  dezelfde afzender, ook als de omschrijving een beetje wisselt.
- Sommige IBAN's zijn **gedeelde rekeningen van betaalverwerkers** (Mollie,
  Adyen, Tikkie, PAY.nl, etc.) — daarachter zitten honderden losse,
  onderling niet-verwante winkels. Die IBAN's staan op een uitsluitingslijst,
  en de tekst na "via Mollie"/"via Stichting..." wordt er automatisch
  afgeknipt zodat de onderliggende naam overblijft (bijvoorbeeld "KNMV via
  Mollie" en "KNMV via Stichting Mollie Payments" worden allebei gewoon
  "KNMV").
- Lukt geen van beide, dan wordt de (opgeschoonde) omschrijvingstekst zelf de
  afzendernaam.

Bij twijfel tussen meerdere schrijfwijzen van dezelfde afzender (bijvoorbeeld
door een tikfout of een net iets andere winkelnaam-notatie) wordt de vaakst
voorkomende schrijfwijze als "officiële" weergavenaam gekozen.

**Handmatige correcties blijven altijd overeind.** Wijs je een transactie
zelf een andere categorie toe (via het detailschermpje), dan wordt dat
apart opgeslagen en overschrijft dat voortaan altijd de automatische regel
voor precies die ene transactie — ook als de pipeline daarna opnieuw draait.

### Stap 4 — De "effectieve" weergave

Wat je uiteindelijk in Uitgaven en op de meeste andere plekken ziet, is niet
zomaar gold, maar een extra laag daarboven die drie dingen samenvoegt:

1. **Normale bankregels**, met de categorisatie van hierboven.
2. **Gesplitste verzamelfacturen** — is een creditcardafschrijving
   opgesplitst in losse posten (zie [Verzamelfacturen](#verzamelfacturen)),
   dan verschijnen die losse posten hier in plaats van de ene grote
   creditcard-afschrijving. Dat gebeurt pas zodra de som van de posten
   precies (op een cent na) het originele bedrag dekt — een half
   opgesplitste factuur laat dus nooit geld "verdwijnen" uit je overzicht.
3. **Contante uitgaven** (zie [Cash](#cash-contant-geld)) — die komen niet
   uit een bankexport, maar tellen wel mee als uitgave.

En één ding wordt hier bewust **uitgesloten**: transacties van een rekening
die je als **spaarrekening** hebt geregistreerd. Een overschrijving naar je
eigen spaarrekening is geen "uitgave" in de zin van geld dat weg is — dat
saldo zie je gewoon terug bij Sparen. (Zie ook de uitleg bij
[Sparen](#sparen) hieronder — dit was lange tijd een bug: zulke rekeningen
telden onterecht mee in Uitgaven én konden zelfs het getoonde banksaldo
laten omslaan naar een spaarsaldo.)

---

## Uitgaven & Rapportage

De hoofdpagina voor "waar geef ik geld aan uit". Filterbaar op categorie,
subcategorie, afzender en periode, met een grafiek en een doorzoekbare
tabel.

- **"Eigen rekeningen verbergen"** — een los aan/uit-vinkje dat
  overschrijvingen naar je eigen andere rekeningen (bijvoorbeeld handmatig
  spaargeld opzij zetten) uit het overzicht filtert. Dit werkt automatisch:
  elke rekening die je ooit als "van"-rekening in een import hebt gezien,
  geldt als "van jou".
- **Periode-instelling** — "laatste N dagen/weken/maanden/jaar", een
  handmatig bereik, of alles. Deze keuze wordt herbruikt op meerdere andere
  plekken in de app (bijvoorbeeld ook voor het vooruitkijken bij Planning).
- **Trendlijn** — een voortschrijdend gemiddelde over de grafiek, met een
  instelbaar aantal maanden (Instellingen → "Trend-venster").
- Klik je op een transactie, dan zie je het volledige detail inclusief de
  **oorspronkelijke ruwe bankregel** (handig om te controleren wat er nou
  precies stond, als een categorisatie gek uitpakt).

---

## Spullen (voorheen Inboedel)

Bijhouden wat je bezit heeft gekost en hoeveel het nu (nog) waard is —
lineaire afschrijving, net als bij een auto.

**Restwaarde-formule.** Bij aanschaf is een artikel het volledige bedrag
waard. Elke dag die verstrijkt, verliest het een vast percentage van zijn
waarde, tot het na de opgegeven levensduur op €0 staat:

> restwaarde = aanschafbedrag × (1 − verstreken tijd ÷ levensduur)

**Kosten per dag** is simpelweg het aanschafbedrag gedeeld door de
levensduur in dagen — een manier om spullen onderling te vergelijken los van
hun prijskaartje ("dat dure espressoapparaat kost me eigenlijk maar 12 cent
per dag, want het gaat 10 jaar mee").

**Opgebouwde buffer.** Gaat een artikel langer mee dan verwacht (je telefoon
houdt 7 jaar vol in plaats van de verwachte 5), dan bouwt dat een aparte,
motiverende teller op: voor elke extra dag die het meegaat "bespaar" je
tegen hetzelfde dagtarief als de afschrijving, tot maximaal het
aanschafbedrag (daarna heb je in feite een heel tweede exemplaar
"verdiend"). Dit cijfer staat los van de restwaarde en telt **niet** mee in
je totale vermogen — een nog prima werkende telefoon zou anders ten onrechte
als een soort schuld gaan meetellen naarmate je 'm langer gebruikt, wat het
omgekeerde van de bedoeling zou zijn.

**Categorieën** — vrij in te vullen (met suggesties op basis van wat je al
eerder typte), en bovenaan de pagina te filteren met een knoppenrij.

**Wordt vervangen?** — een simpele aan/uit-schakelaar per artikel. Staat 'm
uit, dan verschijnt er bij het einde van de levensduur geen verwachte
vervangingskost in Planning (bijvoorbeeld voor iets dat je toch niet
opnieuw gaat kopen als het stuk gaat).

---

## Vaste lasten (voorheen Abonnementen)

Terugkerende betalingen: abonnementen, verzekeringen, lidmaatschappen.

**Automatische detectie.** De pipeline zoekt in je transacties naar
combinaties van dezelfde afzender + hetzelfde bedrag die met een
regelmatige tussenpoos terugkomen (wekelijks, maandelijks, per kwartaal,
per twee maanden of jaarlijks — elk met een bandbreedte, want "maandelijks"
valt in de praktijk niet altijd op exact dezelfde dag). Minimaal 3
transacties nodig voordat er een patroon herkend wordt, en de spreiding
tussen de tussenpozen moet klein genoeg zijn — anders zouden toevallig
even dure losse boodschappen ook als "abonnement" aangemerkt kunnen worden.

Contante uitgaven, inkomsten, overboekingen naar spaargeld/beleggen, en
overboekingen naar een persoon (herkend aan aanheftjes als "Hr", "Mw", "e/o")
worden bewust nooit als abonnement voorgesteld.

Een gevonden patroon verschijnt als **aanbeveling** — je accepteert of
weigert 'm zelf, er wordt nooit automatisch iets aan je vaste lasten
toegevoegd. Een geaccepteerd abonnement wordt daarna elke pipeline-run
ververst: de eerstvolgende verwachte afschrijvingsdatum schuift automatisch
door zodra er een nieuwe, passende transactie binnenkomt.

**Prijswijzigingen** worden apart gesignaleerd: verandert het bedrag van een
al-geaccepteerd abonnement, dan komt dat als losse aanbeveling ("prijs is
gewijzigd naar €X") in plaats van dat het stilzwijgend wordt overgenomen.

**Normalisatie naar een maandbedrag.** Een jaarabonnement van €120 en een
maandabonnement van €12 zijn niet zomaar te vergelijken. Daarom wordt overal
waar bedragen worden opgeteld of gesorteerd (het totaal bovenaan de pagina,
en het sorteren op "Bedrag") gerekend met het bedrag omgerekend naar "per
maand" — bij elk kaartje zie je zowel het per-maand-bedrag als het
oorspronkelijke bedrag/interval erbij.

**Logo's** worden automatisch opgehaald (via een openbare favicon-dienst) of
kun je zelf uploaden. Oude, niet meer gebruikte logo-bestanden (bijvoorbeeld
van een inmiddels verwijderd abonnement) worden elke pipeline-run
automatisch opgeruimd.

---

## Beleggingen

Aan- en verkopen van aandelen/ETF's bijhouden, met automatisch opgehaalde
koersen (Yahoo Finance) en wisselkoersen voor niet-euro-posities.

**Meerdere portefeuilles**, die je zelf aanmaakt en een naam geeft — bewust
**nooit bij elkaar opgeteld** op de Beleggingen-pagina zelf (een pil-
schakelaar bovenaan kiest welke portefeuille je ziet). Voor het totale
vermogen (Overzicht/Vermogen) worden alle portefeuilles wél samen
opgeteld, want daar gaat het om "hoeveel heb ik in totaal", niet om de
prestatie van één specifieke portefeuille.

**Positie- en resultaatberekening.** Voor elke aandelencode wordt bijgehouden
hoeveel stuks je nog in bezit hebt (aankopen min verkopen), tegen welke
gemiddelde aankoopprijs, en wat de huidige waarde is tegen de laatst bekende
koers. Het resultaat (winst/verlies) en het bijbehorende percentage staan
er los naast. Bedragen in vreemde valuta worden omgerekend naar euro's met
de laatst bekende wisselkoers.

**Koersen worden incrementeel opgehaald** — niet elke keer de hele
geschiedenis opnieuw, maar alleen de dagen sinds de laatst opgehaalde koers.
Voeg je een transactie toe in een code die nog geen koersgeschiedenis heeft,
dan wordt die meteen (niet pas bij de volgende nachtelijke run) opgehaald.
Mislukt het ophalen (bijvoorbeeld omdat Yahoo Finance even niet bereikbaar
is), dan gaat de rest van de pipeline gewoon door — koersen zijn nooit
kritiek genoeg om de hele verwerking te laten stoppen.

---

## Woning (Vastgoed + Hypotheek)

Eén pagina per pand, met woningwaarde-geschiedenis én hypotheekverloop naast
elkaar (dit waren twee losse modules, samengevoegd omdat ze feitelijk
hetzelfde onderwerp beschrijven).

**Woningwaarde** is gewoon een handmatig bijgehouden reeks datum+bedrag
(bijvoorbeeld een taxatie, of een WOZ-waarde) — geen automatische
berekening, dat kán het platform niet weten.

**Hypotheek-restschuld** wordt wél berekend, per leningdeel, volgens het
gangbare Nederlandse aflossingsschema voor het gekozen type:

- **Lineair** — elke maand precies hetzelfde bedrag aflossen; de schuld
  daalt in een rechte lijn.
- **Annuïteit** — elke maand hetzelfde totaalbedrag (rente + aflossing
  samen), waarbij het aflossingsdeel geleidelijk groter wordt naarmate de
  schuld daalt — de bekende, licht doorbuigende curve.
- **Aflossingsvrij** — er wordt niets afgelost; de schuld blijft gelijk aan
  de hoofdsom tot het einde van de looptijd.

Elk leningdeel is gekoppeld aan één pand (`locatie_id`) — dat maakt het
mogelijk om bij meerdere panden per pand een eigen, correcte
schuld-grafiek en "percentage afbetaald" te tonen, in plaats van alles door
elkaar.

---

## Planning

Een blik vooruit: welke kosten (en inkomsten) zie je aankomen.

**Twee bronnen worden samengevoegd:**

1. **Handmatige posten** — zelf een bedrag met een (optionele) datum
   invoeren, bijvoorbeeld "vakantie, augustus, -€1500".
2. **Bijna-versleten spullen** — artikelen uit Spullen die richting het
   einde van hun levensduur gaan (met "wordt vervangen" aangevinkt), met de
   negatieve vervangingskost als verwachte uitgave. Is zo'n artikel al over
   zijn levensduur heen maar nog niet vervangen, dan schuift de verwachte
   datum steeds een maand door — zo blijft die post zichtbaar als
   "aankomend" in plaats van steeds verder het verleden in te zakken.

De losse lijst ("Al afgeschreven" / "Binnenkort afgeschreven" / "Handmatig")
gebruikt een **drempel** (in te stellen: "X maanden voor het einde" of "X%
van de levensduur verstreken") om te bepalen wanneer een bijna-versleten
artikel daar al opduikt. De **grafiek** daaronder kijkt verder: die toont
een volledige maandelijkse kostenprojectie over alle nog te vervangen
spullen samen, los van die drempel, met een instelbare vooruitkijk-periode
(3/6/12/24 maanden) direct op de pagina.

**De "is dit haalbaar?"-knop** (bij een geplande uitgave) rekent uit wanneer
je een grote uitgave kan betalen, op basis van je huidige direct
beschikbare vermogen (banksaldo + sparen + beleggingen, uitgaande van
directe verkoopbaarheid) plus je gemiddelde netto maandelijkse overschot
van de afgelopen 6 maanden. Belangrijk detail: het bedrag van **elke andere**
geplande grote uitgave wordt daarbij meteen (niet pas op zijn eigen datum)
van de beschikbare pot afgetrokken. Zonder die regel zouden twee losse,
allebei grote geplande uitgaven elk apart "nu al haalbaar!" kunnen lijken,
terwijl er in werkelijkheid maar geld is voor één van de twee.

---

## Cash (contant geld)

Fysiek contant geld bijhouden, per locatie (bijvoorbeeld "portemonnee" en
"kluis"), uitgesplitst per coupure (briefjes en munten).

Dit werkt als een simpel kasboek: elke wijziging is een **mutatie** —
een verplaatsing tussen twee locaties, een uitgave (geld gaat de deur uit),
of een telling-correctie (je telt je portemonnee na en het klopt niet meer
met wat het systeem denkt — het verschil wordt als correctie-mutatie
vastgelegd). De actuele voorraad per coupure is dus nooit een los, apart
bij te werken getal, maar wordt altijd afgeleid uit de volledige
geschiedenis van mutaties — zo kan een voorraad nooit los raken van hoe
hij is ontstaan, en heb je altijd een navolgbare historie.

Een contante **uitgave** telt automatisch mee in Uitgaven/Rapportage (met
zijn eigen categorie), alsof het een bankregel was — al komt het duidelijk
uit een andere bron. Om dat direct zichtbaar te maken (niet pas na de
nachtelijke verversing) wordt na een uitgave meteen de categorisatie-stap
van de pipeline opnieuw gedraaid.

---

## Verzamelfacturen

Voor rekeningen waarbij één bankafschrijving eigenlijk uit meerdere losse
aankopen bestaat — het klassieke voorbeeld is een creditcard: één
maandelijkse incasso, maar daarachter tientallen losse aankopen die je apart
wil kunnen categoriseren.

Je upload het (PDF- of ander) bestand met de posten, en splitst het
vervolgens handmatig in losse regels, elk met een eigen omschrijving,
bedrag en categorie. Zodra de som van de regels **precies** (op een cent
na) het bedrag van de gekoppelde bank-afschrijving dekt, wisselt de
weergave om: overal waar voorheen de ene grote creditcard-afschrijving
stond, verschijnen nu de losse, gecategoriseerde regels. Is een factuur nog
maar deels gesplitst, dan blijft de oorspronkelijke lump-transactie gewoon
zichtbaar — er verdwijnt dus nooit geld uit je overzicht doordat een
verzamelfactuur half afgehandeld is blijven staan.

**Automatisch splitsen voor bekende formaten.** Voor in elk geval het
ING-creditcardafschrift wordt geprobeerd de PDF automatisch uit te lezen,
de aankopen erin als regels aan te maken, en te koppelen aan de bank-
afschrijving die ze daadwerkelijk heeft betaald. Terugkerende aankopen
(bijvoorbeeld "APPLE.COM/BILL") krijgen daarbij automatisch dezelfde
categorie als de vorige keer dat je die exacte omschrijving met de hand
categoriseerde. Lukt de automatische herkenning niet (ander bestandsformaat,
geen eenduidige match te vinden, de bedragen kloppen niet exact) dan
gebeurt er simpelweg niets — je vult 'm dan gewoon zelf in, zoals altijd.

Deze module is bewust **niet** in het hoofdmenu opgenomen — het is een
invoer-/opruimpunt (je gebruikt het als onderdeel van uploaden), geen
plek waar je dagelijks naartoe navigeert. Bereikbaar via het upload-menu.

---

## Sparen

Saldo's van je spaarrekeningen, plus een handmatig restbedrag voor
spaargeld dat je niet als aparte bankrekening wil registreren.

Een spaarrekening registreer je op precies dezelfde manier als een gewone
betaalrekening (via het upload-menu, met "Type rekening: Spaarrekening"
aangevinkt) — er is geen aparte, losse invoer nodig. Het laatst bekende
saldo komt rechtstreeks uit de bank-export zelf (het "saldo na mutatie"-veld
dat de meeste banken meesturen).

**Geschat saldo.** Omdat je niet elke dag een nieuwe export uploadt, wordt
het saldo tussen de laatste upload en vandaag geschat — dezelfde aanpak als
bij het geschatte banksaldo (zie
[Overzicht & Vermogen](#overzicht--vermogen) hieronder), maar dan berekend
op de mutaties van precies díe ene rekening. Een spaarrekening kan
(uiteraard) nooit negatief staan — die schatting wordt daarom altijd op
minimaal €0 gehouden, ook al zou de rekenkundige extrapolatie eronder
uitkomen.

**Alias en spaardoel.** Elke rekening is aan te klikken om een eigen,
herkenbare naam te geven (in plaats van het kale rekeningnummer) en een
spaardoel in te stellen — is dat doel ingevuld, dan verschijnt er een
voortgangsbalk met percentage onder die rekening.

---

## Overzicht & Vermogen

**Overzicht** (de homepage) toont losse kaartjes per module (uitgaven deze
maand, vaste lasten per maand, etc.) plus een zelf samen te stellen
widget-dashboard (eigen grafiekjes, gefilterd op wat jij interessant vindt).

**Vermogen** (een eigen pagina) telt alles bij elkaar op:

- Banksaldo (geschat, zie hieronder)
- Sparen (rekeningen + handmatig restbedrag, ook geschat)
- Beleggingen (huidige waarde van alle portefeuilles samen)
- Woningwaarde (som van de laatst bekende waarde per pand)
- Hypotheekschuld (aftrek)
- Spullen (dagwaarde/restwaarde, som van alles)

**Hoe het banksaldo geschat wordt.** Je uploadt niet elke dag een nieuwe
bankexport, dus het "actuele" saldo tussen de laatste upload en vandaag is
altijd een schatting. Een plat gemiddelde ("zoveel euro per dag") bleek geen
goede aanname — vaste lasten en salaris vallen op vaste dagen van de maand
(hypotheek rond de 1e, salaris rond de 20e-25e), dus het saldo beweegt met
schokken, niet gelijkmatig. In plaats daarvan wordt een profiel opgebouwd
van de gemiddelde netto mutatie per **dag-van-de-maand**, over de laatste 12
maanden, en dat profiel wordt opgeteld vanaf de laatste bekende datum tot
vandaag. Zo telt "we zitten net vóór de hypotheekafschrijving" of "het
salaris is net binnengekomen" wél mee in de schatting.

**Mutaties per maand** — een historische reeks van je totale vermogen,
maand voor maand. Dit gebruikt, waar mogelijk, **echte** historische
standen in plaats van schattingen: het laatst bekende bank- en spaarsaldo
op elke maand-einddatum (uit de bankexports zelf), de dagelijkse
portefeuille-waarde op die datum, de pandwaarde en hypotheekschuld op die
datum. Alleen voor "nu" (de lopende maand) komt de extrapolatie van
hierboven om de hoek kijken — voor een sowieso al voorbije maand is die
namelijk niet nodig, daar is het echte antwoord al bekend.

---

## Instellingen

- **Planning-drempel** — vanaf wanneer een bijna-versleten artikel al in de
  Planning-lijst verschijnt (zie [Planning](#planning)).
- **Vooruitkijken** — hoever de maandelijkse kostenprojectie in Planning
  standaard vooruitkijkt (op de Planning-pagina zelf ook met snelkeuze-
  knoppen te wijzigen, dit is alleen de standaardwaarde).
- **Verzamelfacturen-locatie** — waar geüploade verzamelfacturen op schijf
  terechtkomen.
- **"Data is oud"-melding** — na hoeveel dagen zonder nieuwe upload de rode
  waarschuwingsbalk verschijnt.
- **Trend-venster** — over hoeveel maanden het voortschrijdend gemiddelde in
  grafieken wordt berekend.
- **Geregistreerde banken** — elke bank is aan te klikken om de
  kolom-koppeling (welke CSV-kolom is de datum, het bedrag, etc.) achteraf
  aan te passen. De bank-code en de landingsmap op schijf liggen daarbij
  vast (die veranderen zou de koppeling met al geüploade bestanden breken).
- **Pipeline opnieuw draaien** — forceert een volledige herberekening
  (bronze → silver → gold → vaste lasten → koersen), ook als er geen nieuwe
  bestanden zijn. Handig na een configuratiewijziging, of gewoon om zeker
  te weten dat alles klopt.
- **Kleurenthema grafieken** — Standaard/Warm/Koel, puur een
  weergavevoorkeur, opgeslagen in je browser (niet gedeeld tussen
  apparaten).

**Landingsmap voor nieuwe banken** wordt sinds kort automatisch bepaald
(je hoeft zelf geen mappad meer te verzinnen) — dat voorkomt typefouten en
zorgt dat elke bank gegarandeerd zijn eigen, unieke map krijgt.

**Geüploade bestanden verwijderen.** Heb je per ongeluk het verkeerde
bestand geüpload? Via het upload-menu ("Geüploade bestanden beheren") kun
je een bestand weer verwijderen. Dat doet drie dingen tegelijk: het bestand
gaat van schijf af, de bijbehorende ruwe data wordt uit de pipeline
verwijderd, en de pipeline wordt gedwongen volledig opnieuw doorgerekend —
zodat de foutieve data ook echt nergens (categorieën, totalen, banksaldo)
blijft hangen.

---

## Terugkerende technische trucs

Een paar ideeën die op meerdere plekken in het platform terugkomen, dus
handig om één keer te snappen:

**"Nooit importeer/beweer twee keer hetzelfde".** Of het nu gaat om een
dubbel geüpload CSV-bestand (herkend aan een hash van de inhoud) of dubbele
regels binnen één bestand (herkend aan een hash van de regel-inhoud) — het
platform is zo gebouwd dat je gerust twee keer hetzelfde bestand kunt
uploaden zonder dat er iets dubbel telt.

**Handmatige keuzes overleven een herberekening.** Categoriseer je een
transactie zelf, geef je een abonnement een logo, of splits je een
verzamelfactuur — die keuzes worden apart vastgelegd en blijven na een
volledige pipeline-herberekening (bijvoorbeeld na een configuratiewijziging)
gewoon staan. De automatische logica overschrijft nooit een bewuste,
handmatige keuze.

**Een rekening "van jou" herkennen zonder dat je het hoeft aan te geven.**
Op een paar plekken (bijvoorbeeld "eigen rekeningen verbergen" bij
Uitgaven) moet het platform weten welke rekeningnummers van jou zijn. In
plaats van dat apart te laten instellen, geldt: elke rekening die ooit als
afzendende rekening in een import is gezien, is per definitie van jou.

**Meerdere locaties/portefeuilles worden nooit stiekem samengevoegd.** Bij
Vastgoed (meerdere panden), Beleggingen (meerdere portefeuilles) en Cash
(meerdere locaties) geldt steeds: op de module-pagina zelf zie je altijd
precies één locatie/portefeuille tegelijk (met een schakelaar erboven om te
wisselen) — nooit een opgeteld totaal dat per ongeluk de indruk geeft dat
het over één ding gaat. Alleen op de Vermogen-pagina, waar het uitdrukkelijk
om een totaal gaat, worden ze wél samengeteld.
