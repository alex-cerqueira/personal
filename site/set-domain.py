#!/usr/bin/env python3
"""Define o domínio final do site: canonical, og:url, og:image absoluto, sitemap.xml e robots.txt.

uso:  python3 set-domain.py https://seudominio.com
É seguro rodar de novo: troca os valores anteriores.
"""
import datetime
import re
import sys
from pathlib import Path

if len(sys.argv) != 2 or not re.fullmatch(r'https://[A-Za-z0-9.-]+(:\d+)?', sys.argv[1].rstrip('/')):
    sys.exit('uso: python3 set-domain.py https://seudominio.com   (sem barra no final, sem caminho)')
domain = sys.argv[1].rstrip('/')
root = Path(__file__).resolve().parent

page = root / 'index.html'
html = page.read_text()
html = re.sub(r'<link rel="canonical"[^>]*>\n', '', html)
html = re.sub(r'<meta property="og:url"[^>]*>\n', '', html)
html, n = re.subn(r'(<meta property="og:image" content=")[^"]*(")', lambda m: m.group(1) + domain + '/assets/og-image.jpg' + m.group(2), html)
if n != 1:
    sys.exit('não encontrei a tag og:image em index.html')
marker = '<meta name="theme-color"'
if html.count(marker) != 1:
    sys.exit('não encontrei o ponto de inserção em index.html')
html = html.replace(marker, '<link rel="canonical" href="%s/">\n<meta property="og:url" content="%s/">\n%s' % (domain, domain, marker))
page.write_text(html)

# estudos de caso: canonical e og:url em cada página que existir
CASES = ['case.html', 'caldohs.html']
for name in CASES:
    f = root / name
    if not f.exists():
        continue
    c = f.read_text()
    c = re.sub(r'<link rel="canonical"[^>]*>\n', '', c)
    c = re.sub(r'<meta property="og:url"[^>]*>\n', '', c)
    if c.count(marker) != 1:
        sys.exit('não encontrei o ponto de inserção em ' + name)
    c = c.replace(marker, '<link rel="canonical" href="%s/%s">\n<meta property="og:url" content="%s/%s">\n%s' % (domain, name, domain, name, marker))
    f.write_text(c)

today = datetime.date.today().isoformat()
urls = ['%s/' % domain] + ['%s/%s' % (domain, n) for n in CASES if (root / n).exists()]
(root / 'sitemap.xml').write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + ''.join('  <url><loc>%s</loc><lastmod>%s</lastmod></url>\n' % (u, today) for u in urls) + '</urlset>\n')
robots = re.sub(r'^Sitemap:.*\n?', '', (root / 'robots.txt').read_text(), flags=re.M).rstrip('\n')
(root / 'robots.txt').write_text(robots + '\nSitemap: %s/sitemap.xml\n' % domain)
print('ok:', domain)
