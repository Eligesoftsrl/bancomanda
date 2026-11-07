# Bancomanda su Vercel + Railway — dominio bancomanda.com

Graficamente l'app resta identica. Cosa cambia:
- I tablet (iPad e Android) usano l'app **dal browser**, aggiunta alla schermata Home. Expo Go non serve più.
- Il database diventa tuo (MongoDB Atlas o MongoDB su Railway): i dati attuali vanno copiati con un passaggio a parte, solo quando decidi tu.

## Gli indirizzi

| Indirizzo | Cosa si apre | Dove gira |
| --- | --- | --- |
| `bancomanda.com` (e `www.`) | Landing di presentazione | Vercel, progetto **landing** (cartella `landing-site`) |
| `bancomanda.com/admin` | Pannello superadmin | Vercel landing → inoltrato al server |
| `app.bancomanda.com` | App dei ristoranti (login + gestionale) | Vercel, progetto **app** (cartella `frontend`) |
| `xxx.up.railway.app` | Server (indirizzo gratuito di Railway, i clienti non lo vedono) | Railway (cartella `backend`) |

```
bancomanda.com ──(Vercel landing, inoltro)──┐
app.bancomanda.com ──(Vercel app)───────────┼──► xxx.up.railway.app (Railway) ──► MongoDB
```
La landing non è copiata: Vercel la prende dal server, quindi ogni modifica fatta al server compare subito anche su bancomanda.com.

**Ordine consigliato:** prima Railway (serve il suo indirizzo), poi i due progetti Vercel.

## 1. Database
Crea un database MongoDB (consigliato MongoDB Atlas) e copia la stringa di connessione (`mongodb+srv://...`).

## 2. Server su Railway
1. New Project → Deploy from GitHub repo → scegli il repository.
2. Service → Settings → **Root Directory**: `backend`
3. Service → Variables: inserisci le variabili di `backend/.env.example`
   - `RAILWAY_DOCKERFILE_PATH=Dockerfile.railway` (obbligatoria)
   - `JWT_SECRET`: stringa casuale nuova e lunga (non riusare quella di prova)
   - `CORS_ORIGINS=https://app.bancomanda.com`
   - `BANCOMANDA_APP_URL=https://app.bancomanda.com` (dove portano i pulsanti "Accedi" della landing)
   - `FTP_*`: solo se vuoi pubblicare il menu sul sito
4. Settings → Networking → **Generate Domain**: Railway crea un indirizzo tipo `bancomanda-production.up.railway.app`. **Copialo**: serve nei passi 3 e 4.
5. Settings → Healthcheck Path: `/api/`

Nota: il Dockerfile avvia **un solo processo** (consigliato). Se aumenti worker o repliche, dopo un cambio password un vecchio accesso può restare valido al massimo 30 secondi.

Verifica: aprendo l'indirizzo Railway deve comparire la landing.

## 3. App su Vercel → app.bancomanda.com
1. Add New → Project → importa il repository.
2. **Root Directory**: `frontend` · Framework Preset: **Other** (build e output li legge da `frontend/vercel.json`).
3. Environment Variables: `EXPO_PUBLIC_BACKEND_URL` = indirizzo Railway del punto 2.4, con `https://` e senza `/` finale.
4. Deploy, poi Settings → Domains → aggiungi `app.bancomanda.com` (Vercel ti mostra il record **CNAME**).
5. Se cambi `EXPO_PUBLIC_BACKEND_URL` serve un nuovo deploy (Deployments → ⋯ → Redeploy): viene inserita in fase di build.

## 4. Landing su Vercel → bancomanda.com
1. In `landing-site/vercel.json` sostituisci `INDIRIZZO-RAILWAY.up.railway.app` con l'indirizzo Railway (3 righe). Puoi chiederlo in chat: lo aggiorno io.
2. Add New → Project → importa **di nuovo** lo stesso repository (è un secondo progetto).
3. **Root Directory**: `landing-site` · Framework Preset: **Other**. Nessuna variabile da impostare.
4. Deploy, poi Settings → Domains → aggiungi `bancomanda.com` e `www.bancomanda.com` (scegli di reindirizzare `www` al dominio principale).
5. Scorciatoie già pronte: `bancomanda.com/admin` (pannello superadmin), `bancomanda.com/login` e `bancomanda.com/accedi` (portano all'app).

## 5. DNS dal tuo registrar
Solo 3 righe, tutte su bancomanda.com (i sottodomini sono gratuiti, non si comprano). Inserisci i valori che ti mostra Vercel:

| Nome | Tipo | Valore |
| --- | --- | --- |
| `@` (bancomanda.com) | A | quello indicato da Vercel (progetto landing) |
| `www` | CNAME | quello indicato da Vercel (progetto landing) |
| `app` | CNAME | quello indicato da Vercel (progetto app) |

Per Railway non serve nessuna riga DNS. La propagazione può richiedere da pochi minuti ad alcune ore; il certificato HTTPS lo crea Vercel da solo.

## 6. Sui tablet
- iPad: apri `app.bancomanda.com` in Safari → Condividi → **Aggiungi alla schermata Home**.
- Android: apri in Chrome → menu ⋮ → **Aggiungi a schermata Home** / Installa app.
- Primo accesso con l'email del locale; resta collegato finché non premi Esci.

## 7. Copia dei dati (solo con conferma)
Il passaggio dei dati dal database attuale a quello nuovo va fatto una volta, a locale chiuso.
Chiedilo esplicitamente: nessun dato viene copiato o modificato senza il tuo ok.

## Se cambia l'indirizzo Railway
Va aggiornato in due punti: variabile `EXPO_PUBLIC_BACKEND_URL` del progetto Vercel app (poi Redeploy) e `landing-site/vercel.json`.

## File preparati
| File | A cosa serve |
| --- | --- |
| `landing-site/vercel.json` | bancomanda.com → landing, /admin e /api inoltrati al server |
| `landing-site/public/robots.txt` | indicizzazione della landing (esclude /admin) |
| `frontend/vercel.json` | build web dell'app, cache, URL puliti |
| `frontend/.env.example` | variabile da impostare su Vercel (progetto app) |
| `backend/Dockerfile.railway` | immagine del server per Railway |
| `backend/Dockerfile.railway.dockerignore` | esclude `.env` e test dall'immagine |
| `backend/.env.example` | elenco variabili da impostare su Railway |
