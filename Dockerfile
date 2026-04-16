# Paper.js Build Environment
FROM node:18-bookworm

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
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -f -v

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Ignore engines check (package.json targets >=18, but Node 16 works fine)
RUN yarn config set ignore-engines true

# Install dependencies
RUN yarn install --frozen-lockfile

# Install Playwright Chromium browser and its system dependencies
RUN npx playwright install-deps chromium && npx playwright install chromium

# Copy the rest of the application
COPY . .

# Remove Yarn 3 config so the bundled Yarn Classic is used at runtime
RUN rm -f .yarnrc.yml && rm -rf .yarn/releases .yarn/plugins

# Default command - build the library
CMD ["yarn", "build"]
