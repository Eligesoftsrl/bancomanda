"""Simulazione locale delle regole di frontend/vercel.json (solo per test)."""
import http.server, os, re, urllib.request

DIST = "/app/frontend/dist"
BACKEND = "http://127.0.0.1:8001"
REDIRECTS = {"/accedi": "/app", "/login": "/app/login"}
STATIC_REWRITE = re.compile(r"^/(manifest\.json|apple-touch-icon\.png|icon-192\.png|icon-512\.png)$")


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=DIST, **k)

    def proxy(self, target):
        body = None
        if self.command in ("POST", "PUT", "PATCH", "DELETE"):
            n = int(self.headers.get("Content-Length") or 0)
            body = self.rfile.read(n) if n else None
        req = urllib.request.Request(BACKEND + target, data=body, method=self.command)
        for k in ("Content-Type", "Authorization"):
            if self.headers.get(k):
                req.add_header(k, self.headers[k])
        try:
            r = urllib.request.urlopen(req)
            code, data, ctype = r.status, r.read(), r.headers.get("Content-Type")
        except urllib.error.HTTPError as e:
            code, data, ctype = e.code, e.read(), e.headers.get("Content-Type")
        self.send_response(code)
        self.send_header("Content-Type", ctype or "text/plain")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def route(self):
        p = self.path.split("?")[0]
        if p in REDIRECTS:
            self.send_response(307); self.send_header("Location", REDIRECTS[p]); self.end_headers(); return
        if p == "/":
            return self.proxy("/api/landing")
        if p == "/admin":
            return self.proxy("/api/admin/dashboard")
        if p.startswith("/api/"):
            return self.proxy(self.path)
        m = STATIC_REWRITE.match(p)
        if m:
            self.path = "/app/" + m.group(1)
        else:
            fs = os.path.join(DIST, p.lstrip("/"))
            if not os.path.exists(fs) and os.path.exists(fs + ".html"):
                self.path = p + ".html"
        return super().do_GET() if self.command == "GET" else self.send_error(405)

    do_GET = route
    do_POST = route
    do_PUT = route
    do_PATCH = route
    do_DELETE = route


http.server.ThreadingHTTPServer(("127.0.0.1", 8095), H).serve_forever()
