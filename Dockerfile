# Paper.js Build Environment

# --- Separate runtime for Playwright ---
FROM node:22-bookworm AS playwright-node

# --- Base stage: dependencies only ---
FROM node:18-bookworm AS base

# Install system dependencies for native modules (canvas, etc.)
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    python3 \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    fontconfig \
    fonts-liberation \
    default-jre-headless \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -f -v

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn config set ignore-engines true
RUN yarn install --frozen-lockfile

COPY . .

RUN rm -f .yarnrc.yml && rm -rf .yarn/releases .yarn/plugins

CMD ["yarn", "build"]

# --- Dist stage: adds Java flags for JSDoc (parboiled needs module access) ---
FROM base AS dist

RUN JAVA_BIN=$(readlink -f "$(which java)") && \
    printf '#!/bin/sh\nexec "%s" --add-opens java.base/java.lang=ALL-UNNAMED --add-opens java.base/sun.nio.ch=ALL-UNNAMED "$@"\n' "$JAVA_BIN" > /usr/local/bin/java && \
    chmod +x /usr/local/bin/java

CMD ["yarn", "dist"]

# --- Test stage: adds Playwright browser ---
FROM base AS test

# Keep paper.js on Node 18; use Node 22 only for Playwright.
COPY --from=playwright-node /usr/local/bin/node /opt/node22/bin/node

ARG BROWSER=chromium
ENV BROWSER=${BROWSER}
ARG CACHE_DATE=unknown

# CACHE_DATE busts cache to always fetch the latest browser version
RUN echo "Cache date: ${CACHE_DATE}" && \
    /opt/node22/bin/node node_modules/playwright/cli.js install-deps ${BROWSER} && \
    /opt/node22/bin/node node_modules/playwright/cli.js install ${BROWSER}

CMD ["sh", "-c", "yarn build && yarn test:node && PATH=/opt/node22/bin:$PATH yarn test:playwright"]
