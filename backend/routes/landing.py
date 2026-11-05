"""
Landing page HTML per Bancó SaaS.
Pagina pubblica per presentare il prodotto e raccogliere richieste demo.
"""
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["Landing Page"])


def get_landing_html() -> str:
    """Generate the landing page HTML."""
    return '''<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bancó — Sistema Gestione Ordini per Ristoranti</title>
    <meta name="description" content="Bancó è il gestionale per ristoranti, bistrot e pizzerie italiane. Ordini, menu del giorno, stampa termica 62mm, cucina e porzionatura su iPad.">
    <meta name="keywords" content="gestionale ristorante, software ristorante, ordini ristorante, menu del giorno, stampa termica, iPad ristorante, POS ristorante">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            /* Light warm theme inspired by giorgiobistrot.it */
            --bg-main: #faf9f6;
            --bg-surface: #f5f3ef;
            --bg-elevated: #ffffff;
            --bg-card: #ffffff;
            --primary: #2d5a27;
            --primary-hover: #3d7a37;
            --primary-light: rgba(45, 90, 39, 0.1);
            --accent: #c4501c;
            --accent-light: rgba(196, 80, 28, 0.1);
            --text-primary: #1a1a1a;
            --text-secondary: #555555;
            --text-muted: #888888;
            --border-subtle: #e5e2dc;
            --border-dark: #d1cdc4;
            --success: #2d5a27;
            --danger: #c4501c;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
            font-family: 'Inter', system-ui, sans-serif;
            background: var(--bg-main);
            color: var(--text-secondary);
            line-height: 1.6;
            min-height: 100vh;
        }
        .serif { font-family: 'Playfair Display', Georgia, serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }

        /* Header */
        header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 100;
            background: rgba(250, 249, 246, 0.95);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--border-subtle);
            padding: 1rem 2rem;
        }
        .header-inner {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .logo {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            text-decoration: none;
        }
        .logo-icon {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 1.25rem;
        }
        .logo-text {
            font-family: 'Playfair Display', serif;
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary);
        }
        nav { display: flex; align-items: center; gap: 2rem; }
        nav a {
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.9rem;
            transition: color 0.2s;
        }
        nav a:hover { color: var(--primary); }
        .nav-buttons { display: flex; gap: 1rem; }
        .btn {
            padding: 0.6rem 1.25rem;
            border-radius: 8px;
            font-weight: 500;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }
        .btn-outline {
            background: transparent;
            border: 1px solid var(--border-dark);
            color: var(--text-primary);
        }
        .btn-outline:hover {
            background: var(--bg-surface);
            border-color: var(--primary);
            color: var(--primary);
        }
        .btn-primary {
            background: var(--primary);
            color: white;
        }
        .btn-primary:hover { background: var(--primary-hover); }

        /* Hero */
        .hero {
            min-height: 100vh;
            display: flex;
            align-items: center;
            padding: 8rem 2rem 4rem;
            position: relative;
            overflow: hidden;
        }
        .hero::before {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 60%;
            height: 100%;
            background: radial-gradient(ellipse at top right, rgba(45, 90, 39, 0.05) 0%, transparent 60%);
            pointer-events: none;
        }
        .hero-inner {
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4rem;
            align-items: center;
        }
        .hero-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: var(--primary-light);
            border: 1px solid rgba(45, 90, 39, 0.2);
            border-radius: 9999px;
            color: var(--primary);
            font-size: 0.8rem;
            font-weight: 500;
            margin-bottom: 1.5rem;
        }
        .hero h1 {
            font-size: clamp(2.5rem, 5vw, 3.5rem);
            color: var(--text-primary);
            line-height: 1.1;
            margin-bottom: 1.5rem;
        }
        .hero-desc {
            font-size: 1.125rem;
            color: var(--text-secondary);
            margin-bottom: 2rem;
            max-width: 500px;
        }
        .hero-buttons { display: flex; gap: 1rem; flex-wrap: wrap; }
        .hero-buttons .btn { padding: 0.875rem 1.75rem; font-size: 1rem; }

        /* Thermal Receipt Simulator */
        .thermal-receipt {
            background: #fffef8;
            color: #1a1a1a;
            padding: 1.5rem;
            border-radius: 4px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            max-width: 280px;
            margin-left: auto;
            transform: rotate(2deg);
            border: 1px solid var(--border-subtle);
        }
        .receipt-header {
            text-align: center;
            border-bottom: 1px dashed #ccc;
            padding-bottom: 0.75rem;
            margin-bottom: 0.75rem;
        }
        .receipt-header h3 { font-size: 1rem; font-weight: 600; }
        .receipt-header p { font-size: 0.65rem; color: #666; margin-top: 0.25rem; }
        .receipt-item {
            display: flex;
            justify-content: space-between;
            padding: 0.25rem 0;
        }
        .receipt-item span:first-child { flex: 1; }
        .receipt-total {
            border-top: 1px dashed #ccc;
            margin-top: 0.5rem;
            padding-top: 0.5rem;
            font-weight: 600;
        }
        .receipt-footer {
            text-align: center;
            margin-top: 1rem;
            font-size: 0.6rem;
            color: #888;
        }

        /* Features Section */
        .features {
            padding: 6rem 2rem;
            background: var(--bg-surface);
        }
        .section-inner {
            max-width: 1200px;
            margin: 0 auto;
        }
        .section-header {
            text-align: center;
            margin-bottom: 4rem;
        }
        .section-header h2 {
            font-size: clamp(2rem, 4vw, 2.75rem);
            color: var(--text-primary);
            margin-bottom: 1rem;
        }
        .section-header p {
            font-size: 1.125rem;
            max-width: 600px;
            margin: 0 auto;
        }
        .bento-grid {
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            gap: 1.5rem;
        }
        .bento-card {
            background: var(--bg-card);
            border: 1px solid var(--border-subtle);
            border-radius: 16px;
            padding: 2rem;
            transition: all 0.3s;
        }
        .bento-card:hover {
            border-color: var(--primary);
            transform: translateY(-4px);
            box-shadow: 0 10px 40px -10px rgba(45, 90, 39, 0.15);
        }
        .bento-card.large { grid-column: span 8; }
        .bento-card.medium { grid-column: span 6; }
        .bento-card.small { grid-column: span 4; }
        .bento-icon {
            width: 48px;
            height: 48px;
            background: var(--primary-light);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--primary);
            font-size: 1.25rem;
            margin-bottom: 1.25rem;
        }
        .bento-card h3 {
            font-size: 1.25rem;
            color: var(--text-primary);
            margin-bottom: 0.75rem;
        }
        .bento-card p {
            font-size: 0.95rem;
            color: var(--text-secondary);
        }

        /* Demo Form Section */
        .demo-section {
            padding: 6rem 2rem;
            background: var(--bg-main);
        }
        .demo-inner {
            max-width: 800px;
            margin: 0 auto;
        }
        .demo-form-card {
            background: var(--bg-card);
            border: 1px solid var(--border-subtle);
            border-radius: 20px;
            padding: 3rem;
            box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08);
        }
        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
        }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .form-group.full { grid-column: span 2; }
        .form-group label {
            font-size: 0.875rem;
            color: var(--text-secondary);
            font-weight: 500;
        }
        .form-group input, .form-group textarea {
            background: var(--bg-surface);
            border: 1px solid var(--border-subtle);
            border-radius: 10px;
            padding: 0.875rem 1rem;
            color: var(--text-primary);
            font-size: 1rem;
            font-family: inherit;
            transition: border-color 0.2s;
        }
        .form-group input:focus, .form-group textarea:focus {
            outline: none;
            border-color: var(--primary);
        }
        .form-group textarea { resize: vertical; min-height: 100px; }
        .form-submit {
            margin-top: 2rem;
            display: flex;
            justify-content: center;
        }
        .form-submit .btn { padding: 1rem 2.5rem; font-size: 1rem; }
        .form-alert {
            margin-top: 1.5rem;
            padding: 1rem;
            border-radius: 10px;
            text-align: center;
            display: none;
        }
        .form-alert.success {
            background: rgba(45, 90, 39, 0.1);
            border: 1px solid rgba(45, 90, 39, 0.3);
            color: var(--success);
        }
        .form-alert.error {
            background: rgba(196, 80, 28, 0.1);
            border: 1px solid rgba(196, 80, 28, 0.3);
            color: var(--danger);
        }

        /* FAQ Section */
        .faq-section {
            padding: 6rem 2rem;
            background: var(--bg-surface);
        }
        .faq-list { max-width: 800px; margin: 0 auto; }
        .faq-item {
            border-bottom: 1px solid var(--border-subtle);
            padding: 1.5rem 0;
        }
        .faq-question {
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            color: var(--text-primary);
            font-size: 1.1rem;
            font-weight: 500;
        }
        .faq-question i { color: var(--primary); transition: transform 0.3s; }
        .faq-item.active .faq-question i { transform: rotate(180deg); }
        .faq-answer {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease, padding 0.3s;
            color: var(--text-secondary);
        }
        .faq-item.active .faq-answer {
            max-height: 500px;
            padding-top: 1rem;
        }

        /* Footer */
        footer {
            padding: 4rem 2rem 2rem;
            background: var(--bg-main);
            border-top: 1px solid var(--border-subtle);
        }
        .footer-inner {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 2rem;
        }
        .footer-left p { color: var(--text-muted); font-size: 0.875rem; }
        .footer-links { display: flex; gap: 2rem; }
        .footer-links a {
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.875rem;
            transition: color 0.2s;
        }
        .footer-links a:hover { color: var(--primary); }

        /* Register Modal */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 200;
            padding: 2rem;
        }
        .modal-overlay.active { display: flex; }
        .modal-content {
            background: var(--bg-card);
            border: 1px solid var(--border-subtle);
            border-radius: 20px;
            padding: 2.5rem;
            width: 100%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.2);
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }
        .modal-header h2 {
            font-size: 1.5rem;
            color: var(--text-primary);
        }
        .modal-close {
            background: none;
            border: none;
            color: var(--text-muted);
            font-size: 1.5rem;
            cursor: pointer;
            transition: color 0.2s;
        }
        .modal-close:hover { color: var(--text-primary); }

        /* Responsive */
        @media (max-width: 1024px) {
            .hero-inner { grid-template-columns: 1fr; text-align: center; }
            .hero-desc { margin: 0 auto 2rem; }
            .hero-buttons { justify-content: center; }
            .thermal-receipt { margin: 2rem auto 0; transform: rotate(0); }
            .bento-card.large, .bento-card.medium, .bento-card.small { grid-column: span 12; }
            nav { display: none; }
        }
        @media (max-width: 640px) {
            .form-grid { grid-template-columns: 1fr; }
            .form-group.full { grid-column: span 1; }
            .footer-inner { flex-direction: column; text-align: center; }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header>
        <div class="header-inner">
            <a href="/" class="logo" data-testid="landing-header-logo">
                <div class="logo-icon">B</div>
                <span class="logo-text">Bancó</span>
            </a>
            <nav>
                <a href="#features" data-testid="nav-link-features">Funzionalità</a>
                <a href="#thermal" data-testid="nav-link-thermal">Stampa 62mm</a>
                <a href="#demo" data-testid="nav-link-demo">Demo</a>
                <a href="#faq" data-testid="nav-link-faq">FAQ</a>
            </nav>
            <div class="nav-buttons">
                <a href="#demo" class="btn btn-outline" data-testid="cta-button-demo-header">Richiedi Demo</a>
                <button class="btn btn-primary" onclick="openRegisterModal()" data-testid="cta-button-register-header">Registrati</button>
            </div>
        </div>
    </header>

    <!-- Hero -->
    <section class="hero">
        <div class="hero-inner">
            <div class="hero-content">
                <div class="hero-badge">
                    <i class="fas fa-utensils"></i>
                    SaaS per Ristoranti Italiani
                </div>
                <h1 class="serif" data-testid="hero-title">La gestione ordini che il tuo bistrot meritava.</h1>
                <p class="hero-desc">
                    Bancó è il gestionale pensato per ristoranti, pizzerie e bistrot. 
                    Ordini al banco, menu del giorno, stampa termica 62mm, vista cucina e porzionatura. 
                    Tutto su iPad, sincronizzato in tempo reale.
                </p>
                <div class="hero-buttons">
                    <a href="#demo" class="btn btn-primary" data-testid="hero-cta-demo">
                        <i class="fas fa-calendar-check"></i> Richiedi una Demo
                    </a>
                    <button class="btn btn-outline" onclick="openRegisterModal()" data-testid="hero-cta-register">
                        <i class="fas fa-rocket"></i> Inizia Gratis
                    </button>
                </div>
            </div>
            <div class="hero-visual">
                <div class="thermal-receipt" data-testid="thermal-simulator-box">
                    <div class="receipt-header">
                        <h3>ORDINE #127</h3>
                        <p>Banco • Da Ritirare • 13:30</p>
                    </div>
                    <div class="receipt-body">
                        <div class="receipt-item">
                            <span>2x Risotto alla zucca</span>
                            <span>€14.00</span>
                        </div>
                        <div class="receipt-item">
                            <span>1x Tagliata di manzo</span>
                            <span>€16.00</span>
                        </div>
                        <div class="receipt-item">
                            <span>1x Tiramisu</span>
                            <span>€5.00</span>
                        </div>
                        <div class="receipt-item receipt-total">
                            <span>TOTALE</span>
                            <span>€35.00</span>
                        </div>
                    </div>
                    <div class="receipt-footer">
                        Stampato da Bancó • 05/11/2026 13:15
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Features -->
    <section class="features" id="features">
        <div class="section-inner">
            <div class="section-header">
                <h2 class="serif">Tutto quello che serve al tuo locale</h2>
                <p>Gestisci ordini, menu e cucina da un'unica piattaforma pensata per la ristorazione italiana.</p>
            </div>
            <div class="bento-grid">
                <div class="bento-card large">
                    <div class="bento-icon"><i class="fas fa-clipboard-list"></i></div>
                    <h3>Ordini in Tempo Reale</h3>
                    <p>Prendi ordini al banco, per telefono o WhatsApp. Ogni ordine è visibile su tutti gli iPad del locale, con stato aggiornato in tempo reale. Gestisci consegne, ritiri e servizio in sala da un'unica interfaccia.</p>
                </div>
                <div class="bento-card small" id="thermal">
                    <div class="bento-icon"><i class="fas fa-print"></i></div>
                    <h3>Stampa 62mm</h3>
                    <p>Stampa comande e scontrini su stampanti termiche ESC/POS con layout ottimizzato per etichette 62mm.</p>
                </div>
                <div class="bento-card medium">
                    <div class="bento-icon"><i class="fas fa-utensils"></i></div>
                    <h3>Menu del Giorno</h3>
                    <p>Pubblica il menu del giorno sul tuo sito web con un click. I clienti vedono sempre i piatti disponibili e le porzioni rimanenti.</p>
                </div>
                <div class="bento-card medium">
                    <div class="bento-icon"><i class="fas fa-fire-burner"></i></div>
                    <h3>Vista Cucina</h3>
                    <p>La cucina vede tutti i piatti da preparare aggregati per tipo. Ogni porzione ha il suo stato: in attesa, in preparazione, pronto.</p>
                </div>
                <div class="bento-card small">
                    <div class="bento-icon"><i class="fas fa-users"></i></div>
                    <h3>Anagrafica Clienti</h3>
                    <p>Registra i clienti abituali con storico ordini e preferenze.</p>
                </div>
                <div class="bento-card small">
                    <div class="bento-icon"><i class="fas fa-tablet-alt"></i></div>
                    <h3>Multi-iPad</h3>
                    <p>Usa più iPad contemporaneamente: banco, cucina, sala. Tutto sincronizzato.</p>
                </div>
                <div class="bento-card small">
                    <div class="bento-icon"><i class="fas fa-chart-pie"></i></div>
                    <h3>Report & Incassi</h3>
                    <p>Vendite giornaliere, piatti più richiesti, vendite mancate.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Demo Request -->
    <section class="demo-section" id="demo">
        <div class="demo-inner">
            <div class="section-header">
                <h2 class="serif">Richiedi una Demo</h2>
                <p>Compila il modulo e ti contatteremo per mostrarti Bancó in azione nel tuo locale.</p>
            </div>
            <div class="demo-form-card">
                <form id="demoForm" data-testid="demo-request-form">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="restaurant_name">Nome del Locale *</label>
                            <input type="text" id="restaurant_name" name="restaurant_name" required 
                                   placeholder="Es. Trattoria da Mario" data-testid="input-restaurant-name">
                        </div>
                        <div class="form-group">
                            <label for="contact_name">Nome Referente *</label>
                            <input type="text" id="contact_name" name="contact_name" required 
                                   placeholder="Es. Mario Rossi" data-testid="input-contact-name">
                        </div>
                        <div class="form-group">
                            <label for="email">Email *</label>
                            <input type="email" id="email" name="email" required 
                                   placeholder="email@esempio.it" data-testid="input-email">
                        </div>
                        <div class="form-group">
                            <label for="phone">Telefono</label>
                            <input type="tel" id="phone" name="phone" 
                                   placeholder="333 123 4567" data-testid="input-phone">
                        </div>
                        <div class="form-group full">
                            <label for="message">Messaggio</label>
                            <textarea id="message" name="message" 
                                      placeholder="Raccontaci del tuo locale e cosa vorresti migliorare..." 
                                      data-testid="input-message"></textarea>
                        </div>
                    </div>
                    <div class="form-submit">
                        <button type="submit" class="btn btn-primary" data-testid="demo-form-submit-button">
                            <i class="fas fa-paper-plane"></i> Invia Richiesta
                        </button>
                    </div>
                </form>
                <div id="formAlert" class="form-alert" data-testid="demo-form-success-alert"></div>
            </div>
        </div>
    </section>

    <!-- FAQ -->
    <section class="faq-section" id="faq">
        <div class="section-inner">
            <div class="section-header">
                <h2 class="serif">Domande Frequenti</h2>
            </div>
            <div class="faq-list">
                <div class="faq-item" data-testid="faq-accordion-item-0">
                    <div class="faq-question" onclick="toggleFaq(this)">
                        <span>Quali stampanti termiche sono compatibili?</span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="faq-answer">
                        Bancó funziona con tutte le stampanti termiche ESC/POS che supportano rotoli da 62mm. 
                        Abbiamo testato con successo Brother QL-820NWB, Epson TM-T20III e molte altre. 
                        La stampa avviene via browser, senza bisogno di driver speciali.
                    </div>
                </div>
                <div class="faq-item" data-testid="faq-accordion-item-1">
                    <div class="faq-question" onclick="toggleFaq(this)">
                        <span>Funziona su iPad e tablet Android?</span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="faq-answer">
                        Sì! Bancó è ottimizzato per iPad (consigliato) ma funziona anche su tablet Android. 
                        Puoi usare più dispositivi contemporaneamente: uno al banco, uno in cucina, uno per le consegne.
                    </div>
                </div>
                <div class="faq-item" data-testid="faq-accordion-item-2">
                    <div class="faq-question" onclick="toggleFaq(this)">
                        <span>E se la connessione cade?</span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="faq-answer">
                        Il sistema si sincronizza automaticamente quando la connessione torna attiva. 
                        Gli ordini già inseriti restano visibili e la coda di stampa riprende da sola.
                    </div>
                </div>
                <div class="faq-item">
                    <div class="faq-question" onclick="toggleFaq(this)">
                        <span>Come funziona la pubblicazione del menu sul sito?</span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="faq-answer">
                        Bancó genera un file JSON con il menu del giorno e lo pubblica sul tuo sito via FTP. 
                        Il tuo sito web può leggere questo file e mostrare sempre il menu aggiornato con prezzi e disponibilità.
                    </div>
                </div>
                <div class="faq-item">
                    <div class="faq-question" onclick="toggleFaq(this)">
                        <span>Quanto costa Bancó?</span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="faq-answer">
                        Offriamo una prova gratuita di 30 giorni senza impegno. 
                        Richiedi una demo per scoprire i piani tariffari adatti al tuo locale.
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer>
        <div class="footer-inner">
            <div class="footer-left">
                <div class="logo" style="margin-bottom: 1rem;">
                    <div class="logo-icon">B</div>
                    <span class="logo-text">Bancó</span>
                </div>
                <p>© 2026 Bancó. Sistema gestionale per la ristorazione italiana.</p>
            </div>
            <div class="footer-links">
                <a href="#features">Funzionalità</a>
                <a href="#demo">Richiedi Demo</a>
                <a href="#faq">FAQ</a>
                <a href="mailto:info@banco.app">Contatti</a>
            </div>
        </div>
    </footer>

    <!-- Register Modal -->
    <div class="modal-overlay" id="registerModal" data-testid="modal-self-register">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="serif">Registra il tuo Ristorante</h2>
                <button class="modal-close" onclick="closeRegisterModal()">&times;</button>
            </div>
            <form id="registerForm">
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label for="reg_tenant_name">Nome del Locale *</label>
                    <input type="text" id="reg_tenant_name" required placeholder="Es. Trattoria da Mario">
                </div>
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label for="reg_tenant_slug">Identificativo (slug) *</label>
                    <input type="text" id="reg_tenant_slug" required placeholder="es. trattoria-mario" 
                           pattern="[a-z0-9-]+" title="Solo lettere minuscole, numeri e trattini">
                    <small style="color: var(--text-muted); font-size: 0.75rem;">
                        Usato per l'URL del tuo locale (solo lettere minuscole, numeri, trattini)
                    </small>
                </div>
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label for="reg_name">Il tuo Nome *</label>
                    <input type="text" id="reg_name" required placeholder="Mario Rossi">
                </div>
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label for="reg_email">Email *</label>
                    <input type="email" id="reg_email" required placeholder="email@esempio.it">
                </div>
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label for="reg_password">Password *</label>
                    <input type="password" id="reg_password" required minlength="8" placeholder="Minimo 8 caratteri">
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">
                    <i class="fas fa-rocket"></i> Crea Account
                </button>
            </form>
            <div id="registerAlert" class="form-alert" style="margin-top: 1rem;"></div>
        </div>
    </div>

    <script>
        // Demo form submission
        document.getElementById('demoForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const btn = this.querySelector('button[type="submit"]');
            const alert = document.getElementById('formAlert');
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Invio...';
            
            const data = {
                restaurant_name: this.restaurant_name.value,
                contact_name: this.contact_name.value,
                email: this.email.value,
                phone: this.phone.value || null,
                message: this.message.value || null
            };
            
            try {
                const resp = await fetch('/api/public/demo-request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (resp.ok) {
                    alert.className = 'form-alert success';
                    alert.textContent = 'Richiesta inviata con successo! Ti contatteremo presto.';
                    alert.style.display = 'block';
                    this.reset();
                } else if (resp.status === 429) {
                    alert.className = 'form-alert error';
                    alert.textContent = 'Hai già inviato una richiesta nelle ultime 24 ore.';
                    alert.style.display = 'block';
                } else {
                    throw new Error('Errore server');
                }
            } catch (err) {
                alert.className = 'form-alert error';
                alert.textContent = 'Si è verificato un errore. Riprova più tardi.';
                alert.style.display = 'block';
            }
            
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Invia Richiesta';
        });

        // Register form
        document.getElementById('registerForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const btn = this.querySelector('button[type="submit"]');
            const alert = document.getElementById('registerAlert');
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrazione...';
            
            const data = {
                tenant_name: document.getElementById('reg_tenant_name').value,
                tenant_slug: document.getElementById('reg_tenant_slug').value.toLowerCase(),
                name: document.getElementById('reg_name').value,
                email: document.getElementById('reg_email').value,
                password: document.getElementById('reg_password').value
            };
            
            try {
                const resp = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await resp.json();
                
                if (resp.ok) {
                    alert.className = 'form-alert success';
                    alert.innerHTML = '<strong>Account creato!</strong><br>Il tuo locale è in attesa di approvazione. Ti invieremo una email quando sarà attivo.';
                    alert.style.display = 'block';
                    this.reset();
                } else {
                    alert.className = 'form-alert error';
                    alert.textContent = result.detail || 'Errore durante la registrazione.';
                    alert.style.display = 'block';
                }
            } catch (err) {
                alert.className = 'form-alert error';
                alert.textContent = 'Si è verificato un errore. Riprova più tardi.';
                alert.style.display = 'block';
            }
            
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-rocket"></i> Crea Account';
        });

        // FAQ toggle
        function toggleFaq(el) {
            const item = el.parentElement;
            item.classList.toggle('active');
        }

        // Modal functions
        function openRegisterModal() {
            document.getElementById('registerModal').classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        function closeRegisterModal() {
            document.getElementById('registerModal').classList.remove('active');
            document.body.style.overflow = '';
        }
        document.getElementById('registerModal').addEventListener('click', function(e) {
            if (e.target === this) closeRegisterModal();
        });

        // Smooth scroll for nav links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    </script>
</body>
</html>'''


@router.get("/", response_class=HTMLResponse)
async def landing_page():
    """Serve the public landing page."""
    return HTMLResponse(content=get_landing_html())


@router.get("/landing", response_class=HTMLResponse)
async def landing_page_alt():
    """Alternative route for landing page."""
    return HTMLResponse(content=get_landing_html())
