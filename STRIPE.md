# Pagare online con Stripe: come si accende

Il codice è già pronto. Quando Stripe è acceso, chi sceglie **Twint** o **carta** paga subito sulla pagina sicura di Stripe. Il sito non vede mai i dati della carta. PayPal resta come prima: il link lo mandate voi.

Finché in `script.js` c'è `stripe: { attivo: false … }`, il sito funziona come prima.

**Regole importanti**
- L'account Stripe lo apre **un genitore** (bisogna avere almeno 18 anni). I soldi arrivano sul **suo** conto.
- Le chiavi che iniziano con `sk_`, `rk_` e `whsec_` sono **segrete**. Non vanno MAI nel sito, su GitHub o in chat. Stanno solo nei *Secrets* di Supabase.

---

## 1. Il genitore apre l'account (si parte in modalità PROVA)
1. https://dashboard.stripe.com/register → paese **Svizzera**.
2. Si può subito provare in **modalità test** (sandbox), senza documento né IBAN. In test i soldi sono finti.
3. **Impostazioni → Metodi di pagamento** → accendi **TWINT**. Carte, Apple Pay e Google Pay sono già accesi.

## 2. La funzione su Supabase
Lo fa chi è *Owner* del progetto Supabase (l'amico), oppure Leo se ha il permesso.
1. Supabase → progetto → **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Nome: `pagamento` (proprio così, minuscolo).
3. Cancella il codice di esempio, incolla **tutto** `supabase/functions/pagamento/index.ts` e premi **Deploy**.
4. Apri la funzione → **Details / Settings** → spegni **Enforce JWT verification** (o "Verify JWT") → **Save**.
   *(Serve perché il sito e Stripe la chiamano senza login. La funzione controlla da sola da dove arrivano le richieste e la firma di Stripe.)*
5. Per i **file caricati dai clienti** la funzione scarica il file dalla cartella privata e rifà il prezzo. Usa `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, che Supabase dà già da solo a ogni funzione: non serve fare niente.

## 3. La chiave segreta (la copia il genitore)
1. Stripe (in modalità test) → **Sviluppatori → Chiavi API** → copia la **Chiave segreta** (`sk_test_…`).
2. Supabase → **Edge Functions → Secrets** → **Add new secret**:
   - Name: `STRIPE_SECRET_KEY`
   - Value: la chiave appena copiata
   - → **Save**

## 4. L'email "💰 PAGATO" (webhook)
1. Stripe → **Sviluppatori → Webhook** → **Aggiungi destinazione / endpoint**.
2. Eventi: `checkout.session.completed` e `checkout.session.async_payment_succeeded`.
3. URL: `https://psnfyxwlpasawkcxrzpe.supabase.co/functions/v1/pagamento`
4. Salva, poi apri il webhook e copia la **chiave di firma** (`whsec_…`).
5. Supabase → **Edge Functions → Secrets** → nuovo secret `STRIPE_WEBHOOK_SECRET` = quella chiave → **Save**.
6. Google Apps Script (account del papà) → incolla di nuovo `google/avvisi-email.gs` (ha la riga nuova "pagato") → **Esegui il deployment → Gestisci deployment → matita → Versione: Nuova versione → Esegui il deployment**. L'indirizzo resta uguale.

## 5. Accendere il sito e provare
1. In `script.js` metti `attivo: true` nella riga `stripe:` (oppure chiedi a Claude: "accendi Stripe"; sistema anche i testi su pagamenti e condizioni).
2. Fai un ordine sul sito con carta e paga con la carta di prova di Stripe:
   `4242 4242 4242 4242` · una data futura qualsiasi · CVC `123`
3. Devono succedere tre cose:
   - si vede "Pagamento ricevuto";
   - arriva l'email "💰 PAGATO … (PROVA)" a tutti e due;
   - il pagamento compare su Stripe nella modalità test.

## 6. Soldi veri
1. Il genitore completa l'account Stripe (documento, IBAN, telefono) e spegne la modalità test.
2. Copia la chiave **live** (`sk_live_…`) e mettila al posto di quella vecchia in `STRIPE_SECRET_KEY`.
3. Rifà il webhook del punto 4 in modalità live: è un altro webhook, con un'altra `whsec_…`, e va messo al posto di quella vecchia.
4. Fate un ordine vero piccolo per controllare, poi rimborsatelo da Stripe.

**Se cambiate dominio** (per esempio print3dlab.ch): in Supabase aggiungete il secret `SITO` = `https://print3dlab.ch`.

---

**Come funziona (per i curiosi)**
1. Il sito salva l'ordine su Netlify e manda le email come sempre.
2. Poi chiede alla funzione di aprire il pagamento.
3. La funzione legge i prezzi **veri** da `script.js` sul sito, così nessuno può pagare 1 centesimo modificando il browser, e crea la pagina di Stripe.
4. Dopo il pagamento Stripe chiama il webhook, e la funzione vi manda l'email "PAGATO".
5. Il numero d'ordine (P3D-…) è lo stesso su Netlify, nelle email e su Stripe.
