import { type Locator, type Page } from 'playwright';
import { getGlobalCursorPos, humanGlide, idleNudge, sleep } from './overlays/cursor';
import { checkpoint, mark, probeText } from './timeline';

/**
 * Doc evidence in the doc step (error clips: doc → highlight → IDE → demo → Notepad).
 *
 * After the doc skim, the engine wheel-scrolls to each faulty snippet, drag-selects it with the
 * browser's own selection and holds, emitting `mark('evidence', text)` per snippet. Nothing is drawn
 * on the page. Ported from the repos' actions/doc-evidence.ts.
 *
 * Contract: a page's evidence is `PageDefinition.findingEvidence` if set, else what the repo
 * registered with `registerDocEvidence(FINDING_EVIDENCE, { skip: KNOWN_ISSUE })` (call it once at
 * module load of the actions file). No evidence → no-op (✅ clips unchanged). Never throws.
 */
export interface DocEvidenceItem {
  /** Text on the rendered doc page (matched against pre/code/p/li/h2/h3). */
  text: string;
  /** Recorder-log note only, never on screen. */
  caption?: string;
  /** Doc tab label to click first when the snippet sits behind a tab. */
  clickTab?: string;
}

// The repo's map is kept by reference and read when a page records: entries added to it after
// registerDocEvidence (e.g. later Object.assign blocks in an actions file) still count
// (LangGraph React lost three pages' evidence that way, review 2026-11-16).
const sources: { map: Record<string, DocEvidenceItem[] | undefined>; skip: Set<string> }[] = [];

/** Register finding evidence per page id. Ids in `skip` (e.g. KNOWN_ISSUE, level 2) get none. */
export function registerDocEvidence(
  map: Record<string, DocEvidenceItem[] | undefined>,
  opts: { skip?: Iterable<string> } = {},
): void {
  sources.push({ map, skip: new Set(opts.skip ?? []) });
}

export function docEvidenceFor(id: string, own?: DocEvidenceItem[]): DocEvidenceItem[] {
  if (own) return own;
  for (let i = sources.length - 1; i >= 0; i--) {
    const { map, skip } = sources[i];
    if (skip.has(id)) return [];
    const items = map[id];
    if (items?.length) return items;
  }
  return [];
}

/** Highlight each item on the doc page as it is now (no navigation). Non-fatal. */
export async function highlightDocEvidence(page: Page, items: DocEvidenceItem[]): Promise<void> {
  if (!items.length) return;
  console.log(`   🔎 Highlighting the faulty doc text (${items.length} spot(s))...`);
  for (const item of items) {
    try {
      mark('evidence', item.text);
      if (item.clickTab) await clickDocTab(page, item.clickTab);
      const target = await findEvidence(page, item.text);
      void checkpoint('evidence', `doc shows "${item.text}"`, () => (target ? probeText(target) : null));
      if (!target) {
        console.warn(`   ⚠️ Evidence not found on the doc page: "${item.text}"`);
        continue;
      }
      if (item.caption) console.log(`   👉 ${item.caption}`);
      await wheelIntoView(page, target, item.text);
      await dragSelect(page, target, item.text);
      for (let i = 0; i < 4; i++) {
        await sleep(900);
        await idleNudge(page);
      }
    } catch (e) {
      console.warn(`   ⚠️ Doc evidence step failed for "${item.text}": ${String(e).slice(0, 120)}`);
    }
  }
}

async function clickDocTab(page: Page, label: string): Promise<void> {
  const tab = page.getByRole('tab', { name: label }).first();
  const box = (await tab.count()) ? await tab.boundingBox().catch(() => null) : null;
  if (!box) {
    console.warn(`   ⚠️ Doc tab not found: "${label}"`);
    return;
  }
  await humanGlide(page, box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await sleep(700);
}
async function findEvidence(page: Page, text: string) {
  for (const sel of ['pre', 'code', 'p', 'li', 'h2', 'h3']) {
    const all = page.locator(sel, { hasText: text });
    const n = await all.count();
    for (let i = 0; i < n; i++) {
      if (await all.nth(i).isVisible().catch(() => false)) return all.nth(i);
    }
  }
  const any = page.getByText(text, { exact: false }).first();
  if ((await any.count()) > 0 && (await any.isVisible().catch(() => false))) return any;
  return null;
}
/**
 * Where the wheel scrolls the doc page itself. docs.copilotkit.ai scrolls a full-height <div>, not
 * the window; code boxes (max-h 600px) and the sidebars have their own scrollbars and would eat the
 * wheel, and the sticky header scrolls nothing. Probe a few points over the article and keep the
 * first whose nearest scrolling ancestor is the page scroller (clientHeight >= 70% of the window and
 * containing the article: the sidebar is tall too).
 * `prefer` is tried first.
 */
async function pageWheelPoint(page: Page, prefer?: { x: number; y: number }): Promise<{ x: number; y: number } | null> {
  return page
    .evaluate((pref) => {
      const art = document.querySelector('article') ?? document.querySelector('main');
      const r = art ? art.getBoundingClientRect() : { left: 300, right: window.innerWidth - 300 };
      const xs = [r.left + 6, r.left + 18, r.right - 8, (r.left + r.right) / 2];
      const h = window.innerHeight;
      const ys = [h * 0.5, h * 0.4, h * 0.62, h * 0.3, h * 0.72];
      const pts: { x: number; y: number }[] = [];
      if (pref) pts.push(pref);
      for (const y of ys) for (const x of xs) pts.push({ x, y });
      for (const p of pts) {
        let el = document.elementFromPoint(p.x, p.y) as HTMLElement | null;
        for (; el && el !== document.body; el = el.parentElement) {
          const oy = getComputedStyle(el).overflowY;
          if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 4) break;
        }
        if (el && el !== document.body && el.clientHeight >= h * 0.7 && (!art || el.contains(art))) return p;
      }
      return null;
    }, prefer ?? null)
    .catch(() => null);
}

/** The text's centre Y, and the rect of its own (non-page) scroll box if it sits in one. */
async function scrollInfo(target: Locator, text?: string): Promise<{ textY: number | null; inner: { top: number; bottom: number; left: number; right: number } | null }> {
  const textY = text ? await textCentreY(target, text) : null;
  const inner = await target
    .evaluate((el) => {
      const h = window.innerHeight;
      for (let e: HTMLElement | null = el as HTMLElement; e && e !== document.body; e = e.parentElement) {
        const oy = getComputedStyle(e).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && e.scrollHeight > e.clientHeight + 4) {
          if (e.clientHeight >= h * 0.7) return null; // the page scroller
          const r = e.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
        }
      }
      return null;
    })
    .catch(() => null);
  return { textY, inner };
}

async function wheelBurst(page: Page, delta: number): Promise<void> {
  const notches = Math.max(2, Math.round(Math.abs(delta) / 100));
  for (let n = 0; n < notches; n++) {
    await page.mouse.wheel(0, delta / notches);
    await sleep(35 + Math.random() * 45);
  }
  await sleep(250 + Math.random() * 400);
}

/**
 * Scroll the way a person does (mouse-wheel bursts, no programmatic jump): wheel the page from a
 * point that scrolls the page until the text is mid-screen; if the text sits in a code box with its
 * own scrollbar, wheel over that box until the line is inside it. Stops when the page can't move
 * further (target near the top/bottom), instead of looping on the spot.
 */
async function wheelIntoView(page: Page, target: Locator, text?: string): Promise<void> {
  const vh = page.viewportSize()?.height ?? 900;
  const mid = vh * 0.5;
  let lastPageY: number | null = null;
  for (let i = 0; i < 60; i++) {
    const box = await target.boundingBox().catch(() => null);
    if (!box) break;
    const { textY, inner } = await scrollInfo(target, text);
    const ty = textY ?? box.y + Math.min(box.height, 120) / 2;
    // 1. The box is on screen but the line is scrolled away inside it: wheel over the box.
    if (inner && inner.top > 60 && inner.bottom < vh - 30 && (ty < inner.top + 24 || ty > inner.bottom - 24)) {
      const cx = inner.left + Math.min(220, (inner.right - inner.left) / 2);
      const cy = (inner.top + inner.bottom) / 2;
      const { x, y } = getGlobalCursorPos();
      if (Math.abs(x - cx) > 40 || Math.abs(y - cy) > 40) await humanGlide(page, cx, cy);
      const want = ty - cy;
      await wheelBurst(page, Math.sign(want) * Math.min(Math.abs(want), 420));
      continue;
    }
    // 2. Otherwise move the page so the line (or the box) sits mid-screen.
    const anchor = inner && (ty < inner.top || ty > inner.bottom) ? (inner.top + inner.bottom) / 2 : ty;
    const off = anchor - mid;
    if (Math.abs(off) < 140) break;
    // Page already at its top or bottom: the line can't get closer to the middle, stop wheeling.
    if (lastPageY !== null && Math.abs(anchor - lastPageY) < 4 && anchor > 70 && anchor < vh - 30) break;
    lastPageY = anchor;
    // Antigravity: wheel from the page margin just left of the snippet (a code box with its own
    // scrollbar eats the wheel), as long as that point scrolls the page and not the sidebar.
    const pt = (await pageWheelPoint(page, { x: Math.max(box.x - 28, 8), y: Math.min(Math.max(mid, 160), vh - 60) })) ?? { x: 40, y: mid };
    const { x, y } = getGlobalCursorPos();
    if (Math.abs(x - pt.x) > 60 || Math.abs(y - pt.y) > 60) await humanGlide(page, pt.x, pt.y);
    await wheelBurst(page, Math.sign(off) * Math.min(Math.abs(off), 300 + Math.random() * 200));
  }
  await sleep(600);
}

interface TextSpan { sx: number; sy: number; ex: number; ey: number }

async function locateText(target: Locator, text: string): Promise<TextSpan | null> {
  // Plain loops only: tsx's `__name` helper does not exist inside the page.
  return target
    .evaluate((el, needle) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      let full = '';
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        nodes.push(n as Text);
        full += (n as Text).data;
      }
      for (let at = full.indexOf(needle); at >= 0; at = full.indexOf(needle, at + 1)) {
        const rects: DOMRect[] = [];
        for (const pos of [at, at + needle.length - 1]) {
          let acc = 0;
          for (const node of nodes) {
            if (pos < acc + node.data.length) {
              const r = document.createRange();
              r.setStart(node, pos - acc);
              r.setEnd(node, Math.min(pos - acc + 1, node.data.length));
              const b = r.getBoundingClientRect();
              if (b.width > 0 && b.height > 0) rects.push(b);
              break;
            }
            acc += node.data.length;
          }
        }
        if (rects.length === 2) {
          const [s, e] = rects;
          return { sx: s.left + 1, sy: s.top + s.height / 2, ex: e.right - 1, ey: e.top + e.height / 2 };
        }
      }
      return null;
    }, text)
    .catch((err) => {
      console.warn(`   ⚠️ locateText failed: ${String(err).slice(0, 160)}`);
      return null;
    });
}

async function textCentreY(target: Locator, text: string): Promise<number | null> {
  return (await locateText(target, text))?.sy ?? null;
}

async function dragSelect(page: Page, target: Locator, text: string): Promise<void> {
  const pts = await locateText(target, text);
  const vh = page.viewportSize()?.height ?? 900;
  // Never drag at a guess: a miss selects whatever is under the cursor (the docs banner, prose).
  if (!pts || pts.sy < 70 || pts.ey > vh - 30) {
    console.warn(`   ⚠️ Text not on screen, not selecting: "${text}"`);
    return;
  }
  await humanGlide(page, pts.sx - 3, pts.sy);
  await sleep(300 + Math.random() * 300);
  await page.mouse.down();
  await humanGlide(page, pts.ex + 2, pts.ey, 34);
  await sleep(120);
  await page.mouse.up();
}
