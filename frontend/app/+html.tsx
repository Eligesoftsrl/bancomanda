// @ts-nocheck
import { ScrollViewStyleReset, useServerDocumentContext } from "expo-router/html";
import type { PropsWithChildren } from "react";

// SDK 58: headNodes/bodyNodes portano gli script dell'app, senza la pagina resta bianca
export default function Root({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } = useServerDocumentContext();
  return (
    <html lang="it" {...htmlAttributes} style={{ height: "100%" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        
        {/* PWA Meta Tags */}
        <meta name="theme-color" content="#DB0007" />
        <meta name="background-color" content="#f5f7fa" />
        <meta name="application-name" content="Bancomanda" />
        <meta name="description" content="Sistema gestione ordini ristorante" />
        
        {/* iOS PWA Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Bancomanda" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* Android/Chrome PWA */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Favicons */}
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        
        <title>Bancomanda</title>
        {headNodes}
        
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                background-color: #f5f7fa;
                -webkit-tap-highlight-color: transparent;
              }
              body > div:first-child { position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; }
              [role="tablist"] [role="tab"] * { overflow: visible !important; }
              [role="heading"], [role="heading"] * { overflow: visible !important; }
              /* Barra di scorrimento sempre visibile nelle finestre lunghe (desktop): Chrome/Safari usano ::-webkit-scrollbar, Firefox le proprietà standard */
              [data-testid="dish-modal-scroll"]::-webkit-scrollbar { width: 8px; }
              [data-testid="dish-modal-scroll"]::-webkit-scrollbar-track { background: transparent; }
              [data-testid="dish-modal-scroll"]::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
              [data-testid="dish-modal-scroll"]::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
              @supports not selector(::-webkit-scrollbar) {
                [data-testid="dish-modal-scroll"] { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
              }
            `,
          }}
        />
      </head>
      <body
        {...bodyAttributes}
        style={{
          margin: 0,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f5f7fa",
        }}
      >
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
