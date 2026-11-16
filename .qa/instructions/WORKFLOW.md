# Workflow (owner, 2026-11-13): read this first

Two flows. **A** when a framework is assigned that has no harness yet. **B** for every testing day (Mon–Fri) on frameworks that already have one. The other rule files say *how* to do each step; this file says *which steps, in which order*.

## Two GitHub repos per framework (owner, 2026-11-12/13)

| | Main repo | Peer repo |
|---|---|---|
| Name | `heap-<code><digit>`: a deliberately vague, software-sounding name so it isn't obviously CopilotKit. Code = framework (lgh LangGraph, ntg Antigravity, gdk Google ADK, gtw AG2, gno Agno, dpg DeepAgents, qks Quickstarts, oap OpenAI Agents Python; new framework → a new 3-letter code), digit = UI (1 React, 2 Vue, 3 Angular) | `copilotkit-<fw>-<ui>` (e.g. `copilotkit-agno-angular`) |
| Visibility | public | public |
| Contents | the whole project: harness, `.github/workflows` CI/CD, voice narration (scripts, audio, `narrate`), recorder, `.qa/`, review tooling | the harness only. **No CI/CD, no voice narration, no automated pipeline, and no mention of them** (no workflow files, narration, `.qa/`, AI-tool files, words like CI/shard/pipeline/Claude in text). Produced only by `handoff.sh`, whose guards (key scan, env files, word scan, tsc, core manifest) must all pass |
| Collaborator | none | **MalaikaAbb** (push access; `handoff.sh --init` invites her) |
| Who writes | agents commit and push here | only `bash 2-shared/handoff.sh <fw>/<ui>` writes it; never edit or push it by hand |

- Create the peer once: `PYTHONIOENCODING=utf-8 bash 2-shared/handoff.sh <fw>/<ui> --init MMMustafakamran/copilotkit-<fw>-<ui>`. Per-repo extra excludes or allowed words: `2-shared/handoff/rules/<fw>-<ui>.py` / `.allow.txt`.
- Re-export after every pushed change to the main repo (end of A and B): `PYTHONIOENCODING=utf-8 bash 2-shared/handoff.sh <fw>/<ui>`.
- The peer repo is what other people see: if a guard fails, fix the main repo or the rules, never skip the guard.

## Standing permissions

Agents may (owner, 2026-11-13): create both repos above, set the main repo's CI secrets with `python 4-private/set-secrets.py <repo>` (prints only ok/FAIL), push, dispatch CI, upload clips to Loom and build the Google Docs. No owner OK is needed for findings, statuses or narration ([QA-RULES.md](QA-RULES.md) §6). Report what changed afterwards. Note: helper agents get blocked by the safety check on `gh repo create` even with this rule; then the main session creates the repo (the owner approved it) and hands the rest back.

## A. New framework (no harness yet)

1. **Scaffold.** New folder `1-frameworks/<fw>/<ui>/`, copied from the closest existing repo with the same frontend (React → `google-adk/react`, Vue → `google-adk/vue`, Angular → `ag2/angular`). Free ports (never 3000/8000). `bash 2-shared/qa-kit/sync.sh <fw>/<ui>`. Crawl the docs section's sidebar plus in-content links ([QA-RULES.md](QA-RULES.md) §9), one route per page, doc code verbatim, HARNESS edits only. Parallel agents (Opus low, balanced: ~3) may build page groups once the quickstart base runs; one agent owns `assignment.json`, `FINDINGS.md`, servers and commits.
2. **Test with the quick demo (probe), never with full recordings.** `npx tsx ../.qa/tools/probe.mts <ids>` (headless). Look at every `final.png`, the 5 s screenshots and `result.json`. Failing pages: 3 probes.
3. **Write everything from the probe evidence:** statuses (§8/§8a, team doc as anchor, `quickstartBlocked` if §8b), `FINDINGS.md`, `FINDING_EVIDENCE` (checked on the rendered page), Notepad notes, narration scripts and their audio (`narrate.py tts`, local only).
4. **Local filming only for diagnosis:** a page whose probe is unclear, flaky, or keeps turning out wrong may get one local `npm run record -- <id>` take to check its wiring. No local filming of the whole framework.
5. **GitHub:** create the main repo, set its secrets, push. Adapt `.github/workflows/daily.yml` (ports, start commands). The first run films every page, `quickstartBlocked` or not.
6. **CI films every page:** `gh workflow run daily.yml -R MMMustafakamran/<repo> -f scope=all`. Download the run to `3-output/<date>/runs/<repo>/r<runid>`.
7. **Review:** Haiku agents review every clip ([REVIEW.md](REVIEW.md)), 5 per agent.
8. **Fix and refilm what the review flags:** wrong status or finding → probe, then fix the status, finding, evidence, note and narration. Bad take → fix the recorder. Refilm the flagged pages (CI re-dispatch with `-f pages=<ids>`; a local take is fine for a page that keeps failing in CI). Review the new takes again. At most 3 rounds, then report what is still bad.
9. **Upload** every final clip to Loom (❌ narrated mp4, ✅ webm), write the links into `assignment.json` (`links[].loom`, `links[].filmed` = date), commit, push.
10. **Google Doc:** `build.py` → HTML ([REPORT.md](REPORT.md)) → a **new** Google Doc for the day (see REPORT.md §0). Then create the peer repo (see *Two GitHub repos* above).
11. **Report to the owner:** per page status, new findings, new big bugs (team ✅ but ours ❌), Loom count, doc link, open problems.

## B. Testing day (existing framework)

1. **Trigger CI** for each assigned repo: `gh workflow run daily.yml -R MMMustafakamran/<repo>` (default `scope=auto`, drift on, latest versions). Never `ignore_drift` or `use_lockfile` for a normal day ([DRIFT.md](DRIFT.md) §1).
2. **What CI films (`scope=auto`):**
   | Situation | Filmed |
   |---|---|
   | CopilotKit version changed since the committed lockfile | **every page** (✅ ⚠️ ❌) |
   | No version change | ❌ and ⚠️ pages, **plus every ✅ page whose last clip (`links[].filmed`) is 4 or more days old**: working pages never go more than 4–5 days without a new clip |
   | Any page with doc drift | **held** (not filmed) until step 3 |
   | `quickstartBlocked` repo | only the quickstart ([QA-RULES.md](QA-RULES.md) §8b) |
   CI installs npm `latest` CopilotKit / AG-UI and shows it in `VERSIONS.md` in the Quickstart IDE segment.
3. **Apply drift first.** Read `drift/drift.md` and `versions.md` from the run. For every held page, working pages too: apply the doc change to the harness verbatim ([DRIFT.md](DRIFT.md) §3), probe, update status/finding if the result changed, `drift.mjs --sync=<docPath>`, commit, push, then film just those pages: `-f pages=<ids>`.
4. **Download** that day's run(s) only, never an older run.
5. **Review, fix, refilm, report:** same as A steps 7–8. Every downloaded clip is Haiku-reviewed; act on each verdict ([REVIEW.md](REVIEW.md) §9); tell the owner every status, finding or narration change.
6. **Upload** to Loom only the clips filmed today, overwrite those pages' links, set `links[].filmed`; pages not filmed today keep their link.
7. **Google Doc:** rebuild the framework's HTML from the committed `assignment.json` files and upload it as a **new** Google Doc for the day (REPORT.md §0). Re-export the peer repos (`handoff.sh <fw>/<ui>`).
8. **Report:** version change yes/no, drift pages and what was applied, status changes, new big bugs, Loom count, doc links.

## Rules that apply to both

- Never print or commit keys or `.env`. Never ports 3000/8000; port 8000 runs the owner's own app.
- Never hide or fix a doc defect ([QA-RULES.md](QA-RULES.md) §1).
- Don't kill processes you didn't start. A helper agent that is denied a permission reports it to the owner; nobody does it for them.
- Briefs given to sub-agents must point at this file and must not contradict it (no local full filming, no `ignore_drift` on a normal day).
