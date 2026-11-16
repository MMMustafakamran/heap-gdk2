"""Paste-by-column report: the team doc's own tables, row for row, with our result in one column.

The owner pastes our column straight over the team doc's column, so the rows must match the team
doc exactly: same sections, same order, same Section / Sub-section rows. Pages are matched by label
(normalized, plus ALIASES); a team row we don't test keeps an empty cell, and the run lists them.

  python team_rows.py --team TEAM.html --framework LangGraph --column LangGraph.js \
      --section "React Guides=langgraph/react/assignment.json" \
      --section "Guides (Vue)=langgraph/vue/assignment.json" \
      --quickstart "JS (React)=langgraph/react/assignment.json" --quickstart "JS (Vue)=langgraph/vue/assignment.json" \
      --out X.html
"""
import argparse, html, re, sys, urllib.parse
import build
from build import cell, TD, esc
from common import load, visible

ALIASES = {  # team label (normalized) -> our label (normalized)
    'open close and feedback': 'open close and feedback',
    'css customization': 'css customization',
    'built generative ui': None,
    'render agent state in your app': 'render agent state in your app',
    'hitl overview': 'human in the loop',
    'governed actions approval ui': 'governed actions',
    'governed actions approval ui ': 'governed actions',
    'sub agents': 'sub agents',
    'subagents': 'sub agents',
}


def norm(s):
    s = html.unescape(re.sub(r'<[^>]+>', ' ', s)).replace('​', '')
    s = re.sub(r'^[\s\-–]+', '', s.lower())
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def team_sections(path, framework):
    s = open(path, encoding='utf-8', errors='ignore').read()
    heads = [(m.start(), norm(m.group(1)), html.unescape(re.sub(r'<[^>]+>', '', m.group(1))).strip())
             for m in re.finditer(r'<h[12][^>]*>(.*?)</h[12]>', s, re.S)]
    start = next(i for i, h in enumerate(heads) if h[1] == norm(framework))
    out = {}
    for i in range(start + 1, len(heads)):
        pos, n, title = heads[i]
        if s[heads[i][0]:heads[i][0] + 3].lower() == '<h1':
            break
        end = heads[i + 1][0] if i + 1 < len(heads) else len(s)
        rows = []
        for r in re.findall(r'<tr[^>]*>(.*?)</tr>', s[pos:end], re.S):
            cells = re.findall(r'<td[^>]*>(.*?)</td>', r, re.S)
            if cells:
                rows.append([(html.unescape(re.sub(r'<[^>]+>', ' ', c)).replace('​', '').strip(), c) for c in cells])
        out[title] = rows
        if n and heads[i + 1:] and heads[i + 1][1] == '':
            pass
    return out


def our_pages(path):
    a = load(path)
    idx = {}
    for p in a['pages']:
        if not visible(p):
            continue
        idx.setdefault(norm(p['label']), p)
    return a, idx


def find(idx, label):
    n = norm(label)
    if n in ALIASES:
        if ALIASES[n] is None:
            return None
        n = ALIASES[n]
    if n in idx:
        return idx[n]
    for k, p in idx.items():  # "CopilotChat" vs "- CopilotChat", "Slots (Subcomponents)" vs "Slots"
        if k.startswith(n + ' ') or n.startswith(k + ' ') or k.replace(' ', '') == n.replace(' ', ''):
            return p
    return None


def clean(raw):
    """A team cell's HTML reduced to what pastes cleanly: text, links, line breaks."""
    t = re.sub(r'<(br|/p|/div)\b[^>]*>', '<br>', raw, flags=re.I)
    links = []

    def keep(m):  # protect links, then strip every other tag
        u = html.unescape(html.unescape(m.group(1)))
        q = re.match(r'https?://www\.google\.com/url\?q=([^&]+)', u)  # Google Docs export wraps every link
        links.append(urllib.parse.unquote(q.group(1)) if q else u)
        return '\x00A%d\x00' % (len(links) - 1)

    t = re.sub(r'<a\b[^>]*?href="([^"]*)"[^>]*>', keep, t, flags=re.I)
    t = re.sub(r'</a\s*>', '\x00/A\x00', t, flags=re.I)
    t = re.sub(r'<(?!br>)[^>]+>', '', t)
    t = html.unescape(t).replace('\xa0', ' ').replace('\u200b', '')
    t = html.escape(t, quote=False).replace('&lt;br&gt;', '<br>')
    t = re.sub('\x00A' + r'(\d+)' + '\x00', lambda m: '<a href="%s">' % html.escape(links[int(m.group(1))]), t)
    t = t.replace('\x00/A\x00', '</a>')
    t = re.sub(r'[ \t]+', ' ', t)
    t = re.sub(r'(\s*<br>\s*)+', '<br>', t).strip()
    t = re.sub(r'^(<br>)+|(<br>)+$', '', t)
    while t.count('</a>') > t.count('<a href'):  # closer whose <a> sat outside this cell
        i = t.rfind('</a>')
        t = t[:i] + t[i + 4:]
    return t.strip()


GROUP = {'section', 'sub section', 'sub section', 'subsection'}


def table(title, column, rows_out):
    h = [f'<h2>{esc(title)}</h2>', '<table style="border-collapse:collapse">',
         f'<tr><td style="{TD}"><b>Page/Section</b></td><td style="{TD}"><b>{esc(column)}</b></td></tr>']
    for label, val in rows_out:
        h.append(f'<tr><td style="{TD}">{esc(label)}</td><td style="{TD}">{val}</td></tr>')
    h.append('</table>')
    return '\n'.join(h)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--team', required=True)
    ap.add_argument('--framework', required=True)
    ap.add_argument('--column', required=True, help='team column header we fill, e.g. LangGraph.js')
    ap.add_argument('--section', action='append', default=[], help='"<team section title>=<assignment.json>"')
    ap.add_argument('--quickstart', action='append', default=[], help='"<team quickstart row label>=<assignment.json>"')
    ap.add_argument('--out', required=True)
    ap.add_argument('--fresh-only', metavar='DATE', help='as build.py: blocked rows not filmed on DATE show only Blocked')
    o = ap.parse_args()
    build.FRESH_ONLY = o.fresh_only
    secs = team_sections(o.team, o.framework)
    parts = [f'<h1>{esc(o.framework)}</h1>',
             f'<p>Rows in the team doc\'s order. Copy the <b>{esc(o.column)}</b> column of each table and paste it over the same column in the team doc.</p>']
    missing = []
    if o.quickstart:
        qrows = []
        team_q = secs.get('Quickstarts') or secs.get('Quickstart') or []
        want = {norm(k): v for k, v in (q.split('=', 1) for q in o.quickstart)}
        for r in team_q:
            if norm(r[0][0]) in want:
                a, idx = our_pages(want[norm(r[0][0])])
                p = next((p for p in a['pages'] if p.get('kind') == 'quickstart' and visible(p)), None)
                qrows.append((r[0][0], cell(a, p) if p else ''))
        parts.append(table('Quickstarts (only our rows)', o.column, qrows))
    for spec in o.section:
        title, path = spec.split('=', 1)
        team = secs.get(title)
        if team is None:
            sys.exit(f'no section "{title}" under {o.framework}; have: {list(secs)}')
        a, idx = our_pages(path)
        hdr = [norm(c[0]) for c in team[0]]
        col = next((i for i, c in enumerate(hdr) if c == norm(o.column)), len(hdr) - 1)
        rows_out = []
        for r in team[1:]:
            label = r[0][0]
            theirs, raw = r[col] if col < len(r) else ('', '')
            if norm(theirs) in GROUP or (not label and not theirs):
                rows_out.append((label, esc(theirs)))
                continue
            p = find(idx, label)
            if p is None:
                # not a page we test: keep the team's own cell (links included) so pasting the column changes nothing here
                missing.append(f'{title}: "{label}" (kept the team cell: {theirs[:40]!r})')
                rows_out.append((label, clean(raw)))
            else:
                rows_out.append((label, cell(a, p)))
        parts.append(table(title, o.column, rows_out))
    open(o.out, 'w', encoding='utf-8').write('<html><head><meta charset="utf-8"></head><body>\n' + '\n'.join(parts) + '\n</body></html>\n')
    print(f'wrote {o.out}')
    for m in missing:
        print('  not tested by us:', m)


if __name__ == '__main__':
    main()
