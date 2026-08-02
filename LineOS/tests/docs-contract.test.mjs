import test from "node:test";
import assert from "node:assert/strict";
import { access, copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const repo = resolve(root, "..");
const research = "docs/research/2026-08-01-monolith-line-human-surface-deep-research";
const read = (path) => readFile(resolve(root, path), "utf8");
const editions = ["en", "th"];
const exactConclusion = "MONOLITH should be a multi-tenant, revision-controlled project and product operating system. LINE is a replaceable Human Surface. Daph is one pilot tenant. Broader customer messaging remains NO-GO until every Trust P0 gate passes with fresh evidence.";

const section = (markdown, number) => {
  const start = markdown.search(new RegExp(`^## ${number}\\. `, "m"));
  assert.notEqual(start, -1, `missing section ${number}`);
  const bodyStart = markdown.indexOf("\n", start) + 1;
  const tail = markdown.slice(bodyStart);
  const relativeEnd = number === 20 ? -1 : tail.search(new RegExp(`^## ${number + 1}\\. `, "m"));
  return relativeEnd === -1 ? tail : tail.slice(0, relativeEnd);
};

const h2s = (markdown) => [...markdown.matchAll(/^## (\d+)\. (.+)$/gm)]
  .map((match) => ({ number: Number(match[1]), title: match[2] }));

const tableRow = (body, state) => {
  const line = body.split("\n").find((candidate) => candidate.startsWith(`| ${state} |`));
  assert.ok(line, `missing lifecycle row: ${state}`);
  return line.split("|").slice(1, -1).map((cell) => cell.trim());
};

const stripHtml = (value) => value
  .replace(/<[^>]+>/g, "")
  .replaceAll("&amp;", "&")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">")
  .replaceAll("&quot;", '"')
  .replaceAll("&#39;", "'");

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

test("both reports have exactly 20 numbered sections and the exact board decision", async () => {
  for (const language of editions) {
    const markdown = await read(research + `.${language}.md`);
    assert.deepEqual(h2s(markdown).map(({ number }) => number), Array.from({ length: 20 }, (_, index) => index + 1));
    assert.match(markdown, /NO-GO for broader customer messaging/);
    assert.match(markdown, /Daph is one pilot tenant/);
    assert.equal((markdown.match(new RegExp(exactConclusion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length, 1);
  }
});

test("research labels evidence, cites primary sources, and records working-tree provenance honestly", async () => {
  const requiredEvidence = [
    "Official constraint", "Verified local fact", "Inference", "Proposal", "Unknown",
    "https://developers.line.biz/en/docs/messaging-api/",
    "https://www.rfc-editor.org/rfc/rfc9700.html",
    "https://csrc.nist.gov/pubs/sp/800/207/final",
    "https://www.w3.org/TR/WCAG22/"
  ];
  const provenance = [
    ["CONTEXT.md", "715E4865B1A4498AC08C6E9AC7A0C7881A54645A645C088B130FE0572A92DE99"],
    ["docs/reports/2026-07-21-ima-schelling-monolith-repository-scope-correction.en.md", "6966AB9BB1C3B97E3856A66A35190E2D404627E5B88BFFE720462E96C296FD42"]
  ];

  for (const language of editions) {
    const markdown = await read(research + `.${language}.md`);
    for (const text of requiredEvidence) assert.match(markdown, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    const topology = section(markdown, 3);
    assert.match(topology, /untracked working-tree evidence/);
    assert.match(topology, /inspected 2026-08-02/);
    assert.match(topology, /not commit or deployment evidence/);
    assert.doesNotMatch(topology, /CONTEXT\.md[^\n]*inspected at parent commit/);
    for (const [path, hash] of provenance) {
      assert.match(topology, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(topology, new RegExp(hash));
    }

    assert.ok(!markdown.includes("manufacturer primary source. |"), `${language}: Official constraint definition is too broad`);
    for (const capability of ["IKEA", "Blum", "Häfele", "HOMAG", "Biesse"]) {
      const paragraph = markdown.split("\n").find((line) => line.includes(capability) && line.includes("Primary-source capability fact"));
      assert.ok(paragraph, `${language}: missing primary-source capability classification for ${capability}`);
      assert.doesNotMatch(paragraph, /\*\*\[Official constraint\]\*\*/);
    }
  }
});

test("threat model separates duplicate-send and unknown-after-send controls", async () => {
  const threats = [
    "cross-tenant", "Forged webhook", "Replay", "Forwarded link", "Stale approval",
    "Unknown group actor", "Wrong audience", "duplicate-send", "unknown-after-send",
    "Audit tampering", "Notification abuse"
  ];
  for (const language of editions) {
    const body = section(await read(research + `.${language}.md`), 9);
    for (const threat of threats) assert.match(body, new RegExp(threat, "i"));
    const duplicate = tableRow(body, "duplicate-send");
    assert.match(duplicate.join(" "), /stable retry key/i);
    assert.match(duplicate.join(" "), /sender idempotency/i);
    assert.match(duplicate.join(" "), /zero duplicate business execution/i);
    const unknown = tableRow(body, "unknown-after-send");
    assert.match(unknown.join(" "), /request\/retry identifiers/i);
    assert.match(unknown.join(" "), /acceptance state/i);
    assert.match(unknown.join(" "), /reconcile outcome/i);
    assert.match(unknown.join(" "), /operator resolution/i);
    assert.match(unknown.join(" "), /never blind resend/i);
    assert.match(unknown.join(" "), /https:\/\/developers\.line\.biz\/en\/docs\/messaging-api\/retrying-api-request\//);
  }
});

test("every lifecycle stage names its Human Surface path and authoritative MONOLITH records", async () => {
  const stages = [
    "Lead / qualify", "Discover / survey", "Brief / concept", "Spatial coordination",
    "Technical design", "Price / contract / change", "Procurement / manufacture",
    "Logistics / install", "Handover / warranty / referral"
  ];
  const surfaceTerms = /(OA 1:1|personal push|groups|Flex→LIFF)/;
  const recordTerms = /(tenant|project|customer|consent|conversation|principal|resource|revision|survey|evidence|BOM|drawing|spec|price|change|grant|decision|audit|outbox|delivery|QA|logistics|install|as-built|warranty)/i;
  const exactHeader = "| State | Human Surface path | Authoritative MONOLITH record/fields | Required revision evidence | High-risk exit gate |";

  for (const language of editions) {
    const body = section(await read(research + `.${language}.md`), 11);
    assert.match(body, new RegExp(exactHeader.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    for (const stage of stages) {
      const cells = tableRow(body, stage);
      assert.equal(cells.length, 5, `${language}: ${stage} must have five lifecycle columns`);
      assert.match(cells[1], surfaceTerms, `${language}: ${stage} missing Human Surface route`);
      assert.match(cells[2], recordTerms, `${language}: ${stage} missing authoritative MONOLITH record/field`);
    }
    assert.match(body, /LINE is not the system of record/);
  }
});

test("reports preserve governed scope, roles, KPIs, roadmap, and gate schemas", async () => {
  const productFamilies = ["base", "wall", "tall/larder", "vanity", "wardrobe", "media", "office", "custom"];
  const roles = ["executive", "sales", "designer", "estimator", "procurement", "factory", "QA", "logistics", "installer", "finance", "partner", "customer", "customer-of-customer"];
  const kpis = ["conversion", "approval latency", "rework", "notification opt-out", "quarantine age", "SLA breach", "delivery reliability", "service recovery", "adoption"];
  const phases = ["P0 Trust closure", "Bounded Daph pilot", "Five governed journeys", "Tenant-2 shadow", "Controlled scale"];

  for (const language of editions) {
    const markdown = await read(research + `.${language}.md`);
    for (const priority of ["P0", "P1", "P2", "P3"]) assert.match(section(markdown, 8), new RegExp(priority));
    for (const family of productFamilies) assert.match(section(markdown, 12), new RegExp(family, "i"));
    for (const role of roles) assert.match(section(markdown, 14), new RegExp(role, "i"));
    for (const kpi of kpis) assert.match(section(markdown, 16), new RegExp(kpi, "i"));
    for (const phase of phases) assert.match(section(markdown, 17), new RegExp(phase));
    assert.match(section(markdown, 18), /\| Mandatory gate \| Owner \| Required evidence \| Failure response \| Rollback \|/);
    assert.match(section(markdown, 19), /\| URL\/evidence \| Publisher \| Date\/version \| Classification \| Supported claim \| Caveat \|/);
  }
});

test("English and Thai preserve the same decision numbers and key identifiers", async () => {
  const [en, th] = await Promise.all(editions.map((language) => read(research + `.${language}.md`)));
  const aligned = [
    "30 KB", "50 KB", "12 bubbles", "1,500", "300", "1,000", "P0", "P1", "P2", "P3",
    "PERMIT", "DENY", "STEP_UP", "QUARANTINE", "unknown-after-send",
    "NO-GO for broader customer messaging", "Daph is one pilot tenant", exactConclusion
  ];
  for (const text of aligned) {
    assert.ok(en.includes(text), `EN missing aligned identifier: ${text}`);
    assert.ok(th.includes(text), `TH missing aligned identifier: ${text}`);
  }
});

test("standalone HTML matches Markdown headings and key claims", async () => {
  const keyClaims = [
    "NO-GO for broader customer messaging", "Daph is one pilot tenant", "unknown-after-send",
    "715E4865B1A4498AC08C6E9AC7A0C7881A54645A645C088B130FE0572A92DE99",
    "6966AB9BB1C3B97E3856A66A35190E2D404627E5B88BFFE720462E96C296FD42"
  ];
  for (const language of editions) {
    const [markdown, html] = await Promise.all([
      read(research + `.${language}.md`),
      read(research + `.${language}.html`)
    ]);
    const mdHeadings = h2s(markdown).map(({ number, title }) => `${number}. ${title.replace(/[*`~]/g, "")}`);
    const htmlHeadings = [...html.matchAll(/<h2>(.*?)<\/h2>/g)].map((match) => stripHtml(match[1]));
    assert.deepEqual(htmlHeadings, mdHeadings);
    for (const claim of keyClaims) assert.ok(html.includes(claim), `${language} HTML missing key claim: ${claim}`);
  }
});

test("committed HTML is a deterministic render of each Markdown source", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "lineos-doc-contract-"));
  try {
    for (const language of editions) {
      const sourceMd = resolve(root, research + `.${language}.md`);
      const sourceHtml = resolve(root, research + `.${language}.html`);
      const tempMd = join(scratch, basename(sourceMd));
      const tempHtml = tempMd.replace(/\.md$/, ".html");
      await copyFile(sourceMd, tempMd);
      const rendered = spawnSync("python", [resolve(repo, "tools", "render_docs.py"), tempMd], { encoding: "utf8" });
      assert.equal(rendered.status, 0, rendered.stderr || rendered.stdout);
      assert.equal(await readFile(tempHtml, "utf8"), await readFile(sourceHtml, "utf8"));
    }
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
