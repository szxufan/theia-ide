# Builder stage
FROM node:24-bookworm AS build-stage

# install required tools to build the application
RUN apt-get update && apt-get install -y libxkbfile-dev libsecret-1-dev

WORKDIR /home/theia

# Copy repository files
COPY . .

# Build with pnpm: the root postinstall compiles the theia framework submodule
# and links it via workspace:* dependencies, so the image contains the
# framework modifications. Reproducible via the committed pnpm-lock.yaml.
RUN npm install -g pnpm@9 && \
    pnpm config set network-timeout 600000 && \
    pnpm install --frozen-lockfile && \
    pnpm build:extensions && \
    (for i in 1 2 3 4 5; do \
        pnpm download:plugins && exit 0; \
        echo "pnpm download:plugins 失败（第 $i/5 次），15 秒后重试，已下载的插件会自动跳过"; \
        sleep 15; \
    done; exit 1) && \
    pnpm browser build && \
    pnpm store prune && \
    rm -rf .git applications/electron theia-extensions/launcher theia-extensions/updater node_modules

# Production stage uses a small base image
FROM node:24-bookworm-slim AS production-stage

# Create theia user and directories
# Application will be copied to /home/theia (read-only app dir)
# User home is a separate data dir so a single volume persists
# all user data (.theia config/extensions, .m2, .gradle, dotfiles)
# without touching the application itself
RUN adduser --system --group --home /home/theia/data theia \
 && mkdir -p /home/theia/data /home/project \
 && chown -R theia:theia /home/theia/data /home/project \
 && chmod g+rw /home

# Install required tools for application: Temurin JDK, JDK, SSH, Bash, Maven
# Node is already available in base image
RUN apt-get update && apt-get install -y wget apt-transport-https curl && \
    apt-get update && apt-get install -y git openssh-client openssh-server bash libsecret-1-0 openjdk-17-jdk maven && \
    apt-get purge -y wget && \
    apt-get clean

ENV HOME=/home/theia/data
WORKDIR /home/theia

# Copy application from builder-stage
COPY --from=build-stage --chown=theia:theia /home/theia /home/theia

EXPOSE 3000

# Health check: probe the HTTP endpoint following redirects, with an HTML
# Accept header. When single-user login is enabled, unauthenticated requests
# without an HTML Accept header are rejected with 401 by design (API/script
# clients); browsers get a 302 to /login.html instead. Sending the header
# makes the probe behave like a browser and succeed in both modes.
# start-period covers the backend startup (plugin deployment).
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fL -H "Accept: text/html" http://localhost:3000/ || exit 1

# Specify default shell for Theia and the Built-In plugins directory
ENV SHELL=/bin/bash \
    THEIA_DEFAULT_PLUGINS=local-dir:/home/theia/plugins

# Use installed git instead of dugite
ENV USE_LOCAL_GIT=true

# Switch to Theia user
USER theia
WORKDIR /home/theia/applications/browser

# Launch the backend application via node
ENTRYPOINT [ "node", "/home/theia/applications/browser/lib/backend/main.js" ]

# Arguments passed to the application
CMD [ "/home/project", "--hostname=0.0.0.0" ]
