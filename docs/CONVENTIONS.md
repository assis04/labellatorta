# Convenções do projeto (leitura obrigatória antes de editar)

Site estático da La Bella Torta (tortaria no Parque São Jorge, São Paulo). Astro 7 (`output: static`),
TypeScript strict, CSS próprio com tokens, sem framework de UI. Publicado no **GitHub Pages**, possivelmente
em subcaminho (`https://<usuario>.github.io/<repo>/`) até o domínio próprio ser apontado.

## Referência visual

O esboço aprovado é `../esboco/index.html` (v2). A linguagem é a do site da La Braciera: fundo creme, seções
alternando creme (`--bg`) e bege (`.section--alt`), títulos em Cormorant Garamond (classe `.h1`/`.h2`, tamanho
contido), texto em DM Sans, rótulo pequeno em caixa alta na cor terracota (`.label`) acima de cada título,
botões em pílula (`.btn--primary`, `.btn--outline`, `.btn--light`, `.btn--ghost-light`), cards simples com foto
de canto arredondado (16px), rodapé escuro. **Não** usar: fundo escuro, neon, tipografia gigante, fontes mono,
molduras duplas, glassmorphism, marquee, gradientes decorativos. Se parecer "feito por IA", está errado.

## Fonte única de dados — nunca repetir fato à mão

- `src/data/business.ts` — nome, endereço, telefone, WhatsApp, geo, horários (`openingHours`), redes, links de mapa.
- `src/data/menu.ts` — as 8 tortas (`tortas`, `salgadas`, `doces`, `vegetarianas`, `destaques`, `getTorta`, `formatPrice`, `tagLabels`).
- `src/data/content.ts` — `faq`, `reviews` (vazio de propósito), `mainNav`, `footerNav`.
- Campos `null` (preço, CEP, ano de fundação) = ainda não confirmados. A interface **omite** ou diz "consulte";
  nunca inventa. Preço `null` → texto "consulte o preço" e nenhum `Offer` no schema.
- **Proibido inventar**: depoimentos, notas do Google, prêmios além do Restaurant Guru 2026, ano de fundação,
  nomes de pessoas, tamanhos de torta, bairros de entrega, prazos, formas de pagamento, distância do metrô.
  Se a seção depende disso, use texto honesto ("combine pelo WhatsApp") ou um convite (ex.: "veja as avaliações no Google" com `links.googleReviews`).

## Links e URLs — sempre pelos helpers (`src/lib/links.ts`)

- Link interno: `href('/cardapio/')` (aplica o base path). Caminhos sempre com barra final.
- WhatsApp: `whatsappUrl('pedido' | 'encomenda' | 'almoco' | texto)` e `whatsappOrderUrl(nomeDaTorta)`.
  Todo link de WhatsApp leva `target="_blank" rel="noopener" data-track="whatsapp" data-track-intent="<onde>"`.
- Telefone/e-mail: `telUrl`, `mailUrl`. Mapa: `links.googleMaps`, `links.waze`, `links.googleMapsEmbed`.
- Rotas oficiais: `/`, `/cardapio/`, `/tortas/<slug>/`, `/almoco/`, `/encomendas/`, `/sobre/`, `/contato/`,
  `/perguntas-frequentes/`, `/politica-de-privacidade/`, `404`.

## Layout e componentes compartilhados (não editar — pedir ao orquestrador)

- `src/layouts/Base.astro` — props: `title`, `fullTitle?`, `description` (120–160 caracteres), `path`,
  `shareImage?`, `shareImageAlt?`, `schema?: JsonLd[]`, `crumbs?: Crumb[]` (gera BreadcrumbList),
  `headerOverlay?` (só home), `noindex?`. Restaurant + WebSite já entram em toda página.
- `src/components/ui/`: `Icon` (nomes em `Icon.astro`), `WhatsAppIcon`, `OpenStatus`, `SectionHead`,
  `TortaCard`, `Breadcrumbs`, `PageHero` (topo das páginas internas, já tem H1 e trilha), `CtaBand`.
- `src/lib/schema.ts` — `menuSchema`, `menuItemSchema`, `faqSchema`, `breadcrumbSchema`, `restaurantId`.
- `src/lib/hours.ts` — `getOpenStatus`, `hoursTable`, `formatTime`. Linhas de horário levam
  `data-hours-days="1,2,3"`; o script global marca o dia de hoje com o atributo `data-today`.
- `src/styles/global.css` — tokens e utilitários (`.container`, `.section`, `.section--alt`, `.label`, `.h1`,
  `.h2`, `.h3`, `.lead`, `.prose`, `.btn*`, `.badge*`, `.icon-dot`, `.photo`, `.sr-only`).
- Comportamentos globais em `src/scripts/site.ts`: `[data-reveal]` (revelação sutil), `[data-open-status]`,
  `[data-hero]` (a home marca o hero para o header transparente virar sólido), `[data-track]`.

## Segurança (CSP via meta — o GitHub Pages não aceita headers)

- **Nenhum atributo `style="…"`** nos templates, nenhum `onclick=` etc., nenhum `define:vars`, nenhum
  `<script is:inline>` (exceção única: o JSON-LD do layout). Estilo sempre por classe em `<style>` do componente.
- Scripts de página: `<script>` normal do Astro (vira módulo externo com hash) importando de `src/scripts/`.
- Nada de recurso externo além de: Google Maps em iframe (só após clique) e `wa.me`/redes em links.
- Texto vindo de dados entra por interpolação `{}` (escapado). `set:html` só com conteúdo controlado.

## Imagens

- Sempre `Picture` de `astro:assets` com `formats={['avif','webp']}`, `widths` e `sizes` coerentes com o
  layout, e `width` = maior largura usada (evita fallback gigante). `alt` descritivo em português.
- Só a imagem do topo da página é `loading="eager"` + `fetchpriority="high"`; o resto é `lazy`.
- Fotos disponíveis em `src/assets/fotos/` (nomes semânticos). Não baixar fotos novas.

## SEO/GEO em cada página

- Um único `<h1>`. Hierarquia sem pular níveis. Title ≤ 60 caracteres, description 120–160, com o que a página
  oferece + "Parque São Jorge"/"Zona Leste de São Paulo" quando fizer sentido.
- Texto factual e citável (frases que uma IA possa usar para responder). Português do Brasil, tom de bairro,
  direto, sem clichês ("experiência única", "sabores que encantam"). Frases com sujeito, sem fragmentos de efeito.
- Toda seção termina numa ação (pedir, encomendar, ver cardápio, como chegar).

## Acessibilidade

- Contraste AA, foco visível (já global), alvos de toque ≥ 44px, `aria-current` em navegação,
  formulários com `<label>` e erros inline (`aria-describedby`, `aria-invalid`), `prefers-reduced-motion` respeitado.

## Verificação (cada agente roda em pasta própria para não colidir com os outros)

```bash
ASTRO_CACHE_DIR=.agent-builds/<seu-nome>/cache npx astro build --outDir .agent-builds/<seu-nome>/dist
npx astro check
npx eslint <seus arquivos>
npx prettier --write <seus arquivos>
```

- **Não** instalar dependências, **não** rodar `npm install`, **não** apagar `dist/` nem `.agent-builds/` de outros.
- Edite apenas os arquivos da sua tarefa. Se precisar mudar algo compartilhado, descreva a mudança no seu relatório.
