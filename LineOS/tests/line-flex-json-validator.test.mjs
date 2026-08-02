import test from "node:test";
import assert from "node:assert/strict";
import { createDraft, updateDraftAtPath } from "../line-flex-model.mjs";
import { getPreset } from "../line-flex-presets.mjs";
import { buildFlexMessage, measureUtf8Bytes } from "../line-flex-json.mjs";
import { validateDraft } from "../line-flex-validator.mjs";

const draft = () => createDraft(getPreset("design-approval"), "th");

test("builds deterministic Header Hero Body Footer JSON", () => {
  const first = buildFlexMessage(draft());
  const second = buildFlexMessage(draft());
  assert.deepEqual(first, second);
  assert.equal(first.type, "flex");
  assert.equal(first.contents.type, "bubble");
  assert.deepEqual(
    ["header", "hero", "body", "footer"].filter((key) => first.contents[key]),
    ["header", "hero", "body", "footer"]
  );
});

test("measures the bubble as UTF-8 and accepts the approved preset", () => {
  const message = buildFlexMessage(draft());
  assert.ok(measureUtf8Bytes(message.contents) < 24 * 1024);
  assert.equal(validateDraft(draft(), message).some((f) => f.severity === "error"), false);
});

test("blocks a high-risk postback and cites it as MONOLITH best practice", () => {
  const unsafe = updateDraftAtPath(draft(), ["intent", "requestedActionType"], "postback");
  const findings = validateDraft(unsafe, buildFlexMessage(unsafe));
  const finding = findings.find((item) => item.ruleId === "MON-ACT-001");
  assert.equal(finding.severity, "error");
  assert.equal(finding.classification, "monolith_best_practice");
});

test("blocks official alt text, URL and label limits", () => {
  let invalid = updateDraftAtPath(draft(), ["altText"], "x".repeat(1501));
  invalid = updateDraftAtPath(invalid, ["hero", "exportUrl"], "http://unsafe.test/image.png");
  invalid = updateDraftAtPath(invalid, ["footer", "primaryLabel"], "x".repeat(41));
  const ids = validateDraft(invalid, buildFlexMessage(invalid)).map((f) => f.ruleId);
  assert.ok(ids.includes("LINE-ALT-002"));
  assert.ok(ids.includes("LINE-IMG-001"));
  assert.ok(ids.includes("LINE-BTN-001"));
});

test("warns at the 24 KB MONOLITH soft budget and errors at the 30 KB official ceiling", () => {
  const message = buildFlexMessage(draft());
  const soft = structuredClone(message);
  soft.contents.body.contents.push({ type: "text", text: "x".repeat(25000), wrap: true });
  const hard = structuredClone(message);
  hard.contents.body.contents.push({ type: "text", text: "x".repeat(33000), wrap: true });
  assert.ok(validateDraft(draft(), soft).some((f) => f.ruleId === "MON-SIZE-001"));
  assert.ok(validateDraft(draft(), hard).some((f) => f.ruleId === "LINE-SIZE-001"));
});
