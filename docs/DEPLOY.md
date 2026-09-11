# Deploying

Stumblezone is published to a Decentraland **World** — a scene addressed by a NAME rather than by
LAND parcels. The live World is `justchatting.dcl.eth`.

## Prerequisites

- Node 22+ (`.nvmrc`), `npm install` done, `npm run verify` green.
- A wallet that owns the NAME (or has been granted deploy rights to it) in a browser extension such
  as MetaMask. The signature is free; no gas is spent.
- `scene.json` → `worldConfiguration.name` set to the NAME.

## Deploy

```bash
npm run deploy -- --target-content https://worlds-content-server.decentraland.org
```

The CLI builds the scene, opens `http://localhost:8000` in your browser, asks the wallet to sign
the deployment, checks the wallet's permissions for the NAME, and uploads. Verify afterwards:

```bash
curl -s https://worlds-content-server.decentraland.org/world/justchatting.dcl.eth/about | jq .healthy
```

## What is uploaded

Only the scene: `bin/`, `assets/`, `images/`, `scene.json`, `main.crdt`. Everything else —
sources, tests, tools, docs, screenshots — is excluded by `.dclignore`, so the World stays at
~3.6 MB. `npm run budget` reports the weight before you deploy.

## Security

No key, seed phrase or token is stored in this repository or in CI. CI only builds and tests;
every deploy is signed by hand. See [SECURITY.md](../SECURITY.md).
