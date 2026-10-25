# Alex Cerqueira — site

Portfólio estático (HTML + CSS + JavaScript), sem dependências e sem etapa de build.
Esta pasta é tudo o que precisa ser publicado.

```
index.html        home (hero, work, approach, expertise, writing, books, about, contact)
case.html         template de estudo de caso (13 capítulos) — noindex enquanto for template
404.html          página de erro
css/ js/          estilos e comportamento (a "Research Network" é um canvas 2D, sem libs)
assets/           capa do livro, retrato e imagem de compartilhamento (og-image.jpg)
favicon.svg, apple-touch-icon.png, robots.txt
set-domain.py     define o domínio final (canonical, og:url, og:image, sitemap)
```

## Ver localmente

```sh
cd site && python3 -m http.server 8000   # abra http://localhost:8000
```

## Antes de publicar

1. **Preencher os placeholders** (aparecem entre colchetes):
   - 3 projetos na home (nome, ano, contexto, papel, descrição e imagem) e o texto do `case.html`;
   - e-mail na seção Contact (`[inserir e-mail]`, em `index.html`).
   Para listar o que falta: `grep -n "\[" index.html | grep -v data-`
2. **Definir o domínio**: `python3 set-domain.py https://seudominio.com`
   (gera `<link rel="canonical">`, `og:url`, `og:image` absoluto, `sitemap.xml` e a linha `Sitemap:` do `robots.txt`).
3. **Quando o case estiver pronto**, remova `<meta name="robots" content="noindex, follow">` do `case.html`.
4. Opcional: um e-mail/URL de contato real em `schema.org` (bloco `application/ld+json` do `index.html`).

## Publicar

Qualquer hospedagem estática serve — publique a pasta `site/`:
Netlify, Vercel ou Cloudflare Pages (diretório de publicação: `site`, sem comando de build),
ou GitHub Pages (via Actions).

## Hostinger (hospedagem compartilhada)

1. No hPanel, abra **Arquivos → Gerenciador de Arquivos** e entre em `public_html`.
2. Envie o conteúdo do pacote (o `.zip` do site) e use **Extrair** ali mesmo. `index.html` e o `.htaccess` precisam ficar **direto** em `public_html`, não dentro de uma subpasta.
3. Se o domínio ainda não tem SSL, ative o certificado gratuito em **Segurança → SSL** e depois descomente as linhas de redirecionamento https no `.htaccess`.
4. Se for colocar o site numa subpasta (ex.: `seudominio.com/portfolio`), a página 404 e os caminhos que começam com `/` precisam ser ajustados.

## Observações

- Tema escuro é o padrão; a escolha do visitante fica salva no navegador (`localStorage`).
- Respeita `prefers-reduced-motion` (animações viram estados estáticos).
- Fontes (Geist e IBM Plex Mono) vêm do Google Fonts; para hospedar localmente, baixe-as e troque o `<link>` por `@font-face`.
- A pasta foi gerada a partir do protótipo no editor de design; daqui em diante, edite estes arquivos diretamente.
