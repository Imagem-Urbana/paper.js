# Paper.js Build Environment
# Using Debian Buster (not Bullseye) because PhantomJS requires OpenSSL 1.1
FROM node:18-buster

# Debian Buster is EOL, repos moved to archive
RUN sed -i 's|http://deb.debian.org|http://archive.debian.org|g' /etc/apt/sources.list \
    && sed -i 's|http://security.debian.org|http://archive.debian.org|g' /etc/apt/sources.list \
    && sed -i '/stretch-updates/d' /etc/apt/sources.list

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

# Try to fix PhantomJS OpenSSL configuration issues
ENV OPENSSL_CONF=/dev/null

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Ignore engines check (package.json targets >=18, but Node 16 works fine)
RUN yarn config set ignore-engines true

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Remove Yarn 3 config so the bundled Yarn Classic is used at runtime
RUN rm -f .yarnrc.yml && rm -rf .yarn/releases .yarn/plugins

# Default command - build the library
CMD ["yarn", "build"]
