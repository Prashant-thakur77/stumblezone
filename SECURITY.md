# Security

## Reporting

If you find a vulnerability — in the scene, the tooling, or the deployment process — email
<prashant101007@gmail.com> with the details. Please do not open a public issue for security reports.
You will get a reply within 72 hours.

## What is and is not in scope

Stumblezone has **no backend**. There is no server, no database, no API key and no stored credential
anywhere in this repository or in CI. The scene runs entirely on the client and talks only to
Decentraland's own message bus.

- The deployment wallet's seed phrase exists only on paper. It is never in a file, an environment
  variable, or a CI secret. Deploys are signed by hand in a browser.
- The message bus is peer-to-peer. A malicious client can send forged `eliminated` / `finished` /
  `cheer` messages; the design accepts this — crowns are a session score with no monetary value, and
  every payload is slot-stamped so a forged message can only affect the round it names.
- No user data is collected, stored or transmitted beyond what the Decentraland client itself does.

## Supported versions

Only the latest commit on `main` is supported. It is what is deployed to `justchatting.dcl.eth`.
