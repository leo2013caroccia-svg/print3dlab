// =====================================================================
//  SUPABASE (facoltativo): file 3D grandi e conteggio delle visite
//  Si accende da solo quando in NEGOZIO.supabase ci sono url e chiave.
//  Le tabelle e i permessi si creano con supabase-installazione.sql
// =====================================================================
const supabaseAttivo = () => !!(NEGOZIO.supabase && NEGOZIO.supabase.url && NEGOZIO.supabase.chiave);
const supabaseBase = () => NEGOZIO.supabase.url.trim().replace(/\/+$/, "");
function supabaseIntestazioni(){
  const k = NEGOZIO.supabase.chiave.trim();
  // la vecchia chiave "anon" e' un JWT (inizia con eyJ) e va anche in Authorization; la nuova "publishable" no
  return k.startsWith("eyJ") ? { apikey: k, Authorization: "Bearer " + k } : { apikey: k };
}
// quanto puo' pesare un file da mandare: con Supabase molto di piu' che con Netlify
const maxInvio = () => supabaseAttivo() ? (NEGOZIO.supabase.maxMB || 50) * 1048576 : 8 * 1048576;

// ---- file 3D: va dritto nella cartella privata di Supabase (nessuno puo' leggerla, solo voi dal pannello) ----
function nomeSicuro(nome){
  const punto = nome.lastIndexOf(".");
  const est = punto > 0 ? nome.slice(punto + 1).toLowerCase() : "";
  const base = (punto > 0 ? nome.slice(0, punto) : nome)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "modello";
  return `${base}.${est}`;
}
function caricaSuSupabase(file, avanzamento){
  const oggi = new Date().toISOString().slice(0, 10);
  const casuale = Math.random().toString(36).slice(2, 8);
  const percorso = `${oggi}/${Date.now().toString(36)}-${casuale}-${nomeSicuro(file.name)}`;
  const indirizzo = `${supabaseBase()}/storage/v1/object/${NEGOZIO.supabase.cartellaFile}/${percorso.split("/").map(encodeURIComponent).join("/")}`;
  return new Promise((ok, no) => {
    const x = new XMLHttpRequest(); // XHR e non fetch: cosi' si vede la percentuale
    x.open("POST", indirizzo);
    Object.entries(supabaseIntestazioni()).forEach(([k, v]) => x.setRequestHeader(k, v));
    x.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    x.setRequestHeader("x-upsert", "false");
    x.upload.onprogress = e => { if(e.lengthComputable && avanzamento) avanzamento(e.loaded / e.total); };
    x.onload = () => x.status >= 200 && x.status < 300 ? ok(percorso) : no(new Error(`Supabase ${x.status}: ${x.responseText.slice(0, 200)}`));
    x.onerror = () => no(new Error("rete"));
    x.send(file);
  });
}

// ---- visite: una riga per ogni pagina aperta. Niente cookie, niente IP, niente nomi ----
const visite = { prima: true };
function contaVisita(pagina){
  if(!supabaseAttivo()) return;
  if(/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === "file:") return; // le vostre prove non contano
  if(navigator.doNotTrack === "1" || window.doNotTrack === "1") return;
  let provenienza = "";
  if(visite.prima && document.referrer){
    try { const r = new URL(document.referrer); if(r.hostname !== location.hostname) provenienza = r.hostname; } catch(e){}
  }
  const w = innerWidth;
  const riga = {
    pagina: pagina === "sezione" && pagine.sotto ? `sezione/${pagine.sotto}` : pagina,
    provenienza,
    schermo: w < 700 ? "telefono" : w < 1100 ? "tablet" : "computer",
    lingua: (navigator.language || "").slice(0, 5),
    nuova: visite.prima,
  };
  visite.prima = false;
  fetch(`${supabaseBase()}/rest/v1/visite`, {
    method: "POST",
    headers: { ...supabaseIntestazioni(), "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(riga),
    keepalive: true,
  }).catch(() => {}); // se non va, il sito continua normale
}
pagine.quandoCambia.push(contaVisita);
