import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { canonicalize, createDraft, updateDraftAtPath } from "../line-flex-model.mjs";
import { getPreset } from "../line-flex-presets.mjs";
import {
  selectActionMode, createDemoTransaction, confirmDemoTransaction
} from "../line-flex-actions.mjs";
import { createDemoReceipt } from "../line-flex-receipt.mjs";

const approval = () => createDraft(getPreset("design-approval"), "th");

test("routes every consequential action through LIFF URI", () => {
  for (const requestedActionType of ["message", "postback", "uri", "liff_uri"]) {
    assert.equal(selectActionMode({ risk: "high", requestedActionType }), "liff_uri");
  }
});

test("allows low-risk acknowledgement postback", () => {
  assert.equal(selectActionMode({ risk: "low", requestedActionType: "postback" }), "postback");
});

test("binds tenant recipient revision action and expiry", () => {
  const tx = createDemoTransaction(approval(), {
    id: "tx_demo_001",
    now: "2026-08-01T10:00:00.000Z"
  });
  assert.equal(tx.tenantId, "tenant_daph_demo");
  assert.equal(tx.recipientRef, "customer_demo_001");
  assert.equal(tx.targetRef, "project_s49_main_kitchen");
  assert.equal(tx.revision, "D-07");
  assert.equal(tx.canonicalAction, "design.approve_revision");
  assert.equal(tx.amount, "฿486,000");
  assert.equal(tx.deadline, "3 ส.ค. 2026 · 18:00");
  assert.equal(tx.actionMode, "liff_uri");
  assert.equal(tx.createdAt, "2026-08-01T10:00:00.000Z");
  assert.equal(tx.expiresAt, "2026-08-02T10:00:00.000Z");
  assert.equal(tx.boundPayload, canonicalize({
    tenantId: tx.tenantId,
    recipientRef: tx.recipientRef,
    targetRef: tx.targetRef,
    revision: tx.revision,
    canonicalAction: tx.canonicalAction,
    amount: tx.amount,
    deadline: tx.deadline
  }));
});

test("fails closed when any bound value changes", () => {
  const tx = createDemoTransaction(approval(), {
    id: "tx_demo_002",
    now: "2026-08-01T10:00:00.000Z"
  });
  const changes = [
    [["context", "tenantId"], "tenant_other_demo"],
    [["context", "recipientRef"], "customer_demo_002"],
    [["intent", "targetRef"], "project_other"],
    [["body", "revision"], "D-08"],
    [["intent", "canonicalAction"], "design.reject_revision"],
    [["body", "amount"], "฿487,000"],
    [["body", "deadline"], "4 ส.ค. 2026 · 18:00"]
  ];

  for (const [path, value] of changes) {
    const changed = updateDraftAtPath(approval(), path, value);
    assert.throws(
      () => confirmDemoTransaction(tx, changed, "2026-08-01T11:00:00.000Z"),
      new Error("bound_value_changed"),
      path.join(".")
    );
  }
});

test("allows the expiry instant and rejects time after it", () => {
  const tx = createDemoTransaction(approval(), {
    id: "tx_demo_003",
    now: "2026-08-01T10:00:00.000Z"
  });
  assert.doesNotThrow(() =>
    confirmDemoTransaction(tx, approval(), "2026-08-02T10:00:00.000Z"));
  assert.throws(
    () => confirmDemoTransaction(tx, approval(), "2026-08-02T10:00:00.001Z"),
    new Error("transaction_expired")
  );
});

test("creates a labelled deterministic SHA-256 digest that changes on bound input", async () => {
  const tx = createDemoTransaction(approval(), {
    id: "tx_demo_004",
    now: "2026-08-01T10:00:00.000Z"
  });
  const confirmed = confirmDemoTransaction(tx, approval(), "2026-08-01T11:00:00.000Z");
  const first = await createDemoReceipt(tx, confirmed);
  const second = await createDemoReceipt(tx, confirmed);
  const digestPayload = {
    receiptVersion: 1,
    transactionId: tx.id,
    tenantId: confirmed.tenantId,
    recipientRef: confirmed.recipientRef,
    targetRef: confirmed.targetRef,
    revision: confirmed.revision,
    canonicalAction: confirmed.canonicalAction,
    createdAt: tx.createdAt,
    confirmedAt: confirmed.confirmedAt,
    outcome: confirmed.outcome
  };

  assert.equal(first.digest, second.digest);
  assert.equal(first.digest, createHash("sha256").update(canonicalize(digestPayload)).digest("hex"));
  assert.match(first.digest, /^[0-9a-f]{64}$/);
  assert.equal(first.title, "Verification Receipt — Demo");
  assert.equal(first.label, "DEMO — NOT A PRODUCTION SIGNATURE");
  assert.equal(
    first.productionNotice,
    "Production signing and audit require the MONOLITH Trust Kernel."
  );
  assert.equal(Object.hasOwn(first, "signature"), false);
  const changed = { ...confirmed, recipientRef: "customer_demo_002" };
  assert.notEqual(first.digest, (await createDemoReceipt(tx, changed)).digest);
});
