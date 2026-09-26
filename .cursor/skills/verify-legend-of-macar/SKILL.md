---
name: verify-legend-of-macar
description: >-
  Verify Legend of Macar, a browser canvas CRPG served from index.html + assets/
  (GitHub Pages; no backend). Use when you must prove a user-facing play path —
  title → new game/continue, movement and standing HUD, combat basics, pack/camp,
  search/craft — with captured evidence and a deterministic APPROVE or REJECT.
  Do not use for compile or npm test alone, and do not treat pixel-guessing or
  "looks fine" as proof.
---

# Verify Legend of Macar

This skill is for the next agent, not a human tour. Drive the **real canvas game** the way a player does. Internal setters, `?play` / `#play` debug skips, and `npm test` are not user-path proof.

Primary surface: `index.html` + `assets/` on a 2D canvas (`#c`). No DOM chrome for play. Live site: `https://www.legendofmacar.com`. Isolated runs must **serve the checkout**, never the live origin (live `localStorage` is the player's book).

Read `features/README.md` before driving. One convenient entry point is incomplete when the map lists others.

Harness: `control-macar` (Chrome CDP + isolated static server + a serve-time read-only probe).

```bash
MACAR_SKILL="<repo>/.cursor/skills/verify-legend-of-macar"
export PATH="$MACAR_SKILL/bin:$PATH"
# or invoke $MACAR_SKILL/bin/control-macar …
```

## Launch

Start an isolated instance owned by this run. Refuse to drive any instance you did not start.

```bash
control-macar launch --port 4174
```

Leave that process running. It binds **127.0.0.1:4174**, injects the verify probe into `/` and `/index.html` only (never writes `index.html` on disk), and starts Chrome with a disposable `--user-data-dir` so `legendofmacar.save.v2` / `.v1` / `.good` / `.pending` are empty.

Ready when stdout includes `launch ready` and `GET http://127.0.0.1:4174/` returns 200 with header `X-Macar-Verify: 1`.

```bash
control-macar browser open /
control-macar browser wait --scene title --timeout 30
```

Teardown is **Cleanup**, not `pkill chrome`. Optional flags: `--headed` if a display exists; `--force` only after a stranded previous run; `--allow-live` is forbidden unless the human explicitly asked to touch the live save.

Two runs at once: different `--port` and a fresh `MACAR_RUN_ID`. Do not attach a second Chrome to the same user-data-dir.

Repo-native start for a human is any static server from the repo root (`python3 -m http.server`, `npx serve`). Verification still uses `control-macar launch` so the probe and isolated profile exist.

## Doctor

Run first whenever anything looks off, and once after every Launch.

```bash
control-macar doctor
```

Pass means: this run's origin answers, the served `index.html` contains the injected `VERIFY-SCAFFOLDING` probe, the document still identifies as The Legend of Macar, Chrome for this run is alive, and the browser is not on `www.legendofmacar.com`.

```bash
control-macar doctor --suite
```

`--suite` runs `npm test` (`node src/qa/run-tests.js` over `src/**/*.test.js`) as a **helper**. A green suite is not user-path proof and cannot APPROVE a feature.

If doctor fails, stop driving. Fix launch or cleanup a stranded run, then doctor again.

## Drive

The game is a canvas. There is no ARIA tree. The harness exposes a **virtual accessibility snapshot** (scene, labeled menu buttons, HUD keys/labels, hint, log, player, save slot) via a probe injected at serve time.

Prefer, in order:

1. Labeled menu buttons (`New descent`, `Descend`, `Continue`, `Chapters`, `Credits`, `Burn it`, `Keep the mark`).
2. Keyboard verbs from play (not title): `d` walk-right, `a` walk-left, `w`/`s` walk, `v` Defend, `1` Attack, `i`/`p`/`4` PACK, `c`/`3` Camp, `f` herb SEARCH, `t` secret SEARCH, `k` Craft, `Escape` pause / leave pack.
3. HUD keys from the snapshot (`pack`, `wall`, `attack`, `search`, `secret`, `camp`, `craft`) — not pixel guesses.

```bash
control-macar browser open /
control-macar browser wait --scene title
control-macar browser click --name "Continue"
control-macar browser wait --scene title_menu
control-macar browser click --name "New descent"
control-macar browser wait --scene play --timeout 60
control-macar browser press --key d --hold-ms 800
control-macar browser press --key v
control-macar browser click --hud-key pack
control-macar browser press --key Escape
```

Standing HUD law (Helm) is a product constraint, not style: **no Rally icon**; both herb and secret-door verbs read **SEARCH**; **Craft** is the word above the icon, not a word on the art; combat log starts **collapsed at the top**; `D` is walk-right; Defend is `V`.

Do not use `?play` / `#play` to skip the title when proving `title-new-game`. That hash is a debug tunnel (`document.title` becomes kin names) and is not a player entry.

Clicking the live canvas at hardcoded CSS coordinates is a last resort. If you must, record the snapshot `menus[]` / `hud[]` box you used.

## Evidence

Proof artifacts live in `.cursor/skills/verify-legend-of-macar/artifacts/<run-id>/` (named in Launch stdout as `evidence …`). Cleanup must not delete this directory.

Standards:

- Exercise the real user path (title buttons, keyboard verbs, HUD plates). Do not assign `G.scene`, call `startChapter` from the console, or open `?play`.
- Capture the **action and the resulting state**, not only the last frame.
- For every required check: a screenshot (`*.png`) and/or a snapshot (`*.json` plus `*.aria.txt`) and/or a console transcript. Name files with the check id (`title-visible.png`).
- Side effects: Continue / save proofs must show `hasSave` and the `legendofmacar.save.v*` keys after a player Save or camp rest — then reload title and read `Continue`.
- `npm test` may be attached as `doctor-suite.txt`. It does not prove a play path.

```bash
control-macar browser screenshot --path "$EVIDENCE/title-visible.png"
control-macar browser snapshot --path "$EVIDENCE/title-visible.json" --aria
control-macar browser console --path "$EVIDENCE/console.jsonl"
control-macar check record --id title-visible --status pass --reason "Continue on splash"
control-macar check record --id title-menu-visible --status pass --reason "New descent on title_menu"
```

Skip only with an explicit **verified-unreachable** reason after you attempted the mapped entry and observed the unmet precondition (example: east-chamber foe before four Rouse). A skip without that prefix is a REJECT.

## Cleanup

Kill only what this run started (Chrome pid and the launch-server pid in `.run/state.json`). Never `pkill -f chrome` or kill by process name.

```bash
control-macar cleanup
control-macar confirm-evidence
```

Cleanup removes the disposable Chrome profile and the server. It **keeps** `artifacts/<run-id>/`. `confirm-evidence` records `cleanup-intact=pass` only if every passed feature check still has a file whose name starts with that check id.

## Helpers

All helpers are executable under this skill directory.

| Command | What it does |
| --- | --- |
| `control-macar launch [--port 4174] [--headed] [--force]` | Isolated server + Chrome. Blocks as the file server. |
| `control-macar doctor [--suite]` | Read-only instance health. `--suite` adds `npm test`. |
| `control-macar browser open /` | Navigate the run's origin. |
| `control-macar browser wait --scene <name> [--timeout 30]` | Poll the probe until scene matches. |
| `control-macar browser click --name "New descent"` | Pointer-click a labeled menu plate. |
| `control-macar browser click --hud-key pack` | Pointer-click a HUD slot by key. |
| `control-macar browser press --key d [--hold-ms 800]` | `keydown` / `keyup` on `window`. |
| `control-macar browser snapshot --path FILE [--aria]` | Probe JSON and optional virtual ARIA text. |
| `control-macar browser screenshot --path FILE` | Viewport PNG (includes the canvas). |
| `control-macar browser console --path FILE` | CDP console transcript. |
| `control-macar browser isolate-saves` | `GameSave.clear(localStorage)` on this origin only. |
| `control-macar browser state` | Print the current probe snapshot. |
| `control-macar prove --feature title-new-game` | Drive the mapped new-game path and record its checks. |
| `control-macar check record --id ID --status pass\|fail\|skip [--reason TEXT]` | Append a check row. |
| `control-macar cleanup` | Tear down pids; keep evidence. |
| `control-macar confirm-evidence` | After cleanup, require evidence files still exist. |
| `control-macar finish` | `cleanup` + `confirm-evidence` + `verdict`. |
| `control-macar verdict` | Print the machine-readable block and exit 0 only on APPROVE. |

The probe source is `lib/probe-snippet.js`. It is **not** product code. The server splices it into the in-memory `index.html` before the last `</script>`.

## Verdict

Emit this block at the end of **every** run, including failures:

```
VERDICT: APPROVE|REJECT
CHECKS: id=pass|fail|skip reason=...
EVIDENCE: /absolute/path/...
```

`control-macar verdict` and `control-macar finish` print that block.

**APPROVE** only if all of the following are true:

1. `doctor=pass`.
2. Every required check for the driven feature(s) is `pass`, or `skip` with `reason` starting with `verified-unreachable`.
3. Each `pass` check has captured evidence (screenshot and/or snapshot/ARIA and/or console transcript) proving the **user-visible** end state.
4. `cleanup-intact=pass` — evidence still exists after teardown.

**REJECT** if any required check fails, is skipped without `verified-unreachable`, lacks evidence, doctor failed, or cleanup removed the proof.

Never APPROVE because the game compiled, Chrome launched, or `npm test` passed. Never APPROVE on "looks fine."

Mapped required checks:

- `title-new-game`: `doctor`, `title-visible`, `title-menu-visible`, `enter-the-deep`, `play-hud`, `cleanup-intact`
- Other features: the labeled bullets in that feature's **Driving it with control-macar** section, plus `doctor` and `cleanup-intact`

One-feature golden path (enough to prove this skill):

```bash
control-macar launch --port 4174
# other terminal:
control-macar doctor
control-macar prove --feature title-new-game
control-macar finish
```

As the game changes, keep this map honest with `/maintain-verification-skill`.
