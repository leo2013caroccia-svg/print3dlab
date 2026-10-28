// @ts-nocheck
// =====================================================================
//  PRINT3DLAB · pagamento online con Stripe (Supabase Edge Function "pagamento")
//  Come si installa: guarda STRIPE.md
//
//  Fa due cose:
//  1. il sito le manda il carrello -> lei calcola il prezzo VERO (dai prezzi di script.js
//     sul sito, non da quelli che manda il browser) e apre una pagina di pagamento Stripe
//  2. Stripe le dice "pagato" (webhook) -> manda l'email "Pagato" a voi due
//
//  Le chiavi NON sono qui: stanno nei "Secrets" di Supabase (Edge Functions > Secrets)
//    STRIPE_SECRET_KEY      la chiave segreta di Stripe (sk_test_... per provare, sk_live_... per davvero)
//    STRIPE_WEBHOOK_SECRET  la chiave del webhook (whsec_...)
//    SITO                   facoltativo: l'indirizzo del sito, es. https://print3dlab.ch
// =====================================================================

const SITO = (Deno.env.get("SITO") || "https://print3dlabch.netlify.app").trim().replace(/\/+$/, "");
const CHIAVE = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
const FIRMA = (Deno.env.get("STRIPE_WEBHOOK_SECRET") || "").trim();
const AVVISI = (Deno.env.get("AVVISI_EMAIL") || "https://script.google.com/macros/s/AKfycby_VlbOZmnlM6etJGYq5FZWasllfm1StIWZtSEwTttWiV4vSSHyntZbrzH-TZacCZfJxg/exec").trim();
const PROVA = CHIAVE.startsWith("sk_test_") || CHIAVE.startsWith("rk_test_");

// da quali siti si puo' chiedere un pagamento (in modalita' prova anche dal computer)
function origineOk(o){
  if(!o) return false;
  if(o === SITO || o === "https://print3dlabch.netlify.app") return true;
  return PROVA && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
}
function intestazioni(origine){
  return {
    "Access-Control-Allow-Origin": origineOk(origine) ? origine : SITO,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
    "Vary": "Origin",
  };
}
const json = (dati, stato, origine) => new Response(JSON.stringify(dati), {
  status: stato, headers: { ...intestazioni(origine), "Content-Type": "application/json" },
});

// ---------------------------------------------------------------------
//  Legge l'oggetto NEGOZIO da script.js (senza eseguire il codice del sito)
// ---------------------------------------------------------------------
function leggiNegozio(js){
  const segno = "const NEGOZIO = ";
  let i = js.indexOf(segno);
  if(i < 0) throw new Error("NEGOZIO non trovato in script.js");
  i += segno.length;
  const sbaglio = () => { throw new Error("script.js: non capisco il carattere " + i); };
  const spazi = () => {
    for(;;){
      while(i < js.length && /\s/.test(js[i])) i++;
      if(js.startsWith("//", i)){ const f = js.indexOf("\n", i); i = f < 0 ? js.length : f; }
      else if(js.startsWith("/*", i)){ const f = js.indexOf("*/", i); i = f < 0 ? js.length : f + 2; }
      else return;
    }
  };
  const stringa = () => {
    const q = js[i++]; let s = "";
    while(js[i] !== q){
      if(i >= js.length) sbaglio();
      if(js[i] === "\\"){ const n = js[i + 1]; s += n === "n" ? "\n" : n === "t" ? "\t" : n; i += 2; }
      else s += js[i++];
    }
    i++; return s;
  };
  const chiave = () => {
    if(js[i] === '"' || js[i] === "'") return stringa();
    const m = /^[A-Za-z_$][\w$]*/.exec(js.slice(i, i + 80)); if(!m) sbaglio();
    i += m[0].length; return m[0];
  };
  const valore = () => {
    spazi();
    const c = js[i];
    if(c === "{"){
      i++; const o = {};
      for(;;){
        spazi(); if(js[i] === "}"){ i++; return o; }
        const k = chiave(); spazi(); if(js[i++] !== ":") sbaglio();
        o[k] = valore(); spazi();
        if(js[i] === ","){ i++; continue; }
        if(js[i] === "}"){ i++; return o; }
        sbaglio();
      }
    }
    if(c === "["){
      i++; const a = [];
      for(;;){
        spazi(); if(js[i] === "]"){ i++; return a; }
        a.push(valore()); spazi();
        if(js[i] === ","){ i++; continue; }
        if(js[i] === "]"){ i++; return a; }
        sbaglio();
      }
    }
    if(c === '"' || c === "'") return stringa();
    const m = /^(-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?|true|false|null)/i.exec(js.slice(i, i + 40));
    if(!m) sbaglio();
    i += m[0].length;
    return m[0] === "true" ? true : m[0] === "false" ? false : m[0] === "null" ? null : Number(m[0]);
  };
  return valore();
}

// il catalogo si rilegge al massimo ogni minuto (cosi' i prezzi nuovi valgono subito)
let catalogo = null, letto = 0;
async function negozio(){
  if(catalogo && Date.now() - letto < 60000) return catalogo;
  const r = await fetch(`${SITO}/script.js?v=${Date.now()}`);
  if(!r.ok) throw new Error("script.js " + r.status);
  catalogo = leggiNegozio(await r.text());
  letto = Date.now();
  return catalogo;
}

// stesso calcolo di prodottoDa() in script.js: il modello con le opzioni della sua sezione
function prodottoDa(N, id){
  for(const s of N.sezioni || []){
    const m = (s.modelli || []).find(x => x.id === id);
    if(!m) continue;
    const { modelli, id: _id, nome, foto, testo, segno, inquadra, ...opzioni } = s;
    return { ...opzioni, ...m, sezione: s };
  }
  return null;
}
const centesimi = chf => Math.round(chf * 100);

// ---------------------------------------------------------------------
//  FILE CARICATI DAI CLIENTI: la funzione scarica il file dalla cartella privata
//  e rifà il calcolo del prezzo (stesse formule di calcolatore.js)
// ---------------------------------------------------------------------
const SUPA = (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "");
const SUPA_CHIAVE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY") || "";
async function scaricaFile(cartella, percorso){
  const h = SUPA_CHIAVE.startsWith("eyJ") ? { apikey: SUPA_CHIAVE, Authorization: `Bearer ${SUPA_CHIAVE}` } : { apikey: SUPA_CHIAVE };
  const r = await fetch(`${SUPA}/storage/v1/object/${cartella}/${percorso.split("/").map(encodeURIComponent).join("/")}`, { headers: h });
  if(r.status === 400 || r.status === 404) throw new Errore("il file non c'e' piu': caricalo di nuovo");
  if(!r.ok) throw new Error("file " + r.status);
  return await r.arrayBuffer();
}
function statistiche(pos){
  let vol = 0, area = 0;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for(let i = 0; i < pos.length; i += 9){
    const ax = pos[i], ay = pos[i + 1], az = pos[i + 2];
    const bx = pos[i + 3], by = pos[i + 4], bz = pos[i + 5];
    const cx = pos[i + 6], cy = pos[i + 7], cz = pos[i + 8];
    vol += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
    const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
    area += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
  }
  for(let i = 0; i < pos.length; i += 3)
    for(let k = 0; k < 3; k++){ const v = pos[i + k]; if(v < min[k]) min[k] = v; if(v > max[k]) max[k] = v; }
  return { volume: Math.abs(vol) / 6, area, misure: max.map((v, k) => v - min[k]) };
}
function leggiSTL(buf){
  const dv = new DataView(buf);
  if(buf.byteLength >= 84){
    const n = dv.getUint32(80, true);
    const testa = new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(buf.byteLength, 300)));
    const sembraTesto = /^\s*solid/.test(testa) && /facet|endsolid/.test(new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(buf.byteLength, 4000))));
    if(n > 0 && 84 + n * 50 <= buf.byteLength && !(sembraTesto && 84 + n * 50 !== buf.byteLength)){
      const pos = new Float32Array(n * 9);
      for(let i = 0; i < n; i++){
        let o = 84 + i * 50 + 12;
        for(let k = 0; k < 9; k++, o += 4) pos[i * 9 + k] = dv.getFloat32(o, true);
      }
      return pos;
    }
  }
  const testo = new TextDecoder().decode(buf);
  const re = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/g, numeri = [];
  let m;
  while((m = re.exec(testo))) numeri.push(+m[1], +m[2], +m[3]);
  return Float32Array.from(numeri.slice(0, numeri.length - numeri.length % 9));
}
function leggiOBJ(testo){
  const v = [], out = [];
  for(const riga of testo.split("\n")){
    if(riga.startsWith("v ")){ const p = riga.trim().split(/\s+/); v.push(+p[1], -(+p[3]), +p[2]); }
    else if(riga.startsWith("f ")){
      const n = v.length / 3;
      const p = riga.trim().split(/\s+/).slice(1).map(t => { const k = parseInt(t); return k < 0 ? n + k : k - 1; });
      for(let j = 1; j + 1 < p.length; j++)
        for(const k of [p[0], p[j], p[j + 1]]) out.push(v[k * 3], v[k * 3 + 1], v[k * 3 + 2]);
    }
  }
  return Float32Array.from(out);
}
function vociZip(buf){
  const dv = new DataView(buf);
  let fine = -1;
  for(let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--)
    if(dv.getUint32(i, true) === 0x06054b50){ fine = i; break; }
  if(fine < 0) throw new Error("zip");
  const n = dv.getUint16(fine + 10, true);
  let p = dv.getUint32(fine + 16, true);
  const voci = [];
  for(let k = 0; k < n && dv.getUint32(p, true) === 0x02014b50; k++){
    const nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
    voci.push({ nome: new TextDecoder().decode(new Uint8Array(buf, p + 46, nl)), metodo: dv.getUint16(p + 10, true), dimensione: dv.getUint32(p + 20, true), inizio: dv.getUint32(p + 42, true) });
    p += 46 + nl + el + cl;
  }
  return voci;
}
async function estraiZip(buf, v){
  const dv = new DataView(buf);
  const nl = dv.getUint16(v.inizio + 26, true), el = dv.getUint16(v.inizio + 28, true);
  const dati = new Uint8Array(buf, v.inizio + 30 + nl + el, v.dimensione);
  if(v.metodo === 0) return new TextDecoder().decode(dati);
  if(v.metodo === 8) return await new Response(new Blob([dati]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();
  throw new Error("compressione");
}
const UNITA = { micron: 0.001, millimeter: 1, centimeter: 10, meter: 1000, inch: 25.4, foot: 304.8 };
async function leggi3MF(buf){
  const out = [];
  const reX = /\bx="([^"]*)"/, reY = /\by="([^"]*)"/, reZ = /\bz="([^"]*)"/;
  const re1 = /\bv1="(\d+)"/, re2 = /\bv2="(\d+)"/, re3 = /\bv3="(\d+)"/;
  for(const voce of vociZip(buf).filter(v => /\.model$/i.test(v.nome))){
    const xml = await estraiZip(buf, voce);
    const u = /<model\b[^>]*\bunit="(\w+)"/.exec(xml);
    const f = u ? (UNITA[u[1]] || 1) : 1;
    for(const mesh of xml.matchAll(/<mesh\b[^>]*>([\s\S]*?)<\/mesh>/g)){
      const v = [];
      for(const a of mesh[1].matchAll(/<vertex\b([^>]*)>/g)) v.push(+reX.exec(a[1])[1] * f, +reY.exec(a[1])[1] * f, +reZ.exec(a[1])[1] * f);
      for(const t of mesh[1].matchAll(/<triangle\b([^>]*)>/g))
        for(const re of [re1, re2, re3]){ const k = +re.exec(t[1])[1] * 3; out.push(v[k], v[k + 1], v[k + 2]); }
    }
  }
  return Float32Array.from(out);
}
// ATTENZIONE: uguale a prezzoStampa() in calcolatore.js
function prezzoStampa(CAL, m, o){
  const s = o.scala / 100;
  const volume = m.volume * s ** 3 / 1000;
  const area = m.area * s ** 2 / 100;
  const guscio = Math.min(volume, area * 0.12);
  const pieno = guscio + (volume - guscio) * o.riempimento.valore;
  const grammi = pieno * o.materiale.densita * 1.08;
  const ore = grammi / (o.qualita.grammiOra * o.materiale.velocita) + 0.15;
  const materiale = grammi * CAL.prezzoGrammo * o.materiale.fattore;
  const macchina = ore * CAL.prezzoOra;
  const q = o.quantita;
  const pezzi = (materiale + macchina) * q;
  const sconto = q >= CAL.scontoDa ? pezzi * CAL.sconto : 0;
  let totale = CAL.preparazione + pezzi - sconto;
  totale = Math.max(CAL.minimo, Math.ceil(totale * 2) / 2);
  const misure = m.misure.map(v => v * s);
  return { grammi, ore, totale, misure, sta: misure.every(v => v <= CAL.piatto) };
}
const PERCORSO_FILE = /^\d{4}-\d{2}-\d{2}\/[a-z0-9]+-[a-z0-9]+-[A-Za-z0-9_-]+\.(stl|obj|3mf)$/i;
async function rigaFile(N, a){
  const CAL = N.stampa || {};
  const percorso = testo(a.file, 200);
  if(!PERCORSO_FILE.test(percorso)) throw new Errore("file sbagliato");
  const materiale = (CAL.materiali || []).find(x => x.id === a.materiale);
  const qualita = (CAL.qualita || []).find(x => x.id === a.qualita);
  const riempimento = (CAL.riempimento || []).find(x => x.id === a.riempimento);
  const colore = (N.colori || []).find(c => c.nome === a.colore);
  const scala = Number(a.scala), pezzi = Math.floor(Number(a.pezzi));
  if(!materiale || !qualita || !riempimento || !colore) throw new Errore("opzioni del file sbagliate");
  if(!(scala >= 25 && scala <= 300) || !(pezzi >= 1 && pezzi <= 100)) throw new Errore("grandezza o pezzi sbagliati");
  if(!SUPA || !SUPA_CHIAVE) throw new Error("manca SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  const buf = await scaricaFile((N.supabase || {}).cartellaFile || "file-clienti", percorso);
  const est = percorso.split(".").pop().toLowerCase();
  const pos = est === "stl" ? leggiSTL(buf) : est === "obj" ? leggiOBJ(new TextDecoder().decode(buf)) : await leggi3MF(buf);
  if(!pos.length || pos.some(x => !isFinite(x))) throw new Errore("il file non si legge");
  const st = prezzoStampa(CAL, statistiche(pos), { scala, materiale, qualita, riempimento, quantita: pezzi });
  if(!st.sta) throw new Errore("il modello e' troppo grande per la stampante");
  const nomeFile = percorso.split("/").pop().replace(/^[a-z0-9]+-[a-z0-9]+-/i, "");
  return {
    nome: `Stampa di ${nomeFile}`,
    descrizione: [materiale.nome, qualita.nome, `riempimento ${riempimento.info}`, scala !== 100 ? `${scala}%` : "", colore.nome, `${pezzi} ${pezzi === 1 ? "pezzo" : "pezzi"}`].filter(Boolean).join(" · "),
    prezzo: st.totale, quantita: 1,
  };
}
// errore "gentile": il sito lo mostra cosi' com'e'
class Errore extends Error {}
const testo = (t, max) => String(t ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

// ---------------------------------------------------------------------
//  1. il sito chiede di pagare un ordine
// ---------------------------------------------------------------------
async function creaPagamento(req, origine){
  if(!CHIAVE || !/^(sk|rk)_(test|live)_/.test(CHIAVE)) return json({ errore: "Stripe non e' ancora collegato" }, 503, origine);
  if(!origineOk(origine)) return json({ errore: "sito non permesso" }, 403, origine);

  let d;
  try { d = await req.json(); } catch(e){ return json({ errore: "dati sbagliati" }, 400, origine); }
  const numero = testo(d.numero, 20);
  if(!/^P3D-\d{6}-\d{4}$/.test(numero)) return json({ errore: "numero d'ordine sbagliato" }, 400, origine);
  const email = testo(d.email, 200);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ errore: "email sbagliata" }, 400, origine);
  if(!Array.isArray(d.articoli) || !d.articoli.length || d.articoli.length > 30) return json({ errore: "carrello vuoto" }, 400, origine);

  const N = await negozio();
  const righe = [];
  let subtotale = 0;
  for(const a of d.articoli){
    if(a && a.tipo === "file"){
      try {
        const r = await rigaFile(N, a);
        subtotale += r.prezzo; righe.push(r);
      } catch(err){
        if(err instanceof Errore) return json({ errore: err.message }, 400, origine);
        throw err;
      }
      continue;
    }
    const p = prodottoDa(N, a && a.id);
    if(!p) return json({ errore: "prodotto che non esiste: " + testo(a && a.id, 40) }, 400, origine);
    const quantita = Math.floor(Number(a.quantita));
    if(!(quantita >= 1 && quantita <= 99)) return json({ errore: "quantita' sbagliata" }, 400, origine);

    let prezzo = Number(p.prezzo), misura = "";
    if(Array.isArray(p.misure) && p.misure.length){
      const m = p.misure.find(x => x.nome === a.misura);
      if(!m) return json({ errore: "misura sbagliata per " + p.nome }, 400, origine);
      prezzo += Number(m.piu) || 0; misura = m.nome;
    }
    const colore = (N.colori || []).find(c => c.nome === a.colore);
    if(!colore) return json({ errore: "colore sbagliato" }, 400, origine);
    let scritta = "";
    if(p.scritta){
      scritta = testo(a.scritta, p.maxScritta || 20);
      if(p.scrittaObbligatoria && !scritta) return json({ errore: "manca la scritta per " + p.nome }, 400, origine);
    }
    if(!(prezzo > 0)) return json({ errore: "prezzo sbagliato" }, 400, origine);

    subtotale += prezzo * quantita;
    righe.push({
      nome: p.nome,
      descrizione: [misura, colore.nome, scritta ? `Scritta: "${scritta}"` : ""].filter(Boolean).join(" · "),
      prezzo, quantita,
    });
  }

  const sped = (N.spedizioni || []).find(s => s.id === d.spedizione);
  if(!sped) return json({ errore: "spedizione sbagliata" }, 400, origine);
  const gratisDa = Number(N.spedizioneGratisDa) || 0;
  const costoSped = gratisDa && subtotale >= gratisDa ? 0 : Number(sped.prezzo) || 0;

  // la richiesta a Stripe (formato "form", come vuole la loro API)
  const f = new URLSearchParams();
  f.set("mode", "payment");
  f.set("locale", "it");
  f.set("customer_email", email);
  f.set("client_reference_id", numero);
  f.set("metadata[numero]", numero);
  f.set("payment_intent_data[metadata][numero]", numero);
  f.set("payment_intent_data[description]", `${N.nome || "Print3DLab"} · ordine ${numero}`);
  const base = origineOk(origine) ? origine : SITO;
  f.set("success_url", `${base}/?pagato=${numero}#cassa`);
  f.set("cancel_url", `${base}/?annullato=${numero}#cassa`);
  f.set("expires_at", String(Math.floor(Date.now() / 1000) + 3600)); // il link vale 1 ora
  const tutte = [...righe];
  if(costoSped) tutte.push({ nome: `Spedizione ${sped.nome}`, descrizione: sped.info || "", prezzo: costoSped, quantita: 1 });
  tutte.forEach((r, n) => {
    f.set(`line_items[${n}][quantity]`, String(r.quantita));
    f.set(`line_items[${n}][price_data][currency]`, "chf");
    f.set(`line_items[${n}][price_data][unit_amount]`, String(centesimi(r.prezzo)));
    f.set(`line_items[${n}][price_data][product_data][name]`, testo(r.nome, 120));
    if(r.descrizione) f.set(`line_items[${n}][price_data][product_data][description]`, testo(r.descrizione, 300));
  });

  const s = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${CHIAVE}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: f.toString(),
  });
  const risposta = await s.json().catch(() => ({}));
  if(!s.ok || !risposta.url){
    console.error("Stripe:", s.status, JSON.stringify(risposta.error || risposta).slice(0, 500));
    return json({ errore: "Stripe non ha risposto" }, 502, origine);
  }
  return json({ url: risposta.url, totale: subtotale + costoSped }, 200, origine);
}

// ---------------------------------------------------------------------
//  2. Stripe avvisa che un ordine e' stato pagato (webhook)
// ---------------------------------------------------------------------
const esadecimale = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
async function firmaGiusta(corpo, intestazione){
  if(!FIRMA || !intestazione) return false;
  const parti = intestazione.split(",").map(x => x.split("="));
  const t = (parti.find(([k]) => k === "t") || [])[1];
  const firme = parti.filter(([k]) => k === "v1").map(([, v]) => v);
  if(!t || !firme.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(FIRMA), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const giusta = esadecimale(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`${t}.${corpo}`)));
  return firme.some(f => f.length === giusta.length && [...f].reduce((x, c, n) => x | (c.charCodeAt(0) ^ giusta.charCodeAt(n)), 0) === 0);
}

async function avvisoStripe(req){
  const corpo = await req.text();
  if(!(await firmaGiusta(corpo, req.headers.get("stripe-signature")))) return new Response("firma sbagliata", { status: 400 });
  const e = JSON.parse(corpo);
  const s = e.data && e.data.object || {};
  const pagato = (e.type === "checkout.session.completed" && s.payment_status === "paid") || e.type === "checkout.session.async_payment_succeeded";
  if(pagato && AVVISI){
    const c = s.customer_details || {};
    const campi = {
      "form-name": "pagato",
      "numero-ordine": s.client_reference_id || (s.metadata || {}).numero || "",
      "totale": `CHF ${((s.amount_total || 0) / 100).toFixed(2)}`,
      "nome": c.name || "",
      "email": c.email || s.customer_email || "",
      "pagamento": "Pagato online con Stripe" + (e.livemode ? "" : " (PROVA, niente soldi veri)"),
    };
    await fetch(AVVISI, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(campi) }).catch(() => {});
  }
  return new Response("ok");
}

Deno.serve(async req => {
  const origine = req.headers.get("origin") || "";
  if(req.method === "OPTIONS") return new Response(null, { status: 204, headers: intestazioni(origine) });
  if(req.method !== "POST") return json({ errore: "usa POST" }, 405, origine);
  try {
    if(req.headers.get("stripe-signature")) return await avvisoStripe(req);
    return await creaPagamento(req, origine);
  } catch(err){
    console.error(err);
    return json({ errore: "qualcosa non va" }, 500, origine);
  }
});
