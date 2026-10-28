// =====================================================================
//  DA CAMBIARE: tutto quello che c'e' qui sotto finisce sul sito.
//  Cambia nome, prezzi, foto o prodotti qui e il sito si aggiorna da solo.
// =====================================================================
const NEGOZIO = {
  nome: "Print3DLab",
  email: ["leo2013.caroccia@gmail.com", "leon.laszuk@gmail.com"], // la prima e' quella principale
  youtube: "",            // link del canale, es. "https://www.youtube.com/@nomecanale"
  fotoDiEsempio: true,    // metti false quando nel catalogo ci sono le foto dei VOSTRI oggetti
  secondiPerFoto: 4,      // ogni quanti secondi cambia la foto grande nella home

  // ---- Supabase (facoltativo): file 3D fino a 50 MB e conteggio delle visite ----
  // Incolla "Project URL" e "Publishable key" (oppure la vecchia "anon public") da Supabase: Project Settings > API Keys.
  // Prima esegui supabase-installazione.sql nel SQL Editor di Supabase. Se restano vuoti, il sito funziona come prima.
  // La chiave "secret" / "service_role" NON va MAI qui: questo file lo puo' leggere chiunque.
  supabase: { url: "https://psnfyxwlpasawkcxrzpe.supabase.co", chiave: "sb_publishable_xXLOvdKD6vJjFlQGQ1IwVA_LM21sOmX", cartellaFile: "file-clienti", maxMB: 50 },

  // ---- email quando arriva un ordine, un file o un messaggio (gratis, con Google Apps Script) ----
  // Incolla qui l'indirizzo della "App web" di Google Apps Script (finisce con /exec). Vuoto = niente email.
  avvisiEmail: "https://script.google.com/macros/s/AKfycby_VlbOZmnlM6etJGYq5FZWasllfm1StIWZtSEwTttWiV4vSSHyntZbrzH-TZacCZfJxg/exec",

  // chi risponde per il negozio (Impressum). Siete minorenni: qui vanno i dati di un genitore.
  responsabile: { nome: "", indirizzo: "", localita: "" },

  // ---- spedizione e pagamento (prezzi La Posta 2026, pacchi fino a 2 kg) ----
  spedizioni: [
    { id: "economy", nome: "PostPac Economy", info: "La Posta · 2-3 giorni lavorativi", prezzo: 9.00 },
    { id: "priority", nome: "PostPac Priority", info: "La Posta · il giorno lavorativo dopo", prezzo: 10.50 },
  ],
  spedizioneGratisDa: 80, // da questa spesa la posta la paghiamo noi (0 = mai gratis)
  pagamenti: [
    { id: "twint", nome: "Twint", info: "Ti mandiamo la richiesta di pagamento con la conferma" },
    { id: "paypal", nome: "PayPal", info: "Ti mandiamo il link PayPal con la conferma" },
    { id: "carta", nome: "Carta di credito o debito", info: "Visa o Mastercard: ti mandiamo un link di pagamento sicuro. La carta non la scrivi mai sul nostro sito" },
  ],

  // ---- la home: foto grandi a tutto schermo che cambiano da sole (cartella vetrina/) ----
  // per ogni foto servono 3 file: nome.jpg, nome-telefono.jpg e nome-sfondo.jpg (sfocata)
  // prodotto: il modello che si apre con "Acquista ora" (es. "natale-babbo"), oppure una sezione intera (es. "natale")
  // bottone / link: il bottone principale al posto di "Acquista ora"
  // altro: il secondo bottone (se manca: "Vedi tutti" che porta alla sezione del modello)
  // inquadra / inquadraTelefono: quale parte della foto tenere visibile ("50% 60%" = centro, un po' in basso)
  vetrina: [
    { foto: "1-nido-ape", etichetta: "Il più bello", nome: "Portaoggetti a nido d'ape", sotto: "Per la scrivania, il bagno o le piante grasse.", prodotto: "portapenne-nido", alt: "Cestino a nido d'ape color rame appena stampato su una Bambu Lab" },
    { foto: "6-carica", etichetta: "Hai già un file 3D?", nome: "Carica il tuo file", sotto: "Vedi il modello in 3D e il prezzo in un secondo.", bottone: "Carica file", link: "#carica", altro: { testo: "Come funziona", link: "#come" }, inquadra: "0% 50%", inquadraTelefono: "62% 50%", alt: "Modellino di una casa stampato in 3D tenuto in mano" },
    { foto: "2-babbo-natale", etichetta: "Natale 2026", nome: "Babbo Natale da appendere", sotto: "Per l'albero, anche con il nome di chi lo riceve.", prodotto: "natale-babbo", inquadra: "50% 55%", alt: "Decorazione di Babbo Natale stampata in 3D sul piatto di una Bambu Lab" },
    { foto: "3-scritta", etichetta: "Personalizzato", nome: "Scritte con il tuo nome", sotto: "Portachiavi, targhette e scritte. Scegli tu il colore.", prodotto: "portachiavi-nome", altro: { testo: "Provalo adesso", link: "#prova" }, alt: "Scritta verde e nera stampata in 3D su una Bambu Lab" },
    { foto: "4-pupazzi", etichetta: "Natale 2026", nome: "Pupazzi di neve", sotto: "Decorazioni per l'albero, bianche e rosse.", prodotto: "natale-pupazzo", inquadra: "50% 58%", alt: "Due decorazioni natalizie bianche e rosse appena stampate" },
    { foto: "5-regalo", etichetta: "Idea regalo", nome: "Pacchetti regalo in miniatura", sotto: "Da mettere sotto l'albero o sopra il pacco vero.", prodotto: "mini-regalo", inquadra: "50% 58%", alt: "Piccolo pacchetto regalo stampato in 3D sul piatto della stampante" },
  ],

  // ---- il negozio: SEZIONI, e dentro ogni sezione i MODELLI ----
  // Sezione: id (senza spazi), nome, foto (cartella foto/), testo, segno (etichetta facoltativa).
  //   Le opzioni scritte nella sezione valgono per tutti i suoi modelli:
  //   misure: grandezze, "piu" = quanto costa in piu' della misura piu' piccola
  //   scritta: il testo sopra la casella per il nome. maxScritta: quante lettere. scrittaObbligatoria: true se serve per forza.
  // Modello: id (diverso da tutti gli altri!), nome, prezzo (franchi per un pezzo), testo, dettagli.
  //   foto: file in foto/ (meglio quadrata o 4:5). Se manca si vede "Foto in arrivo".
  //   autore / link: chi ha disegnato il modello e la pagina (es. MakerWorld). Si vedono piccoli sotto il modello.
  //   Un modello puo' cambiare le opzioni della sezione: misure: false (niente misure), scritta: false (niente nome)...
  //   ATTENZIONE: per vendere un modello di un altro serve una licenza che permetta l'uso commerciale.
  sezioni: [
    { id: "portapenne", nome: "Portapenne", foto: "portaoggetti.jpg", segno: "Il più bello",
      testo: "Per tenere in ordine penne, matite e pennarelli sulla scrivania.",
      misure: [ { nome: "Piccolo · 8 cm", piu: 0 }, { nome: "Medio · 11 cm", piu: 4 }, { nome: "Grande · 14 cm", piu: 9 } ],
      modelli: [
        { id: "portapenne-nido", nome: "Portapenne a nido d'ape", prezzo: 15, foto: "portaoggetti.jpg", testo: "Pareti traforate a esagoni: leggero ma resistente." },
        { id: "portapenne-esagono", nome: "Portapenne esagonale", prezzo: 14, testo: "Tre scomparti di altezze diverse." },
        { id: "portapenne-spirale", nome: "Portapenne a spirale", prezzo: 16, testo: "Le pareti girano piano piano verso l'alto." },
        { id: "portapenne-organizer", nome: "Organizer da scrivania", prezzo: 22, testo: "Penne, forbici, post-it e un posto per il telefono.", misure: false, dettagli: "Circa 20 × 10 × 10 cm" },
        { id: "portapenne-gatto", nome: "Portapenne gatto", prezzo: 18, testo: "Un gatto seduto con le penne al posto della coda." },
        { id: "portapenne-mattoncini", nome: "Portapenne a mattoncini", prezzo: 13, testo: "Sembra costruito con i mattoncini." },
      ] },
    { id: "scritte", nome: "Nomi e portachiavi", foto: "scritte.jpg", segno: "Il più richiesto",
      testo: "Portachiavi, targhette e scritte con il nome che vuoi.",
      scritta: "Nome o scritta", maxScritta: 12, scrittaObbligatoria: true,
      modelli: [
        { id: "portachiavi-nome", nome: "Portachiavi con nome", prezzo: 6, foto: "scritte.jpg", testo: "Il tuo nome con l'anello per le chiavi.", dettagli: "Circa 7 × 3 cm, spessore 4 mm" },
        { id: "targhetta-porta", nome: "Targhetta per la porta", prezzo: 14, testo: "Per la porta della cameretta, con i fori per appenderla.", maxScritta: 16 },
        { id: "nome-scrivania", nome: "Nome da scrivania", prezzo: 10, testo: "Le lettere stanno in piedi su una base." },
        { id: "portachiavi-due-colori", nome: "Portachiavi a due colori", prezzo: 8, testo: "Scritta e base di due colori diversi.", dettagli: "Il secondo colore lo scegli nelle note dell'ordine" },
        { id: "segnalibro-nome", nome: "Segnalibro con nome", prezzo: 7, testo: "Sottile e flessibile, con il nome in rilievo." },
        { id: "etichetta-zaino", nome: "Etichetta per lo zaino", prezzo: 9, testo: "Da attaccare allo zaino o alla borsa della palestra." },
      ] },
    { id: "natale", nome: "Decorazioni di Natale", foto: "natale.jpg", segno: "Novità",
      testo: "Per l'albero e per la tavola. Anche con i nomi di famiglia.",
      scritta: "Nome da scrivere (facoltativo)", maxScritta: 14,
      modelli: [
        { id: "natale-babbo", nome: "Babbo Natale da appendere", prezzo: 10, foto: "natale.jpg", testo: "Con il filo per appenderlo all'albero.", dettagli: "Circa 8 cm" },
        { id: "natale-pupazzo", nome: "Pupazzo di neve", prezzo: 9, foto: "natale-pupazzo.jpg", testo: "Bianco e rosso, con la sciarpa." },
        { id: "natale-pallina", nome: "Pallina con nome", prezzo: 8, testo: "Una pallina per ogni persona della famiglia." },
        { id: "natale-stella", nome: "Stella per l'albero", prezzo: 15, testo: "Da mettere in cima all'albero.", scritta: false },
        { id: "natale-segnaposto", nome: "Segnaposto per il pranzo", prezzo: 5, testo: "Il nome di ogni invitato sul suo posto.", scritta: "Nome dell'invitato", scrittaObbligatoria: true },
        { id: "natale-fiocco", nome: "Fiocco di neve traforato", prezzo: 6, testo: "Leggero, da appendere all'albero o alla finestra.", scritta: false },
      ] },
    { id: "porta-cellulare", nome: "Porta cellulare", foto: "porta-cellulare.jpg", inquadra: "28% 50%",
      testo: "Tengono il telefono in piedi. Vanno bene per quasi tutti i telefoni, anche con la cover.",
      modelli: [
        { id: "cellulare-semplice", nome: "Supporto semplice", prezzo: 12, foto: "porta-cellulare.jpg", inquadra: "28% 50%", testo: "Il classico: stabile e pulito.", dettagli: "Per telefoni fino a 12 mm con la cover" },
        { id: "cellulare-inclinabile", nome: "Supporto inclinabile", prezzo: 16, testo: "Scegli tu l'inclinazione, da 30 a 75 gradi." },
        { id: "cellulare-portapenne", nome: "Supporto con portapenne", prezzo: 18, testo: "Telefono davanti, penne dietro." },
        { id: "cellulare-pieghevole", nome: "Supporto pieghevole", prezzo: 14, testo: "Si chiude e sta in tasca." },
        { id: "cellulare-cane", nome: "Supporto cane", prezzo: 15, testo: "Un cane sdraiato che tiene il telefono." },
        { id: "cellulare-comodino", nome: "Supporto da comodino", prezzo: 13, testo: "Con il buco per il cavo del caricatore." },
      ] },
    { id: "statuine", nome: "Statuine personalizzate", foto: "statuine.jpg",
      testo: "Piccole figure fatte per te. Dopo l'ordine ti chiediamo le foto.",
      scritta: "Chi vuoi nella statuina? (es. il mio cane Rex)", maxScritta: 40,
      modelli: [
        { id: "statuina-animale", nome: "Il tuo animale", prezzo: 25, foto: "statuine.jpg", testo: "Il tuo cane, gatto o coniglio in miniatura.", dettagli: "Circa 10 cm" },
        { id: "statuina-calciatore", nome: "Calciatore con la tua maglia", prezzo: 28, testo: "Con il numero e i colori della tua squadra." },
        { id: "statuina-famiglia", nome: "Statuina di famiglia", prezzo: 35, testo: "Fino a 4 persone sulla stessa base." },
        { id: "statuina-busto", nome: "Busto da una foto", prezzo: 30, testo: "Testa e spalle, come una piccola scultura." },
        { id: "statuina-cartone", nome: "Te in versione cartone", prezzo: 22, testo: "Testa grande e corpo piccolo, stile cartone animato." },
        { id: "statuina-trofeo", nome: "Trofeo con nome", prezzo: 18, testo: "Per il torneo, la gara o il compleanno.", scritta: "Nome e scritta del trofeo" },
      ] },
    { id: "miniature", nome: "Miniature e modellini", foto: "miniatura.jpg",
      testo: "Oggetti piccoli pieni di dettagli. Alcuni si muovono!",
      misure: [ { nome: "Mini · 4 cm", piu: 0 }, { nome: "Media · 7 cm", piu: 4 } ],
      modelli: [
        { id: "mini-regalo", nome: "Pacchetto regalo", prezzo: 8, foto: "miniatura.jpg", testo: "Da mettere sotto l'albero o sopra il pacco vero." },
        { id: "mini-casetta", nome: "Casetta di montagna", prezzo: 10, testo: "Con il tetto spiovente e le finestre." },
        { id: "mini-tenda", nome: "Tenda da campeggio", prezzo: 8, testo: "Per chi ama dormire in montagna." },
        { id: "mini-stampante", nome: "Stampante 3D in miniatura", prezzo: 12, testo: "Una piccola stampante 3D, con il piatto e la testina." },
        { id: "mini-drago", nome: "Drago snodato", prezzo: 14, testo: "Esce già montato e si muove tutto.", misure: [ { nome: "Medio · 15 cm", piu: 0 }, { nome: "Grande · 30 cm", piu: 10 } ] },
        { id: "mini-polpo", nome: "Polpo snodato", prezzo: 9, testo: "Tentacoli che si muovono, da tenere in mano." },
      ] },
  ],

  colori: [
    { nome: "Arancio", hex: "#ff5b1f" },
    { nome: "Blu", hex: "#2f6bff" },
    { nome: "Verde", hex: "#18a865" },
    { nome: "Rosa", hex: "#ff5fa8" },
    { nome: "Giallo", hex: "#ffc61a", chiaro: true },
    { nome: "Viola", hex: "#8a5cff" },
    { nome: "Nero", hex: "#2a2724" },
    { nome: "Bianco", hex: "#f4f1ea", chiaro: true },
  ],

  // ---- il calcolatore per i file caricati ----
  stampa: {
    piatto: 256,             // mm, il piatto della Bambu Lab
    preparazione: 3,         // CHF fissi per ogni richiesta (controllo del file, piatto, pulizia)
    prezzoGrammo: 0.06,      // CHF per grammo di PLA
    prezzoOra: 1.5,          // CHF per ogni ora di stampa
    minimo: 5,               // CHF, il prezzo piu' basso
    scontoDa: 5, sconto: 0.10, // da 5 pezzi uguali, 10% in meno sui pezzi
    materiali: [
      { id: "PLA", nome: "PLA", info: "Il più usato: rigido, preciso, tanti colori.", densita: 1.24, fattore: 1, velocita: 1 },
      { id: "PETG", nome: "PETG", info: "Più resistente al caldo e all'acqua. Ottimo per pezzi da usare fuori.", densita: 1.27, fattore: 1.25, velocita: 0.85 },
      { id: "TPU", nome: "TPU", info: "Morbido e flessibile come la gomma. Per cover, piedini e guarnizioni.", densita: 1.21, fattore: 1.6, velocita: 0.45 },
    ],
    qualita: [
      { id: "bozza", nome: "Bozza", info: "0,28 mm", grammiOra: 28 },
      { id: "normale", nome: "Normale", info: "0,20 mm", grammiOra: 18 },
      { id: "fine", nome: "Fine", info: "0,12 mm", grammiOra: 10 },
    ],
    riempimento: [
      { id: "15", nome: "Leggero", info: "15%", valore: 0.15 },
      { id: "30", nome: "Robusto", info: "30%", valore: 0.30 },
      { id: "60", nome: "Molto robusto", info: "60%", valore: 0.60 },
    ],
  },
};
// =====================================================================

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const movimentoRidotto = matchMedia("(prefers-reduced-motion: reduce)");
const chf = n => "CHF " + n.toFixed(2);
const pad2 = x => String(x).padStart(2, "0");
const emailPrincipale = () => NEGOZIO.email[0];
// tutte le email come link: "a@x.ch o b@x.ch"
const linkEmail = () => NEGOZIO.email.map(e => `<a href="mailto:${e}">${e}</a>`).join(" o ");
const sezioneDa = id => NEGOZIO.sezioni.find(s => s.id === id);
// un modello con le opzioni della sua sezione (se il modello ne ha di sue, valgono quelle)
function prodottoDa(id){
  for(const s of NEGOZIO.sezioni){
    const m = s.modelli.find(x => x.id === id);
    if(!m) continue;
    const { modelli, id: _id, nome, foto, testo, segno, inquadra, ...opzioni } = s;
    return { ...opzioni, ...m, sezione: s };
  }
  return null;
}
const prezzoMinimo = s => Math.min(...s.modelli.map(m => m.prezzo));
// per scrivere testi dentro l'HTML senza rompere niente
const sicuro = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// mescola un colore con il nero (q = quanto scurire, da 0 a 1)
function scurisci(hex, q){
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * (1 - q) + 20 * q));
  return "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
}

// pallini dei colori (servono nel negozio e nel calcolatore)
function creaPallini(contenitore, scelto, quandoCambia){
  contenitore.setAttribute("role", "radiogroup");
  contenitore.setAttribute("aria-label", "Colore");
  contenitore.innerHTML = NEGOZIO.colori.map((c, i) => `
    <button type="button" role="radio" aria-checked="${i === scelto}" aria-label="${c.nome}" title="${c.nome}" style="--s:${c.hex}" data-i="${i}"></button>`).join("");
  contenitore.onclick = e => {
    const b = e.target.closest("button"); if(!b) return;
    $$("button", contenitore).forEach(x => x.setAttribute("aria-checked", x === b));
    quandoCambia(NEGOZIO.colori[+b.dataset.i]);
  };
}

// contatore - 1 +
function avviaContatore(box, quandoCambia){
  const input = $("input", box);
  const limita = () => {
    const min = +input.min || 1, max = +input.max || 99;
    input.value = Math.min(max, Math.max(min, parseInt(input.value) || min));
    quandoCambia && quandoCambia(+input.value);
  };
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-piu]"); if(!b) return;
    input.value = (parseInt(input.value) || 1) + +b.dataset.piu;
    limita();
  });
  input.addEventListener("change", limita);
  input.addEventListener("input", () => { if(input.value) quandoCambia && quandoCambia(Math.max(1, parseInt(input.value) || 1)); });
}

// ---- testi presi da NEGOZIO ----
function riempiCampi(){
  $$("[data-campo]").forEach(el => { if(NEGOZIO[el.dataset.campo]) el.textContent = NEGOZIO[el.dataset.campo]; });
  $$("[data-campo-href]").forEach(el => {
    const chiave = el.dataset.campoHref;
    if(NEGOZIO[chiave]) el.href = NEGOZIO[chiave];
    else el.remove();
  });
  $$("[data-email-lista]").forEach(ul => {
    ul.innerHTML = NEGOZIO.email.map(e => `<li><a href="mailto:${e}">${e}</a></li>`).join("");
  });
  $$("[data-email-tutte]").forEach(el => { el.innerHTML = linkEmail(); });
  const scritte = prodottoDa("portachiavi-nome");
  if(scritte) $("[data-prezzo-portachiavi]").textContent = chf(scritte.prezzo);
  const gratis = NEGOZIO.spedizioneGratisDa;
  $$("[data-spedizione-gratis]").forEach(el => { el.textContent = gratis ? `Da ${chf(gratis)} di spesa` : "Prezzi La Posta"; });

  // impressum
  const r = NEGOZIO.responsabile;
  const mancano = !r.nome || !r.indirizzo;
  $("[data-impressum]").innerHTML = `
    <div><dt>Negozio</dt><dd>${sicuro(NEGOZIO.nome)}, stampa 3D nel Locarnese</dd></div>
    <div><dt>Responsabile</dt><dd>${mancano ? '<span class="da-completare">Da completare con nome e indirizzo di un genitore</span>' : `${sicuro(r.nome)}<br>${sicuro(r.indirizzo)}<br>${sicuro(r.localita)}`}</dd></div>
    <div><dt>Email</dt><dd>${linkEmail()}</dd></div>
    <div><dt>IVA</dt><dd>Non iscritti al registro IVA</dd></div>`;
}

// =====================================================================
//  IL PORTACHIAVI DA PROVARE
// =====================================================================
const prova = { colore: NEGOZIO.colori[0], timer: 0 };

function disegnaPortachiavi(){
  const svg = $(".portachiavi");
  const nome = $("#prova-nome").value.trim() || "Nome";
  const lettere = $(".pc-lettere", svg), ombra = $(".pc-lettere-ombra", svg);
  lettere.textContent = ombra.textContent = nome;

  const x0 = 46, y0 = 58, h = 136, r = 38;
  const lungo = lettere.getComputedTextLength();
  const W = Math.max(230, 104 + lungo + 46);
  const hx = x0 + 54, hy = y0 + h / 2, hr = 17;
  const forma =
    `M${x0 + r} ${y0}H${x0 + W - r}A${r} ${r} 0 0 1 ${x0 + W} ${y0 + r}V${y0 + h - r}A${r} ${r} 0 0 1 ${x0 + W - r} ${y0 + h}` +
    `H${x0 + r}A${r} ${r} 0 0 1 ${x0} ${y0 + h - r}V${y0 + r}A${r} ${r} 0 0 1 ${x0 + r} ${y0}Z` +
    `M${hx + hr} ${hy}A${hr} ${hr} 0 1 0 ${hx - hr} ${hy}A${hr} ${hr} 0 1 0 ${hx + hr} ${hy}Z`;
  ["pc-base", "pc-spessore", "pc-righe"].forEach(c => $("." + c, svg).setAttribute("d", forma));
  $(".pc-spessore", svg).setAttribute("transform", "translate(9 11)");
  $(".pc-anello circle", svg).setAttribute("transform", `translate(${hx - 34} ${hy - 34})`);

  const tx = x0 + 102, ty = y0 + h / 2 + 31;
  lettere.setAttribute("x", tx); lettere.setAttribute("y", ty);
  ombra.setAttribute("x", tx + 4); ombra.setAttribute("y", ty + 5);
  svg.setAttribute("viewBox", `0 0 ${x0 + W + 34} 250`);

  const c = prova.colore;
  svg.style.setProperty("--base", c.hex);
  svg.style.setProperty("--spessore", scurisci(c.hex, c.chiaro ? 0.22 : 0.38));
  svg.style.setProperty("--lettere", c.chiaro ? "#2a2724" : "#fffaf1");
  svg.style.setProperty("--lettere-ombra", c.chiaro ? scurisci(c.hex, 0.35) : scurisci(c.hex, 0.55));
  $("[data-nome-colore]").textContent = c.nome;

  // 136 unita' = 3 cm di altezza
  $("[data-misura]").textContent = (W / h * 3).toFixed(1).replace(".", ",") + " cm";
}

function ristampa(){
  const svg = $(".portachiavi");
  if(movimentoRidotto.matches) return;
  svg.classList.remove("ristampa");
  void svg.getBoundingClientRect();
  svg.classList.add("ristampa");
}

function avviaProva(){
  creaPallini($(".prova-colori"), 0, c => { prova.colore = c; disegnaPortachiavi(); ristampa(); });
  $("#prova-nome").addEventListener("input", () => {
    disegnaPortachiavi();
    clearTimeout(prova.timer);
    prova.timer = setTimeout(ristampa, 450);
  });
  $("#prova-ordina").addEventListener("click", () => {
    const nome = $("#prova-nome").value.trim();
    if(!nome){ $("#prova-nome").focus(); return; }
    const p = prodottoDa("portachiavi-nome");
    aggiungiAlCarrello({ id: p.id, nome: p.nome, foto: p.foto || p.sezione.foto, prezzo: p.prezzo, colore: prova.colore.nome, scritta: nome, quantita: 1 });
  });
  disegnaPortachiavi();
  // la larghezza del nome cambia quando arriva il carattere vero
  if(document.fonts) document.fonts.ready.then(disegnaPortachiavi);
}

// =====================================================================
//  VETRINA: le foto grandi nella home, che cambiano da sole
// =====================================================================
const vetrina = { el: null, slide: [], barre: [], attuale: 0, timer: 0, visibile: true, turno: 0, inizioTocco: null };

function creaVetrina(){
  vetrina.el = $("#vetrina");
  const contenitore = $("#vetrina-immagini");
  if(!vetrina.el || !contenitore) return;
  contenitore.innerHTML = NEGOZIO.vetrina.map((v, i) => {
    const p = v.prodotto && prodottoDa(v.prodotto);
    const sez = !p && v.prodotto && sezioneDa(v.prodotto);
    const altro = v.altro || (p ? { testo: "Vedi tutti", link: "#sezione/" + p.sezione.id } : { testo: "Scopri di più", link: "#prodotti" });
    const prezzo = p ? p.prezzo : sez ? prezzoMinimo(sez) : 0;
    const principale = v.link
      ? `<a class="bottone-quadro" href="${v.link}">${v.bottone || "Scopri"}</a>`
      : sez ? `<a class="bottone-quadro" href="#sezione/${sez.id}">${v.bottone || "Acquista ora"}</a>`
      : `<button class="bottone-quadro" type="button" data-apri-prodotto="${v.prodotto}">${v.bottone || "Acquista ora"}</button>`;
    return `
    <figure class="vetrina-slide${i === 0 ? " attiva primo" : ""}" role="group" aria-roledescription="foto" aria-label="${i + 1} di ${NEGOZIO.vetrina.length}"${i ? ' aria-hidden="true"' : ""}>
      <div class="vs-dentro">
        <img class="vs-sfondo" src="vetrina/${v.foto}-sfondo.jpg" alt=""${i ? ' loading="lazy"' : ""} decoding="async">
        <picture class="vs-foto">
          <source media="(max-width: 860px)" srcset="vetrina/${v.foto}-telefono.jpg">
          <img src="vetrina/${v.foto}.jpg" alt="${v.alt}" style="--inquadra:${v.inquadra || "50% 50%"};--inquadra-tel:${v.inquadraTelefono || v.inquadra || "50% 50%"}"${i ? ' loading="lazy"' : ' fetchpriority="high"'} decoding="async">
        </picture>
        <figcaption class="vs-testo">
          <p class="vs-etichetta">${v.etichetta || ""}</p>
          <h2 class="vs-titolo">${v.nome}</h2>
          <p class="vs-sotto">${v.sotto || ""}${prezzo ? ` <span class="vs-prezzo">da ${chf(prezzo)}</span>` : ""}</p>
          <div class="vs-azioni">
            ${principale}
            <a class="bottone-quadro bottone-quadro-vuoto" href="${altro.link}">${altro.testo}</a>
          </div>
        </figcaption>
      </div>
    </figure>`;
  }).join("");
  vetrina.slide = $$(".vetrina-slide", contenitore);
  vetrina.el.style.setProperty("--durata", NEGOZIO.secondiPerFoto + "s");

  const barre = $(".vetrina-barre", vetrina.el);
  barre.innerHTML = NEGOZIO.vetrina.map((v, i) => `
    <button type="button" role="tab" aria-selected="${i === 0}" aria-label="Foto ${i + 1}: ${v.nome}" data-i="${i}"><i></i></button>`).join("");
  vetrina.barre = $$("button", barre);
  barre.addEventListener("click", e => { const b = e.target.closest("button"); if(b) mostraFoto(+b.dataset.i); });
  $$(".freccia", vetrina.el).forEach(b => b.addEventListener("click", () => mostraFoto(vetrina.attuale + +b.dataset.vai)));

  // scorrere col dito sul telefono
  contenitore.addEventListener("pointerdown", e => { vetrina.inizioTocco = { x: e.clientX, y: e.clientY }; });
  contenitore.addEventListener("pointerup", e => {
    if(!vetrina.inizioTocco) return;
    const dx = e.clientX - vetrina.inizioTocco.x, dy = e.clientY - vetrina.inizioTocco.y;
    vetrina.inizioTocco = null;
    if(Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) mostraFoto(vetrina.attuale + (dx < 0 ? 1 : -1));
  });
  // le altre foto si scaricano quando la prima e' gia' a schermo
  addEventListener("load", () => $$("img", contenitore).forEach(img => { img.loading = "eager"; }));

  document.addEventListener("visibilitychange", programma);
  aggiornaNumero();
  programma();
}

function programma(){
  clearTimeout(vetrina.timer);
  const gira = vetrina.visibile && !document.hidden && !movimentoRidotto.matches && !document.body.classList.contains("menu-aperto") && !document.querySelector("dialog[open]");
  vetrina.el.classList.toggle("in-giro", gira);
  if(gira) vetrina.timer = setTimeout(() => mostraFoto(vetrina.attuale + 1), NEGOZIO.secondiPerFoto * 1000);
}

function mostraFoto(i){
  const n = vetrina.slide.length;
  i = (i + n) % n;
  if(i === vetrina.attuale){ programma(); return; }
  clearTimeout(vetrina.timer);
  const turno = ++vetrina.turno;
  const nuova = vetrina.slide[i];
  // prima la foto deve essere pronta (decodificata): cosi' l'animazione non scatta
  const img = $(".vs-foto img", nuova);
  img.loading = "eager";
  const pronta = img.decode ? img.decode().catch(() => {}) : Promise.resolve();
  const attesa = new Promise(r => setTimeout(r, 1200)); // non aspettare all'infinito
  Promise.race([pronta, attesa]).then(() => {
    if(turno !== vetrina.turno) return;
    const vecchia = vetrina.slide[vetrina.attuale];
    vetrina.slide.forEach(s => { if(s !== vecchia) s.classList.remove("esce"); s.classList.remove("primo"); });
    vecchia.classList.remove("attiva"); vecchia.classList.add("esce"); vecchia.setAttribute("aria-hidden", "true");
    nuova.classList.remove("attiva"); void nuova.offsetWidth;
    nuova.classList.add("attiva"); nuova.removeAttribute("aria-hidden");
    vetrina.attuale = i;
    vetrina.barre.forEach((b, k) => {
      b.setAttribute("aria-selected", k === i);
      b.classList.toggle("fatta", k < i);
    });
    const barra = vetrina.barre[i]; barra.classList.remove("corre"); void barra.offsetWidth; barra.classList.add("corre");
    aggiornaNumero();
    programma();
  });
}

function aggiornaNumero(){
  $("[data-vd-numero]", vetrina.el).textContent = `${pad2(vetrina.attuale + 1)} / ${pad2(NEGOZIO.vetrina.length)}`;
  if(vetrina.attuale === 0) vetrina.barre[0].classList.add("corre");
}

// =====================================================================
//  MENU A HAMBURGER
// =====================================================================
function avviaMenu(){
  const bottone = $(".hamburger"), menu = $("#menu");
  let ultimoFocus = null;
  const apri = () => {
    ultimoFocus = document.activeElement;
    menu.hidden = false;
    void menu.offsetWidth;
    document.body.classList.add("menu-aperto");
    bottone.setAttribute("aria-expanded", "true");
    bottone.setAttribute("aria-label", "Chiudi il menu");
    $(".hamburger-testo", bottone).textContent = "Chiudi";
    $("a", menu).focus({ preventScroll: true });
    programma();
  };
  const chiudi = (rimettiFocus = true) => {
    document.body.classList.remove("menu-aperto");
    bottone.setAttribute("aria-expanded", "false");
    bottone.setAttribute("aria-label", "Apri il menu");
    $(".hamburger-testo", bottone).textContent = "Menu";
    setTimeout(() => { if(!document.body.classList.contains("menu-aperto")) menu.hidden = true; }, movimentoRidotto.matches ? 0 : 500);
    if(rimettiFocus && ultimoFocus) ultimoFocus.focus({ preventScroll: true });
    programma();
  };
  bottone.addEventListener("click", () => document.body.classList.contains("menu-aperto") ? chiudi() : apri());
  menu.addEventListener("click", e => { if(e.target.closest("a")) chiudi(false); });
  document.addEventListener("keydown", e => {
    if(!document.body.classList.contains("menu-aperto")) return;
    if(e.key === "Escape") chiudi();
    // il tasto Tab resta dentro il menu
    if(e.key === "Tab"){
      const focabili = [bottone, ...$$("a, button", menu)];
      const primo = focabili[0], ultimo = focabili[focabili.length - 1];
      if(e.shiftKey && document.activeElement === primo){ e.preventDefault(); ultimo.focus(); }
      else if(!e.shiftKey && document.activeElement === ultimo){ e.preventDefault(); primo.focus(); }
    }
  });
}

// =====================================================================
//  PAGINE: la home e' ferma, le altre sezioni si aprono dal menu
// =====================================================================
const pagine = { attuale: "home", sotto: "", quandoCambia: [] };

function avviaPagine(){
  const sezioni = $$("[data-pagina]");
  const voci = $$("#menu .menu-voci a");
  const giro = $("[data-giro]");
  const titoloBase = document.title;
  // l'ordine delle pagine e' quello del menu
  const elenco = voci.map(a => ({ id: a.hash.slice(1), nome: a.lastChild.textContent.trim() }))
                     .filter(p => p.id !== "inizio");

  const vai = primaVolta => {
    // "#sezione/portapenne": la pagina e' "sezione", "portapenne" e' quale
    const [hash, sotto = ""] = decodeURIComponent(location.hash.slice(1)).split("/");
    pagine.sotto = sotto;
    const bersaglio = hash ? document.getElementById(hash) : null;
    const contenitore = bersaglio ? bersaglio.closest("[data-pagina]") : null;
    const pagina = contenitore ? contenitore.dataset.pagina : "home";
    const casa = pagina === "home";
    pagine.attuale = pagina;

    $$("dialog[open]").forEach(d => d.close());
    sezioni.forEach(el => el.classList.toggle("pagina-attiva", el.dataset.pagina === pagina));
    document.documentElement.classList.toggle("in-home", casa);
    $$("#menu .menu-voci a, .testata-nav a").forEach(a => {
      const qui = casa ? a.hash === "#inizio" : a.hash === "#" + (pagina === "sezione" ? "prodotti" : pagina);
      if(qui) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    const voce = elenco.find(p => p.id === pagina);
    const titolo = voce ? voce.nome : !casa && ($("h2", bersaglio || contenitore) || {}).textContent;
    document.title = casa ? titoloBase : `${titolo} · ${NEGOZIO.nome}`;

    // in fondo: pagina prima e pagina dopo
    const i = elenco.findIndex(p => p.id === pagina);
    if(!casa && i >= 0){
      const prima = i > 0 ? elenco[i - 1] : { id: "inizio", nome: "Home" };
      const dopo = elenco[i + 1];
      giro.innerHTML = `
        <a class="giro-link giro-indietro" href="#${prima.id}"><span>&larr; Indietro</span><b>${prima.nome}</b></a>
        ${dopo ? `<a class="giro-link giro-avanti" href="#${dopo.id}"><span>Avanti · ${pad2(i + 2)} &rarr;</span><b>${dopo.nome}</b></a>` : ""}`;
    } else giro.innerHTML = "";

    // la vetrina gira solo quando sei nella home
    vetrina.visibile = casa;
    programma();
    pagine.quandoCambia.forEach(f => f(pagina));

    if(bersaglio && contenitore && bersaglio !== contenitore && !casa && bersaglio.closest(".legale-testi")) bersaglio.scrollIntoView({ behavior: "instant" });
    else scrollTo({ top: 0, behavior: "instant" });
    // chi usa la tastiera o il lettore di schermo parte dal titolo della pagina nuova
    if(!primaVolta && !casa){
      const t = $("h2", bersaglio && bersaglio !== contenitore ? bersaglio : contenitore);
      if(t){ t.tabIndex = -1; t.focus({ preventScroll: true }); }
    }
  };
  addEventListener("hashchange", () => vai(false));
  // se clicchi la pagina in cui sei gia', torni in cima
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href^="#"]');
    if(a && a.hash && a.hash === location.hash){
      const t = document.getElementById(a.hash.slice(1));
      if(t && t.closest(".legale-testi")) t.scrollIntoView({ behavior: "instant" });
      else scrollTo({ top: 0, behavior: "instant" });
    }
    // "Chiedi un preventivo" sceglie gia' l'argomento nei contatti
    const arg = e.target.closest("[data-argomento]");
    if(arg) $("#campo-argomento").value = arg.dataset.argomento;
  });
  vai(true);
}

// ---- le sezioni compaiono quando ci arrivi ----
function avviaRivela(){
  const els = $$(".rivela, .rivela-gruppo");
  if(movimentoRidotto.matches || !("IntersectionObserver" in window)){ els.forEach(el => el.classList.add("in")); return; }
  const io = new IntersectionObserver(voci => voci.forEach(v => {
    if(v.isIntersecting){ v.target.classList.add("in"); io.unobserve(v.target); }
  }), { rootMargin: "0px 0px -8% 0px" });
  els.forEach(el => io.observe(el));
}

// ---- invio dei moduli a Netlify (funziona quando il sito e' online su Netlify) ----
async function inviaModulo(modulo, dati){
  const multipart = modulo.enctype === "multipart/form-data";
  const r = await fetch("/", multipart
    ? { method: "POST", body: dati }
    : { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(dati).toString() });
  if(!r.ok) throw new Error(r.status);
  avvisaPerEmail(dati);
}

// ---- manda anche un'email a voi due (Google Apps Script). Se non va, l'ordine resta comunque su Netlify ----
function avvisaPerEmail(dati){
  if(!NEGOZIO.avvisiEmail) return;
  const campi = {};
  for(const [k, v] of dati.entries()) if(typeof v === "string") campi[k] = v; // i file no: quelli vanno su Supabase
  if(campi["campo-trappola"]) return; // spam
  fetch(NEGOZIO.avvisiEmail, {
    method: "POST",
    mode: "no-cors", // Google non risponde al sito: va bene, basta che l'email parta
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(campi),
    keepalive: true,
  }).catch(() => {});
}

// controlla i campi obbligatori e porta al primo sbagliato
function campiOk(modulo){
  const sbagliato = $$("input, select, textarea", modulo).find(el => !el.disabled && !el.checkValidity());
  if(sbagliato){
    sbagliato.focus();
    sbagliato.reportValidity();
    return false;
  }
  return true;
}

function avviaContatti(){
  const modulo = $("#modulo-contatto"), stato = $(".modulo-stato", modulo);
  modulo.addEventListener("submit", async e => {
    e.preventDefault();
    if(!campiOk(modulo)) return;
    const bottone = $("button[type=submit]", modulo);
    bottone.disabled = true;
    stato.className = "modulo-stato";
    stato.textContent = "Invio in corso…";
    try {
      await inviaModulo(modulo, new FormData(modulo));
      modulo.reset();
      stato.classList.add("ok");
      stato.textContent = "Messaggio ricevuto, grazie! Ti rispondiamo entro un giorno.";
    } catch(err){
      stato.classList.add("errore");
      stato.innerHTML = `Non è partito. Riprova o scrivici a ${linkEmail()}.`;
    }
    bottone.disabled = false;
  });
}

riempiCampi();
avviaProva();
creaVetrina();
avviaMenu();
avviaContatti();
// pagine e comparse partono quando anche negozio.js e calcolatore.js sono pronti
document.addEventListener("DOMContentLoaded", () => { avviaPagine(); avviaRivela(); });
