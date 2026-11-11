# Arquitetura

Site institucional e de conversão da La Bella Torta: 17 páginas estáticas, ~5 KB de JavaScript por página
(11,8 KB na página de encomendas), zero cookies, publicado no GitHub Pages.

## Stack e por quê

| Peça       | Escolha                                                                   | Por que esta e não outra                                                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework  | **Astro 7, saída estática**                                               | Gera HTML puro e só manda JS onde há interação. Para um site de conteúdo local é o melhor Core Web Vitals possível sem servidor. Next/Remix trariam runtime e hidratação que o site não precisa. |
| Linguagem  | **TypeScript strict** (`astro/tsconfigs/strictest`)                       | Erros de dado (preço, horário, slug) quebram o build, não a página em produção.                                                                                                                  |
| Estilo     | **CSS próprio com tokens** (`src/styles/global.css`) + CSS por componente | Sem framework de UI: CSS mínimo, sem classe utilitária no HTML, e nenhum atributo `style=` (exigência da CSP).                                                                                   |
| Fontes     | **Fontsource local** (Cormorant Garamond + DM Sans variável), com preload | Nenhuma requisição ao Google Fonts: mais rápido e sem repassar IP do visitante (LGPD).                                                                                                           |
| Imagens    | **`astro:assets` + sharp**                                                | As fotos originais do site antigo viram AVIF/WebP em vários tamanhos no build, com `width`/`height` fixos (sem salto de layout).                                                                 |
| Hospedagem | **GitHub Pages via Actions**                                              | Custo zero, HTTPS e CDN. Limitação: não aceita headers HTTP; mitigada abaixo. Para auto-hospedagem há Docker + nginx.                                                                            |
| Testes     | **Vitest** (unitários + verificação do HTML gerado)                       | Mesma toolchain do Vite que o Astro usa; os testes de build leem o `dist` real.                                                                                                                  |
| Qualidade  | `astro check`, ESLint (TS strict + Astro + jsx-a11y), Prettier            | Rodam no CI antes de qualquer deploy.                                                                                                                                                            |
| Analytics  | **Plausible** (opcional, desligado por padrão)                            | Sem cookies, então sem banner de consentimento; liga com uma variável.                                                                                                                           |

## Princípios de arquitetura

1. **Fonte única de dados.** `src/data/business.ts`, `menu.ts` e `content.ts` alimentam páginas, dados estruturados
   (schema.org), `llms.txt`, rodapé e testes. Um preço muda em um lugar.
2. **Nada inventado.** Campo desconhecido é `null`; a interface diz "consulte pelo WhatsApp" e o schema omite o campo.
   Os testes falham se aparecer placeholder ("validar", "R$ —", "lorem") no HTML. Ver `PENDENCIAS.md`.
3. **Toda URL passa por helper** (`src/lib/links.ts`): o mesmo build funciona na raiz do domínio ou em subcaminho
   (`usuario.github.io/repo/`).
4. **Lógica pura e testável** em `src/lib` e `src/scripts/order-form.ts`; componentes só apresentam.

## Estrutura

```
src/
  data/          fatos da casa (endereço, horários, cardápio, perguntas frequentes)
  lib/           lógica pura: horários/"aberto agora", links e WhatsApp, schema.org
  layouts/       Base.astro — <head> de SEO, JSON-LD, header, footer, WhatsApp flutuante
  components/
    ui/          peças compartilhadas (Header, Footer, TortaCard, PageHero, MapFacade…)
    home/        seções da página inicial
    menu/        cardápio e página de cada sabor
    pages/       peças das páginas institucionais (formulário de encomenda, FAQ, horários)
  pages/         rotas (index, cardapio, tortas/[slug], almoco, encomendas, sobre, contato,
                 perguntas-frequentes, politica-de-privacidade, 404, robots.txt, llms.txt)
  scripts/       JS de navegador: site.ts (global), order-form.ts, map-facade.ts
  assets/fotos/  fotos originais (processadas no build)
public/          ícones, manifest
tests/unit/      lógica e integridade dos dados
tests/dist/      verificação do site gerado (SEO, CSP, links, acessibilidade básica, orçamento de JS)
scripts/         utilitários (baixar fotos do site antigo, gerar ícones)
docs/            convenções para quem for editar
```

## SEO e GEO (respostas de IA)

- Title/description únicos por página, canonical absoluto, Open Graph com imagem 1200×630 gerada no build.
- Dados estruturados: `Restaurant` (endereço, geo, horários, sameAs, prêmio) em todas as páginas; `Menu`/`MenuItem`
  no cardápio e em cada sabor; `FAQPage`; `BreadcrumbList`; `AboutPage`; `ContactPage`.
- Uma página por sabor (`/tortas/<slug>/`): 8 portas de entrada para buscas como "torta de camarão Zona Leste".
- `llms.txt` gerado dos dados; `robots.txt` libera explicitamente os rastreadores de busca e de IA em produção.
- Sitemap sem páginas de redirecionamento nem 404. As 109 URLs do site antigo (SITE123) redirecionam para as novas.
- **Prévia não indexável:** com `SITE_INDEXABLE=false` (padrão no CI) toda página leva `noindex` e o robots.txt
  bloqueia tudo, para a prévia no github.io não competir com o domínio oficial.

## Segurança

- **CSP** gerada pelo Astro (`security.csp`) com hash de cada script e estilo: sem `unsafe-inline`, sem `unsafe-eval`,
  `object-src 'none'`, `base-uri 'self'`, `frame-src` só para o Google Maps. Vai por `<meta>` porque o GitHub Pages
  não aceita headers.
- **O que o GitHub Pages não cobre** (exige header HTTP): `frame-ancestors` (clickjacking), `X-Content-Type-Options`,
  `Permissions-Policy`, COOP. Risco baixo num site sem login nem formulário que envie dados. Se o cliente quiser
  fechar isso: Cloudflare na frente do Pages, ou a imagem Docker deste repositório, que entrega todos esses headers
  (`nginx.conf`).
- Nenhum dado pessoal sai do navegador: o formulário de encomenda só monta a mensagem e abre o WhatsApp no aparelho
  da pessoa (`method="dialog"`, sem envio). O mapa do Google só carrega após clique.
- JSON-LD serializado com escape de `<`; todo `target="_blank"` com `rel="noopener"`.
- CI com permissões mínimas, `persist-credentials: false` e actions fixadas por SHA.
- Dependências com versão exata e lock file; `npm audit` zerado (override do `minimatch` usado só pelo ESLint).

## Como rodar

```bash
npm ci
npm run dev          # http://localhost:4321
npm run verify       # check + lint + formatação + testes unitários + build + testes do build
npm run build && npm run preview
```

Variáveis (ver `.env.example`): `SITE_URL`, `BASE_PATH`, `SITE_INDEXABLE`, `PLAUSIBLE_DOMAIN`.
No Git Bash do Windows, prefixe `MSYS_NO_PATHCONV=1` ao usar `BASE_PATH=/repo/` (o shell converte o caminho).

Docker (auto-hospedagem ou prévia de produção com headers completos), porta **8080** só em `127.0.0.1`:

```bash
docker compose up --build -d   # http://localhost:8080
```

Imagem multi-stage: build em `node:22-alpine`, execução em `nginx-unprivileged` (não-root, uid 101), sistema de
arquivos somente leitura, `cap_drop: ALL`, `no-new-privileges`, healthcheck em `/healthz`.

## Deploy

`.github/workflows/deploy.yml`: em push na `main`, roda tipos, lint, formatação, testes unitários, build e testes do
build; só então publica no Pages. Variáveis do repositório (Settings → Secrets and variables → Actions → Variables):

| Variável           | Prévia (hoje)             | Com domínio próprio               |
| ------------------ | ------------------------- | --------------------------------- |
| `SITE_INDEXABLE`   | (vazia → `false`)         | `true`                            |
| `SITE_URL`         | (vazia → origem do Pages) | `https://www.labellatorta.com.br` |
| `PLAUSIBLE_DOMAIN` | opcional                  | opcional                          |

Para virar o domínio: configurar `www.labellatorta.com.br` em Settings → Pages (CNAME no DNS do cliente),
ativar "Enforce HTTPS", definir as duas variáveis acima e rodar o workflow.

## Custos

| Item                                 | Custo                     |
| ------------------------------------ | ------------------------- |
| Hospedagem (GitHub Pages)            | R$ 0                      |
| Domínio `.com.br` (o cliente já tem) | ~R$ 40/ano no Registro.br |
| Plausible (opcional)                 | a partir de ~US$ 9/mês    |
| Runtime, banco, APIs                 | não há                    |
