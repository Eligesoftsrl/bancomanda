"""
Landing page HTML per Bancomanda SaaS.
Pagina pubblica con animazioni e immagini.
"""
import os
from html import escape
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, FileResponse

router = APIRouter(tags=["Landing Page"])
ASSETS_DIR = (Path(__file__).resolve().parent.parent / "static" / "landing").resolve()


@router.get("/landing/assets/{name}")
async def landing_asset(name: str):
    path = (ASSETS_DIR / name).resolve()
    if path.parent != ASSETS_DIR or not path.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(path, headers={"Cache-Control": "public, max-age=86400"})


def get_landing_html() -> str:
    """Generate the landing page HTML with animations."""
    return '''<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bancomanda — Sistema Gestione Ordini per Ristoranti</title>
    <meta name="description" content="Bancomanda è il gestionale per ristoranti, bistrot e pizzerie italiane. Ordini, menu del giorno, stampa termica 62mm, cucina e porzionatura su iPad e tablet Android.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
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
            overflow-x: hidden;
        }
        .serif { font-family: 'Playfair Display', Georgia, serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }

        /* Animations */
        @keyframes blob-drift {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -20px) scale(1.05); }
            66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes float-slow {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(2deg); }
        }
        @keyframes pulse-dot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.2); }
        }
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        .blob-drift { animation: blob-drift 20s ease-in-out infinite; }
        .float-slow { animation: float-slow 6s ease-in-out infinite; }
        .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
        .fade-in { animation: fade-in-up 0.8s ease-out forwards; opacity: 0; }
        .fade-in-delay-1 { animation-delay: 0.1s; }
        .fade-in-delay-2 { animation-delay: 0.2s; }
        .fade-in-delay-3 { animation-delay: 0.3s; }
        .fade-in-delay-4 { animation-delay: 0.4s; }
        .marquee { animation: marquee 30s linear infinite; }

        /* Header */
        header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 100;
            background: rgba(250, 249, 246, 0.9);
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
            border-radius: 9999px;
            font-weight: 600;
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
            border: 1px solid var(--border-subtle);
            color: var(--text-primary);
        }
        .btn-outline:hover {
            background: var(--bg-surface);
            border-color: var(--primary);
            color: var(--primary);
            transform: translateY(-2px);
        }
        .btn-primary {
            background: var(--primary);
            color: white;
            box-shadow: 0 10px 25px -5px rgba(45, 90, 39, 0.3);
        }
        .btn-primary:hover { 
            background: var(--primary-hover); 
            transform: translateY(-2px);
            box-shadow: 0 15px 30px -5px rgba(45, 90, 39, 0.4);
        }

        /* Hero */
        .hero {
            min-height: 100vh;
            display: flex;
            align-items: center;
            padding: 8rem 2rem 4rem;
            position: relative;
            overflow: hidden;
        }
        /* Animated blobs */
        .hero-blob {
            position: absolute;
            border-radius: 50%;
            filter: blur(80px);
            pointer-events: none;
        }
        .hero-blob-1 {
            top: -100px;
            left: -100px;
            width: 400px;
            height: 400px;
            background: rgba(45, 90, 39, 0.12);
        }
        .hero-blob-2 {
            top: 20%;
            right: -150px;
            width: 500px;
            height: 500px;
            background: rgba(196, 80, 28, 0.08);
            animation-delay: -7s;
        }
        .hero-blob-3 {
            bottom: -100px;
            left: 30%;
            width: 350px;
            height: 350px;
            background: rgba(251, 235, 168, 0.4);
            animation-delay: -14s;
        }
        .hero-inner {
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4rem;
            align-items: center;
            position: relative;
            z-index: 1;
        }
        .hero-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: white;
            border: 1px solid var(--border-subtle);
            border-radius: 9999px;
            color: var(--primary);
            font-size: 0.8rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            box-shadow: 0 4px 15px -3px rgba(0,0,0,0.08);
        }
        .hero-badge .pulse-dot {
            width: 8px;
            height: 8px;
            background: var(--primary);
            border-radius: 50%;
        }
        .hero h1 {
            font-size: clamp(2.5rem, 5vw, 3.5rem);
            color: var(--text-primary);
            line-height: 1.1;
            margin-bottom: 1.5rem;
        }
        .hero h1 .highlight {
            position: relative;
            color: var(--primary);
        }
        .hero h1 .highlight svg {
            position: absolute;
            left: 0;
            bottom: -8px;
            width: 100%;
            height: 12px;
        }
        .hero-desc {
            font-size: 1.125rem;
            color: var(--text-secondary);
            margin-bottom: 2rem;
            max-width: 500px;
        }
        .hero-buttons { display: flex; gap: 1rem; flex-wrap: wrap; }
        .hero-buttons .btn { padding: 0.875rem 1.75rem; font-size: 1rem; }

        /* Hero Image Section */
        .hero-visual {
            position: relative;
        }
        .hero-image {
            width: 100%;
            max-width: 500px;
            border-radius: 24px;
            box-shadow: 0 30px 60px -15px rgba(0,0,0,0.2);
        }
        /* Floating cards around hero image */
        .floating-card {
            position: absolute;
            background: white;
            border-radius: 16px;
            padding: 0.75rem 1rem;
            box-shadow: 0 10px 30px -5px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            border: 1px solid white;
            backdrop-filter: blur(10px);
        }
        .floating-card-icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.9rem;
        }
        .floating-card-text {
            font-size: 0.75rem;
        }
        .floating-card-text span:first-child {
            display: block;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--text-muted);
            font-size: 0.65rem;
        }
        .floating-card-text span:last-child {
            display: block;
            font-weight: 600;
            color: var(--text-primary);
        }
        .floating-card-1 {
            top: 10%;
            left: -20px;
            animation: float-slow 5s ease-in-out infinite;
        }
        .floating-card-2 {
            top: 40%;
            right: -30px;
            animation: float-slow 6s ease-in-out infinite;
            animation-delay: -2s;
        }
        .floating-card-3 {
            bottom: 15%;
            left: 10%;
            animation: float-slow 7s ease-in-out infinite;
            animation-delay: -4s;
        }

        /* Marquee Section */
        .marquee-section {
            padding: 1.5rem 0;
            background: white;
            border-top: 1px solid var(--border-subtle);
            border-bottom: 1px solid var(--border-subtle);
            overflow: hidden;
        }
        .marquee-track {
            display: flex;
            width: max-content;
            gap: 1rem;
        }
        .marquee-item {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: var(--bg-surface);
            border: 1px solid var(--border-subtle);
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-primary);
            white-space: nowrap;
        }
        .marquee-item i {
            color: var(--primary);
        }

        /* Features Section */
        .features {
            padding: 6rem 2rem;
            background: var(--bg-surface);
            position: relative;
        }
        .section-inner {
            max-width: 1200px;
            margin: 0 auto;
        }
        .section-header {
            text-align: center;
            margin-bottom: 4rem;
        }
        .section-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--primary);
            margin-bottom: 1rem;
        }
        .section-badge span {
            width: 24px;
            height: 4px;
            background: var(--accent);
            border-radius: 2px;
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
            border-radius: 24px;
            padding: 2rem;
            transition: all 0.3s;
            position: relative;
            overflow: hidden;
        }
        .bento-card:hover {
            border-color: var(--primary);
            transform: translateY(-8px);
            box-shadow: 0 20px 50px -15px rgba(45, 90, 39, 0.2);
        }
        .bento-card.large { grid-column: span 8; }
        .bento-card.medium { grid-column: span 6; }
        .bento-card.small { grid-column: span 4; }
        .bento-card.featured {
            background: var(--primary);
            color: white;
            border-color: transparent;
        }
        .bento-card.featured:hover {
            transform: translateY(-8px);
            box-shadow: 0 20px 50px -15px rgba(45, 90, 39, 0.4);
        }
        .bento-icon {
            width: 56px;
            height: 56px;
            background: var(--primary-light);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--primary);
            font-size: 1.5rem;
            margin-bottom: 1.5rem;
        }
        .bento-card.featured .bento-icon {
            background: rgba(255,255,255,0.2);
            color: white;
        }
        .bento-card h3 {
            font-size: 1.25rem;
            color: var(--text-primary);
            margin-bottom: 0.75rem;
        }
        .bento-card.featured h3 { color: white; }
        .bento-card p {
            font-size: 0.95rem;
            color: var(--text-secondary);
        }
        .bento-card.featured p { color: rgba(255,255,255,0.85); }
        .bento-card-image {
            width: 100%;
            height: 150px;
            object-fit: cover;
            object-position: top;
            border-radius: 12px;
            margin-top: 1.5rem;
            border: 1px solid var(--border, #e8e2d9);
        }
        .ipad-frame {
            background: #1d1d1f;
            padding: 12px;
            border-radius: 28px;
            box-shadow: 0 30px 60px -15px rgba(0,0,0,0.25), inset 0 0 0 2px #3a3a3c;
        }
        .ipad-frame img {
            display: block;
            width: 100%;
            height: auto;
            border-radius: 16px;
        }
        .hero-image.ipad-frame { max-width: 560px; }

        /* Gallery Section */
        .gallery-section {
            padding: 6rem 2rem;
            background: var(--bg-main);
        }
        .showcase-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 3rem;
            margin-top: 3rem;
        }
        .showcase-item { margin: 0; }
        .showcase-item.wide {
            grid-column: span 2;
            display: grid;
            grid-template-columns: 1.5fr 1fr;
            gap: 3rem;
            align-items: center;
        }
        .showcase-item.wide figcaption { margin-top: 0; }
        .showcase-item.wide figcaption strong { font-size: 1.5rem; }
        .showcase-item.wide figcaption span { font-size: 1.05rem; }
        .showcase-item .ipad-frame {
            transition: transform 0.4s ease, box-shadow 0.4s ease;
        }
        .showcase-item:hover .ipad-frame {
            transform: translateY(-8px);
            box-shadow: 0 40px 70px -20px rgba(0,0,0,0.3), inset 0 0 0 2px #3a3a3c;
        }
        .showcase-item figcaption {
            margin-top: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
        }
        .showcase-item figcaption strong {
            font-size: 1.15rem;
            color: var(--text-primary);
        }
        .showcase-item figcaption span {
            font-size: 0.95rem;
            color: var(--text-secondary);
        }

        /* Demo Form Section */
        .demo-section {
            padding: 6rem 2rem;
            background: var(--bg-surface);
            position: relative;
        }
        .demo-section::before {
            content: '';
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 400px;
            height: 400px;
            background: rgba(45, 90, 39, 0.06);
            border-radius: 50%;
            filter: blur(100px);
            pointer-events: none;
        }
        .demo-inner {
            max-width: 800px;
            margin: 0 auto;
            position: relative;
        }
        .demo-form-card {
            background: var(--bg-card);
            border: 1px solid var(--border-subtle);
            border-radius: 24px;
            padding: 3rem;
            box-shadow: 0 20px 50px -15px rgba(0,0,0,0.1);
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
            border-radius: 12px;
            padding: 0.875rem 1rem;
            color: var(--text-primary);
            font-size: 1rem;
            font-family: inherit;
            transition: all 0.2s;
        }
        .form-group input:focus, .form-group textarea:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 4px rgba(45, 90, 39, 0.1);
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
            border-radius: 12px;
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
            background: var(--bg-main);
        }
        .faq-list { max-width: 800px; margin: 0 auto; }
        .faq-item {
            background: white;
            border: 1px solid var(--border-subtle);
            border-radius: 16px;
            margin-bottom: 1rem;
            overflow: hidden;
            transition: all 0.3s;
        }
        .faq-item:hover {
            border-color: var(--primary);
        }
        .faq-question {
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            color: var(--text-primary);
            font-size: 1rem;
            font-weight: 600;
            padding: 1.25rem 1.5rem;
        }
        .faq-question i { 
            color: var(--primary); 
            transition: transform 0.3s;
            width: 36px;
            height: 36px;
            background: var(--bg-surface);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .faq-item.active .faq-question i { 
            transform: rotate(180deg);
            background: var(--primary);
            color: white;
        }
        .faq-answer {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease, padding 0.3s;
            color: var(--text-secondary);
            padding: 0 1.5rem;
        }
        .faq-item.active .faq-answer {
            max-height: 500px;
            padding: 0 1.5rem 1.5rem;
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

        /* Modal */
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
            backdrop-filter: blur(4px);
        }
        .modal-overlay.active { display: flex; }
        .modal-content {
            background: var(--bg-card);
            border: 1px solid var(--border-subtle);
            border-radius: 24px;
            padding: 2.5rem;
            width: 100%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
            animation: fade-in-up 0.3s ease-out;
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
            background: var(--bg-surface);
            border: none;
            color: var(--text-muted);
            font-size: 1.25rem;
            cursor: pointer;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        .modal-close:hover { 
            background: var(--danger);
            color: white;
        }

        /* Accedi */
        .btn-login {
            background: var(--primary-light);
            color: var(--primary);
            border: 1px solid transparent;
        }
        .btn-login:hover {
            background: var(--primary);
            color: #fff;
            transform: translateY(-2px);
        }
        .hero-login {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            margin-top: 1.5rem;
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.95rem;
        }
        .hero-login strong { color: var(--primary); }
        .hero-login i { color: var(--accent); transition: transform 0.25s ease; }
        .hero-login:hover i { transform: translateX(4px); }

        /* Scroll reveal (attivo solo con JS) */
        .reveal-ready .reveal {
            opacity: 0;
            transform: translateY(32px);
            transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-ready .reveal.is-visible { opacity: 1; transform: none; }
        .reveal-ready .reveal.reveal-d1 { transition-delay: 0.1s; }
        .reveal-ready .reveal.reveal-d2 { transition-delay: 0.2s; }
        .reveal-ready .reveal.reveal-d3 { transition-delay: 0.3s; }
        .reveal-ready .reveal.is-visible.bento-card { transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease; }

        /* Bento con foto reali */
        .bento-card.photo-bg {
            min-height: 300px;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            border-color: transparent;
            background: #1a1a1a;
        }
        .bento-bg {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .bento-card.photo-bg::after {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(180deg, rgba(20, 18, 16, 0.1) 0%, rgba(20, 18, 16, 0.88) 100%);
        }
        .bento-card.featured.photo-bg::after {
            background: linear-gradient(180deg, rgba(45, 90, 39, 0.25) 0%, rgba(26, 54, 23, 0.94) 100%);
        }
        .bento-card.photo-bg > *:not(.bento-bg) { position: relative; z-index: 1; }
        .bento-card.photo-bg:hover .bento-bg { transform: scale(1.07); }
        .bento-card.photo-bg h3 { color: #fff; }
        .bento-card.photo-bg p { color: rgba(255, 255, 255, 0.88); }
        .bento-card.photo-bg .bento-icon { background: rgba(255, 255, 255, 0.18); color: #fff; backdrop-filter: blur(8px); }
        .bento-card-image.photo { object-position: center; border: none; }
        .mini-chart {
            display: flex;
            align-items: flex-end;
            gap: 8px;
            height: 72px;
            margin-top: 1.5rem;
        }
        .mini-chart span {
            flex: 1;
            height: var(--h);
            background: linear-gradient(180deg, var(--accent), #e8946a);
            border-radius: 6px 6px 2px 2px;
            transform-origin: bottom;
        }
        .reveal-ready .mini-chart span { transform: scaleY(0.08); transition: transform 1s cubic-bezier(0.16, 1, 0.3, 1); }
        .reveal-ready .is-visible .mini-chart span { transform: scaleY(1); }
        .mini-chart span:nth-child(2) { transition-delay: 0.1s; }
        .mini-chart span:nth-child(3) { transition-delay: 0.2s; }
        .mini-chart span:nth-child(4) { transition-delay: 0.3s; }
        .mini-chart span:nth-child(5) { transition-delay: 0.4s; }
        .mini-chart span:nth-child(6) { transition-delay: 0.5s; }

        /* Fascia fotografica */
        .photo-band {
            position: relative;
            padding: 7rem 2rem;
            background: #1a1a1a url('/api/landing/assets/photo-kitchen.webp') center / cover no-repeat;
            color: #fff;
            overflow: hidden;
        }
        .photo-band::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(100deg, rgba(20, 18, 16, 0.94) 0%, rgba(20, 18, 16, 0.78) 55%, rgba(20, 18, 16, 0.45) 100%);
        }
        .photo-band-inner {
            position: relative;
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 1.15fr 1fr;
            gap: 4rem;
            align-items: center;
        }
        .section-badge.light { color: #f3c9b4; }
        .photo-band h2 {
            font-size: clamp(2rem, 4vw, 3rem);
            color: #fff;
            line-height: 1.15;
            margin-bottom: 1.25rem;
        }
        .photo-band p { color: rgba(255, 255, 255, 0.85); font-size: 1.1rem; max-width: 520px; }
        .band-points { list-style: none; margin-top: 2rem; display: grid; gap: 1rem; }
        .band-points li { display: flex; align-items: center; gap: 0.875rem; color: #fff; font-weight: 500; }
        .band-points i {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(196, 80, 28, 0.9);
            flex-shrink: 0;
        }
        .photo-band-visual { position: relative; justify-self: center; }
        .band-photo {
            display: block;
            width: min(380px, 80vw);
            aspect-ratio: 4 / 5;
            object-fit: cover;
            border-radius: 28px;
            box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 0.6);
            transform: rotate(2.5deg);
            border: 6px solid rgba(255, 255, 255, 0.9);
        }
        .band-chip {
            position: absolute;
            left: -2rem;
            bottom: 2.5rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            background: rgba(255, 255, 255, 0.95);
            color: var(--text-primary);
            padding: 0.875rem 1.25rem;
            border-radius: 16px;
            font-weight: 600;
            font-size: 0.9rem;
            box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.35);
        }
        .band-chip i { color: var(--accent); font-size: 1.1rem; }

        /* Demo con foto di sfondo */
        .demo-section.photo {
            background: linear-gradient(rgba(18, 16, 14, 0.8), rgba(18, 16, 14, 0.9)), url('/api/landing/assets/photo-interior.webp') center / cover no-repeat;
        }
        .demo-section.photo::before { display: none; }
        .demo-section.photo .section-header h2 { color: #fff; }
        .demo-section.photo .section-header p { color: rgba(255, 255, 255, 0.85); }
        .demo-section.photo .demo-form-card { box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 0.55); border-color: transparent; }

        @media (prefers-reduced-motion: reduce) {
            .reveal-ready .reveal, .reveal-ready .mini-chart span { opacity: 1; transform: none; transition: none; }
            .bento-bg { transition: none; }
        }

        /* Responsive */
        @media (max-width: 1024px) {
            .photo-band-inner { grid-template-columns: 1fr; gap: 3rem; }
            .band-chip { left: 0; }
            .hero-inner { grid-template-columns: 1fr; text-align: center; }
            .hero-desc { margin: 0 auto 2rem; }
            .hero-buttons { justify-content: center; }
            .hero-visual { margin-top: 3rem; }
            .floating-card { display: none; }
            .bento-card.large, .bento-card.medium, .bento-card.small { grid-column: span 12; }
            nav { display: none; }
            .showcase-grid { grid-template-columns: 1fr; }
            .showcase-item.wide { grid-column: span 1; grid-template-columns: 1fr; gap: 1.5rem; }
        }
        @media (max-width: 640px) {
            .nav-demo { display: none; }
            .nav-buttons { gap: 0.5rem; }
            .nav-buttons .btn { padding: 0.55rem 0.9rem; font-size: 0.85rem; }
            .photo-band { padding: 5rem 1.5rem; }
            .form-grid { grid-template-columns: 1fr; }
            .form-group.full { grid-column: span 1; }
            .footer-inner { flex-direction: column; text-align: center; }
            .hero-image { max-width: 100%; }
        }
    </style>
</head>
<body>
    <script>document.documentElement.classList.add('reveal-ready');</script>
    <!-- Header -->
    <header>
        <div class="header-inner">
            <a href="/api/landing" class="logo">
                <div class="logo-icon">B</div>
                <span class="logo-text">Bancomanda</span>
            </a>
            <nav>
                <a href="#features">Funzionalità</a>
                <a href="#gallery">L'app</a>
                <a href="#demo">Demo</a>
                <a href="#faq">FAQ</a>
            </nav>
            <div class="nav-buttons">
                <a href="__APP_URL__" class="btn btn-login" data-testid="header-login-button"><i class="fas fa-right-to-bracket"></i> Accedi</a>
                <a href="#demo" class="btn btn-outline nav-demo">Richiedi Demo</a>
                <button class="btn btn-primary" onclick="openRegisterModal()" data-testid="header-register-button">Registrati</button>
            </div>
        </div>
    </header>

    <!-- Hero -->
    <section class="hero">
        <div class="hero-blob hero-blob-1 blob-drift"></div>
        <div class="hero-blob hero-blob-2 blob-drift"></div>
        <div class="hero-blob hero-blob-3 blob-drift"></div>
        
        <div class="hero-inner">
            <div class="hero-content">
                <div class="hero-badge fade-in">
                    <span class="pulse-dot"></span>
                    SaaS per Ristoranti Italiani
                </div>
                <h1 class="serif fade-in fade-in-delay-1">
                    La gestione ordini che il tuo <span class="highlight">bistrot meritava.<svg viewBox="0 0 200 12" preserveAspectRatio="none"><path d="M2 8 C 40 2, 100 12, 198 4" fill="none" stroke="#c4501c" stroke-width="4" stroke-linecap="round"/></svg></span>
                </h1>
                <p class="hero-desc fade-in fade-in-delay-2">
                    Bancomanda è il gestionale pensato per ristoranti, pizzerie e bistrot. 
                    Ordini al banco, menu del giorno, stampa termica 62mm, vista cucina e porzionatura. 
                    Tutto su iPad e tablet Android, sincronizzato in tempo reale.
                </p>
                <div class="hero-buttons fade-in fade-in-delay-3">
                    <a href="#demo" class="btn btn-primary">
                        <i class="fas fa-calendar-check"></i> Richiedi una Demo
                    </a>
                    <button class="btn btn-outline" onclick="openRegisterModal()">
                        <i class="fas fa-rocket"></i> Inizia Gratis
                    </button>
                </div>
                <a href="__APP_URL__" class="hero-login fade-in fade-in-delay-4" data-testid="hero-login-link">
                    Hai già un account? <strong>Accedi al tuo locale</strong> <i class="fas fa-arrow-right"></i>
                </a>
            </div>
            <div class="hero-visual fade-in fade-in-delay-4">
                <div class="ipad-frame hero-image float-slow" data-testid="hero-app-screenshot">
                    <img src="/api/landing/assets/app-orders.webp" alt="Schermata Ordini del giorno su iPad" width="1366" height="1024">
                </div>
                
                <!-- Floating Cards -->
                <div class="floating-card floating-card-1">
                    <div class="floating-card-icon" style="background: #c4501c;">
                        <i class="fas fa-clipboard-list"></i>
                    </div>
                    <div class="floating-card-text">
                        <span>Ordine #127</span>
                        <span>3 piatti • €45.00</span>
                    </div>
                </div>
                <div class="floating-card floating-card-2">
                    <div class="floating-card-icon" style="background: var(--primary);">
                        <i class="fas fa-print"></i>
                    </div>
                    <div class="floating-card-text">
                        <span>Stampato</span>
                        <span>Comanda cucina</span>
                    </div>
                </div>
                <div class="floating-card floating-card-3">
                    <div class="floating-card-icon" style="background: #8b7fd4;">
                        <i class="fas fa-utensils"></i>
                    </div>
                    <div class="floating-card-text">
                        <span>Menu del giorno</span>
                        <span>13 piatti online</span>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Marquee -->
    <div class="marquee-section" aria-hidden="true">
        <div class="marquee-track marquee">
            <span class="marquee-item"><i class="fas fa-clipboard-list"></i> Ordini</span>
            <span class="marquee-item"><i class="fas fa-print"></i> Stampa 62mm</span>
            <span class="marquee-item"><i class="fas fa-utensils"></i> Menu del Giorno</span>
            <span class="marquee-item"><i class="fas fa-fire-burner"></i> Vista Cucina</span>
            <span class="marquee-item"><i class="fas fa-users"></i> Clienti</span>
            <span class="marquee-item"><i class="fas fa-tablet-alt"></i> Multi-tablet</span>
            <span class="marquee-item"><i class="fas fa-chart-pie"></i> Report</span>
            <span class="marquee-item"><i class="fas fa-globe"></i> Pubblica Online</span>
            <span class="marquee-item"><i class="fas fa-clipboard-list"></i> Ordini</span>
            <span class="marquee-item"><i class="fas fa-print"></i> Stampa 62mm</span>
            <span class="marquee-item"><i class="fas fa-utensils"></i> Menu del Giorno</span>
            <span class="marquee-item"><i class="fas fa-fire-burner"></i> Vista Cucina</span>
            <span class="marquee-item"><i class="fas fa-users"></i> Clienti</span>
            <span class="marquee-item"><i class="fas fa-tablet-alt"></i> Multi-tablet</span>
            <span class="marquee-item"><i class="fas fa-chart-pie"></i> Report</span>
            <span class="marquee-item"><i class="fas fa-globe"></i> Pubblica Online</span>
        </div>
    </div>

    <!-- Features -->
    <section class="features" id="features">
        <div class="section-inner">
            <div class="section-header reveal">
                <div class="section-badge"><span></span> Funzionalità</div>
                <h2 class="serif">Tutto quello che serve al tuo locale</h2>
                <p>Gestisci ordini, menu e cucina da un'unica piattaforma pensata per la ristorazione italiana.</p>
            </div>
            <div class="bento-grid">
                <div class="bento-card large reveal" data-testid="bento-orders">
                    <div class="bento-icon"><i class="fas fa-clipboard-list"></i></div>
                    <h3>Ordini in Tempo Reale</h3>
                    <p>Prendi ordini al banco, per telefono o WhatsApp. Ogni ordine è visibile su tutti i tablet del locale, con stato aggiornato in tempo reale.</p>
                    <img src="/api/landing/assets/app-orders.webp" alt="Stato ordini in tempo reale" class="bento-card-image" loading="lazy">
                </div>
                <div class="bento-card small featured photo-bg reveal reveal-d1" data-testid="bento-print">
                    <img src="/api/landing/assets/photo-chefs.webp" alt="Cuochi che impiattano in una cucina professionale" class="bento-bg" loading="lazy">
                    <div class="bento-icon"><i class="fas fa-print"></i></div>
                    <h3>Stampa 62mm</h3>
                    <p>Stampa comande e scontrini su stampanti termiche ESC/POS con layout ottimizzato.</p>
                </div>
                <div class="bento-card medium reveal" data-testid="bento-menu">
                    <div class="bento-icon"><i class="fas fa-utensils"></i></div>
                    <h3>Menu del Giorno</h3>
                    <p>Pubblica il menu del giorno sul tuo sito web con un click. I clienti vedono sempre i piatti disponibili.</p>
                    <img src="/api/landing/assets/photo-plating.webp" alt="Impiattamento di pasta fresca" class="bento-card-image photo" loading="lazy">
                </div>
                <div class="bento-card medium reveal reveal-d1" data-testid="bento-kitchen">
                    <div class="bento-icon"><i class="fas fa-fire-burner"></i></div>
                    <h3>Vista Cucina</h3>
                    <p>La cucina vede tutti i piatti da preparare aggregati per tipo. Ogni porzione ha il suo stato.</p>
                    <img src="/api/landing/assets/app-kitchen.webp" alt="Vista cucina con piatti raggruppati" class="bento-card-image" style="object-position: center 28%;" loading="lazy">
                </div>
                <div class="bento-card small photo-bg reveal" data-testid="bento-customers">
                    <img src="/api/landing/assets/photo-table.webp" alt="Tavolo con aperitivo e spaghetti alle vongole" class="bento-bg" loading="lazy">
                    <div class="bento-icon"><i class="fas fa-users"></i></div>
                    <h3>Anagrafica Clienti</h3>
                    <p>Registra i clienti abituali con storico ordini.</p>
                </div>
                <div class="bento-card small photo-bg reveal reveal-d1" data-testid="bento-tablets">
                    <img src="/api/landing/assets/photo-chef.webp" alt="Cuoco al lavoro in cucina" class="bento-bg" loading="lazy">
                    <div class="bento-icon"><i class="fas fa-tablet-alt"></i></div>
                    <h3>Multi-tablet</h3>
                    <p>Usa più tablet, iPad o Android: banco, cucina, sala.</p>
                </div>
                <div class="bento-card small reveal reveal-d2" data-testid="bento-report">
                    <div class="bento-icon" style="background: var(--accent-light); color: var(--accent);"><i class="fas fa-chart-pie"></i></div>
                    <h3>Report</h3>
                    <p>Vendite, piatti più richiesti, incassi.</p>
                    <div class="mini-chart" aria-hidden="true">
                        <span style="--h: 38%"></span><span style="--h: 62%"></span><span style="--h: 48%"></span><span style="--h: 80%"></span><span style="--h: 66%"></span><span style="--h: 100%"></span>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Fascia fotografica -->
    <section class="photo-band" data-testid="photo-band">
        <div class="photo-band-inner">
            <div class="reveal">
                <div class="section-badge light"><span></span> Dal banco alla cucina</div>
                <h2 class="serif">Niente più foglietti volanti.</h2>
                <p>L'ordine preso al banco arriva subito in cucina: piatti raggruppati, porzioni contate, comanda stampata. Tu pensi ai clienti.</p>
                <ul class="band-points">
                    <li class="reveal reveal-d1"><i class="fas fa-bolt"></i> Ordini sincronizzati su tutti i tablet</li>
                    <li class="reveal reveal-d2"><i class="fas fa-print"></i> Comanda su stampante termica 62mm</li>
                    <li class="reveal reveal-d3"><i class="fas fa-check-double"></i> Stato di ogni porzione, dal fuoco al banco</li>
                </ul>
            </div>
            <div class="photo-band-visual reveal reveal-d2">
                <img src="/api/landing/assets/photo-pasta.webp" alt="Pasta fresca fatta a mano" class="band-photo" loading="lazy">
                <div class="band-chip"><i class="fas fa-fire-burner"></i><span>12 porzioni in preparazione</span></div>
            </div>
        </div>
    </section>

    <!-- Gallery Section -->
    <section class="gallery-section" id="gallery">
        <div class="section-inner">
            <div class="section-header reveal">
                <div class="section-badge"><span></span> L'app</div>
                <h2 class="serif">Pensato per chi lavora ogni giorno</h2>
                <p>Le vere schermate di Bancomanda su tablet: dal bancone alla cucina, ogni passaggio è sotto controllo.</p>
            </div>
            <div class="showcase-grid">
                <figure class="showcase-item reveal" data-testid="showcase-orders">
                    <div class="ipad-frame">
                        <img src="/api/landing/assets/app-orders.webp" alt="Schermata Ordini del giorno" loading="lazy" width="1366" height="1024">
                    </div>
                    <figcaption>
                        <strong>Ordini del giorno</strong>
                        <span>Canale, servizio, orario di consegna, note e stato di ogni ordine, con i contatori sempre in vista.</span>
                    </figcaption>
                </figure>
                <figure class="showcase-item reveal reveal-d1" data-testid="showcase-menu">
                    <div class="ipad-frame">
                        <img src="/api/landing/assets/app-menu.webp" alt="Schermata Menu del giorno" loading="lazy" width="1366" height="1024">
                    </div>
                    <figcaption>
                        <strong>Menu del giorno</strong>
                        <span>Prezzi del giorno e porzioni rimaste per ogni piatto, filtrabili per categoria e pubblicabili sul sito.</span>
                    </figcaption>
                </figure>
                <figure class="showcase-item wide reveal" data-testid="showcase-kitchen">
                    <div class="ipad-frame">
                        <img src="/api/landing/assets/app-kitchen.webp" alt="Schermata Vista Cucina" loading="lazy" width="1366" height="1024">
                    </div>
                    <figcaption>
                        <strong>Vista cucina</strong>
                        <span>I piatti da preparare raggruppati per tipo: la cucina vede quante porzioni servono, per quale ordine e per che ora. Un tocco su "Completa" e il banco sa che è pronto.</span>
                    </figcaption>
                </figure>
            </div>
        </div>
    </section>

    <!-- Demo Request -->
    <section class="demo-section photo" id="demo" data-testid="demo-section">
        <div class="demo-inner">
            <div class="section-header reveal">
                <div class="section-badge light"><span></span> Contattaci</div>
                <h2 class="serif">Richiedi una Demo</h2>
                <p>Compila il modulo e ti contatteremo per mostrarti Bancomanda in azione.</p>
            </div>
            <div class="demo-form-card reveal reveal-d1">
                <form id="demoForm">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="restaurant_name">Nome del Locale *</label>
                            <input type="text" id="restaurant_name" name="restaurant_name" required placeholder="Es. Trattoria da Mario">
                        </div>
                        <div class="form-group">
                            <label for="contact_name">Nome Referente *</label>
                            <input type="text" id="contact_name" name="contact_name" required placeholder="Es. Mario Rossi">
                        </div>
                        <div class="form-group">
                            <label for="email">Email *</label>
                            <input type="email" id="email" name="email" required placeholder="email@esempio.it">
                        </div>
                        <div class="form-group">
                            <label for="phone">Telefono</label>
                            <input type="tel" id="phone" name="phone" placeholder="333 123 4567">
                        </div>
                        <div class="form-group full">
                            <label for="message">Messaggio</label>
                            <textarea id="message" name="message" placeholder="Raccontaci del tuo locale..."></textarea>
                        </div>
                    </div>
                    <div class="form-submit">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-paper-plane"></i> Invia Richiesta
                        </button>
                    </div>
                </form>
                <div id="formAlert" class="form-alert"></div>
            </div>
        </div>
    </section>

    <!-- FAQ -->
    <section class="faq-section" id="faq">
        <div class="section-inner">
            <div class="section-header reveal">
                <div class="section-badge"><span></span> Domande Frequenti</div>
                <h2 class="serif">Tutto quello che vuoi sapere</h2>
            </div>
            <div class="faq-list reveal reveal-d1">
                <div class="faq-item">
                    <div class="faq-question" onclick="toggleFaq(this)">
                        <span>Quali stampanti termiche sono compatibili?</span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="faq-answer">
                        Bancomanda funziona con tutte le stampanti termiche ESC/POS che supportano rotoli da 62mm. 
                        Abbiamo testato con successo Brother QL-820NWB, Epson TM-T20III e molte altre.
                    </div>
                </div>
                <div class="faq-item">
                    <div class="faq-question" onclick="toggleFaq(this)">
                        <span>Funziona su iPad e tablet Android?</span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="faq-answer">
                        Sì. Bancomanda si usa dal browser su qualsiasi tablet, iPad o Android, e si aggiunge alla schermata Home come una normale app. 
                        Puoi usare più dispositivi contemporaneamente.
                    </div>
                </div>
                <div class="faq-item">
                    <div class="faq-question" onclick="toggleFaq(this)">
                        <span>Come funziona la pubblicazione del menu?</span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="faq-answer">
                        Bancomanda genera un file JSON con il menu del giorno e lo pubblica sul tuo sito via FTP. 
                        Il tuo sito mostra sempre il menu aggiornato con prezzi e disponibilità.
                    </div>
                </div>
                <div class="faq-item">
                    <div class="faq-question" onclick="toggleFaq(this)">
                        <span>Quanto costa Bancomanda?</span>
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
                    <span class="logo-text">Bancomanda</span>
                </div>
                <p>© 2026 Bancomanda. Sistema gestionale per la ristorazione italiana.</p>
            </div>
            <div class="footer-links">
                <a href="__APP_URL__" data-testid="footer-login-link"><i class="fas fa-right-to-bracket"></i> Accedi</a>
                <a href="#features">Funzionalità</a>
                <a href="#demo">Richiedi Demo</a>
                <a href="#faq">FAQ</a>
                <a href="mailto:info@banco.app">Contatti</a>
            </div>
        </div>
    </footer>

    <!-- Register Modal -->
    <div class="modal-overlay" id="registerModal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="serif">Registra il tuo Ristorante</h2>
                <button class="modal-close" onclick="closeRegisterModal()">&times;</button>
            </div>
            <form id="registerForm">
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Nome del Locale *</label>
                    <input type="text" id="reg_tenant_name" required placeholder="Es. Trattoria da Mario">
                </div>
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Identificativo (slug) *</label>
                    <input type="text" id="reg_tenant_slug" required placeholder="trattoria-mario" pattern="[a-z0-9-]+">
                    <small style="color: var(--text-muted); font-size: 0.75rem;">Solo lettere minuscole, numeri, trattini</small>
                </div>
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Il tuo Nome *</label>
                    <input type="text" id="reg_name" required placeholder="Mario Rossi">
                </div>
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Email *</label>
                    <input type="email" id="reg_email" required placeholder="email@esempio.it">
                </div>
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label>Password *</label>
                    <input type="password" id="reg_password" required minlength="8" placeholder="Minimo 8 caratteri">
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center;">
                    <i class="fas fa-rocket"></i> Crea Account
                </button>
            </form>
            <div id="registerAlert" class="form-alert" style="margin-top: 1rem;"></div>
        </div>
    </div>

    <script>
        // Demo form
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
                    alert.textContent = 'Richiesta inviata! Ti contatteremo presto.';
                    alert.style.display = 'block';
                    this.reset();
                } else if (resp.status === 429) {
                    alert.className = 'form-alert error';
                    alert.textContent = 'Hai già inviato una richiesta nelle ultime 24 ore.';
                    alert.style.display = 'block';
                } else {
                    throw new Error();
                }
            } catch (err) {
                alert.className = 'form-alert error';
                alert.textContent = 'Errore. Riprova più tardi.';
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
                    alert.innerHTML = '<strong>Account creato!</strong><br>Il tuo locale è in attesa di approvazione.';
                    alert.style.display = 'block';
                    this.reset();
                } else {
                    alert.className = 'form-alert error';
                    alert.textContent = result.detail || 'Errore durante la registrazione.';
                    alert.style.display = 'block';
                }
            } catch (err) {
                alert.className = 'form-alert error';
                alert.textContent = 'Errore. Riprova più tardi.';
                alert.style.display = 'block';
            }
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-rocket"></i> Crea Account';
        });

        function toggleFaq(el) {
            el.parentElement.classList.toggle('active');
        }

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

        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            });
        });

        // Sezioni che compaiono scorrendo
        if ('IntersectionObserver' in window) {
            const revealObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        revealObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
            document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));
        } else {
            document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
        }
    </script>
</body>
</html>'''


def render_landing() -> HTMLResponse:
    # BANCOMANDA_APP_URL = indirizzo dell'app (es. dominio Vercel); in anteprima stessa origine
    app_url = escape(os.environ.get("BANCOMANDA_APP_URL") or "/", quote=True)
    return HTMLResponse(content=get_landing_html().replace("__APP_URL__", app_url))


@router.get("/", response_class=HTMLResponse)
async def landing_page():
    """Serve the public landing page."""
    return render_landing()


@router.get("/landing", response_class=HTMLResponse)
async def landing_page_alt():
    """Alternative route for landing page."""
    return render_landing()
