import { type PageActionHandler } from '../core/types';
import { sendPrompt, waitForAgentResponseCompletion } from '../core/actions';
import { sleep } from '../core/overlays/cursor';
import { glideTo } from './glide-click';

/** Vue Frontend Tools: the agent calls filter_incidents and "Current filter" changes. */
export const runVueFrontendToolsAction: PageActionHandler = async (page, config, _root, ctx) => {
  const label = page.getByText(/Current filter:/).first();
  const msgCount = await sendPrompt(page, config.prompt, { timeoutMs: 15000 });
  const changed = await page
    .waitForFunction(() => !/Current filter: all\b/.test(document.body.innerText), null, { timeout: 60000 })
    .then(() => true)
    .catch(() => false);
  if (!changed) ctx.fail('filter_incidents never ran: "Current filter" stayed "all".');
  try {
    await waitForAgentResponseCompletion(page, 2500, msgCount);
  } catch (e) {
    ctx.warn(`Reply did not complete cleanly: ${String(e).slice(0, 160)}`);
  }
  await glideTo(page, label, 3000);
  await sleep(1500);
};

import { runStandardAction } from '../core/actions';
import { type DocEvidence, showFinding } from './doc-evidence';
import { registerDocEvidence } from '../core/doc-evidence';

export const FINDING_EVIDENCE: Record<string, DocEvidence[]> = {
  quickstart: [
    { text: 'Bring your ADK agents', caption: 'The Vue quickstart URL shows the ADK landing page, not Vue steps' },
    { text: 'Start building', caption: 'Only a setup-prompt wizard, no install / runtime / agent steps' },
  ],
};
// Doc step highlights these (core/doc-evidence.ts), before the IDE. No KNOWN_ISSUE set in this repo.
registerDocEvidence(FINDING_EVIDENCE);

/** Finding clips end with the finding typed into Notepad (REPOS.md Rule 6). */
const QUICKSTART_FINDING = [
  "vue quickstart should walk u thru a vue app with an adk agent",
  "the link opens the google adk landing page with a prompt wizard for a coding agent",
  "no create vue step, no copilotkit vue install, no runtime and no adk agent, i wired it all myself",
  "so there is no working vue setup for the other pages to build on",
].join('\n');

export const runVueQuickstartAction: PageActionHandler = async (page, config, root, ctx) => {
  try {
    await runStandardAction(page, config, root, ctx);
  } finally {
    await showFinding(page, config, FINDING_EVIDENCE[config.id], QUICKSTART_FINDING, 'finding-vue-quickstart.txt');
  }
};
