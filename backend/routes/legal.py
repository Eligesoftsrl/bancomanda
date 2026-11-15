"""Pagina legale: informativa privacy (GDPR art. 13), cookie e dichiarazione AI Act."""
from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["Legal"])

PRIVACY_VERSION = "2026-11-13"
CONTROLLER = {
    "name": "Eligesoft srl",
    "vat": "04532690650",
    "address": "Via San Pietro 16, 84014 Nocera Inferiore (SA)",
    "email": "info@eligesoft.com",
}

PRIVACY_HTML = f"""<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Informativa privacy e cookie · Bancomanda</title>
    <meta name="robots" content="index,follow">
    <link rel="icon" type="image/png" href="/api/landing/assets/favicon.png">
    <link rel="stylesheet" href="/api/landing/assets/fonts.css">
    <style>
        :root {{ --primary: #f5595a; --navy: #141d2c; --text: #0f172a; --muted: #475569; --border: #e2e8f0; --bg: #faf9f6; }}
        * {{ box-sizing: border-box; }}
        body {{ margin: 0; font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); line-height: 1.65; }}
        header {{ background: var(--navy); padding: 1.25rem 1.5rem; }}
        header a {{ display: inline-flex; align-items: center; gap: 0.75rem; color: #fff; text-decoration: none; font-weight: 700; font-size: 1.15rem; }}
        header img {{ width: 36px; height: 36px; border-radius: 9px; }}
        main {{ max-width: 820px; margin: 0 auto; padding: 3rem 1.5rem 4rem; }}
        h1 {{ font-family: 'Playfair Display', serif; font-size: 2.4rem; line-height: 1.15; margin: 0 0 0.5rem; }}
        h2 {{ font-family: 'Playfair Display', serif; font-size: 1.35rem; margin: 2.5rem 0 0.75rem; padding-top: 1.5rem; border-top: 1px solid var(--border); }}
        p, li {{ color: var(--muted); font-size: 0.98rem; }}
        strong {{ color: var(--text); }}
        a {{ color: #c93d3e; }}
        .updated {{ color: var(--muted); font-size: 0.85rem; }}
        .card {{ background: #fff; border: 1px solid var(--border); border-left: 4px solid var(--primary); border-radius: 12px; padding: 1.25rem 1.5rem; margin: 1.5rem 0; }}
        table {{ width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem; background: #fff; }}
        th, td {{ border: 1px solid var(--border); padding: 0.65rem 0.8rem; text-align: left; vertical-align: top; color: var(--muted); }}
        th {{ background: #f2f0eb; color: var(--text); font-weight: 600; }}
        footer {{ text-align: center; color: var(--muted); font-size: 0.85rem; padding: 2rem 1rem; border-top: 1px solid var(--border); }}
        @media (max-width: 640px) {{ h1 {{ font-size: 1.9rem; }} table, thead, tbody, tr, th, td {{ display: block; }} th {{ display: none; }} td {{ border-top: none; }} tr {{ border-top: 1px solid var(--border); margin-bottom: 0.75rem; }} }}
    </style>
</head>
<body>
    <header><a href="/" data-testid="privacy-home-link"><img src="/api/landing/assets/favicon.png" alt="">Bancomanda</a></header>
    <main data-testid="privacy-page">
        <h1>Informativa privacy e cookie</h1>
        <p class="updated">Versione del {PRIVACY_VERSION} · ai sensi degli artt. 13 e 14 del Regolamento (UE) 2016/679 (GDPR) e del D.Lgs. 196/2003</p>

        <div class="card" data-testid="privacy-controller">
            <strong>Titolare del trattamento</strong><br>
            {CONTROLLER['name']} · Human Technology<br>
            P. IVA {CONTROLLER['vat']} · {CONTROLLER['address']}<br>
            Email: <a href="mailto:{CONTROLLER['email']}">{CONTROLLER['email']}</a>
        </div>

        <h2>1. Quali dati trattiamo e perché</h2>
        <table>
            <thead><tr><th>Dati</th><th>Finalità</th><th>Base giuridica</th><th>Conservazione</th></tr></thead>
            <tbody>
                <tr><td><strong>Richiesta demo</strong>: nome del locale, nome e cognome, email, telefono (facoltativo), messaggio</td><td>Ricontattarti e presentarti il servizio</td><td>Misure precontrattuali richieste da te (art. 6.1.b)</td><td>24 mesi dall'invio, poi cancellazione automatica</td></tr>
                <tr><td><strong>Registrazione del locale</strong>: nome del locale, nome, email, password (salvata solo in forma cifrata irreversibile)</td><td>Creare e gestire l'account, fornire il servizio</td><td>Esecuzione del contratto (art. 6.1.b)</td><td>Per tutta la durata del servizio e fino a 12 mesi dalla chiusura, salvo obblighi di legge</td></tr>
                <tr><td><strong>Dati tecnici di navigazione</strong>: indirizzo IP, data e ora, pagina richiesta, browser</td><td>Sicurezza del servizio, prevenzione di abusi e accessi non autorizzati</td><td>Legittimo interesse (art. 6.1.f)</td><td>Registri tecnici conservati per il tempo strettamente necessario (di norma non oltre 30 giorni)</td></tr>
            </tbody>
        </table>
        <p>Il conferimento dei dati contrassegnati come obbligatori è necessario per rispondere alla richiesta o per attivare il servizio. Non effettuiamo profilazione, non vendiamo i dati e non li usiamo per pubblicità.</p>

        <h2>2. Dati dei clienti dei ristoranti</h2>
        <p>I dati che ogni ristorante inserisce nell'app (per esempio nomi, telefoni e indirizzi dei propri clienti, ordini e note) appartengono al ristorante, che ne è <strong>titolare</strong>. Per questi dati {CONTROLLER['name']} agisce come <strong>responsabile del trattamento</strong> ai sensi dell'art. 28 GDPR, secondo le istruzioni del ristorante e un accordo sul trattamento dei dati disponibile su richiesta. I dati di ogni ristorante sono separati da quelli degli altri e accessibili solo con le credenziali di quel ristorante.</p>

        <h2>3. A chi comunichiamo i dati</h2>
        <p>I dati sono trattati dal personale autorizzato di {CONTROLLER['name']} e dai fornitori tecnici che ospitano il servizio, nominati responsabili del trattamento: <strong>Vercel Inc.</strong> (pubblicazione del sito) e <strong>Railway Corporation</strong> (server e database). Questi fornitori possono trattare dati anche fuori dall'Unione Europea: il trasferimento avviene sulla base di una decisione di adeguatezza della Commissione (EU-U.S. Data Privacy Framework) o delle Clausole Contrattuali Standard (art. 46 GDPR). I dati possono essere comunicati alle autorità solo se previsto dalla legge.</p>

        <h2>4. Sicurezza</h2>
        <p>Usiamo connessioni cifrate (HTTPS), password cifrate in modo irreversibile, blocco degli accessi dopo tentativi errati, separazione dei dati tra ristoranti e cifratura delle credenziali dei servizi collegati (per esempio i dati FTP per pubblicare il menu).</p>

        <h2>5. I tuoi diritti</h2>
        <p>Puoi chiedere in qualsiasi momento l'accesso ai tuoi dati, la rettifica, la cancellazione, la limitazione, la portabilità e opporti al trattamento basato sul legittimo interesse (artt. 15-22 GDPR), scrivendo a <a href="mailto:{CONTROLLER['email']}">{CONTROLLER['email']}</a>. Rispondiamo entro 30 giorni. Hai inoltre diritto di proporre reclamo al Garante per la protezione dei dati personali (<a href="https://www.garanteprivacy.it" rel="noopener" target="_blank">www.garanteprivacy.it</a>).</p>

        <h2 id="cookie">6. Cookie e archiviazione locale</h2>
        <p>Il sito <strong>non usa cookie di profilazione, pubblicitari o di statistica</strong> e non carica risorse da server di terze parti: caratteri e icone sono ospitati sui nostri server. Per questo non chiediamo alcun consenso: alla prima visita mostriamo solo un breve avviso informativo, la cui chiusura viene ricordata nel browser (Linee guida del Garante sui cookie del 10 giugno 2021).</p>
        <p>L'app per i ristoranti usa solo <strong>archiviazione tecnica</strong> nel browser o nel dispositivo (local storage) per mantenere l'accesso dell'utente e le sue preferenze: è strettamente necessaria al funzionamento e non richiede consenso (art. 122 D.Lgs. 196/2003). Puoi cancellarla in qualsiasi momento uscendo dall'account o dalle impostazioni del browser.</p>

        <h2 id="ai-act">7. Intelligenza artificiale (Regolamento UE 2024/1689 "AI Act")</h2>
        <p>Bancomanda <strong>non utilizza sistemi di intelligenza artificiale</strong>: ordini, report, menu e stampe sono prodotti con regole e calcoli definiti, senza modelli di IA e senza decisioni automatizzate che producano effetti giuridici sulle persone (art. 22 GDPR). Se in futuro introdurremo funzioni basate sull'IA, lo indicheremo chiaramente nell'app e in questa pagina, come richiesto dagli obblighi di trasparenza dell'AI Act.</p>

        <h2>8. Modifiche</h2>
        <p>Possiamo aggiornare questa informativa: la versione in vigore è sempre pubblicata su questa pagina con la data di aggiornamento.</p>
    </main>
    <footer>© 2026 {CONTROLLER['name']} · Human Technology · P. IVA {CONTROLLER['vat']} · {CONTROLLER['address']}</footer>
</body>
</html>"""


@router.get("/legal/privacy", response_class=HTMLResponse, include_in_schema=False)
async def privacy_page():
    return HTMLResponse(PRIVACY_HTML, headers={"Cache-Control": "public, max-age=3600"})
