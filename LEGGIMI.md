# Print3DLab

Il sito del negozio di stampa 3D. Quando salvate una modifica su GitHub (branch `main`),
Netlify aggiorna il sito da solo in circa un minuto.

## Dove si cambia cosa
- **Prodotti, sezioni, modelli, prezzi, spedizioni, pagamenti, email**: `script.js`, in alto, dentro `NEGOZIO`.
- **Foto dei prodotti**: cartella `foto/` (poi scrivi il nome del file nel modello, es. `foto: "gatto.jpg"`).
- **Foto grandi della home**: cartella `vetrina/` e la lista `vetrina` in `script.js`.
- **Testi delle pagine** (domande, come funziona, condizioni, privacy): `index.html`.
- **Colori e stile**: `style.css`.

## Regole per lavorare in due senza pasticci
1. Prima di iniziare: **Fetch / Pull** (prendi le modifiche dell'altro).
2. Dopo aver finito: **Commit** con una frase che dice cosa hai cambiato, poi **Push**.
3. Non modificate lo **stesso file nello stesso momento**: ditevelo su WhatsApp.
4. Se qualcosa si rompe: su GitHub o su Netlify (Deploys) si torna alla versione di prima.

## Mai mettere qui dentro
- La **secret key** di Supabase o di Stripe, password, dati delle carte.
  Il sito e' pubblico: chiunque puo' leggere questi file.

## Supabase
- File 3D dei clienti: Supabase > Storage > `file-clienti`.
- Visite: Supabase > SQL Editor (le domande sono in fondo a `supabase-installazione.sql`).

## Pagamenti online (Stripe)
Tutti i passi sono in `STRIPE.md`. Le chiavi segrete di Stripe NON vanno mai nei file: solo nei Secrets di Supabase.
