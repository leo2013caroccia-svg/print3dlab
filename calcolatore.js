// =====================================================================
//  CALCOLATORE: legge il file 3D, lo mostra in 3D e calcola il prezzo
//  (i prezzi si cambiano in NEGOZIO.stampa, in cima a script.js)
// =====================================================================
const CAL = NEGOZIO.stampa;
const MAX_LETTURA = 60 * 1024 * 1024;  // per il prezzo leggiamo anche file piu' grandi

const calc = {
  modello: null,           // { pos, volume (mm3), area (mm2), misure [x,y,z] mm }
  tipo: "",                // "stl", "3mf", "obj", "step"
  materiale: CAL.materiali[0], qualita: CAL.qualita[1], riempimento: CAL.riempimento[0],
  scala: 100, colore: NEGOZIO.colori[0], quantita: 1,
};

// ---------------------------------------------------------------------
//  LETTURA DEI FILE
// ---------------------------------------------------------------------
// volume, superficie e misure da una lista di triangoli (9 numeri per triangolo, in mm)
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
  for(let i = 0; i < pos.length; i += 3){
    for(let k = 0; k < 3; k++){
      const v = pos[i + k];
      if(v < min[k]) min[k] = v;
      if(v > max[k]) max[k] = v;
    }
  }
  return { pos, volume: Math.abs(vol) / 6, area, min, max, misure: max.map((v, k) => v - min[k]) };
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
  // STL di testo
  const testo = new TextDecoder().decode(buf);
  const re = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/g, numeri = [];
  let m;
  while((m = re.exec(testo))) numeri.push(+m[1], +m[2], +m[3]);
  return Float32Array.from(numeri.slice(0, numeri.length - numeri.length % 9));
}

function leggiOBJ(testo){
  const v = [], out = [];
  for(const riga of testo.split("\n")){
    if(riga.startsWith("v ")){
      const p = riga.trim().split(/\s+/);
      // gli OBJ di solito hanno l'alto sull'asse Y: lo giriamo come gli STL (alto su Z)
      v.push(+p[1], -(+p[3]), +p[2]);
    } else if(riga.startsWith("f ")){
      const n = v.length / 3;
      const p = riga.trim().split(/\s+/).slice(1).map(t => { const k = parseInt(t); return k < 0 ? n + k : k - 1; });
      for(let j = 1; j + 1 < p.length; j++)
        for(const k of [p[0], p[j], p[j + 1]]) out.push(v[k * 3], v[k * 3 + 1], v[k * 3 + 2]);
    }
  }
  return Float32Array.from(out);
}

// il 3MF e' uno zip: leggiamo l'elenco dei file e scompattiamo i modelli
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
    voci.push({
      nome: new TextDecoder().decode(new Uint8Array(buf, p + 46, nl)),
      metodo: dv.getUint16(p + 10, true), dimensione: dv.getUint32(p + 20, true), inizio: dv.getUint32(p + 42, true),
    });
    p += 46 + nl + el + cl;
  }
  return voci;
}
async function estraiZip(buf, v){
  const dv = new DataView(buf);
  const nl = dv.getUint16(v.inizio + 26, true), el = dv.getUint16(v.inizio + 28, true);
  const dati = new Uint8Array(buf, v.inizio + 30 + nl + el, v.dimensione);
  if(v.metodo === 0) return new TextDecoder().decode(dati);
  if(v.metodo === 8 && "DecompressionStream" in window){
    const flusso = new Blob([dati]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return await new Response(flusso).text();
  }
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
    // ogni <mesh> ha i suoi vertici
    for(const mesh of xml.matchAll(/<mesh\b[^>]*>([\s\S]*?)<\/mesh>/g)){
      const v = [];
      for(const a of mesh[1].matchAll(/<vertex\b([^>]*)>/g))
        v.push(+reX.exec(a[1])[1] * f, +reY.exec(a[1])[1] * f, +reZ.exec(a[1])[1] * f);
      for(const t of mesh[1].matchAll(/<triangle\b([^>]*)>/g)){
        for(const re of [re1, re2, re3]){
          const k = +re.exec(t[1])[1] * 3;
          out.push(v[k], v[k + 1], v[k + 2]);
        }
      }
    }
  }
  return Float32Array.from(out);
}

async function leggiFile(file){
  const est = (file.name.split(".").pop() || "").toLowerCase();
  if(est === "step" || est === "stp") return { tipo: "step" };
  if(!["stl", "obj", "3mf"].includes(est)) throw new Error("tipo");
  if(file.size > Math.max(MAX_LETTURA, maxInvio())) throw new Error("grande");
  const buf = await file.arrayBuffer();
  let pos;
  if(est === "stl") pos = leggiSTL(buf);
  else if(est === "obj") pos = leggiOBJ(new TextDecoder().decode(buf));
  else pos = await leggi3MF(buf);
  if(!pos.length || pos.some(x => !isFinite(x))) throw new Error("vuoto");
  return { tipo: est, modello: statistiche(pos) };
}

// ---------------------------------------------------------------------
//  IL MODELLO IN 3D (WebGL, senza librerie)
// ---------------------------------------------------------------------
const visore = { gl: null, prog: null, u: {}, mod: null, piatto: null, n: 0, ay: -0.6, ax: 0.5, auto: true, raf: 0, ripresa: 0, colore: [1, 0.36, 0.12], tela: null };

const VERTICI = `
attribute vec3 aPos; attribute vec3 aNor;
uniform mat4 uProj, uVista, uModello;
varying vec3 vNor; varying vec3 vMondo;
void main(){
  vec4 m = uModello * vec4(aPos, 1.0);
  vMondo = m.xyz;
  vNor = (uVista * uModello * vec4(aNor, 0.0)).xyz;
  gl_Position = uProj * uVista * m;
}`;
const COLORI = `
precision mediump float;
uniform vec3 uColore; uniform float uPiatto;
varying vec3 vNor; varying vec3 vMondo;
void main(){
  if(uPiatto > 0.5){
    vec2 g = abs(fract(vMondo.xz * 8.0) - 0.5);
    float riga = smoothstep(0.465, 0.495, max(g.x, g.y));
    float bordo = smoothstep(0.485, 0.5, max(abs(vMondo.x), abs(vMondo.z)));
    vec3 c = mix(vec3(0.17, 0.17, 0.18), vec3(0.27, 0.27, 0.28), max(riga, bordo));
    gl_FragColor = vec4(c, 1.0);
    return;
  }
  vec3 n = normalize(vNor);
  if(!gl_FrontFacing) n = -n;
  vec3 l1 = normalize(vec3(0.45, 0.7, 0.6)), l2 = normalize(vec3(-0.7, 0.2, 0.3));
  float d = max(dot(n, l1), 0.0) * 0.72 + max(dot(n, l2), 0.0) * 0.22;
  float lucido = pow(max(dot(n, normalize(l1 + vec3(0.0, 0.0, 1.0))), 0.0), 36.0) * 0.22;
  float bordo = pow(1.0 - max(n.z, 0.0), 3.0) * 0.18;
  gl_FragColor = vec4(uColore * (0.34 + d) + lucido + bordo, 1.0);
}`;

// matrici 4x4 (per colonne, come vuole WebGL)
const M = {
  per(a, b){ const o = new Float32Array(16); for(let i = 0; i < 4; i++) for(let j = 0; j < 4; j++){ let s = 0; for(let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; },
  prospettiva(fov, asp, vicino, lontano){ const f = 1 / Math.tan(fov / 2), d = vicino - lontano; return new Float32Array([f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (lontano + vicino) / d, -1, 0, 0, 2 * lontano * vicino / d, 0]); },
  sposta(x, y, z){ return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]); },
  giraX(a){ const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); },
  giraY(a){ const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); },
  scala(k){ return new Float32Array([k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1]); },
};

function avviaVisore(tela){
  const gl = tela.getContext("webgl", { antialias: true, alpha: true });
  if(!gl) return false;
  const shader = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERTICI));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, COLORI));
  gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
  gl.useProgram(prog);
  ["uProj", "uVista", "uModello", "uColore", "uPiatto"].forEach(n => { visore.u[n] = gl.getUniformLocation(prog, n); });
  visore.aPos = gl.getAttribLocation(prog, "aPos");
  visore.aNor = gl.getAttribLocation(prog, "aNor");
  gl.enable(gl.DEPTH_TEST);
  visore.gl = gl; visore.prog = prog; visore.tela = tela;
  // il piatto della stampante: un quadrato di lato 1 (= 256 mm)
  visore.piatto = caricaBuffer(new Float32Array([-.5, -.001, -.5, .5, -.001, .5, .5, -.001, -.5, -.5, -.001, -.5, -.5, -.001, .5, .5, -.001, .5]));

  // trascinare per girare
  let tocco = null;
  tela.addEventListener("pointerdown", e => { tocco = { x: e.clientX, y: e.clientY, ay: visore.ay, ax: visore.ax }; tela.setPointerCapture(e.pointerId); visore.auto = false; clearTimeout(visore.ripresa); });
  tela.addEventListener("pointermove", e => {
    if(!tocco) return;
    visore.ay = tocco.ay + (e.clientX - tocco.x) * 0.01;
    visore.ax = Math.min(1.45, Math.max(0.05, tocco.ax + (e.clientY - tocco.y) * 0.008));
    richiediDisegno();
  });
  const lascia = () => { tocco = null; visore.ripresa = setTimeout(() => { visore.auto = true; richiediDisegno(); }, 4000); };
  tela.addEventListener("pointerup", lascia);
  tela.addEventListener("pointercancel", lascia);
  new ResizeObserver(richiediDisegno).observe(tela);
  return true;
}

// prende triangoli (posizioni) e calcola le normali di ogni faccia
function caricaBuffer(pos){
  const gl = visore.gl, nor = new Float32Array(pos.length);
  for(let i = 0; i < pos.length; i += 9){
    const ux = pos[i + 3] - pos[i], uy = pos[i + 4] - pos[i + 1], uz = pos[i + 5] - pos[i + 2];
    const vx = pos[i + 6] - pos[i], vy = pos[i + 7] - pos[i + 1], vz = pos[i + 8] - pos[i + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for(let k = 0; k < 9; k += 3){ nor[i + k] = nx; nor[i + k + 1] = ny; nor[i + k + 2] = nz; }
  }
  const bp = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bp); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
  const bn = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bn); gl.bufferData(gl.ARRAY_BUFFER, nor, gl.STATIC_DRAW);
  return { bp, bn, n: pos.length / 3 };
}

function caricaModello(m){
  const gl = visore.gl;
  if(!gl) return;
  if(visore.mod){ gl.deleteBuffer(visore.mod.bp); gl.deleteBuffer(visore.mod.bn); }
  // centrato sul piatto, appoggiato sopra, con l'alto verso l'alto (Z del file -> Y dello schermo)
  const cx = (m.min[0] + m.max[0]) / 2, cy = (m.min[1] + m.max[1]) / 2, z0 = m.min[2];
  const src = m.pos, pos = new Float32Array(src.length);
  for(let i = 0; i < src.length; i += 3){
    pos[i] = src[i] - cx;
    pos[i + 1] = src[i + 2] - z0;
    pos[i + 2] = -(src[i + 1] - cy);
  }
  visore.mod = caricaBuffer(pos);
  visore.raggio = Math.hypot(m.misure[0], m.misure[1], m.misure[2]) / 2;
  visore.altezza = m.misure[2];
  visore.ay = -0.6; visore.ax = 0.5; visore.auto = true;
  richiediDisegno();
}

function disegna(){
  const gl = visore.gl, tela = visore.tela;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = Math.round(tela.clientWidth * dpr), h = Math.round(tela.clientHeight * dpr);
  if(!w || !h) return;
  if(tela.width !== w || tela.height !== h){ tela.width = w; tela.height = h; }
  gl.viewport(0, 0, w, h);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  if(!visore.mod) return;

  const k = calc.scala / 100 / CAL.piatto;          // mm -> unita' del piatto
  const r = Math.max(0.74, visore.raggio * k * 1.15);
  const asp = w / h, fov = 0.62;
  const dist = r / Math.tan(fov / 2) / Math.min(1, asp);
  const ty = Math.min(visore.altezza * k, 1.2) * 0.42;
  const proj = M.prospettiva(fov, asp, dist * 0.05, dist * 10);
  const vista = M.per(M.sposta(0, -ty, -dist), M.per(M.giraX(visore.ax), M.giraY(visore.ay)));
  gl.uniformMatrix4fv(visore.u.uProj, false, proj);
  gl.uniformMatrix4fv(visore.u.uVista, false, vista);

  const traccia = (b, modello, piatto) => {
    gl.uniformMatrix4fv(visore.u.uModello, false, modello);
    gl.uniform1f(visore.u.uPiatto, piatto);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.bp); gl.enableVertexAttribArray(visore.aPos); gl.vertexAttribPointer(visore.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.bn); gl.enableVertexAttribArray(visore.aNor); gl.vertexAttribPointer(visore.aNor, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, b.n);
  };
  gl.uniform3fv(visore.u.uColore, visore.colore);
  traccia(visore.piatto, M.scala(1), 1);
  traccia(visore.mod, M.scala(k), 0);
}

function ciclo(){
  visore.raf = 0;
  const attivo = pagine.attuale === "carica" && !document.hidden;
  if(!attivo) return;
  const gira = visore.auto && !movimentoRidotto.matches;
  if(gira) visore.ay += 0.0055;
  disegna();
  if(gira) visore.raf = requestAnimationFrame(ciclo);
}
function richiediDisegno(){ if(visore.gl && !visore.raf) visore.raf = requestAnimationFrame(ciclo); }

const hexInRgb = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

// ---------------------------------------------------------------------
//  IL PREZZO
// ---------------------------------------------------------------------
function stima(){
  return calc.modello ? prezzoStampa(calc.modello, calc) : null;
}
// o = { scala, materiale, qualita, riempimento, quantita }. ATTENZIONE: uguale in supabase/functions/pagamento/index.ts
function prezzoStampa(m, o){
  const s = o.scala / 100;
  const volume = m.volume * s ** 3 / 1000;           // cm3
  const area = m.area * s ** 2 / 100;                // cm2
  // le pareti esterne sono piene (circa 1,2 mm), dentro c'e' il riempimento
  const guscio = Math.min(volume, area * 0.12);
  const pieno = guscio + (volume - guscio) * o.riempimento.valore;
  const grammi = pieno * o.materiale.densita * 1.08; // +8% per supporti e scarti
  const ore = grammi / (o.qualita.grammiOra * o.materiale.velocita) + 0.15;
  const materiale = grammi * CAL.prezzoGrammo * o.materiale.fattore;
  const macchina = ore * CAL.prezzoOra;
  const q = o.quantita;
  const pezzi = (materiale + macchina) * q;
  const sconto = q >= CAL.scontoDa ? pezzi * CAL.sconto : 0;
  let totale = CAL.preparazione + pezzi - sconto;
  totale = Math.max(CAL.minimo, Math.ceil(totale * 2) / 2); // arrotondato ai 50 centesimi
  const misure = m.misure.map(v => v * s);
  return { grammi, ore, materiale, macchina, sconto, totale, alPezzo: totale / q, misure, sta: misure.every(v => v <= CAL.piatto) };
}

const scriviPeso = g => g < 10 ? g.toFixed(1).replace(".", ",") + " g" : Math.round(g) + " g";
const scriviOre = h => { const min = Math.round(h * 60); return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${pad2(min % 60)} min`; };
const scriviMisure = v => v.map(x => x < 10 ? x.toFixed(1).replace(".", ",") : Math.round(x)).join(" × ") + " mm";

function aggiornaConto(){
  const f = $("#modulo-file"), st = stima();
  const scrivi = (k, t) => { $(`[data-stima="${k}"]`, f).textContent = t; };
  const nota = $("[data-conto-nota]", f), avviso = $("[data-visore-avviso]", f);
  $("[data-scala-valore]", f).textContent = calc.scala + "%";
  const avanti = $("[data-file-avanti]", f);
  avanti.disabled = !st || !st.sta || !calc.file;
  avanti.textContent = st && st.sta ? `Avanti · ${chf(st.totale)}` : "Avanti";

  if(!st){
    ["peso", "tempo", "pezzo", "totale"].forEach(k => scrivi(k, "–"));
    nota.textContent = calc.tipo === "step"
      ? "Per i file STEP il prezzo lo calcoliamo noi: scrivici dalla pagina Contatti."
      : "Carica un file STL, 3MF o OBJ per vedere il prezzo.";
    return;
  }
  scrivi("peso", scriviPeso(st.grammi * 1));
  scrivi("tempo", scriviOre(st.ore));
  scrivi("pezzo", chf(st.alPezzo));
  scrivi("totale", chf(st.totale));
  $('[data-stima="totale"]', f).classList.remove("cambia"); void f.offsetWidth; $('[data-stima="totale"]', f).classList.add("cambia");
  nota.textContent = st.sconto ? `Con lo sconto di ${Math.round(CAL.sconto * 100)}% da ${CAL.scontoDa} pezzi.` : "Calcolato dal tuo file. Prima di stampare lo controlliamo noi.";
  $('[data-stima="dettagli"]', f).innerHTML = `
    <dl>
      <div><dt>Filamento (${scriviPeso(st.grammi)} di ${calc.materiale.nome} × ${calc.quantita})</dt><dd>${chf(st.materiale * calc.quantita)}</dd></div>
      <div><dt>Stampante (${scriviOre(st.ore)} × ${calc.quantita})</dt><dd>${chf(st.macchina * calc.quantita)}</dd></div>
      <div><dt>Preparazione</dt><dd>${chf(CAL.preparazione)}</dd></div>
      ${st.sconto ? `<div><dt>Sconto ${Math.round(CAL.sconto * 100)}%</dt><dd>− ${chf(st.sconto)}</dd></div>` : ""}
    </dl>
    <p>Arrotondato ai 50 centesimi, minimo ${chf(CAL.minimo)}.</p>`;

  $("[data-visore-misure]", f).textContent = scriviMisure(st.misure);
  avviso.hidden = st.sta && Math.max(...st.misure) >= 5;
  avviso.textContent = !st.sta
    ? `Così è troppo grande per la stampante (massimo ${CAL.piatto / 10} cm per lato): riduci la grandezza oppure lo stampiamo in più pezzi.`
    : "È molto piccolo: sotto i 5 mm i dettagli si perdono.";
}

// ---------------------------------------------------------------------
//  IL MODULO
// ---------------------------------------------------------------------
function creaSegmenti(f, chiave){
  const box = $(`[data-opzioni="${chiave}"]`, f);
  const voci = CAL[chiave], campo = { materiali: "materiale", qualita: "qualita", riempimento: "riempimento" }[chiave];
  box.innerHTML = voci.map(v => `<label><input type="radio" name="opz-${chiave}" value="${v.id}"${calc[campo] === v ? " checked" : ""}><span>${v.nome}${v.info && chiave !== "materiali" ? `<small>${v.info}</small>` : ""}</span></label>`).join("");
  box.setAttribute("role", "radiogroup");
  const info = $(`[data-info="${chiave}"]`, f);
  if(info) info.textContent = calc[campo].info;
  box.addEventListener("change", e => {
    calc[campo] = voci.find(v => v.id === e.target.value);
    if(info) info.textContent = calc[campo].info;
    aggiornaConto();
  });
}

function mostraFile(file){
  const f = $("#modulo-file"), zona = $("#zona-file");
  const titolo = $("[data-zona-titolo]", f), sotto = $("[data-zona-sotto]", f);
  const tela = $("#visore-tela"), barra = $("[data-visore-barra]", f), aiuto = $("[data-visore-aiuto]", f), avviso = $("[data-visore-avviso]", f);
  zona.classList.remove("errore", "pieno");
  calc.modello = null; calc.tipo = ""; calc.file = file || null;
  if(!file){
    zona.hidden = false; tela.hidden = barra.hidden = aiuto.hidden = avviso.hidden = true;
    titolo.textContent = "Trascina qui il tuo file 3D";
    sotto.textContent = testoZona();
    aggiornaConto();
    return;
  }
  titolo.textContent = "Sto leggendo il modello…";
  sotto.textContent = file.name;
  zona.classList.add("pieno");
  leggiFile(file).then(r => {
    calc.tipo = r.tipo;
    $("[data-visore-nome]", f).textContent = file.name;
    barra.hidden = false;
    if(r.tipo === "step"){
      titolo.textContent = file.name;
      sotto.textContent = "File STEP ricevuto: l'anteprima 3D non è disponibile. Il prezzo lo calcoliamo noi.";
      $("[data-visore-misure]", f).textContent = "";
      barra.hidden = true;
    } else {
      calc.modello = r.modello;
      if(visore.gl){
        zona.hidden = true; tela.hidden = false; aiuto.hidden = false;
        caricaModello(r.modello);
      } else {
        titolo.textContent = file.name;
        sotto.textContent = "Il tuo browser non mostra il 3D, ma il prezzo è qui accanto.";
      }
    }
    if(file.size > maxInvio()){
      avviso.hidden = false;
      avviso.textContent = `Il file pesa ${(file.size / 1048576).toFixed(1).replace(".", ",")} MB, il massimo è ${mbMax()} MB: mandacelo con un link (Google Drive, WeTransfer...) dalla pagina Contatti.`;
      calc.file = null;
    }
    aggiornaConto();
    if(file.size > maxInvio()) avviso.hidden = false;
  }).catch(err => {
    zona.classList.remove("pieno"); zona.classList.add("errore");
    zona.hidden = false; tela.hidden = aiuto.hidden = true; barra.hidden = true;
    titolo.textContent = err.message === "grande" ? "Questo file è troppo grande da leggere" : "Non riesco a leggere questo file";
    sotto.textContent = err.message === "tipo" ? "Usa un file STL, 3MF, OBJ o STEP (non G-code)." : "Controlla che sia un modello 3D valido, oppure mandacelo con un link dalla pagina Contatti.";
    aggiornaConto();
  });
}

const mbMax = () => Math.round(maxInvio() / 1048576);
const testoZona = () => `oppure clicca per sceglierlo · STL, 3MF, OBJ o STEP · fino a ${mbMax()} MB`;

function avviaCalcolatore(){
  const f = $("#modulo-file");
  $("[data-zona-sotto]", f).textContent = testoZona();
  ["materiali", "qualita", "riempimento"].forEach(k => creaSegmenti(f, k));
  creaPallini($('[data-pallini="colore-file"]', f), 0, c => {
    calc.colore = c; visore.colore = hexInRgb(c.hex);
    $("[data-colore-nome]", f).textContent = c.nome;
    aggiornaConto(); richiediDisegno();
  });
  visore.colore = hexInRgb(calc.colore.hex);
  avviaContatore($("[data-contatore]", f), q => { calc.quantita = q; aggiornaConto(); });
  const scala = $("#campo-scala");
  scala.addEventListener("input", () => {
    calc.scala = +scala.value;
    scala.style.setProperty("--pieno", (scala.value - scala.min) / (scala.max - scala.min));
    aggiornaConto(); richiediDisegno();
  });
  scala.style.setProperty("--pieno", (scala.value - scala.min) / (scala.max - scala.min));

  avviaVisore($("#visore-tela"));

  // scegliere o trascinare il file
  const input = $("#campo-file"), area = $("#visore"), zona = $("#zona-file");
  input.addEventListener("change", () => mostraFile(input.files[0]));
  $("[data-visore-cambia]", f).addEventListener("click", () => input.click());
  ["dragenter", "dragover"].forEach(t => area.addEventListener(t, e => { e.preventDefault(); zona.classList.add("sopra"); area.classList.add("sopra"); }));
  ["dragleave", "dragend"].forEach(t => area.addEventListener(t, e => { if(!area.contains(e.relatedTarget)){ zona.classList.remove("sopra"); area.classList.remove("sopra"); } }));
  area.addEventListener("drop", e => {
    e.preventDefault();
    zona.classList.remove("sopra"); area.classList.remove("sopra");
    const file = e.dataTransfer.files[0];
    if(!file) return;
    try { input.files = e.dataTransfer.files; } catch(err){}
    mostraFile(file);
  });

  pagine.quandoCambia.push(p => { if(p === "carica") richiediDisegno(); });
  document.addEventListener("visibilitychange", richiediDisegno);

  // AVANTI: il file va nella cartella privata di Supabase, poi nel carrello, poi alla cassa
  const stato = $(".modulo-stato", f);
  f.addEventListener("submit", async e => {
    e.preventDefault();
    stato.className = "modulo-stato";
    const st = stima(), file = calc.file;
    if(!st || !st.sta || !file) return;
    const permesso = f.elements["accetto"];
    if(!permesso.checked){
      stato.classList.add("errore");
      stato.textContent = "Spunta la casella: il file deve essere tuo o devi avere il permesso di stamparlo.";
      permesso.focus();
      return;
    }
    if(!supabaseAttivo()){
      stato.classList.add("errore");
      stato.innerHTML = `Adesso non riusciamo a ricevere file dal sito: mandacelo per email a ${linkEmail()}.`;
      return;
    }
    const bottone = $("[data-file-avanti]", f);
    bottone.disabled = true;
    try {
      const percorso = await caricaSuSupabase(file, p => { bottone.textContent = `Carico il file… ${Math.round(p * 100)}%`; });
      aggiungiFileAlCarrello({
        file: percorso, nomeFile: file.name,
        materiale: calc.materiale.id, qualita: calc.qualita.id, riempimento: calc.riempimento.id,
        scala: calc.scala, colore: calc.colore.nome, pezzi: calc.quantita,
        dettagli: [calc.materiale.nome, `${calc.qualita.nome} ${calc.qualita.info}`, `riempimento ${calc.riempimento.info}`,
          calc.scala !== 100 ? `${calc.scala}%` : "", calc.colore.nome, `${calc.quantita} ${calc.quantita === 1 ? "pezzo" : "pezzi"}`,
          scriviMisure(st.misure), scriviPeso(st.grammi), scriviOre(st.ore)].filter(Boolean).join(" · "),
        prezzo: st.totale,
      });
      // si riparte da capo, il file e' nel carrello
      $("#campo-file").value = "";
      permesso.checked = false;
      mostraFile(null);
      location.hash = "#cassa";
    } catch(err){
      stato.classList.add("errore");
      stato.innerHTML = `Il file non è partito. Riprova, oppure mandacelo per email a ${linkEmail()}.`;
    }
    aggiornaConto();
  });
  aggiornaConto();
}

avviaCalcolatore();
