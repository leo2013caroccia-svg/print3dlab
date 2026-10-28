// =====================================================================
//  NEGOZIO: catalogo, scheda del prodotto, carrello e cassa
//  (i prodotti e i prezzi si cambiano in NEGOZIO, in cima a script.js)
// =====================================================================

// ---- carrello salvato nel browser di chi visita (solo una comodita': se non si puo', resta in memoria) ----
const CHIAVE_CARRELLO = "print3dlab-carrello";
let carrello = [];
try { carrello = JSON.parse(localStorage.getItem(CHIAVE_CARRELLO)) || []; } catch(e){ carrello = []; }
if(!Array.isArray(carrello)) carrello = [];
const salvaCarrello = () => { try { localStorage.setItem(CHIAVE_CARRELLO, JSON.stringify(carrello)); } catch(e){} };

const subtotale = () => carrello.reduce((s, r) => s + r.prezzo * r.quantita, 0);
const pezziNelCarrello = () => carrello.reduce((s, r) => s + (r.tipo === "file" ? r.pezzi : r.quantita), 0);
const chiaveRiga = r => [r.id, r.misura, r.colore, r.scritta, r.file].join("|");
const descrizioneRiga = r => r.tipo === "file" ? r.dettagli : [r.misura, r.colore, r.scritta ? `«${r.scritta}»` : ""].filter(Boolean).join(" · ");
// la foto nel carrello; per i file caricati un riquadro "3D"
const fotoRiga = r => r.foto ? `<img src="foto/${r.foto}" alt="" loading="lazy">` : `<span class="riga-3d" aria-hidden="true">3D</span>`;

// ---- catalogo: le sezioni ----
const quantiModelli = s => `${s.modelli.length} ${s.modelli.length === 1 ? "modello" : "modelli"}`;
// la foto del modello, oppure il riquadro "Foto in arrivo"
const fotoModello = (m, nome) => m.foto
  ? `<img src="foto/${m.foto}" alt="" loading="lazy" decoding="async"${m.inquadra ? ` style="object-position:${m.inquadra}"` : ""}>`
  : `<span class="foto-vuota" aria-hidden="true"><b>${sicuro(nome.charAt(0))}</b><small>Foto in arrivo</small></span>`;

function creaCatalogo(){
  $("#catalogo").innerHTML = NEGOZIO.sezioni.map((s, i) => `
    <li class="prodotto rivela">
      <a class="prodotto-foto" href="#sezione/${s.id}" aria-label="${sicuro(s.nome)}: vedi i modelli">
        ${fotoModello(s, s.nome)}
        ${s.segno ? `<span class="prodotto-segno">${s.segno}</span>` : ""}
        <span class="prodotto-numero">${pad2(i + 1)}</span>
        <span class="prodotto-veloce" aria-hidden="true">Vedi i ${quantiModelli(s)}</span>
      </a>
      <div class="prodotto-testo">
        <div class="prodotto-riga">
          <h3>${sicuro(s.nome)}</h3>
          <span class="prodotto-prezzo"><small>da</small> ${chf(prezzoMinimo(s))}</span>
        </div>
        <p>${sicuro(s.testo)}</p>
        <p class="prodotto-quanti">${quantiModelli(s)}</p>
        <a class="bottone bottone-piccolo prodotto-aggiungi" href="#sezione/${s.id}">Vedi i modelli <span aria-hidden="true">&rarr;</span></a>
      </div>
    </li>`).join("");
  $("#nota-foto").hidden = !NEGOZIO.fotoDiEsempio;
}

// ---- la pagina di una sezione: tutti i suoi modelli ----
function disegnaSezione(){
  const s = sezioneDa(pagine.sotto);
  if(!s){ location.replace("#prodotti"); return; } // indirizzo sbagliato: torna a tutte le sezioni
  const pag = $("#sezione"), i = NEGOZIO.sezioni.indexOf(s);
  $("[data-sez-etichetta]", pag).textContent = `Sezione ${pad2(i + 1)} · ${quantiModelli(s)}`;
  $("[data-sez-nome]", pag).textContent = s.nome;
  $("[data-sez-testo]", pag).textContent = s.testo;
  document.title = `${s.nome} · ${NEGOZIO.nome}`;

  // le altre sezioni, per cambiare al volo
  $("[data-sez-schede]", pag).innerHTML = NEGOZIO.sezioni.map(x =>
    `<a href="#sezione/${x.id}"${x === s ? ' aria-current="page"' : ""}>${sicuro(x.nome)}</a>`).join("");

  $("#modelli").innerHTML = s.modelli.map((m, k) => {
    const p = prodottoDa(m.id);
    return `
    <li class="prodotto modello" style="--k:${k}">
      <button class="prodotto-foto" type="button" data-apri-prodotto="${m.id}" aria-label="Scegli: ${sicuro(m.nome)}">
        ${fotoModello(m, m.nome)}
        <span class="prodotto-numero">${pad2(k + 1)}</span>
        <span class="prodotto-veloce" aria-hidden="true">Scegli</span>
      </button>
      <div class="prodotto-testo">
        <div class="prodotto-riga">
          <h3>${sicuro(m.nome)}</h3>
          <span class="prodotto-prezzo">${p.misure ? "<small>da</small> " : ""}${chf(m.prezzo)}</span>
        </div>
        <p>${sicuro(m.testo || "")}</p>
        ${m.autore || m.link ? `<p class="modello-autore">Modello di ${m.link ? `<a href="${sicuro(m.link)}" target="_blank" rel="noopener">${sicuro(m.autore || "vedi l'originale")}</a>` : sicuro(m.autore)}</p>` : ""}
        <div class="prodotto-colori" aria-hidden="true">${NEGOZIO.colori.map(c => `<i style="--s:${c.hex}"></i>`).join("")}</div>
        <button class="bottone bottone-piccolo prodotto-aggiungi" type="button" data-apri-prodotto="${m.id}">Scegli</button>
      </div>
    </li>`;
  }).join("");
  $("#nota-modelli").hidden = s.modelli.every(m => m.foto);

  // sezione prima e dopo
  const prima = NEGOZIO.sezioni[i - 1], dopo = NEGOZIO.sezioni[i + 1];
  $("[data-sez-giro]", pag).innerHTML = `
    ${prima ? `<a class="giro-link giro-indietro" href="#sezione/${prima.id}"><span>&larr; Sezione prima</span><b>${sicuro(prima.nome)}</b></a>`
            : `<a class="giro-link giro-indietro" href="#prodotti"><span>&larr; Indietro</span><b>Tutte le sezioni</b></a>`}
    ${dopo ? `<a class="giro-link giro-avanti" href="#sezione/${dopo.id}"><span>Sezione dopo &rarr;</span><b>${sicuro(dopo.nome)}</b></a>` : ""}`;
}
function avviaSezioni(){
  pagine.quandoCambia.push(p => { if(p === "sezione") disegnaSezione(); });
}

// ---- dialoghi (scheda e carrello) con animazione di chiusura ----
function apriDialogo(d){
  if(d.open) return;
  $$("dialog[open]").forEach(x => x.close());
  d.classList.remove("chiude");
  d.showModal();
  programma();
}
function chiudiDialogo(d){
  if(!d.open || d.classList.contains("chiude")) return;
  if(movimentoRidotto.matches){ d.close(); return; }
  d.classList.add("chiude");
  setTimeout(() => { d.classList.remove("chiude"); d.close(); }, 240);
}
function avviaDialoghi(){
  $$("dialog").forEach(d => {
    d.addEventListener("close", programma);
    d.addEventListener("cancel", e => { e.preventDefault(); chiudiDialogo(d); });
    // clic fuori dal riquadro = chiudi
    d.addEventListener("click", e => {
      if(e.target === d || e.target.closest("[data-chiudi]")) {
        if(e.target.closest("a[data-chiudi]")) d.close(); // i link cambiano pagina: chiudi subito
        else chiudiDialogo(d);
      }
    });
  });
}

// ---- scheda del prodotto ----
const scheda = { p: null, colore: NEGOZIO.colori[0], misura: 0 };

function apriScheda(id){
  const p = prodottoDa(id); if(!p) return;
  const d = $("#scheda");
  scheda.p = p; scheda.colore = NEGOZIO.colori[0]; scheda.misura = 0;
  const img = $("[data-scheda-foto]", d);
  img.hidden = !p.foto;
  if(p.foto){ img.src = "foto/" + p.foto; img.style.objectPosition = p.inquadra || ""; img.alt = p.nome; }
  else img.removeAttribute("src");
  $("[data-scheda-vuota]", d).hidden = !!p.foto;
  $("[data-scheda-iniziale]", d).textContent = p.nome.charAt(0);
  $("[data-scheda-segno]", d).textContent = p.sezione.nome;
  $("[data-scheda-nome]", d).textContent = p.nome;
  $("[data-scheda-testo]", d).textContent = p.testo;
  $("[data-scheda-dettagli]", d).textContent = p.dettagli || "Ogni pezzo può avere piccole righe degli strati: è normale nella stampa 3D";

  const box = $("[data-scheda-misure-box]", d);
  box.hidden = !p.misure;
  if(p.misure){
    const seg = $("[data-scheda-misure]", d);
    seg.innerHTML = p.misure.map((m, i) => `<label><input type="radio" name="misura" value="${i}"${i === 0 ? " checked" : ""}><span>${sicuro(m.nome)}<small>${chf(p.prezzo + (m.piu || 0))}</small></span></label>`).join("");
    seg.onchange = e => { scheda.misura = +e.target.value; aggiornaScheda(); };
  }

  const sbox = $("[data-scheda-scritta-box]", d), sin = $("[data-scheda-scritta]", d);
  sbox.hidden = !p.scritta;
  sin.value = "";
  sin.required = !!(p.scritta && p.scrittaObbligatoria);
  sin.maxLength = p.maxScritta || 20;
  $("[data-scheda-scritta-etichetta]", d).textContent = p.scritta || "";

  creaPallini($('[data-pallini="colore-scheda"]', d), 0, c => { scheda.colore = c; aggiornaScheda(); });
  $("[data-contatore] input", d).value = 1;
  aggiornaScheda();
  apriDialogo(d);
  if(p.scritta && matchMedia("(pointer: fine)").matches) sin.focus();
}

function prezzoScheda(){
  const p = scheda.p;
  return p.prezzo + (p.misure ? p.misure[scheda.misura].piu || 0 : 0);
}
function aggiornaScheda(){
  const d = $("#scheda");
  const q = Math.max(1, parseInt($("[data-contatore] input", d).value) || 1);
  $("[data-scheda-prezzo]", d).textContent = chf(prezzoScheda());
  $("[data-scheda-colore-nome]", d).textContent = scheda.colore.nome;
  $("[data-scheda-aggiungi]", d).textContent = `Aggiungi · ${chf(prezzoScheda() * q)}`;
}

function avviaScheda(){
  const d = $("#scheda");
  avviaContatore($("[data-contatore]", d), aggiornaScheda);
  $("[data-scheda-modulo]", d).addEventListener("submit", e => {
    e.preventDefault();
    const sin = $("[data-scheda-scritta]", d);
    if(!sin.closest("[hidden]") && !sin.checkValidity()){ sin.focus(); sin.reportValidity(); return; }
    const p = scheda.p;
    aggiungiAlCarrello({
      id: p.id, nome: p.nome, foto: p.foto || p.sezione.foto, prezzo: prezzoScheda(),
      misura: p.misure ? p.misure[scheda.misura].nome : "",
      colore: scheda.colore.nome,
      scritta: p.scritta ? sin.value.trim() : "",
      quantita: Math.max(1, parseInt($("[data-contatore] input", d).value) || 1),
    });
  });
  // qualsiasi bottone "Acquista ora" / "Scegli" del sito apre la scheda
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-apri-prodotto]");
    if(b){ e.preventDefault(); apriScheda(b.dataset.apriProdotto); }
    if(e.target.closest("[data-apri-carrello]")) apriCarrello();
  });
}

// ---- carrello ----
function aggiungiAlCarrello(riga){
  const k = chiaveRiga(riga);
  const uguale = carrello.find(r => chiaveRiga(r) === k);
  if(uguale) uguale.quantita = Math.min(99, uguale.quantita + riga.quantita);
  else carrello.push(riga);
  salvaCarrello();
  disegnaCarrello(k);
  apriCarrello();
  const n = $("[data-carrello-numero]");
  n.classList.remove("salta-su"); void n.offsetWidth; n.classList.add("salta-su");
}
// un file caricato dal calcolatore: una riga sola, il prezzo e' gia' per tutti i pezzi
function aggiungiFileAlCarrello(d){
  const riga = { tipo: "file", id: "file", nome: `Stampa di ${d.nomeFile}`, foto: "", quantita: 1, ...d };
  carrello.push(riga);
  salvaCarrello();
  disegnaCarrello(chiaveRiga(riga));
}

function apriCarrello(){ disegnaCarrello(); apriDialogo($("#carrello")); }

function disegnaCarrello(nuova){
  const d = $("#carrello");
  const pezzi = pezziNelCarrello(), tot = subtotale();
  const numero = $("[data-carrello-numero]");
  numero.hidden = !pezzi;
  numero.textContent = pezzi;
  $("[data-apri-carrello]").setAttribute("aria-label", pezzi ? `Carrello, ${pezzi} ${pezzi === 1 ? "pezzo" : "pezzi"}` : "Carrello, vuoto");
  $("[data-carrello-conta]", d).textContent = pezzi ? `(${pezzi})` : "";
  $("[data-carrello-vuoto]", d).hidden = !!carrello.length;
  $("[data-carrello-fondo]", d).hidden = !carrello.length;
  $("[data-carrello-subtotale]", d).textContent = chf(tot);

  // barra "spedizione gratis"
  const gratis = NEGOZIO.spedizioneGratisDa, barra = $("[data-carrello-gratis]", d);
  barra.hidden = !gratis || !carrello.length;
  if(gratis){
    const manca = gratis - tot;
    barra.innerHTML = `<p>${manca > 0 ? `Ancora <b>${chf(manca)}</b> e la spedizione è gratis` : "<b>Spedizione gratis</b> con La Posta"}</p><i style="--pieno:${Math.min(1, tot / gratis)}"></i>`;
  }

  $("[data-carrello-lista]", d).innerHTML = carrello.map((r, i) => `
    <li class="riga${chiaveRiga(r) === nuova ? " nuova" : ""}">
      ${fotoRiga(r)}
      <div class="riga-testo">
        <p class="riga-nome">${sicuro(r.nome)}</p>
        <p class="riga-dettagli">${sicuro(descrizioneRiga(r))}</p>
        <div class="riga-comandi">
          ${r.tipo === "file" ? `<span class="riga-pezzi">${r.pezzi} ${r.pezzi === 1 ? "pezzo" : "pezzi"}</span>` : `<div class="contatore contatore-piccolo">
            <button type="button" data-riga-piu="-1" data-i="${i}" aria-label="Uno in meno">−</button>
            <span aria-live="polite">${r.quantita}</span>
            <button type="button" data-riga-piu="1" data-i="${i}" aria-label="Uno in più">+</button>
          </div>`}
          <button type="button" class="riga-togli" data-riga-togli="${i}">Togli</button>
        </div>
      </div>
      <p class="riga-prezzo">${chf(r.prezzo * r.quantita)}</p>
    </li>`).join("");
  if(pagine.attuale === "cassa") disegnaCassa();
}

function avviaCarrello(){
  $("[data-carrello-lista]").addEventListener("click", e => {
    const piu = e.target.closest("[data-riga-piu]"), togli = e.target.closest("[data-riga-togli]");
    if(piu){
      const r = carrello[+piu.dataset.i];
      r.quantita += +piu.dataset.rigaPiu;
      if(r.quantita < 1) carrello.splice(+piu.dataset.i, 1);
      r.quantita = Math.min(99, r.quantita);
    }
    if(togli) carrello.splice(+togli.dataset.rigaTogli, 1);
    if(piu || togli){ salvaCarrello(); disegnaCarrello(); }
  });
  // un altro tab ha cambiato il carrello
  addEventListener("storage", e => {
    if(e.key !== CHIAVE_CARRELLO) return;
    try { carrello = JSON.parse(e.newValue) || []; } catch(err){ carrello = []; }
    disegnaCarrello();
  });
  disegnaCarrello();
}

// =====================================================================
//  CASSA
// =====================================================================
const cassa = () => $("#modulo-ordine");
const stripeAttivo = () => !!(NEGOZIO.stripe && NEGOZIO.stripe.attivo && NEGOZIO.stripe.funzione);
const pagamentoScelto = () => NEGOZIO.pagamenti.find(p => p.id === (cassa().querySelector('[name="scelta-pagamento"]:checked') || {}).dataset?.id) || NEGOZIO.pagamenti[0];
const pagaSubito = p => stripeAttivo() && !!p.online;
const spedizioneScelta = () => NEGOZIO.spedizioni.find(s => s.id === (cassa().querySelector('[name="scelta-spedizione"]:checked') || {}).value) || NEGOZIO.spedizioni[0];
function costoSpedizione(s){
  if(!s.prezzo) return 0;
  return NEGOZIO.spedizioneGratisDa && subtotale() >= NEGOZIO.spedizioneGratisDa ? 0 : s.prezzo;
}

function avviaCassa(){
  const m = cassa();
  $("[data-spedizioni]", m).innerHTML = NEGOZIO.spedizioni.map((s, i) => `
    <label class="scelta"><input type="radio" name="scelta-spedizione" value="${s.id}"${i === 0 ? " checked" : ""}><span>${s.nome}<small>${s.info}</small><em data-prezzo-spedizione="${s.id}"></em></span></label>`).join("");
  $("[data-pagamenti]", m).innerHTML = NEGOZIO.pagamenti.map((p, i) => `
    <label class="scelta"><input type="radio" name="scelta-pagamento" value="${p.nome}" data-id="${p.id}"${i === 0 ? " checked" : ""}><span>${p.nome}<small>${pagaSubito(p) ? p.infoOnline || p.info : p.info}</small></span></label>`).join("");
  m.addEventListener("change", e => { if(e.target.name === "scelta-spedizione" || e.target.name === "scelta-pagamento") disegnaCassa(); });
  $("[name=npa]", m).addEventListener("input", e => { e.target.value = e.target.value.replace(/\D/g, ""); });
  m.addEventListener("submit", inviaOrdine);
  pagine.quandoCambia.push(p => { if(p === "cassa") disegnaCassa(); });
}

function disegnaCassa(){
  const m = cassa(), vuota = !carrello.length;
  if(!$("[data-grazie]").hidden) return; // dopo l'ordine resta la pagina "grazie"
  $("[data-cassa-vuota]").hidden = !vuota;
  m.hidden = vuota;
  $(".cassa-passi").hidden = vuota;
  if(vuota) return;

  const s = spedizioneScelta();
  NEGOZIO.spedizioni.forEach(x => {
    const c = costoSpedizione(x);
    $(`[data-prezzo-spedizione="${x.id}"]`, m).textContent = c ? chf(c) : "Gratis";
  });

  $("[data-riepilogo-lista]", m).innerHTML = carrello.map(r => `
    <li>
      <span class="riepilogo-foto">${fotoRiga(r)}<b>${r.tipo === "file" ? r.pezzi : r.quantita}</b></span>
      <span class="riepilogo-testo"><b>${sicuro(r.nome)}</b><small>${sicuro(descrizioneRiga(r))}</small></span>
      <span class="riepilogo-prezzo">${chf(r.prezzo * r.quantita)}</span>
    </li>`).join("");
  const sub = subtotale(), sped = costoSpedizione(s);
  $('[data-conto="subtotale"]', m).textContent = chf(sub);
  $('[data-conto="spedizione"]', m).textContent = sped ? chf(sped) : "Gratis";
  $('[data-conto="totale"]', m).textContent = chf(sub + sped);
  // con Stripe si paga subito, altrimenti vi mandate voi il link
  const subito = pagaSubito(pagamentoScelto());
  $("[data-riepilogo-sicuro]", m).textContent = subito
    ? "Paghi subito sulla pagina sicura di Stripe. La carta non passa mai dal nostro sito."
    : "Non paghi adesso: prima ti confermiamo l'ordine per email.";
  $("button[type=submit]", m).textContent = subito ? `Ordina e paga · ${chf(sub + sped)}` : "Invia l'ordine";
}

function numeroOrdine(){
  const d = new Date();
  return `P3D-${String(d.getFullYear()).slice(2)}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${Math.floor(1000 + Math.random() * 9000)}`;
}

async function inviaOrdine(e){
  e.preventDefault();
  const m = cassa(), stato = $(".modulo-stato", m), bottone = $("button[type=submit]", m);
  if(!carrello.length || !campiOk(m)) return;
  const s = spedizioneScelta(), sub = subtotale(), sped = costoSpedizione(s), numero = numeroOrdine();
  const pag = pagamentoScelto(), subito = pagaSubito(pag);
  m.elements["numero-ordine"].value = numero;
  m.elements["articoli"].value = carrello.map(r => `${r.quantita} × ${r.nome}${descrizioneRiga(r) ? " (" + descrizioneRiga(r) + ")" : ""} = ${chf(r.prezzo * r.quantita)}`).join("\n");
  m.elements["subtotale"].value = chf(sub);
  m.elements["costo-spedizione"].value = `${s.nome}: ${sped ? chf(sped) : "gratis"}`;
  m.elements["totale"].value = chf(sub + sped);
  m.elements["file-online"].value = carrello.filter(r => r.tipo === "file").map(r => `${NEGOZIO.supabase.cartellaFile}/${r.file}`).join("\n");

  bottone.disabled = true;
  stato.className = "modulo-stato";
  stato.textContent = "Invio in corso…";
  const dati = new FormData(m);
  dati.set("spedizione", s.nome);
  dati.set("pagamento", subito ? `${pag.nome} · online con Stripe (controlla che sia pagato)` : pag.nome);
  dati.delete("scelta-spedizione"); dati.delete("scelta-pagamento");
  try {
    await inviaModulo(m, dati);
    // ordine partito: pagina "grazie" e carrello vuoto
    const info = {
      numero, nome: m.elements["nome"].value.trim(), email: m.elements["email"].value.trim(), consegna: `Pacco con ${s.nome}`,
      spedizione: s.id, articoli: carrello.map(r => r.tipo === "file"
        ? { tipo: "file", file: r.file, materiale: r.materiale, qualita: r.qualita, riempimento: r.riempimento, scala: r.scala, colore: r.colore, pezzi: r.pezzi }
        : { id: r.id, misura: r.misura, colore: r.colore, scritta: r.scritta, quantita: r.quantita }),
    };
    mostraGrazie(info, subito ? "vai" : "normale");
    carrello = []; salvaCarrello(); disegnaCarrello();
    if(subito){ ricordaPagamento(info); vaiAStripe(info); }
    m.reset();
    stato.textContent = "";
  } catch(err){
    stato.classList.add("errore");
    stato.innerHTML = `Non è partito. Riprova tra un attimo o scrivici a ${linkEmail()}.`;
  }
  bottone.disabled = false;
}

// ---- la pagina "grazie": dopo l'ordine, e quando si torna da Stripe ----
const TESTI_GRAZIE = {
  normale: e => `Abbiamo ricevuto il tuo ordine. Entro un giorno ti scriviamo a <b>${e}</b> per confermare la data e mandarti il pagamento.`,
  vai: e => `Abbiamo ricevuto il tuo ordine. Adesso ti portiamo alla pagina di pagamento. La conferma arriva a <b>${e}</b>.`,
  pagato: e => `Pagamento ricevuto, grazie! Entro un giorno ti scriviamo a <b>${e}</b> per confermare la data di spedizione.`,
  annullato: e => `Il pagamento non è stato fatto, ma il tuo ordine è salvato. Puoi riprovare qui sotto, oppure ti mandiamo noi il link per pagare a <b>${e}</b>.`,
};
function mostraGrazie(info, modo){
  const g = $("[data-grazie]"), m = cassa();
  $("[data-grazie-numero]", g).textContent = info.numero;
  $("[data-grazie-nome]", g).textContent = info.nome || "";
  $("[data-grazie-nome]", g).parentNode.firstChild.textContent = info.nome ? "Grazie, " : "Grazie";
  $("[data-grazie-testo]", g).innerHTML = TESTI_GRAZIE[modo](sicuro(info.email || "la tua email"));
  $("[data-grazie-consegna]", g).textContent = info.consegna || "Pacco con La Posta";
  $("[data-grazie-stato]", g).textContent = "";
  $("[data-grazie-riprova]", g).hidden = !(modo === "annullato" && info.articoli);
  m.hidden = true;
  $("[data-cassa-vuota]").hidden = true;
  $(".cassa-testa").hidden = true;
  g.hidden = false;
  g.focus({ preventScroll: true });
  scrollTo({ top: 0, behavior: "instant" });
}

// l'ordine da pagare resta in memoria in questa scheda, per quando si torna da Stripe
const CHIAVE_PAGAMENTO = "print3dlab-pagamento";
const ricordaPagamento = info => { try { sessionStorage.setItem(CHIAVE_PAGAMENTO, JSON.stringify(info)); } catch(e){} };
function pagamentoRicordato(numero){
  try { const i = JSON.parse(sessionStorage.getItem(CHIAVE_PAGAMENTO)); return i && i.numero === numero ? i : null; } catch(e){ return null; }
}

// chiede alla funzione su Supabase di aprire la pagina di Stripe (il prezzo lo calcola lei)
async function vaiAStripe(info){
  const g = $("[data-grazie]"), stato = $("[data-grazie-stato]", g), riprova = $("[data-grazie-riprova]", g);
  stato.className = "modulo-stato";
  stato.textContent = "Apro la pagina di pagamento…";
  riprova.disabled = true;
  try {
    const r = await fetch(NEGOZIO.stripe.funzione, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero: info.numero, email: info.email, spedizione: info.spedizione, articoli: info.articoli }),
    });
    const d = await r.json().catch(() => ({}));
    if(!r.ok || !d.url) throw new Error(d.errore || r.status);
    location.href = d.url;
  } catch(err){
    stato.classList.add("errore");
    stato.innerHTML = `Il pagamento online non è partito. Niente paura: l'ordine è salvato e ti mandiamo il link per pagare per email. Domande? ${linkEmail()}`;
    riprova.hidden = false;
    riprova.disabled = false;
  }
}

// tornando da Stripe l'indirizzo e' /?pagato=P3D-...#cassa oppure /?annullato=P3D-...#cassa
function ritornoDaStripe(){
  const q = new URLSearchParams(location.search);
  const numero = q.get("pagato") || q.get("annullato");
  if(!numero || !/^P3D-\d{6}-\d{4}$/.test(numero)) return;
  history.replaceState(null, "", location.pathname + "#cassa");
  const info = pagamentoRicordato(numero) || { numero };
  if(q.get("pagato")){
    try { sessionStorage.removeItem(CHIAVE_PAGAMENTO); } catch(e){}
    mostraGrazie(info, "pagato");
  } else mostraGrazie(info, "annullato");
}

// se torni alla cassa dopo un ordine, si riparte da capo
function avviaGrazie(){
  pagine.quandoCambia.push(p => {
    const g = $("[data-grazie]");
    if(p !== "cassa" && !g.hidden){ g.hidden = true; $(".cassa-testa").hidden = false; }
  });
}

creaCatalogo();
avviaSezioni();
avviaDialoghi();
avviaScheda();
avviaCarrello();
avviaCassa();
avviaGrazie();
$("[data-grazie-riprova]").addEventListener("click", () => { const i = pagamentoRicordato($("[data-grazie-numero]").textContent); if(i) vaiAStripe(i); });
ritornoDaStripe();
