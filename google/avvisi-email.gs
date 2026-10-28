// =====================================================================
//  PRINT3DLAB · email quando arriva un ordine, un file o un messaggio
//  Va incollato in script.google.com (vedi i passi che ti ha dato Claude).
//  Manda l'email DALLA tua Gmail a tutte e due le email qui sotto.
// =====================================================================
const EMAIL = ["leo2013.caroccia@gmail.com", "leon.laszuk@gmail.com"];

const TITOLI = {
  "ordine": "🛒 Nuovo ordine",
  "file-da-stampare": "📦 Nuovo file da stampare",
  "contatto": "✉️ Nuovo messaggio",
};

// nomi piu' leggibili nell'email
const ETICHETTE = {
  "numero-ordine": "Numero ordine", "articoli": "Articoli", "subtotale": "Subtotale",
  "costo-spedizione": "Spedizione", "totale": "TOTALE", "spedizione": "Tipo di spedizione",
  "pagamento": "Pagamento", "nome": "Nome", "cognome": "Cognome", "email": "Email",
  "telefono": "Telefono", "via": "Via", "complemento": "Complemento", "npa": "NPA",
  "localita": "Località", "paese": "Paese", "note": "Note", "conosciuto": "Ci ha conosciuto con",
  "materiale": "Materiale", "qualita": "Qualità", "riempimento": "Riempimento", "colore": "Colore",
  "dimensioni": "Dimensioni", "peso-stimato": "Peso stimato", "tempo-stimato": "Tempo stimato",
  "prezzo-stimato": "Prezzo stimato", "scala": "Scala %", "quantita": "Pezzi",
  "file-online": "File su Supabase (Storage)", "link": "Link al modello", "consegna": "Consegna",
  "argomento": "Argomento", "messaggio": "Messaggio", "accetto": "Ha accettato le condizioni",
};

function doPost(e) {
  try {
    // massimo 40 email all'ora, cosi' nessuno vi riempie la casella
    const cache = CacheService.getScriptCache();
    const quante = Number(cache.get("quante") || 0);
    if (quante >= 40) return risposta("troppe");
    cache.put("quante", String(quante + 1), 3600);

    const d = JSON.parse(e.postData.contents);
    const modulo = String(d["form-name"] || "");
    if (!TITOLI[modulo] || d["campo-trappola"]) return risposta("no");

    let titolo = TITOLI[modulo];
    if (d["numero-ordine"]) titolo += " " + d["numero-ordine"];
    if (d["totale"]) titolo += " · " + d["totale"];
    if (d["nome"]) titolo += " · " + d["nome"] + " " + (d["cognome"] || "");

    const righe = Object.keys(d)
      .filter(k => k !== "form-name" && k !== "campo-trappola" && String(d[k]).trim() !== "")
      .map(k => (ETICHETTE[k] || k) + ": " + String(d[k]).slice(0, 3000));

    const opzioni = {
      to: EMAIL.join(","),
      subject: titolo.slice(0, 200),
      body: righe.join("\n") + "\n\n—\nTutti i dati sono anche su Netlify > Forms.",
    };
    // "Rispondi" risponde direttamente al cliente
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d["email"] || ""))) opzioni.replyTo = d["email"];
    MailApp.sendEmail(opzioni);
    return risposta("ok");
  } catch (err) {
    return risposta("errore");
  }
}

// per provare senza il sito: nel menu in alto scegli "prova" e premi Esegui
function prova() {
  doPost({ postData: { contents: JSON.stringify({ "form-name": "contatto", nome: "Prova", email: EMAIL[0], argomento: "Prova", messaggio: "Se leggi questa email, gli avvisi funzionano!" }) } });
}

function risposta(testo) {
  return ContentService.createTextOutput(testo);
}
