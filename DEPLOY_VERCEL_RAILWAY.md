# Bancomanda su Vercel + Railway

Graficamente l'app resta identica. Cosa cambia:
- I tablet (iPad e Android) usano l'app **dal browser**, aggiunta alla schermata Home. Expo Go non serve più.
- Il database diventa tuo (MongoDB Atlas o MongoDB su Railway): i dati attuali vanno copiati con un passaggio a parte, solo quando decidi tu.

```
Tablet (Safari/Chrome) ──► Vercel  (frontend: cartella /frontend)
                              │  EXPO_PUBLIC_BACKEND_URL
                              ▼
                           Railway (backend: cartella /backend) ──► MongoDB
                              └─ /api/landing  (pagina pubblica)
                              └─ /api/admin    (pannello superadmin)
```

## 1. Database
Crea un database MongoDB (consigliato MongoDB Atlas) e copia la stringa di connessione (`mongodb+srv://...`).

## 2. Backend su Railway
1. New Project → Deploy from GitHub repo → scegli il repository.
2. Service → Settings → **Root Directory**: `backend`
3. Service → Variables: inserisci tutte le variabili di `backend/.env.example`
   - `RAILWAY_DOCKERFILE_PATH=Dockerfile.railway` (obbligatoria)
   - `JWT_SECRET`: stringa casuale nuova e lunga (non riusare quella di prova)
   - `CORS_ORIGINS`: l'indirizzo Vercel (dopo il punto 3), es. `https://bancomanda.vercel.app`
   - `BANCOMANDA_APP_URL`: lo stesso indirizzo Vercel: è dove portano i pulsanti "Accedi" della landing
   - `FTP_*`: solo se vuoi pubblicare il menu sul sito
4. Settings → Networking → **Generate Domain**. Annota l'indirizzo (es. `https://bancomanda-api.up.railway.app`).
5. Settings → Healthcheck Path: `/api/`

Nota: il Dockerfile avvia **un solo processo** (consigliato). Se aumenti worker o repliche, dopo un cambio password un vecchio accesso può restare valido al massimo 30 secondi.

Verifica: aprendo `https://<railway>/api/landing` deve comparire la landing.

## 3. Frontend su Vercel
1. Add New → Project → importa lo stesso repository.
2. **Root Directory**: `frontend` · Framework Preset: **Other** (build e output li legge da `frontend/vercel.json`).
3. Environment Variables: `EXPO_PUBLIC_BACKEND_URL` = indirizzo Railway del punto 2.4 (senza `/` finale).
4. Deploy. Se cambi `EXPO_PUBLIC_BACKEND_URL` serve un nuovo deploy (viene inserita in fase di build).

## 4. Sui tablet
- iPad: apri l'indirizzo Vercel in Safari → Condividi → **Aggiungi alla schermata Home**.
- Android: apri in Chrome → menu ⋮ → **Aggiungi a schermata Home** / Installa app.
- Primo accesso con l'email del locale; resta collegato finché non premi Esci.

## 5. Copia dei dati (solo con conferma)
Il passaggio dei dati dal database attuale a quello nuovo va fatto una volta, a locale chiuso.
Chiedilo esplicitamente: nessun dato viene copiato o modificato senza il tuo ok.

## File preparati
| File | A cosa serve |
| --- | --- |
| `frontend/vercel.json` | build web statica, cache, URL puliti |
| `frontend/.env.example` | variabile da impostare su Vercel |
| `backend/Dockerfile.railway` | immagine del backend per Railway |
| `backend/Dockerfile.railway.dockerignore` | esclude `.env` e test dall'immagine |
| `backend/.env.example` | elenco variabili da impostare su Railway |
