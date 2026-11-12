/**
 * Finding clips for the Vue pages added 2026-11-10 (AUTORECORDER.md section 2): demo, then the
 * faulty doc text drag-selected, then the hurried Notepad note. Problem text: FINDINGS.md entries.
 * Evidence texts were checked against the rendered doc pages (2026-11-10).
 */
import { type Page } from 'playwright';
import { type ActionContext, type PageActionHandler, type PageRecordConfig } from '../core/types';
import { runStandardAction, sendPrompt } from '../core/actions';
import { sleep } from '../core/overlays/cursor';
import { type DocEvidence, showFinding } from './doc-evidence';
import { glideClick, glideTo } from './glide-click';
import { checkpoint, mark, probeText } from '../core/timeline';

type Demo = (page: Page, config: PageRecordConfig, root: string, ctx: ActionContext) => Promise<void>;

interface NewFinding { evidence: DocEvidence[]; note: string; demo?: Demo }

/** Send the prompt, then wait for `text` to show (or give up after `ms`). */
async function promptAndWaitFor(page: Page, config: PageRecordConfig, text: RegExp, ms: number): Promise<boolean> {
  await sendPrompt(page, config.prompt, { timeoutMs: 15000 });
  const el = page.getByText(text).first();
  const ok = await el.waitFor({ state: 'visible', timeout: ms }).then(() => true).catch(() => false);
  if (ok) await glideTo(page, el, 3000);
  return ok;
}

export const NEW_FINDINGS: Record<string, NewFinding> = {
  // FINDINGS.md #2
  'frontend-tools': {
    evidence: [{ text: 'The agent can then call it like any other tool and your frontend runs it in the browser.', caption: 'no backend step: the ADK agent needs AGUIToolset()' }],
    note: [
      'page only shows the vue side, useFrontendTool in DashboardAgent.vue',
      'nothing about the adk agent, no AGUIToolset step like the hitl page has',
      'with a plain adk agent the tool never reaches the model',
      'asked to show only sev1 incidents, agent just answers in text, filter stays all',
      'adding AGUIToolset to the agent makes it work, page never says so',
    ].join('\n'),
    demo: async (page, config, _root, ctx) => {
      await promptAndWaitFor(page, config, /sev ?1/i, 60000);
      await sleep(4000);
      const text = await page.evaluate(() => document.body.innerText).catch(() => '');
      if (/Current filter: all\b/.test(text)) ctx.fail('filter_incidents never ran: "Current filter" stayed "all".');
    },
  },
  // FINDINGS.md #2
  'tool-based': {
    evidence: [{ text: 'When the agent calls the tool, CopilotKit renders your component inline in the chat', caption: 'no backend step: the ADK agent needs AGUIToolset()' }],
    note: [
      'page registers WeatherCard with useComponent and shows no agent side',
      'plain adk agent never gets the component as a tool',
      'asked for the paris weather card, it just typed a text card in the chat',
      'no WeatherCard rendered, with AGUIToolset on the agent it shows up',
    ].join('\n'),
    demo: async (page, config, _root, ctx) => {
      await promptAndWaitFor(page, config, /Paris/i, 60000);
      await sleep(5000);
      ctx.fail('The agent answered in text; the WeatherCard component never rendered.');
    },
  },
  // FINDINGS.md #2
  'governed-actions': {
    evidence: [{ text: 'The agent proposes the action, the UI renders the checkpoint', caption: 'no agent shown; a plain ADK agent never sees the tool' }],
    note: [
      'page has the approval card and the useHumanInTheLoop tool but no agent at all',
      'plain adk agent doesnt get the frontend tool',
      'asked it to call approve_governed_action, it says it has no tools',
      'no approval card, same AGUIToolset step missing here',
    ].join('\n'),
    demo: async (page, config, _root, ctx) => {
      await promptAndWaitFor(page, config, /tool|email|access/i, 60000);
      await sleep(4000);
      if (!(await page.getByText('Approve and run').count())) ctx.fail('No approval card rendered.');
    },
  },
  // FINDINGS.md #3
  'state-rendering': {
    evidence: [
      { text: 'type ResearchState = { status?: string; draft?: string; completed?: number; total?: number };', caption: 'UI reads status/draft/completed/total' },
      { text: 'tool_context.state["document"] = document', caption: 'agent only writes document' },
    ],
    note: [
      'ResearchProgress reads status draft completed total from the agent state',
      'but the agent on the page only ever writes state document',
      'asked it to research the bicycle and write a draft',
      'agent says its in the document view but the panel stays on idle, empty bar',
    ].join('\n'),
    demo: async (page, config, _root, ctx) => {
      await promptAndWaitFor(page, config, /bicycle|draft|document/i, 60000);
      await sleep(4000);
      const idle = page.getByText('Idle', { exact: true }).first();
      if (await idle.isVisible().catch(() => false)) {
        ctx.fail('The progress panel stayed on "Idle": nothing the agent writes reaches it.');
        await glideTo(page, idle, 2500).catch(() => {});
      }
    },
  },
  // FINDINGS.md #4
  'shared-state': {
    evidence: [
      { text: 'tools=[set_notes, AGUIToolset()],', caption: 'set_notes never shown' },
      { text: 'before_model_callback=_inject_preferences,', caption: '_inject_preferences never shown' },
    ],
    note: [
      'agent snippet is only the LlmAgent call',
      'set_notes _inject_preferences _INSTRUCTION get_model are used but never shown',
      'it says see src agents shared_state_read_write_agent.py but doesnt link it',
      'as written its a nameerror, had to copy the showcase file to run it',
    ].join('\n'),
  },
  // FINDINGS.md #5
  hitl: {
    evidence: [
      { text: 'from agents.shared_chat import get_model, stop_on_terminal_text', caption: 'agents.shared_chat never shown or linked' },
      { text: 'import TimePickerCard from "./TimePickerCard.vue";', caption: 'TimePickerCard.vue never shown' },
    ],
    note: [
      'agent imports get_model and stop_on_terminal_text from agents.shared_chat',
      'that file isnt on the page or linked, backend wont start, modulenotfound',
      'MeetingApproval also imports TimePickerCard.vue which is never shown',
      'and the agent prompt says generate_task_steps, the vue tool is schedule_meeting',
      'picker only showed up with a stand in shared_chat and a picker i wrote',
    ].join('\n'),
    demo: async (page, config, _root, ctx) => {
      if (!(await promptAndWaitFor(page, config, /Pick a time/, 60000))) ctx.fail('No time picker card showed up');
    },
  },
  // FINDINGS.md #5
  'programmatic-control': {
    evidence: [
      { text: 'from agents.shared_chat import get_model, stop_on_terminal_text', caption: 'agents.shared_chat never shown or linked' },
      { text: 'const { agent } = useAgent({ agentId: "sales" });', caption: 'sales is never registered' },
    ],
    note: [
      'backend step is the hitl planning agent, imports agents.shared_chat',
      'shared_chat isnt on the page or linked so the server wont start, modulenotfound',
      'frontend uses agent sales, nothing registers sales anywhere',
      'with a stand in shared_chat the run button works but nothing shows the reply',
    ].join('\n'),
    demo: async (page, _config, _root, ctx) => {
      const run = page.getByRole('button', { name: 'Run agent' });
      await run.waitFor({ state: 'visible', timeout: 15000 });
      await sleep(1200);
      await glideClick(page, run);
      await sleep(1500);
      const done = await page
        .waitForFunction(() => !(document.querySelector('button') as HTMLButtonElement | null)?.disabled, null, { timeout: 60000 })
        .then(() => true)
        .catch(() => false);
      if (!done) ctx.warn('Run agent stayed disabled for 60 s');
      await glideTo(page, run, 3000);
    },
  },
  // FINDINGS.md #6
  'shared-state-readonly': {
    evidence: [{ text: "Surfaced to the agent through the backend's CopilotKit middleware on every turn.", caption: 'the agent never sees the context' }],
    note: [
      'page says useAgentContext values reach the agent on every turn',
      'set workspace to northstar like the doc, asked which workspace am i in',
      'agent says it cant see that, never gets northstar',
      'same with AGUIToolset on the agent, page shows no backend side for this',
    ].join('\n'),
  },
  // FINDINGS.md #7
  'mcp-apps': {
    evidence: [
      { text: 'agents: { default: agent },', caption: 'agent is never defined' },
      { text: 'https://mcp.example.com/mcp', caption: 'placeholder MCP server url' },
    ],
    note: [
      'runtime snippet registers default agent but agent is never defined',
      'and the mcp server url is just mcp.example.com/mcp, a placeholder',
      'filled both in with the excalidraw mcp server',
      'chat shows timed out waiting for agent to become idle, app frame stays blank',
    ].join('\n'),
  },
  // FINDINGS.md #8
  webmcp: {
    evidence: [{ text: 'searchOrders(', caption: 'searchOrders is never defined' }],
    note: [
      'OrderSearch.vue calls searchOrders but the page never defines or imports it',
      'asked the agent to use the searchOrders tool to find my open orders',
      'chat never replies, just sits there',
    ].join('\n'),
    demo: async (page, config, _root, ctx) => {
      await sendPrompt(page, config.prompt, { timeoutMs: 15000 });
      await sleep(30000);
      const text = await page.evaluate(() => document.body.innerText).catch(() => '');
      if (!/order/i.test(text.replace(config.prompt, ''))) ctx.fail('The agent never replied after the searchOrders tool was asked for');
    },
  },
  // FINDINGS.md #5, #9
  subagents: {
    evidence: [
      { text: 'On the frontend, the delegation log is a reactive render of the', caption: 'no frontend code for the delegation log' },
      { text: 'from agents.shared_chat import get_model, stop_on_terminal_text', caption: 'agents.shared_chat never shown or linked' },
    ],
    demo: async (page, config, _root, ctx) => {
      if (!(await promptAndWaitFor(page, config, /scatter|Rayleigh|wavelength/i, 120000))) ctx.fail('The supervisor never replied');
    },
    note: [
      'delegation log section says the frontend renders the delegations slot but has no code at all',
      'subagents_agent.py imports agents.shared_chat which isnt on the page or linked',
      'so the backend wont start as written, modulenotfound',
      'with a stand in shared_chat it answers but theres no delegation log to see',
    ].join('\n'),
  },
};

export const runNewFindingAction: PageActionHandler = async (page, config, root, ctx) => {
  const f = NEW_FINDINGS[config.id];
  try {
    await (f.demo ?? runStandardAction)(page, config, root, ctx);
  } finally {
    await showFinding(page, config, f.evidence, f.note);
  }
};

/** Fully Headless UI (✅): the doc's own <input aria-label="Message"> + Send button, replies as <article data-role>. */
export const runHeadlessUiAction: PageActionHandler = async (page, config, _root, ctx) => {
  await sendPrompt(page, config.prompt, {
    inputSelector: 'input[aria-label="Message"]',
    submitSelector: 'button[type="submit"]',
    messageSelector: 'article[data-role="assistant"]',
    timeoutMs: 15000,
  });
  const reply = page.locator('article[data-role="assistant"]').last();
  const ok = await page
    .waitForFunction(() => [...document.querySelectorAll('article[data-role="assistant"]')].some((a) => (a.textContent ?? '').trim().length > 2), null, { timeout: 60000 })
    .then(() => true)
    .catch(() => false);
  if (!ok) ctx.fail('No assistant reply rendered in the headless chat');
  else await glideTo(page, reply, 3000);
};

/** Human in the Loop (✅): the time picker card appears in the chat; pick a slot. */
export const runHitlAction: PageActionHandler = async (page, config, _root, ctx) => {
  if (!(await promptAndWaitFor(page, config, /Pick a time/, 90000))) return ctx.fail('No time picker card showed up');
  const slot = page.getByRole('button', { name: /Tomorrow/ }).first();
  if (await slot.isVisible().catch(() => false)) {
    await glideClick(page, slot);
    await sleep(8000);
  }
};

// ---------------------------------------------------------------------------------------------
// Threads pages, tested with the CopilotKit Intelligence key (2026-11-10). Runtime:
// my-copilot-app/server.threads.ts on 8154 (the headless page's server.ts). Threads are per user
// and persist between runs, so older rows can already be listed.
// ---------------------------------------------------------------------------------------------
const DRAWER_ROW = 'copilotkit-threads-drawer li[role="option"][data-thread-id]';
const promptHead = (config: PageRecordConfig) => config.prompt.slice(0, 24);

/** Threads Drawer: chat once, the thread is listed, New Conversation resets the chat, the row replays it. */
export const runThreadsDrawerAction: PageActionHandler = async (page, config, root, ctx) => {
  await page.locator('copilotkit-threads-drawer').first().waitFor({ state: 'attached', timeout: 30000 }).catch(() => {});
  await sleep(3000); // the drawer loads its list
  const rowsBefore = await page.locator(DRAWER_ROW).count();
  await runStandardAction(page, config, root, ctx);
  const listed = await page
    .waitForFunction((n) => (document.querySelector('copilotkit-threads-drawer')?.shadowRoot
      ?.querySelectorAll('li[role="option"][data-thread-id]').length ?? 0) > n, rowsBefore, { timeout: 45000, polling: 500 })
    .then(() => true)
    .catch(() => false);
  void checkpoint('thread', 'the new conversation is listed in the drawer', async () => `${await page.locator(DRAWER_ROW).count()} row(s), was ${rowsBefore}`, {
    ok: () => listed,
  });
  if (!listed) {
    ctx.fail('The Threads Drawer did not list the new conversation.');
    return;
  }
  await sleep(4000); // the thread name fills in
  await glideTo(page, page.locator(DRAWER_ROW).first(), 2000);
  mark('click', 'New Conversation');
  await glideClick(page, page.getByText('New Conversation', { exact: true }).first());
  const userBubble = page.getByText(config.prompt, { exact: false }).first();
  const reset = await userBubble.waitFor({ state: 'hidden', timeout: 15000 }).then(() => true).catch(() => false);
  void checkpoint('new', '"New Conversation" clears the chat', async () => reset);
  if (!reset) ctx.fail('"New Conversation" did not reset the chat.');
  await sleep(2500);
  mark('click', 'reopen thread');
  const mine = page.locator(DRAWER_ROW).filter({ hasText: promptHead(config) });
  await glideClick(page, (await mine.count()) > 0 ? mine.first() : page.locator(DRAWER_ROW).first());
  const replayed = await userBubble.waitFor({ state: 'visible', timeout: 20000 }).then(() => true).catch(() => false);
  void checkpoint('replay', 'selecting the thread replays its history', () => probeText(page.getByText(config.prompt, { exact: false })));
  if (!replayed) ctx.fail('Selecting the thread in the drawer did not replay its conversation.');
  await sleep(2500);
  // The page's own "New conversation" toolbar button (useCopilotChatConfiguration().startNewThread()).
  mark('click', 'own New conversation button');
  await glideClick(page, page.getByRole('button', { name: 'New conversation', exact: true }).first());
  const ownReset = await userBubble.waitFor({ state: 'hidden', timeout: 15000 }).then(() => true).catch(() => false);
  void checkpoint('new-button', 'the own "New conversation" button clears the chat', async () => ownReset);
  if (!ownReset) ctx.fail('The own "New conversation" button did not reset the chat.');
  await sleep(3000);
};

/** Headless Threads: chat once, the useThreads list shows it, selecting another row switches the chat, and back. */
export const runHeadlessThreadsAction: PageActionHandler = async (page, config, root, ctx) => {
  await runStandardAction(page, config, root, ctx);
  // The doc's ThreadSidebar: <li><button>{name}</button><button>Rename</button><button>Archive</button><button>Delete</button></li>
  const rows = page.locator('li:has(> button:text-is("Rename")) > button:first-child');
  const listed = await rows.first().waitFor({ state: 'visible', timeout: 45000 }).then(() => true).catch(() => false);
  void checkpoint('thread', 'the useThreads list shows the thread (Rename / Archive / Delete row)', async () => `${await rows.count()} row(s)`, {
    ok: () => listed,
  });
  if (!listed) {
    ctx.fail('The chat ran, but the useThreads list shows no threads.');
    return;
  }
  await sleep(4000); // the thread name fills in
  const userBubble = page.getByText(config.prompt, { exact: false }).first();
  const other = rows.filter({ hasNotText: promptHead(config) });
  if ((await other.count()) > 0) {
    mark('click', 'other thread');
    await glideClick(page, other.first());
    const switched = await userBubble.waitFor({ state: 'hidden', timeout: 20000 }).then(() => true).catch(() => false);
    void checkpoint('switch', 'selecting another thread switches the chat away from this one', async () => switched);
    if (!switched) ctx.fail('Selecting another thread did not switch the chat.');
    await sleep(3000);
  }
  mark('click', 'reopen thread');
  const mine = rows.filter({ hasText: promptHead(config) });
  await glideClick(page, (await mine.count()) > 0 ? mine.first() : rows.first());
  const replayed = await userBubble.waitFor({ state: 'visible', timeout: 20000 }).then(() => true).catch(() => false);
  void checkpoint('replay', 'selecting the thread replays its history', () => probeText(page.getByText(config.prompt, { exact: false })));
  if (!replayed) ctx.fail('Selecting the thread did not replay its conversation.');
  await sleep(4000);
};
