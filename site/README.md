# Alex Cerqueira — site

Portfólio estático (HTML + CSS + JavaScript), sem dependências e sem etapa de build.
Esta pasta é tudo o que precisa ser publicado.

```
index.html        home (hero, work, approach, expertise, writing, books, about, contact)
iconlib.html      estudo de caso 01 — IconLib (14 capítulos; imagens a enviar)
design-system.html estudo de caso 02 — NodIA (14 capítulos, carrossel com a capa e três páginas de documentação em SVG)
case.html         estudo de caso 03 — Reciclar (14 capítulos, carrossel de imagens)
caldohs.html      estudo de caso 04 — Caldohs (14 capítulos, carrossel de imagens)
wft.html          estudo de caso 05 — World Footvolley Tournament (14 capítulos, carrossel de imagens)
bonomia.html      estudo de caso 06 — Bonomia (14 capítulos, carrossel de imagens)
hostad.html       estudo de caso 07 — Hostad (14 capítulos, carrossel de imagens)
404.html          página de erro
css/nodia.css    design system NodIA (tokens + Link, Icon Button e Menu Item), cópia fiel de github.com/alex-cerqueira/NodIA — não editar aqui
css/ js/          estilos e comportamento (a "Research Network" é um canvas 2D, sem libs)
assets/           imagens dos cases (as páginas do NodIA são SVG de 1,5–1,8 MB, carregadas só quando o carrossel as pede), capa do livro, retrato e imagem de compartilhamento (og-image.jpg)
favicon.svg, apple-touch-icon.png, robots.txt
set-domain.py     define o domínio final (canonical, og:url, og:image, sitemap)
```

## Ver localmente

```sh
cd site && python3 -m http.server 8000   # abra http://localhost:8000
```

## Antes de publicar

1. **Preencher os placeholders** (aparecem entre colchetes):
   - os cinco projetos da home e seus cases já estão prontos;
   - e-mail na seção Contact (`[inserir e-mail]`, em `index.html`).
   Para listar o que falta: `grep -n "\[" index.html | grep -v data-`
2. **Definir o domínio**: `python3 set-domain.py https://seudominio.com`
   (gera `<link rel="canonical">` e `og:url` na home e nos cases, `og:image` absoluto, `sitemap.xml` e a linha `Sitemap:` do `robots.txt`).
3. Opcional: um e-mail/URL de contato real em `schema.org` (bloco `application/ld+json` do `index.html`).

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

- **Design system:** as cores, a tipografia e o movimento vêm dos tokens do NodIA (`css/nodia.css`, v0.1.0, commit 898da6d). O cabeçalho tem o botão "menu" (um Menu Item do sistema, com a palavra e o ícone de hambúrguer, que vira um X) e abre, da direita para a esquerda, uma gaveta com os Menu Items; o botão de tema (Icon Button, variante secondary) fica dentro da gaveta, no canto inferior direito. Os estilos do portfólio só definem o que é próprio dele: a translucência do cabeçalho (`--hdr`), o tom do logotipo da home (`--logo`), a curva de animação da home (`--ease`) e as medidas da grade (`--gx`, `--gut`). Para atualizar o sistema, gere `nodia.css` de novo a partir do repositório.

- Tema escuro é o padrão; a escolha do visitante fica salva no navegador (`localStorage`).
- Respeita `prefers-reduced-motion` (animações viram estados estáticos).
- Fontes (Geist e IBM Plex Mono) vêm do Google Fonts; para hospedar localmente, baixe-as e troque o `<link>` por `@font-face`.
- A pasta foi gerada a partir do protótipo no editor de design; daqui em diante, edite estes arquivos diretamente.
