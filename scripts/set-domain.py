# One-shot domain switch. Usage: python scripts/set-domain.py yamplata.com
# Rewrites every hard-coded origin/path (canonical, OG, JSON-LD, sitemap, robots, push URL,
# camera stamp text, README), writes docs/CNAME, and regenerates og-image.png.
# After running: bump VERSION in docs/sw.js and BUILD in index.html, commit, push, then set the
# custom domain in GitHub → Settings → Pages (see docs-internal/launch-steps.md).
import io, os, re, subprocess, sys
root = os.path.join(os.path.dirname(__file__), "..")
new = sys.argv[1].strip().lower().rstrip("/")
if not re.fullmatch(r"[a-z0-9.-]+\.[a-z]{2,}", new): sys.exit("give a bare hostname, e.g. yamplata.com")
OLD_URL, OLD_HOST_PATH = "https://yuvartz.github.io/yam-palta/", "yuvartz.github.io/yam-palta"
NEW_URL, NEW_HOST = f"https://{new}/", new
edits = {
    "docs/index.html": [(OLD_URL, NEW_URL), (OLD_HOST_PATH, NEW_HOST)],
    "docs/sitemap.xml": [(OLD_URL, NEW_URL)],
    "docs/robots.txt": [(OLD_URL, NEW_URL)],
    "scripts/build-og-image.py": [(OLD_HOST_PATH, NEW_HOST)],
    "README.md": [(OLD_URL, NEW_URL)],
}
for rel, pairs in edits.items():
    p = os.path.join(root, rel)
    if not os.path.exists(p): print(f"{rel}: missing, skipped"); continue
    s = io.open(p, encoding="utf-8").read(); n = 0
    for a, b in pairs: n += s.count(a); s = s.replace(a, b)
    io.open(p, "w", encoding="utf-8", newline="\n").write(s); print(f"{rel}: {n} replacement(s)")
io.open(os.path.join(root, "docs", "CNAME"), "w", newline="\n").write(new + "\n"); print("docs/CNAME written")
# manifest id: keep it stable and absolute on the new origin
mp = os.path.join(root, "docs", "manifest.json"); m = io.open(mp, encoding="utf-8").read()
m = re.sub(r'"id":\s*"[^"]*"', f'"id": "{NEW_URL}"', m, count=1); io.open(mp, "w", encoding="utf-8", newline="\n").write(m); print("manifest id set")
subprocess.run([sys.executable, os.path.join(root, "scripts", "build-og-image.py")], check=True)
print("done — now bump sw VERSION / BUILD, commit, push, and configure Pages custom domain")
