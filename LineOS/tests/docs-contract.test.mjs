import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const research = "docs/research/2026-08-01-monolith-line-human-surface-deep-research";
const read = (path) => readFile(resolve(root, path), "utf8");

test("deep research exists in bilingual Markdown and standalone HTML", async () => {
  for (const suffix of [".en.md", ".th.md", ".en.html", ".th.html"]) {
    await access(resolve(root, research + suffix));
  }
  const enHtml = await read(research + ".en.html");
  const thHtml = await read(research + ".th.html");
  assert.match(enHtml, /^<!doctype html>/);
  assert.match(enHtml, /<html lang="en">/);
  assert.match(thHtml, /^<!doctype html>/);
  assert.match(thHtml, /<html lang="th">/);
});

test("research preserves the board stop rule and tenant boundary", async () => {
  const en = await read(research + ".en.md");
  const th = await read(research + ".th.md");
  assert.match(en, /NO-GO for broader customer messaging/);
  assert.match(en, /Daph is one pilot tenant/);
  assert.match(th, /NO-GO/);
  assert.match(th, /Daph.*tenant/);
});

test("research labels evidence and cites primary technical sources", async () => {
  const en = await read(research + ".en.md");
  for (const text of [
    "Official constraint", "Verified local fact", "Inference", "Proposal", "Unknown",
    "https://developers.line.biz/en/docs/messaging-api/",
    "https://www.rfc-editor.org/rfc/rfc9700.html",
    "https://csrc.nist.gov/pubs/sp/800/207/final",
    "https://www.w3.org/TR/WCAG22/"
  ]) assert.match(en, new RegExp(text.replace(/[.*+?^()|[\]{}]/g, "\\$&")));
});
