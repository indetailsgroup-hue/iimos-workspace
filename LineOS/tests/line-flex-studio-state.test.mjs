import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PRESET_IDS } from "../line-flex-presets.mjs";
import { createSandboxVerificationRecord } from "../line-design-approval-record.mjs";
import {
  createInitialStudioState, reduceStudioState, deriveStudioView, isStudioDraftDirty,
  receiptRowsFor, selectStudioJourney, createDesignApprovalJourneyController,
  designApprovalReviewRowsFor, designApprovalErrorCopyFor,
  designApprovalReceiptCopyFor, shouldClearDesignApprovalReview,
  setConfirmationBusy
} from "../line-flex-studio.mjs";

const studioSource = readFileSync(
  fileURLToPath(new URL("../line-flex-studio.mjs", import.meta.url)),
  "utf8"
);

const reviewSnapshot = () => ({
  reviewSessionId: "review_session_demo_001",
  serverIssuedIdempotencyKey: "idempotency_demo_001",
  mode: "sandbox",
  businessEffect: "none",
  providerContext: "Daph Studio · A1 sandbox fixture",
  workItemRef: "work_item_demo_001",
  approvalRequestRef: "approval_request_demo_001",
  revisionLabel: "D-07",
  revisionId: "a".repeat(64),
  artifactManifestSha256: "b".repeat(64),
  digestAlgorithm: "SHA-256",
  canonicalizationVersion: "line-design-approval-v1",
  expectedWorkflowVersion: 7,
  reviewArtifacts: [{
    kind: "rendered_preview",
    label: "Main kitchen perspective",
    uri: "https://example.com/monolith/demo/artifacts/main-kitchen.png"
  }],
  requestedCanonicalAction: "design.approve_revision",
  plainLanguageConsequence: "Records a sandbox confirmation attempt only.",
  issuedAt: "2026-08-01T10:00:00.000Z",
  expiresAt: "2026-08-01T10:15:00.000Z"
});

const sandboxRecord = () => createSandboxVerificationRecord({
  recordId: "record_demo_001",
  correlationId: "correlation_demo_001",
  reviewSessionId: "review_session_demo_001",
  providerContext: "Daph Studio · A1 sandbox fixture",
  scopeContext: "Main kitchen review scope",
  workItemRef: "work_item_demo_001",
  approvalRequestRef: "approval_request_demo_001",
  revisionLabel: "D-07",
  revisionId: "a".repeat(64),
  artifactManifestSha256: "b".repeat(64),
  canonicalizationVersion: "line-design-approval-v1",
  requestedCanonicalAction: "design.approve_revision",
  outcome: "sandbox_recorded",
  createdAt: "2026-08-01T10:00:00.000Z",
  confirmedAt: "2026-08-01T10:05:00.000Z"
});

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

test("routes only Design Approval to the port and fails closed for unknown presets", () => {
  assert.equal(selectStudioJourney("design-approval"), "design-approval-port");
  for (const presetId of PRESET_IDS.filter((id) => id !== "design-approval")) {
    assert.equal(selectStudioJourney(presetId), "legacy-demo");
  }
  assert.throws(
    () => selectStudioJourney("future-approval"),
    /unknown_studio_journey/
  );
});

test("renders Design Approval review rows only from the captured adapter snapshot", async () => {
  const snapshot = reviewSnapshot();
  const mutableDraft = {
    body: { project: "DRAFT PROJECT", revision: "DRAFT-99", trustNote: "DRAFT EFFECT" },
    context: { tenantName: "DRAFT TENANT" }
  };
  const port = {
    openReview: async () => snapshot,
    confirmReview: async () => ({ outcome: "not_available" })
  };
  const journey = createDesignApprovalJourneyController(port);

  const opened = await journey.open({ reviewToken: "opaque-token", language: "en" });
  mutableDraft.body.project = "CHANGED DRAFT PROJECT";
  snapshot.providerContext = "MUTATED ADAPTER OBJECT";

  assert.equal(opened.outcome, "review_opened");
  assert.deepEqual(opened.rows, designApprovalReviewRowsFor(reviewSnapshot(), "en"));
  assert.deepEqual(opened.rows, [
    ["Provider context", "Daph Studio · A1 sandbox fixture"],
    ["Work item reference", "work_item_demo_001"],
    ["Request reference", "approval_request_demo_001"],
    ["Revision label", "D-07"],
    ["Revision ID", "a".repeat(64)],
    ["Requested action", "design.approve_revision"],
    ["Consequence", "Records a sandbox confirmation attempt only."],
    ["Issued at", "2026-08-01T10:00:00.000Z"],
    ["Expires at", "2026-08-01T10:15:00.000Z"],
    ["Review artifact 1", "Main kitchen perspective · https://example.com/monolith/demo/artifacts/main-kitchen.png"]
  ]);
  assert.equal(JSON.stringify(opened.rows).includes("DRAFT"), false);
  assert.equal(JSON.stringify(opened.rows).includes("MUTATED"), false);
});

test("confirms with only captured adapter-bound values and returns authentic record rows", async () => {
  const snapshot = reviewSnapshot();
  const record = await sandboxRecord();
  const confirmInputs = [];
  const port = {
    openReview: async () => snapshot,
    confirmReview: async (input) => {
      confirmInputs.push(input);
      return { outcome: "sandbox_recorded", record };
    }
  };
  const journey = createDesignApprovalJourneyController(port);
  await journey.open({ reviewToken: "opaque-token", language: "th" });

  snapshot.reviewSessionId = "review_session_demo_999";
  snapshot.serverIssuedIdempotencyKey = "idempotency_demo_999";
  snapshot.revisionId = "f".repeat(64);
  const result = await journey.confirm();

  assert.deepEqual(confirmInputs, [{
    reviewSessionId: "review_session_demo_001",
    serverIssuedIdempotencyKey: "idempotency_demo_001",
    expectedRevisionId: "a".repeat(64),
    decision: "confirm"
  }]);
  assert.equal(Object.isFrozen(confirmInputs[0]), true);
  assert.equal(result.outcome, "sandbox_recorded");
  assert.equal(result.title, "Sandbox Verification Record — Demo · No Business Effect");
  assert.equal(result.rows.at(-1)[0], "ค่าแฮช SHA-256 ของบันทึก");
  assert.equal(result.rows.at(-1)[1], record.recordDigest);
  assert.deepEqual(result.copy, designApprovalReceiptCopyFor("th"));
  assert.match(result.copy.workflowDisclosure, /workflow.*approval state.*ไม่เปลี่ยน/u);
  assert.match(result.copy.digestDisclosure, /ไม่ใช่ลายเซ็น/u);
  assert.equal(journey.getState().phase, "idle");
});

test("keeps one active confirmation while the adapter owns duplicate semantics", async () => {
  let resolveConfirm;
  let confirmCalls = 0;
  const record = await sandboxRecord();
  const port = {
    openReview: async () => reviewSnapshot(),
    confirmReview: async () => {
      confirmCalls += 1;
      return new Promise((resolve) => {
        resolveConfirm = resolve;
      });
    }
  };
  const journey = createDesignApprovalJourneyController(port);
  await journey.open({ reviewToken: "opaque-token", language: "en" });

  const first = journey.confirm();
  const second = journey.confirm();
  assert.equal(journey.getState().phase, "confirming");
  assert.equal(confirmCalls, 1);
  resolveConfirm({ outcome: "sandbox_recorded", record });
  const [firstResult, secondResult] = await Promise.all([first, second]);

  assert.equal(confirmCalls, 1);
  assert.deepEqual(secondResult, firstResult);
  assert.equal(journey.getState().phase, "idle");
});

test("clears active review for every studio and dialog lifecycle boundary", async () => {
  assert.equal(shouldClearDesignApprovalReview("language.changed"), true);
  assert.equal(shouldClearDesignApprovalReview("preset.changed"), true);
  assert.equal(shouldClearDesignApprovalReview("field.changed"), true);
  assert.equal(shouldClearDesignApprovalReview("draft.reset"), true);
  assert.equal(shouldClearDesignApprovalReview("block.changed"), false);

  const journey = createDesignApprovalJourneyController({
    openReview: async () => reviewSnapshot(),
    confirmReview: async () => ({ outcome: "not_available" })
  });
  for (const reason of [
    "language.changed", "preset.changed", "field.changed", "draft.reset",
    "cancel", "dialog.cancel", "dialog.close"
  ]) {
    await journey.open({ reviewToken: "opaque-token", language: "en" });
    assert.equal(journey.getState().phase, "ready");
    journey.clear(reason);
    assert.equal(journey.getState().phase, "idle");
  }
});

test("clears terminal adapter outcomes and exposes exact neutral bilingual copy", async () => {
  const expected = {
    en: {
      expired: "This sandbox session is no longer available. Open the latest LINE message and try again.",
      stale_revision: "The reviewed revision is no longer current. Open the latest LINE message and try again.",
      version_conflict: "The current workflow view changed. Open the latest LINE message and try again.",
      idempotency_conflict: "This confirmation could not be completed safely. Open the latest LINE message and try again.",
      unauthorized: "This request is unavailable. Check the latest LINE message or contact your service team.",
      not_available: "This request is unavailable. Check the latest LINE message or contact your service team.",
      invalid_request: "This confirmation could not be completed. Open the latest LINE message and try again.",
      temporarily_unavailable: "The sandbox service is temporarily unavailable. Please try again."
    },
    th: {
      expired: "เซสชัน Sandbox นี้ไม่พร้อมใช้งานแล้ว โปรดเปิดข้อความ LINE ล่าสุดและลองใหม่",
      stale_revision: "รุ่นแบบที่ตรวจไม่ใช่รุ่นปัจจุบันแล้ว โปรดเปิดข้อความ LINE ล่าสุดและลองใหม่",
      version_conflict: "ข้อมูล workflow ปัจจุบันเปลี่ยนแล้ว โปรดเปิดข้อความ LINE ล่าสุดและลองใหม่",
      idempotency_conflict: "ไม่สามารถดำเนินการยืนยันนี้ได้อย่างปลอดภัย โปรดเปิดข้อความ LINE ล่าสุดและลองใหม่",
      unauthorized: "คำขอนี้ไม่พร้อมใช้งาน โปรดตรวจข้อความ LINE ล่าสุดหรือติดต่อทีมบริการ",
      not_available: "คำขอนี้ไม่พร้อมใช้งาน โปรดตรวจข้อความ LINE ล่าสุดหรือติดต่อทีมบริการ",
      invalid_request: "ไม่สามารถดำเนินการยืนยันนี้ได้ โปรดเปิดข้อความ LINE ล่าสุดและลองใหม่",
      temporarily_unavailable: "บริการ Sandbox ไม่พร้อมใช้งานชั่วคราว โปรดลองอีกครั้ง"
    }
  };

  for (const language of ["en", "th"]) {
    for (const [outcome, message] of Object.entries(expected[language])) {
      assert.equal(designApprovalErrorCopyFor(outcome, language), message);
      assert.equal(message.includes(outcome), false);
      const journey = createDesignApprovalJourneyController({
        openReview: async () => reviewSnapshot(),
        confirmReview: async () => ({ outcome })
      });
      await journey.open({ reviewToken: "opaque-token", language });
      const result = await journey.confirm();
      assert.deepEqual(result, { outcome, message });
      assert.equal(journey.getState().phase, "idle");
    }
  }
});

test("maps thrown adapter errors to neutral temporary failure without leaking details", async () => {
  const journey = createDesignApprovalJourneyController({
    openReview: async () => reviewSnapshot(),
    confirmReview: async () => {
      throw new Error("secret customer_id=42 token=abc stack");
    }
  });
  await journey.open({ reviewToken: "opaque-token", language: "en" });
  const result = await journey.confirm();
  assert.deepEqual(result, {
    outcome: "temporarily_unavailable",
    message: "The sandbox service is temporarily unavailable. Please try again."
  });
  assert.equal(JSON.stringify(result).includes("secret"), false);
  assert.equal(journey.getState().phase, "idle");
});

test("uses the exact approved Design Approval receipt disclosure in both languages", () => {
  for (const language of ["en", "th"]) {
    const copy = designApprovalReceiptCopyFor(language);
    assert.equal(copy.title, "Sandbox Verification Record — Demo · No Business Effect");
    assert.match(copy.workflowDisclosure, /workflow.*approval state/u);
    assert.equal(/did not change|ไม่เปลี่ยน/u.test(copy.workflowDisclosure), true);
    assert.equal(/not a (?:digital )?signature|ไม่ใช่ลายเซ็น/u.test(copy.digestDisclosure), true);
  }
});

test("uses a visible busy state as UX while the adapter remains authoritative", () => {
  const attributes = new Map();
  const button = {
    disabled: false,
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: (name) => attributes.delete(name)
  };

  setConfirmationBusy(button, true);
  assert.equal(button.disabled, true);
  assert.equal(attributes.get("aria-busy"), "true");

  setConfirmationBusy(button, false);
  assert.equal(button.disabled, false);
  assert.equal(attributes.has("aria-busy"), false);
});

test("bindStudio accepts an injected port and constructs the sandbox default only at browser binding", () => {
  assert.match(studioSource, /export function bindStudio\(doc, options = \{\}\)/u);
  assert.match(studioSource, /installJourney\(doc, controller, options\.designApprovalPort\)/u);
  assert.match(
    studioSource,
    /bindStudio\(document, \{\s*designApprovalPort: createSandboxDesignApprovalPort\(\)\s*\}\)/u
  );
  assert.doesNotMatch(
    studioSource,
    /const\s+\w*[Pp]ort\s*=\s*createSandboxDesignApprovalPort\(\)/u
  );
});
