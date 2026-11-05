# Auth Testing Playbook (Bancomanda)

App Expo (iPad) → token Bearer, non cookie. Sessione: access token 60 min + refresh token rotante (365 giorni), salvato in SecureStore (native) / localStorage (web).

## Step 1: MongoDB
- `db.users.findOne({email: "titolare@giorgiobistrot.it"}, {password_hash: 1})` → hash bcrypt `$2b$`
- Indici: `users.email` unique, `login_attempts.identifier`

## Step 2: API
```
API=<EXPO_PUBLIC_BACKEND_URL>
curl -s -X POST $API/api/auth/login -H "Content-Type: application/json" -d '{"email":"titolare@pizzeria-napoli.it","password":"Password123!"}'
curl -s $API/api/auth/me -H "Authorization: Bearer <access_token>"
curl -s $API/api/orders -H "Authorization: Bearer <access_token>"
```
- Senza token, /api/orders → 401
- 5 password errate → 429 per 15 minuti (per IP+email)
- Isolamento: un locale non vede né modifica documenti di un altro (404)
