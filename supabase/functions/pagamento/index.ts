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
