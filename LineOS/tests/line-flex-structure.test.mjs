import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");

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

test("runtime shell has no remote scripts styles fonts or tracking", async () => {
  const html = await read("line-flex-studio.html");
  const css = await read("line-flex-studio.css");
  assert.doesNotMatch(html, /https?:\/\//i);
  assert.doesNotMatch(html, /analytics|segment|pixel|gtag/i);
  assert.doesNotMatch(css, /@import|url\(["']?https?:\/\//i);
});

test("all five local SVG assets are self-contained", async () => {
  for (const name of [
    "design-approval-hero.svg", "quote-order-hero.svg", "sla-escalation-hero.svg",
    "site-update-hero.svg", "issue-evidence-hero.svg"
  ]) {
    const svg = await read("assets/line-flex-studio/" + name);
    assert.match(svg, /^<svg/);
    assert.doesNotMatch(svg, /https?:\/\/|<script|foreignObject/i);
    assert.match(svg, /aria-hidden="true"/);
  }
});
