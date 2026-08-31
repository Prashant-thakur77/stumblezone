# Credits

## Code
All gameplay code in `src/` written for this buildathon. No third-party gameplay code is vendored.

## Engine and tooling
- **Decentraland SDK7** (`@dcl/sdk`) — Decentraland Foundation
- **Decentraland SDK Skills** (`decentraland/sdk-skills`) — verified SDK7 patterns, used as the
  API reference throughout
- **tsx** — TypeScript execution for the unit-test runner

## Art
No third-party 3D models, textures or audio are used. Every visual in the scene is built from SDK
primitives (`MeshRenderer.setBox`) with a hand-picked colour palette defined in `src/config.ts`.

The fruit palette is chosen for maximum hue separation so the colours stay distinguishable on a
small screen in bright light.

## Design reference
Round concepts are inspired by the party-game genre (memory-tile, sweeper, disappearing-bridge and
hex-decay formats are long-standing genre staples). No assets, code or files from any commercial
game are used.

## Documentation
- Decentraland creator documentation — `docs.decentraland.org`
