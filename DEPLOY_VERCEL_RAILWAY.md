# Bancomanda su Vercel + Railway: tutto su bancomanda.com

Un solo dominio, nessun sottodominio:

| Indirizzo | Cosa si apre |
| --- | --- |
| `bancomanda.com` | Landing di presentazione |
| `bancomanda.com/app` | App dei ristoranti: login e gestionale (`/accedi` e `/login` portano qui) |
| `bancomanda.com/admin` | Pannello superadmin |
| `bancomanda.com/api/...` | Server (inoltrato in automatico a Railway, nessuno lo vede) |

```
bancomanda.com (Vercel) ── / ──────────► landing (dal server)
                         ── /app ──────► app (file su Vercel)
                         ── /api, /admin ► server su Railway (xxx.up.railway.app) ──► MongoDB
```
Graficamente l'app resta identica. I tablet la usano dal browser, aggiunta alla schermata Home: Expo Go non serve più.

**Ordine:** prima Railway (serve il suo indirizzo), poi Vercel.

## 1. Database
Crea un database MongoDB (consigliato MongoDB Atlas, gratuito per iniziare) e copia la stringa di connessione (`mongodb+srv://...`).

## 2. Server su Railway
1. New Project → Deploy from GitHub repo → scegli il repository.
2. Service → Settings → **Root Directory**: `backend`
3. Service → Variables: inserisci le variabili di `backend/.env.example`
   - `RAILWAY_DOCKERFILE_PATH=Dockerfile.railway` (obbligatoria)
   - `MONGO_URL`, `DB_NAME`: dal punto 1
   - `JWT_SECRET`: frase casuale nuova e lunga
   - `LEGACY_TENANT_*`: nome, email e password provvisoria del locale "storico" (Giorgio): è l'account che vedrà i dati copiati dal sistema attuale. Fino alla copia resta vuoto. Non usarlo per un locale demo.
   - `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`: il tuo accesso a `bancomanda.com/admin` (creato solo al primo avvio)
   - `FTP_*`: solo se vuoi pubblicare il menu sul sito
4. Settings → Networking → **Generate Domain**: Railway crea un indirizzo tipo `bancomanda-production.up.railway.app`.
   **Mandalo in chat**: lo inserisco io in `frontend/vercel.json` (oggi c'è il segnaposto `INDIRIZZO-RAILWAY`).
5. Settings → Healthcheck Path: `/api/`

## 3. Sito su Vercel → bancomanda.com
1. Prima: **Save to GitHub** dall'editor, così Vercel legge il `vercel.json` aggiornato.
2. Add New → Project → importa il repository.
3. **Root Directory**: `frontend` · Framework Preset: **Other**. Build, output e install li legge da `frontend/vercel.json`: lasciali vuoti.
4. **Nessuna variabile da inserire.**
5. Deploy, poi Settings → Domains → aggiungi `bancomanda.com` e `www.bancomanda.com` (scegli di reindirizzare `www` al dominio principale).

## 4. DNS dal tuo registrar
Solo 2 righe, con i valori che ti mostra Vercel:

| Nome | Tipo | Valore |
| --- | --- | --- |
| `@` (bancomanda.com) | A | quello indicato da Vercel |
| `www` | CNAME | quello indicato da Vercel |

Per Railway non serve nessuna riga DNS. Il certificato HTTPS lo crea Vercel da solo.

## 5. Sui tablet
- iPad: apri `bancomanda.com/app` in Safari → Condividi → **Aggiungi alla schermata Home**.
- Android: apri in Chrome → menu ⋮ → **Aggiungi a schermata Home** / Installa app.
- Primo accesso con l'email del locale; resta collegato finché non premi Esci.

## 6. Copia dei dati (solo con conferma)
Il passaggio dei dati dal database attuale a quello nuovo va fatto una volta, a locale chiuso.
Chiedilo esplicitamente: nessun dato viene copiato o modificato senza il tuo ok.

## Se cambia l'indirizzo Railway
Va aggiornato solo in `frontend/vercel.json` (3 righe), poi nuovo deploy su Vercel.

## File preparati
| File | A cosa serve |
| --- | --- |
| `frontend/vercel.json` | landing su `/`, app su `/app`, `/api` e `/admin` inoltrati al server |
| `frontend/scripts/vercel-postbuild.js` | sistema i file dell'app sotto `/app` durante la build |
| `frontend/app.config.js` | attiva il percorso `/app` solo nella build Vercel (anteprima ed Expo Go invariati) |
| `backend/Dockerfile.railway` | immagine del server per Railway |
| `backend/Dockerfile.railway.dockerignore` | esclude `.env` e test dall'immagine |
| `backend/.env.example` | elenco variabili da impostare su Railway |
