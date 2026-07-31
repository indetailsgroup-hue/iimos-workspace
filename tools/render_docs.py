#!/usr/bin/env python3
"""Render controlled-set Markdown into standalone HTML.

Satisfies §12 of the Controlled Complete Document Set design:
UTF-8 metadata, responsive layout, printable styling, readable tables,
code blocks, and working links. No external dependencies, no network
requests — the output opens correctly from the filesystem.

Handles the Markdown subset these documents actually use:
headings, tables, fenced code, blockquotes, lists, hr, links,
bold/italic/strikethrough, inline code.

Usage:
    python tools/render_docs.py <file.md> [more.md ...]
    python tools/render_docs.py --all        # every .md under docs/
"""

from __future__ import annotations

import html
import re
import sys
from pathlib import Path

CSS = """
:root{--fg:#1a1c1e;--muted:#5a6570;--bg:#fff;--surface:#f6f8fa;--border:#d5dbe1;
--accent:#0b5fa5;--warn-bg:#fff8e6;--warn-bd:#e0a800;--code:#0f172a}
@media(prefers-color-scheme:dark){:root{--fg:#e6e9ec;--muted:#9aa5b1;--bg:#14171a;
--surface:#1d2126;--border:#333b44;--accent:#6ab0f3;--warn-bg:#2a2410;--warn-bd:#b8860b;--code:#dbe4ee}}
*{box-sizing:border-box}
body{margin:0;padding:2rem 1.25rem 5rem;background:var(--bg);color:var(--fg);
font:16px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans Thai",
"Sarabun",Roboto,"Helvetica Neue",Arial,sans-serif;
-webkit-text-size-adjust:100%}
main{max-width:78ch;margin:0 auto}
h1,h2,h3,h4{line-height:1.3;margin:2.2em 0 .7em;font-weight:650}
h1{font-size:1.9rem;margin-top:0;border-bottom:2px solid var(--border);padding-bottom:.4em}
h2{font-size:1.42rem;border-bottom:1px solid var(--border);padding-bottom:.3em}
h3{font-size:1.16rem}h4{font-size:1rem}
p,ul,ol{margin:0 0 1.05em}
a{color:var(--accent);text-decoration-thickness:.08em;text-underline-offset:.15em}
code{font:.88em/1.5 "SFMono-Regular",Consolas,"Liberation Mono",monospace;
background:var(--surface);border:1px solid var(--border);border-radius:4px;
padding:.12em .38em;color:var(--code);word-break:break-word}
pre{background:var(--surface);border:1px solid var(--border);border-radius:8px;
padding:1rem;overflow-x:auto;margin:0 0 1.3em}
pre code{background:none;border:0;padding:0;white-space:pre;word-break:normal}
blockquote{margin:1.3em 0;padding:.9em 1.1em;background:var(--warn-bg);
border-left:4px solid var(--warn-bd);border-radius:0 6px 6px 0}
blockquote > :last-child{margin-bottom:0}
.tablewrap{overflow-x:auto;margin:0 0 1.4em;border:1px solid var(--border);border-radius:8px}
table{border-collapse:collapse;width:100%;font-size:.93rem}
th,td{padding:.55em .8em;text-align:left;vertical-align:top;
border-bottom:1px solid var(--border)}
th{background:var(--surface);font-weight:650;white-space:nowrap}
tr:last-child td{border-bottom:0}
td[align=right],th[align=right]{text-align:right}
hr{border:0;border-top:1px solid var(--border);margin:2.4em 0}
del{opacity:.55}
ul,ol{padding-left:1.5em}li{margin:.3em 0}
@media print{
  body{padding:0;font-size:11pt;background:#fff;color:#000}
  main{max-width:none}
  a{color:#000;text-decoration:underline}
  a[href^="http"]::after{content:" (" attr(href) ")";font-size:.82em;color:#444}
  pre,blockquote,.tablewrap{break-inside:avoid}
  h1,h2,h3{break-after:avoid}
  thead{display:table-header-group}
}
"""

_INLINE = (
    (re.compile(r"\*\*(.+?)\*\*", re.S), r"<strong>\1</strong>"),
    (re.compile(r"(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)", re.S), r"<em>\1</em>"),
    (re.compile(r"~~(.+?)~~", re.S), r"<del>\1</del>"),
)


def _link_target(url: str) -> str:
    """Point internal .md links at their rendered .html companion."""
    if url.startswith(("http://", "https://", "#", "mailto:")):
        return url
    base, sep, frag = url.partition("#")
    if base.endswith(".md"):
        base = base[:-3] + ".html"
    return base + sep + frag


def inline(text: str) -> str:
    """Escape, then apply inline markup. Code spans are protected first."""
    spans: list[str] = []

    def stash(m: re.Match) -> str:
        spans.append(m.group(1))
        return f"\x00{len(spans) - 1}\x00"

    text = re.sub(r"`([^`]+)`", stash, text)
    text = html.escape(text, quote=False)

    def link(m: re.Match) -> str:
        label, url = m.group(1), _link_target(m.group(2).strip())
        ext = ' target="_blank" rel="noopener"' if url.startswith("http") else ""
        return f'<a href="{html.escape(url, quote=True)}"{ext}>{label}</a>'

    text = re.sub(r"\[([^\]]*)\]\(([^)\s]+)\)", link, text)
    for pat, rep in _INLINE:
        text = pat.sub(rep, text)
    text = re.sub(r"\x00(\d+)\x00",
                  lambda m: f"<code>{html.escape(spans[int(m.group(1))], quote=False)}</code>",
                  text)
    return text


def _row(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def _aligns(sep: str) -> list[str]:
    out = []
    for c in _row(sep):
        left, right = c.startswith(":"), c.endswith(":")
        out.append("center" if left and right else "right" if right else "left")
    return out


def render(md: str) -> str:
    lines = md.replace("\r\n", "\n").split("\n")
    out: list[str] = []
    i, n = 0, len(lines)
    list_stack: list[str] = []

    def close_lists() -> None:
        while list_stack:
            out.append(f"</{list_stack.pop()}>")

    # strip YAML front matter
    if lines and lines[0].strip() == "---":
        for j in range(1, n):
            if lines[j].strip() == "---":
                i = j + 1
                break

    while i < n:
        raw = lines[i]
        line = raw.rstrip()
        stripped = line.strip()

        if not stripped:
            close_lists()
            i += 1
            continue

        if stripped.startswith("```"):
            close_lists()
            lang = stripped[3:].strip()
            body: list[str] = []
            i += 1
            while i < n and not lines[i].strip().startswith("```"):
                body.append(lines[i])
                i += 1
            i += 1
            cls = f' class="language-{html.escape(lang, quote=True)}"' if lang else ""
            out.append(f"<pre><code{cls}>"
                       + html.escape("\n".join(body), quote=False) + "</code></pre>")
            continue

        # HTML comment: emit as a real comment instead of escaping it into
        # visible text. Machine-readable markers (evidence blocks) live in
        # comments and must not render as prose. Only a line that is *entirely*
        # one comment qualifies; anything else falls through and is escaped, so
        # this cannot become a tag-injection route.
        if stripped.startswith("<!--"):
            close_lists()
            buf: list[str] = []
            j, closed = i, False
            while j < n:
                buf.append(lines[j])
                j += 1
                if "-->" in buf[-1]:
                    closed = True
                    break
            block = "\n".join(buf).strip()

            # A scan that reached end-of-file found no closing delimiter, and a
            # block holding a second `<!--` ran past the end of its own comment
            # into the next one — HTML comments do not nest. Both mean the
            # opening `<!--` is unterminated. Consuming those lines would delete
            # every heading, table and paragraph after a single dropped `-->`:
            # silently, with exit 0 and an .html file still produced. A typo in
            # hand-written markup must cost one ugly line, not the document.
            if not closed or block.count("<!--") > 1:
                out.append("<p>" + inline(stripped) + "</p>")
                i += 1
                continue

            i = j
            m = re.fullmatch(r"<!--(.*?)-->", block, re.S)
            if m:
                body = m.group(1)
                for bad in ("<", ">", "--"):
                    body = body.replace(bad, "")
                out.append(f"<!--{body}-->")
            else:
                out.append("<p>" + inline(block) + "</p>")
            continue

        m = re.match(r"(#{1,6})\s+(.*)", stripped)
        if m:
            close_lists()
            lvl = len(m.group(1))
            out.append(f"<h{lvl}>{inline(m.group(2))}</h{lvl}>")
            i += 1
            continue

        if re.fullmatch(r"(-{3,}|\*{3,}|_{3,})", stripped):
            close_lists()
            out.append("<hr>")
            i += 1
            continue

        # table: header row followed by a separator row
        if (stripped.startswith("|") and i + 1 < n
                and re.match(r"^\s*\|[\s:|-]+\|\s*$", lines[i + 1])):
            close_lists()
            head = _row(stripped)
            aligns = _aligns(lines[i + 1])
            i += 2
            body_rows = []
            while i < n and lines[i].strip().startswith("|"):
                body_rows.append(_row(lines[i].strip()))
                i += 1
            def cell(tag: str, val: str, idx: int) -> str:
                a = aligns[idx] if idx < len(aligns) else "left"
                attr = f' align="{a}"' if a != "left" else ""
                return f"<{tag}{attr}>{inline(val)}</{tag}>"
            out.append('<div class="tablewrap"><table><thead><tr>'
                       + "".join(cell("th", c, k) for k, c in enumerate(head))
                       + "</tr></thead><tbody>")
            for r in body_rows:
                out.append("<tr>" + "".join(cell("td", c, k) for k, c in enumerate(r)) + "</tr>")
            out.append("</tbody></table></div>")
            continue

        if stripped.startswith(">"):
            close_lists()
            quote: list[str] = []
            while i < n and lines[i].strip().startswith(">"):
                quote.append(re.sub(r"^\s*>\s?", "", lines[i]))
                i += 1
            out.append("<blockquote>" + render("\n".join(quote)) + "</blockquote>")
            continue

        m = re.match(r"[-*+]\s+(.*)", stripped)
        if m:
            if not list_stack or list_stack[-1] != "ul":
                close_lists()
                list_stack.append("ul")
                out.append("<ul>")
            out.append(f"<li>{inline(m.group(1))}</li>")
            i += 1
            continue

        m = re.match(r"\d+[.)]\s+(.*)", stripped)
        if m:
            if not list_stack or list_stack[-1] != "ol":
                close_lists()
                list_stack.append("ol")
                out.append("<ol>")
            out.append(f"<li>{inline(m.group(1))}</li>")
            i += 1
            continue

        close_lists()
        para = [stripped]
        i += 1
        while i < n and lines[i].strip() and not re.match(
                r"^\s*(#{1,6}\s|[-*+]\s|\d+[.)]\s|>|\||```|-{3,}$)", lines[i]):
            para.append(lines[i].strip())
            i += 1
        out.append("<p>" + inline(" ".join(para)) + "</p>")

    close_lists()
    return "\n".join(out)


def title_of(md: str, fallback: str) -> str:
    m = re.search(r"^#\s+(.+)$", md, re.M)
    return re.sub(r"[*`~]", "", m.group(1)).strip() if m else fallback


def build(path: Path) -> Path:
    md = path.read_text(encoding="utf-8")
    lang = "th" if path.name.endswith(".th.md") else "en"
    doc = f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="tools/render_docs.py">
<title>{html.escape(title_of(md, path.stem), quote=False)}</title>
<style>{CSS}</style>
</head>
<body><main>
{render(md)}
</main></body>
</html>
"""
    out = path.with_suffix(".html")
    out.write_text(doc, encoding="utf-8")
    return out


def main(argv: list[str]) -> int:
    root = Path(__file__).resolve().parent.parent
    if argv and argv[0] == "--all":
        targets = sorted((root / "docs").rglob("*.md"))
    else:
        targets = [Path(a) for a in argv]
    if not targets:
        print(__doc__)
        return 2
    for p in targets:
        if not p.exists():
            print(f"MISSING {p}")
            continue
        out = build(p)
        print(f"{out.stat().st_size:>8}  {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
