# Docker Build Environment for Paper.js

This Docker setup provides a consistent build and test environment for Paper.js with all required dependencies pre-installed.

## Prerequisites

- Docker
- Docker Compose (recommended)

## Quick Start

### Using Docker Compose (Recommended)

Build the library:
```bash
docker compose up paperjs
```

Build and run automated tests (both Node and PhantomJS):
```bash
docker compose up paperjs-test
```

Run interactive browser tests (for debugging):
```bash
docker compose up paperjs-test-browser
```
Then open http://localhost:8000/test in your browser. Press Ctrl+C to stop the server.

### Building Complete Distribution

To build the complete distribution including documentation:
```bash
docker compose up paperjs-dist
```

This runs `yarn dist` which generates:
- All library files (paper-core.js, paper-full.js)
- TypeScript definitions (paper.d.ts)
- Complete documentation in `dist/docs/`

**Note**: `paperjs` service uses `yarn build` (quick build), while `paperjs-dist` uses `yarn dist` (complete build with docs).

### Development with Watch Mode

For active development, use watch mode to automatically rebuild when source files change:
```bash
docker compose watch paperjs-watch
```

This uses Docker Compose's built-in watch feature to:
- Monitor the `src/` directory for changes
- Automatically sync changes to the container
- Rebuild immediately when files are modified
- Update the `dist/` folder in real-time

**Using in another application**: Mount Paper.js dist folder in your app's compose file:
```yaml
# In your app's docker-compose.yml
services:
  your-app:
    volumes:
      - ../paper.js/dist:/app/node_modules/paper/dist
```

Then run `docker compose watch paperjs-watch` in the paper.js directory. Your app will automatically use the rebuilt files.

### Using Docker Directly

Build the Docker image:
```bash
docker build -t paperjs-build .
```

Run the build:
```bash
docker run --rm -v $(pwd)/dist:/app/dist paperjs-build yarn build
```

Build complete distribution with documentation:
```bash
docker run --rm -v $(pwd)/dist:/app/dist paperjs-build yarn dist
```

Run tests:
```bash
docker run --rm paperjs-build yarn test
```

## Output

Built files will be available in the `dist/` directory on your host machine:
- `dist/paper-core.js` - Core library
- `dist/paper-full.js` - Full library with all features
- `dist/paper.d.ts` - TypeScript definitions
- `dist/docs/` - Documentation (generated with `yarn dist`)

