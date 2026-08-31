# Getting a World and a deploy wallet

Runbook for the two items blocking Task 1 of the [build plan](superpowers/plans/2026-08-31-stumblezone-build.md).
Written 2026-08-31; every claim below was checked against the live Decentraland docs that day.
Deadline pressure: the World must exist and be deployed to before **Sep 4**, and stay up **Sep 5–11**.

---

## Part 0 — Do this first, before reading the rest

**Ask in the Friendzone Discord channel whether participant NAMEs are provided.**

`https://dcl.gg/discord` → the Friendzone channel. Ask verbatim:

> Building for the Friendzone Mobile Buildathon — are Decentraland NAMEs provided to participants for
> deploying our Worlds, or do we need to acquire our own NAME/ENS?

This costs five minutes and may save 100 MANA plus gas. It is asynchronous, so send it now and keep
working through Part 2 while you wait. Do **not** block on the answer — if nothing comes back within a
few hours, take Route B or C.

---

## Part 1 — The wallet

You need one wallet that will own the World and sign deployments. If you already have a MetaMask
account you use for Decentraland, that is the one — skip to Part 2.

- [ ] **1.1** Install MetaMask (browser extension) from `https://metamask.io`. Docs:
  `https://docs.decentraland.org/blockchain-integration/get-a-wallet.md`
- [ ] **1.2** Create a wallet. **Write the 12-word seed phrase on paper.** Not in a file, not in this
  repo, not in a password manager you have not tested a restore from.
- [ ] **1.3** Log in to `https://decentraland.org` with it once, so a Decentraland profile exists for
  the address. You need this anyway to walk your own World.
- [ ] **1.4** Note the address. It goes in `scene.json` nowhere, but you will need it for the Discord
  ask and for checking your storage budget.

**Security line that matters:** this wallet will own the NAME/ENS and sign deploys. It should hold the
100 MANA and gas and nothing else. Do not use a wallet holding significant assets.

---

## Part 2 — The World

Three routes. **Pick by what you already own**, in this order.

### Route B — You already own an ENS domain (best case: free, instant, zero config)

Verified against the docs: **no ENS-side setup is required.** No text records, no resolver changes,
no Decentraland-specific configuration. The Worlds content server checks that the signing wallet owns
the domain, and that is the whole handshake.

- [ ] **B.1** Confirm the domain is held by the wallet from Part 1. Check at `https://app.ens.domains`.
  If it is in a different wallet, either deploy from that wallet or transfer the domain.
- [ ] **B.2** Confirm the registration does not expire before Sep 12. An expiring domain during the
  judging window takes your World down.
- [ ] **B.3** Put it in `scene.json`:

```json
{ "worldConfiguration": { "name": "yourname.eth" } }
```

- [ ] **B.4** Go to Part 3.

**Constraint:** ENS Worlds have a **fixed 36 MB** scene size cap and do not draw from the NAME/LAND/MANA
storage budget. Stumblezone is a low-poly arena with one texture atlas — 36 MB is not close to a
problem, but run `SceneOptimizer` over the GLBs before the final deploy anyway.

### Route C1 — Buy an ENS domain (cheap, fast, no MANA needed)

- [ ] **C1.1** Go to `https://app.ens.domains`, connect the Part 1 wallet, search a name.
- [ ] **C1.2** Register for 1 year. A 5+ character `.eth` name is the cheap tier; you also pay Ethereum
  gas. Check the total shown at checkout before signing.
- [ ] **C1.3** Wait for the registration to confirm, then follow Route B from B.3.

### Route C2 — Buy a Decentraland NAME (100 MANA)

- [ ] **C2.1** Go to `https://builder.decentraland.org/names`, connect the Part 1 wallet.
- [ ] **C2.2** Claim a name. Cost is **100 MANA**.

  **Unverified in the docs:** which chain the mint happens on, and therefore whether gas is ETH or
  MATIC. The docs state the 100 MANA price but do not state the network. **The Builder checkout shows
  the network and the gas estimate before you sign — read that screen and budget for gas on top of
  the 100 MANA.** If the gas quote is unpleasant, Route C1 is cheaper.

  Alternative: buy an already-minted NAME from `https://decentraland.org/marketplace/names`.

- [ ] **C2.3** Put it in `scene.json` as `yourname.dcl.eth`:

```json
{ "worldConfiguration": { "name": "yourname.dcl.eth" } }
```

- [ ] **C2.4** Go to Part 3.

**Storage:** each NAME grants 100 MB, +100 MB per LAND parcel, +100 MB per 2,000 MANA held, shared
across all your Worlds. If you later drop below your used budget (by selling MANA, say) you get
**48 hours** to fix it before your Worlds go inaccessible — do not sell the MANA during judging week.

### Route comparison

| | Cost | Speed | Storage cap | Config needed |
|---|---|---|---|---|
| **A. Discord-provided NAME** | free | hours–days, uncertain | 100 MB | none |
| **B. ENS you own** | free | instant | 36 MB | **none** |
| **C1. Buy ENS** | ~1yr fee + ETH gas | ~10 min | 36 MB | none |
| **C2. Buy DCL NAME** | 100 MANA + gas | ~10 min | 100 MB+ | none |

For this project, **B or C1 wins**. 36 MB is far more than a Kenney-asset arena needs, and neither
requires acquiring MANA under deadline.

---

## Part 3 — Prove it works today, with a cube

Do not discover a permissions problem on Sep 4. Deploy something trivial the same day you get the name.

- [ ] **3.1** Scaffold, if you have not yet:

```bash
cd /home/prashant/stumblezone
npx @dcl/sdk-commands init --project scene-template
```

- [ ] **3.2** Add `worldConfiguration` to `scene.json` with your name from Part 2.
- [ ] **3.3** Deploy:

```bash
npm run deploy -- --target-content https://worlds-content-server.decentraland.org
```

A browser window opens; sign with the Part 1 wallet. Validations run and either accept or reject.

- [ ] **3.4** Wait. **Conversion takes 30–60 minutes** before the scene is reliably playable. This is
  not optional patience — it is why the final deploy on Sep 4 cannot be the last thing you do.
- [ ] **3.5** Open it on your phone. In the Decentraland mobile app chatbox:

```
/goto yourname.eth
```

  Or from a browser: `decentraland://?realm=yourname.eth`

- [ ] **3.6** **Done when** you have walked around a default cube scene in your live World, on your
  phone, over mobile data — not just Wi-Fi. That proves the thing judges will do actually works.

**Note:** all Worlds are automatically listed on the Places page. That is what you want here — it is
free discovery during judging. To opt out you would add `"placesConfig": { "optOut": true }` inside
`worldConfiguration`; **do not** do that for this project.

---

## Part 4 — The CI deploy wallet (optional, and my recommendation is to skip it)

**Recommendation: skip GitHub Actions auto-deploy for this build.** You will deploy perhaps six times
total over eleven days, each one deliberate, each one needing a 30–60 minute conversion wait before you
verify it. `npm run deploy` from your laptop is the right tool at that frequency. Setting up CI costs
an hour you do not have and adds a failure mode (a bad auto-deploy taking the World down mid-judging)
with no matching benefit.

Do it only if you end up with a collaborator pushing scene changes. If so:

- [ ] **4.1** Create a **second, empty** MetaMask account. It holds nothing and owns nothing. This is
  the disposable key.
- [ ] **4.2** Grant it deploy rights on your World. In **Creator Hub → Manage tab → your World →
  Permissions**:
  - Enable **Multi-Scene World (Advanced)** — collaborator grants live behind this toggle.
  - Under **Collaborators**, add the disposable wallet's address with scope **All Parcels**.

  Equivalent API, if you prefer curl (all require signed fetch and World ownership):
  - `GET  /world/{world_name}/permissions` — view current config
  - `POST /world/{world_name}/permissions/deployment` — set the permission type
  - `PUT  /world/{world_name}/permissions/deployment/{address}` — add an address to the allow-list

- [ ] **4.3** Export the disposable account's private key from MetaMask and store it as a GitHub
  repository secret named `DCL_PRIVATE_KEY`. The CLI reads it from the environment:

```bash
export DCL_PRIVATE_KEY=<the disposable key>
npm run deploy -- --target-content https://worlds-content-server.decentraland.org
```

- [ ] **4.4** **Never** put the Part 1 wallet's key in CI. It owns the NAME/ENS; if it leaks, you lose
  the World mid-judging and the submission fails requirement #1.
- [ ] **4.5** Since the repo must be public for the buildathon, confirm the key is a GitHub *secret*
  and never a committed file. Add a `.gitignore` entry for `.env` before you create one.

---

## What to hand back to the build plan

Once Part 3 is green, these values unblock Task 1:

- World name (for `scene.json` → `worldConfiguration.name`): `________________`
- Deploy wallet address: `________________`
- Route taken (A / B / C1 / C2): `____`
- Confirmed playable on phone over mobile data: `yes / no`

Then update [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) — blocking items 1 and 2 close.
