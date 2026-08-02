import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");
const svgNamespace = "http://www.w3.org/2000/svg";
const svgRoot = `<svg xmlns="${svgNamespace}" viewBox="0 0 1200 780" aria-hidden="true">`;

const allowedSvgAttributes = new Map([
  ["svg", new Set(["xmlns", "viewBox", "aria-hidden"])],
  ["rect", new Set([
    "x", "y", "width", "height", "rx", "fill", "stroke", "stroke-width",
    "stroke-dasharray", "transform"
  ])],
  ["path", new Set(["d", "fill", "stroke", "stroke-width", "stroke-linecap"])],
  ["circle", new Set(["cx", "cy", "r", "fill", "opacity", "stroke", "stroke-width"])]
]);

function decodeNumericXmlReferences(source, label) {
  return source.replace(/&#(x[0-9a-f]+|\d+);/gi, (reference, encoded) => {
    const hexadecimal = encoded[0].toLowerCase() === "x";
    const codePoint = Number.parseInt(hexadecimal ? encoded.slice(1) : encoded, hexadecimal ? 16 : 10);
    assert.ok(
      codePoint > 0 && codePoint <= 0x10ffff && !(codePoint >= 0xd800 && codePoint <= 0xdfff),
      `${label}: invalid numeric XML character reference ${reference}`
    );
    return String.fromCodePoint(codePoint);
  });
}

function parseQuotedAttributes(source, label) {
  const attributes = new Map();
  const pattern = /\s*([A-Za-z_:][A-Za-z0-9_.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gy;
  let offset = 0;

  while (offset < source.length) {
    if (/^\s*$/.test(source.slice(offset))) break;
    pattern.lastIndex = offset;
    const match = pattern.exec(source);
    assert.ok(match, `${label}: malformed or unquoted attribute near ${source.slice(offset)}`);
    const [, name, doubleQuoted, singleQuoted] = match;
    assert.ok(!attributes.has(name), `${label}: duplicate attribute ${name}`);
    attributes.set(name, doubleQuoted ?? singleQuoted);
    offset = pattern.lastIndex;
  }

  assert.match(source.slice(offset), /^\s*$/, `${label}: unparsed attribute content`);
  return attributes;
}

function assertSafeSvg(source, label) {
  assert.ok(source.startsWith(svgRoot), `${label}: SVG root must use the canonical namespace and exact contract`);
  assert.ok(source.trimEnd().endsWith("</svg>"), `${label}: SVG root must close the document`);

  const decoded = decodeNumericXmlReferences(source, label);
  assert.doesNotMatch(decoded, /&/, `${label}: named or malformed entity references are forbidden`);
  assert.doesNotMatch(decoded, /<\?|<!/, `${label}: processing instructions and declarations are forbidden`);
  assert.doesNotMatch(decoded, /\burl\s*\(/i, `${label}: CSS url() references are forbidden`);
  assert.doesNotMatch(decoded, /\bdata\s*:/i, `${label}: embedded data URIs are forbidden`);
  assert.doesNotMatch(
    decoded.replace(`xmlns="${svgNamespace}"`, ""),
    /(?:https?|ftp):\/\//i,
    `${label}: external URL content is forbidden`
  );

  const tags = /<(\/)?([A-Za-z][A-Za-z0-9:-]*)([^>]*)>/g;
  const stack = [];
  let cursor = 0;
  let match;

  while ((match = tags.exec(decoded)) !== null) {
    assert.match(decoded.slice(cursor, match.index), /^\s*$/, `${label}: text content is forbidden`);
    const [, closing, name, rawAttributes] = match;
    assert.ok(allowedSvgAttributes.has(name), `${label}: forbidden SVG element <${name}>`);

    if (closing) {
      assert.match(rawAttributes, /^\s*$/, `${label}: closing tags cannot have attributes`);
      assert.equal(stack.pop(), name, `${label}: mismatched closing tag </${name}>`);
    } else {
      const selfClosing = /\/\s*$/.test(rawAttributes);
      const attributeSource = selfClosing ? rawAttributes.replace(/\/\s*$/, "") : rawAttributes;
      const attributes = parseQuotedAttributes(attributeSource, `${label} <${name}>`);
      const allowedAttributes = allowedSvgAttributes.get(name);

      for (const [attribute, value] of attributes) {
        assert.ok(allowedAttributes.has(attribute), `${label}: forbidden attribute ${attribute} on <${name}>`);
        assert.doesNotMatch(value, /[<>]/, `${label}: markup is forbidden inside attributes`);
        if (attribute !== "xmlns") {
          assert.doesNotMatch(value, /(?:https?|ftp):\/\/|\bdata\s*:|\burl\s*\(/i,
            `${label}: external reference in ${attribute}`);
        }
      }

      if (!selfClosing) stack.push(name);
    }

    cursor = tags.lastIndex;
  }

  assert.match(decoded.slice(cursor), /^\s*$/, `${label}: unparsed or text content is forbidden`);
  assert.deepEqual(stack, [], `${label}: unclosed SVG elements`);
}

function assertAllowedHtmlResources(html, css) {
  const links = [...html.matchAll(/<link\b([^>]*)>/gi)];
  assert.equal(links.length, 1, "shell must load exactly one linked resource");
  assert.deepEqual(
    Object.fromEntries(parseQuotedAttributes(links[0][1], "stylesheet link")),
    { rel: "stylesheet", href: "./line-flex-studio.css" }
  );

  const scriptOpenings = [...html.matchAll(/<script\b/gi)];
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  assert.equal(scriptOpenings.length, 1, "shell must contain exactly one script opening tag");
  assert.equal(scripts.length, 1, "shell must load exactly one external module script");
  assert.deepEqual(
    Object.fromEntries(parseQuotedAttributes(scripts[0][1], "module script")),
    { type: "module", src: "./line-flex-studio.mjs" }
  );
  assert.equal(scripts[0][2].trim(), "", "inline script content is forbidden");

  const remaining = html.replace(links[0][0], "").replace(scripts[0][0], "");
  assert.doesNotMatch(remaining, /<(?:link|script|style|img|iframe|frame|object|embed|video|audio|source|track|base|portal|svg)\b/i,
    "extra resource-loading or inline style elements are forbidden");
  assert.doesNotMatch(remaining, /\b(?:src|srcset|poster|data|ping|action|formaction|style)\s*=/i,
    "extra resource-loading attributes are forbidden");
  assert.doesNotMatch(remaining, /http-equiv\s*=\s*["']?refresh/i, "meta refresh is forbidden");

  for (const href of remaining.matchAll(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi)) {
    assert.match(href[1] ?? href[2] ?? href[3], /^#[A-Za-z][A-Za-z0-9_.:-]*$/,
      "non-resource links must be same-document fragments");
  }

  assert.doesNotMatch(css, /@import|url\s*\(/i, "CSS imports and URL resource loads are forbidden");
}

test("Studio shell exposes semantic controls and dialogs", async () => {
  const html = await read("line-flex-studio.html");
  for (const id of [
    "language-toggle", "tenant-context", "preset-list", "block-tabs", "field-panel",
    "phone-preview", "json-output", "validation-list", "payload-count",
    "copy-json", "download-json", "reset-draft", "run-journey",
    "liff-dialog", "receipt-dialog", "toast-live"
  ]) assert.match(html, new RegExp('id="' + id + '"'));
  assert.match(html, /<main/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<dialog[^>]+id="liff-dialog"/);
  assert.match(html, /<script type="module" src="\.\/line-flex-studio\.mjs"/);
});

test("runtime shell uses only the approved local stylesheet and module", async () => {
  const html = await read("line-flex-studio.html");
  const css = await read("line-flex-studio.css");
  assertAllowedHtmlResources(html, css);
  assert.doesNotMatch(html, /analytics|segment|pixel|gtag/i);
});

test("all five local SVG assets are self-contained", async () => {
  for (const name of [
    "design-approval-hero.svg", "quote-order-hero.svg", "sla-escalation-hero.svg",
    "site-update-hero.svg", "issue-evidence-hero.svg"
  ]) {
    const svg = await read("assets/line-flex-studio/" + name);
    assertSafeSvg(svg, name);
  }
});

test("encoded numeric references cannot hide remote SVG resources", () => {
  const malicious = `${svgRoot}
<path d="M0 0h20v20z" fill="&#x75;&#114;&#108;(&#104;&#116;&#116;&#112;&#58;//attacker.invalid/paint.svg#x)"/>
</svg>`;
  assert.doesNotMatch(
    malicious.replace(`xmlns="${svgNamespace}"`, ""),
    /https?:\/\//i,
    "fixture demonstrates the old raw-regex bypass outside the legitimate namespace"
  );
  assert.throws(
    () => assertSafeSvg(malicious, "encoded remote fixture"),
    /CSS url\(\) references are forbidden/
  );
});
