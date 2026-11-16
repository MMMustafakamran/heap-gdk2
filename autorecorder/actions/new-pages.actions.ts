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
import { registerDocEvidence } from '../core/doc-evidence';
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
      "page says the agent can call the frontend tool and the browser runs it",
      "asked to show only sev1 incidents, agent answers in text and the filter stays on all",
      "there is no agent side step, a plain adk agent never gets the tool without aguitoolset",
      "with aguitoolset added by hand it works, so the page is missing that step",
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
      "page says when the agent calls the tool weathercard renders in the chat",
      "asked for the paris weather card, the agent typed a text card and no weathercard showed",
      "no agent side is shown, a plain adk agent needs aguitoolset to get the tool",
      "with aguitoolset added by hand the card shows up, so the page is missing that step",
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
      "governed actions page says the agent proposes the action and u approve it in a card",
      "asked it to call approve_governed_action, it says it has no tools and no approval card shows",
      "no agent is shown at all, a plain adk agent never gets the tool without aguitoolset",
      "so the approval step cant run as written",
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
      "page says the progress panel follows the agent state live",
      "asked it to research the bicycle, the panel stays on idle with an empty bar",
      "the ui reads status draft completed and total but the agent only writes document",
      "so nothing the agent writes ever reaches the panel",
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
      "page says the agent and the ui share the notes state",
      "as written the agent dies with nameerror, it only ran after i copied the showcase file",
      "set_notes _inject_preferences _instruction and get_model are never shown",
      "the page says see the agent file but never links it, so u cant run it as written",
    ].join('\n'),
  },
  // FINDINGS.md #5
  hitl: {
    evidence: [
      { text: 'from agents.shared_chat import get_model, stop_on_terminal_text', caption: 'agents.shared_chat never shown or linked' },
      { text: 'import TimePickerCard from "./TimePickerCard.vue";', caption: 'TimePickerCard.vue never shown' },
    ],
    note: [
      "hitl page says the agent asks u to pick a time in a card",
      "the picker only showed up with a stand in shared chat and a picker i wrote myself",
      "the agent imports agents.shared_chat which is never shown or linked, so the backend wont start with modulenotfound",
      "timepickercard.vue is imported but never shown either",
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
      "page says run the agent from ur own button and show what it did",
      "the run button only does something with a stand in agent, and nothing shows the reply",
      "the agent imports agents.shared_chat which is never shown or linked, so the server wont start with modulenotfound",
      "the frontend uses an agent called sales that is never registered",
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
      "page says useagentcontext values reach the agent on every turn",
      "set workspace to northstar, asked which workspace am i in, the agent says it cant see it",
      "the page shows no backend side for this, and adding aguitoolset doesnt change it",
      "so the context never reaches the agent",
    ].join('\n'),
  },
  // FINDINGS.md #7
  'mcp-apps': {
    evidence: [
      { text: 'agents: { default: agent },', caption: 'agent is never defined' },
      { text: 'https://mcp.example.com/mcp', caption: 'placeholder MCP server url' },
    ],
    note: [
      "page says the mcp app shows up right in the chat",
      "the runtime snippet uses an agent that is never defined and the server url is the mcp.example.com placeholder",
      "with the agent and url filled in by hand the chat times out and the app frame stays blank",
      "so the snippet cant run as written",
    ].join('\n'),
  },
  // FINDINGS.md #8
  webmcp: {
    evidence: [{ text: 'searchOrders(', caption: 'searchOrders is never defined' }],
    note: [
      "page says the agent can use the searchorders tool from ordersearch.vue",
      "asked it to find my open orders, chat never replies and just sits there",
      "searchorders is never defined or imported on the page",
      "so the tool cant work as written",
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
      "subagents page says the ui shows a delegation log of the subagents",
      "with a stand in shared chat the supervisor answers but there is no delegation log",
      "the log section has no code at all",
      "the agent imports agents.shared_chat which is never shown or linked, so the backend wont start",
    ].join('\n'),
  },
};

// Doc step highlights each page's evidence (core/doc-evidence.ts), before the IDE. No KNOWN_ISSUE set in this repo.
registerDocEvidence(Object.fromEntries(Object.entries(NEW_FINDINGS).map(([id, f]) => [id, f.evidence])));

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
  // HARNESS (recorder): Intelligence keeps a user's threads across takes and every take sends the same prompt, so
  // older rows carry the same generated name ("Exploring tide pools"). Filtering rows by name picked the current
  // thread itself (CI run 43212255785). The list is newest first: switch to the last (oldest) row and check that the
  // chat content changes (the old thread has the same prompt, so the prompt bubble stays).
  const chatText = () =>
    page.evaluate(() => {
      const clone = document.body.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('ul').forEach((u) => { if (u.querySelector('li > button')) u.remove(); });
      return clone.innerText.replace(/\s+/g, ' ').trim();
    });
  const waitText = async (want: (t: string) => boolean) => {
    for (let i = 0; i < 40; i++) {
      if (want(await chatText())) return true;
      await sleep(500);
    }
    return false;
  };
  const before = await chatText();
  const count = await rows.count();
  if (count > 1) {
    mark('click', 'other thread');
    await glideClick(page, rows.nth(count - 1));
    const switched = await waitText((t) => t !== before);
    void checkpoint('switch', 'selecting another thread switches the chat away from this one', async () => switched);
    if (!switched) ctx.fail('Selecting another thread did not switch the chat.');
    await sleep(3000);
  }
  mark('click', 'reopen thread');
  await glideClick(page, rows.first()); // newest first: the thread this take created
  const replayed = (await waitText((t) => t === before)) && (await userBubble.isVisible());
  void checkpoint('replay', 'selecting the thread replays its history', () => probeText(page.getByText(config.prompt, { exact: false })));
  if (!replayed) ctx.fail('Selecting the thread did not replay its conversation.');
  await sleep(4000);
};
