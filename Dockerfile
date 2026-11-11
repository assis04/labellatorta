# syntax=docker/dockerfile:1
#
# Site da La Bella Torta servido por nginx sem root, com os headers de segurança que o GitHub Pages
# não permite (ver nginx.conf). Uso: auto-hospedagem e prévia de produção local.
#
#   docker compose up --build                                   -> http://localhost:8080
#   docker build --build-arg SITE_INDEXABLE=true -t labellatorta-site .
#   docker run --rm labellatorta-site -t                        -> valida o nginx.conf
#
# Imagens fixadas por versão + digest (reprodutível; atualize as duas juntas).

# ---- 1. build: Node 22 compila o site estático -------------------------------------------------
FROM node:22.23.4-alpine3.24@sha256:0e1754758c2df4cfa3e68d59e2e1b7374bb7fd9ea6328eaaacf15cc934af8202 AS build

WORKDIR /app
ENV CI=true \
    ASTRO_TELEMETRY_DISABLED=1 \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false

# Dependências antes do código: a camada do `npm ci` só refaz quando o lockfile muda.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .

# Configuração PÚBLICA do build (vai parar no HTML). Nunca passe segredos por ARG.
# Padrão seguro: prévia sem indexação; produção liga SITE_INDEXABLE=true explicitamente.
ARG SITE_URL=https://www.labellatorta.com.br
ARG BASE_PATH=/
ARG SITE_INDEXABLE=false
ARG PLAUSIBLE_DOMAIN=

# O site vai para /srv/site<BASE_PATH>; o 404.html também fica na raiz para o error_page do nginx.
RUN case "$BASE_PATH" in /|/*/) ;; *) echo "BASE_PATH deve começar e terminar com /" >&2; exit 1;; esac \
 && npm run build \
 && mkdir -p "/srv/site${BASE_PATH%/}" \
 && cp -R dist/. "/srv/site${BASE_PATH%/}/" \
 && if [ -f dist/404.html ]; then cp dist/404.html /srv/site/404.html; fi

# ---- 2. runtime: só nginx + arquivos estáticos --------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.30.6-alpine3.24@sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03 AS runtime

LABEL org.opencontainers.image.title="labellatorta-site" \
      org.opencontainers.image.description="Site estático da La Bella Torta (Astro) servido por nginx sem root"

# Arquivos pertencem ao root e são só leitura para o nginx (uid 101): o processo não altera o site.
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /srv/site /srv/www

USER 101:101
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

# nginx direto como PID 1 (sem os scripts de entrypoint da imagem, que tentam escrever em /etc).
# STOPSIGNAL SIGQUIT herdado da imagem base: desligamento gracioso.
ENTRYPOINT ["nginx", "-e", "stderr"]
CMD ["-g", "daemon off;"]
