# Paper.js Build Environment

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

ARG BROWSER=chromium
ARG CACHE_DATE=unknown

# CACHE_DATE busts cache to always fetch the latest browser version
RUN echo "Cache date: ${CACHE_DATE}" && \
    npx playwright install-deps ${BROWSER} && \
    npx playwright install ${BROWSER}

CMD ["sh", "-c", "yarn build && yarn test"]
