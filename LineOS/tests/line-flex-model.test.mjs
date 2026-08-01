import test from "node:test";
import assert from "node:assert/strict";
import { createDraft, updateDraftAtPath, canonicalize } from "../line-flex-model.mjs";
import { PRESET_IDS, PRESETS, getPreset } from "../line-flex-presets.mjs";

test("ships exactly the five approved immutable presets", () => {
  assert.deepEqual(PRESET_IDS, [
    "design-approval",
    "quote-order",
    "sla-escalation",
    "site-update",
    "issue-evidence"
  ]);
  assert.equal(Object.isFrozen(PRESETS), true);
  for (const id of PRESET_IDS) assert.equal(Object.isFrozen(getPreset(id)), true);
});

test("creates isolated bilingual drafts", () => {
  const th = createDraft(getPreset("design-approval"), "th");
  const en = createDraft(getPreset("design-approval"), "en");
  th.body.project = "changed outside the source";
  assert.notEqual(th.body.project, en.body.project);
  assert.notEqual(th.body.project, getPreset("design-approval").copy.th.body.project);
});

test("updates a nested field without mutating the previous draft", () => {
  const before = createDraft(getPreset("design-approval"), "th");
  const after = updateDraftAtPath(before, ["body", "revision"], "D-08");
  assert.equal(before.body.revision, "D-07");
  assert.equal(after.body.revision, "D-08");
  assert.notEqual(after, before);
});

test("canonicalize sorts object keys recursively", () => {
  assert.equal(canonicalize({ z: 1, a: { y: 2, b: 3 } }),
    '{"a":{"b":3,"y":2},"z":1}');
});
