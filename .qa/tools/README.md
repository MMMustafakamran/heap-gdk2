# tools/

CI steps shared by every repo (run from the repo root, from its synced `.qa/tools/`).

| Tool | Job | What it does |
|---|---|---|
| `drift.mjs` | plan | Doc drift vs `doc-snapshot/`; holds changed pages ([DRIFT.md](../../instructions/DRIFT.md)). |
| `versions.mjs` | plan | Re-resolves lockfiles within the ranges: what a new reader installs today. |
| `evidence_check.mjs` | plan, after drift | Every `FINDING_EVIDENCE` text (from `autorecorder/actions/*.ts`) must be in the live page's server-rendered HTML (scripts / RSC payload ignored: they hold code the reader never sees). Missing → page held; `plan-out/evidence.json`. Tool or fetch fault → warn, record anyway. `--dump=f.json` writes the page table for `gate.py`; `--evidence=t.json` tests the matcher. |
| `gate.py` | record, after Record | Finding clips (evidence or `demoMayError`) need `evidence` mark + all `evidence` checkpoints ok + `notepad` + `notepad-closed`. Failures retaken once, then `::warning::` + summary table. The `failure` mark is expected. |
| `ci_post.py` | record / report | Narration fit/mix + clip checks + run summary. |
| `probe.mts` | local | Fast headless probe of a page (AUTORECORDER.md §0). |
| `warm_graphs.py` | CI | Warms LangGraph graphs before recording. |
