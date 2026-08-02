import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialStudioState, reduceStudioState, deriveStudioView, isStudioDraftDirty,
  receiptRowsFor
} from "../line-flex-studio.mjs";

test("starts with the Thai design approval preset", () => {
  const state = createInitialStudioState();
  assert.equal(state.language, "th");
  assert.equal(state.presetId, "design-approval");
  assert.equal(state.activeBlock, "header");
});

test("language and preset changes create fresh valid views", () => {
  let state = createInitialStudioState();
  state = reduceStudioState(state, { type: "language.changed", language: "en" });
  state = reduceStudioState(state, { type: "preset.changed", presetId: "quote-order" });
  const view = deriveStudioView(state);
  assert.equal(view.draft.language, "en");
  assert.equal(view.draft.presetId, "quote-order");
  assert.equal(view.hasBlockingErrors, false);
});

test("field changes update preview JSON and validation from one draft", () => {
  const state = reduceStudioState(createInitialStudioState(), {
    type: "field.changed", path: ["body", "revision"], value: "D-08"
  });
  const view = deriveStudioView(state);
  assert.equal(view.draft.body.revision, "D-08");
  assert.match(view.jsonText, /D-08/);
  assert.match(view.preview.body.revision, /D-08/);
});

test("blocking errors disable copy download and journey", () => {
  const state = reduceStudioState(createInitialStudioState(), {
    type: "field.changed", path: ["altText"], value: ""
  });
  const view = deriveStudioView(state);
  assert.equal(view.hasBlockingErrors, true);
  assert.equal(view.canExport, false);
  assert.equal(view.canRunJourney, false);
});

test("dirty state follows draft values instead of edit events", () => {
  let state = createInitialStudioState();
  assert.equal(isStudioDraftDirty(state), false);

  state = reduceStudioState(state, {
    type: "field.changed", path: ["body", "revision"], value: "D-08"
  });
  assert.equal(isStudioDraftDirty(state), true);

  state = reduceStudioState(state, {
    type: "field.changed", path: ["body", "revision"], value: "D-07"
  });
  assert.equal(isStudioDraftDirty(state), false);

  state = reduceStudioState(state, { type: "language.changed", language: "en" });
  assert.equal(isStudioDraftDirty(state), false);
  state = reduceStudioState(state, { type: "preset.changed", presetId: "quote-order" });
  assert.equal(isStudioDraftDirty(state), false);
});

test("receipt rows expose the exact English and Thai visible evidence contract", () => {
  const receipt = {
    transactionId: "tx_demo_visible",
    tenantId: "tenant_daph_demo",
    providerName: "Daph Studio",
    recipientRef: "customer_demo_001",
    targetRef: "project_s49_main_kitchen",
    revision: "D-07",
    canonicalAction: "design.approve_revision",
    outcome: "confirmed_demo",
    createdAt: "2026-08-01T10:00:00.000Z",
    confirmedAt: "2026-08-01T11:00:00.000Z",
    digest: "a".repeat(64)
  };

  assert.deepEqual(receiptRowsFor(receipt, "en"), [
    ["Transaction / correlation ID", "tx_demo_visible"],
    ["Tenant ID", "tenant_daph_demo"],
    ["Provider", "Daph Studio"],
    ["Recipient", "customer_demo_001"],
    ["Project / resource", "project_s49_main_kitchen"],
    ["Revision", "D-07"],
    ["Action", "design.approve_revision"],
    ["Outcome", "confirmed_demo"],
    ["Created", "2026-08-01T10:00:00.000Z"],
    ["Confirmed", "2026-08-01T11:00:00.000Z"],
    ["SHA-256 digest", "a".repeat(64)]
  ]);
  assert.deepEqual(receiptRowsFor(receipt, "th"), [
    ["รายการ / Correlation ID", "tx_demo_visible"],
    ["รหัส Tenant", "tenant_daph_demo"],
    ["ผู้ให้บริการ", "Daph Studio"],
    ["ผู้รับ", "customer_demo_001"],
    ["โครงการ / ทรัพยากร", "project_s49_main_kitchen"],
    ["รุ่นแบบ", "D-07"],
    ["การดำเนินการ", "design.approve_revision"],
    ["ผลลัพธ์", "confirmed_demo"],
    ["สร้างเมื่อ", "2026-08-01T10:00:00.000Z"],
    ["ยืนยันเมื่อ", "2026-08-01T11:00:00.000Z"],
    ["SHA-256 digest", "a".repeat(64)]
  ]);
});
