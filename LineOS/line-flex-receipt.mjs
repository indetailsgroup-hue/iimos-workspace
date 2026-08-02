import { canonicalize } from "./line-flex-model.mjs";

const toHex = (bytes) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

export async function createDemoReceipt(transaction, confirmation) {
  const payload = {
    receiptVersion: 1,
    transactionId: transaction.id,
    tenantId: confirmation.tenantId,
    recipientRef: confirmation.recipientRef,
    targetRef: confirmation.targetRef,
    revision: confirmation.revision,
    canonicalAction: confirmation.canonicalAction,
    createdAt: transaction.createdAt,
    confirmedAt: confirmation.confirmedAt,
    outcome: confirmation.outcome
  };
  const bytes = new TextEncoder().encode(canonicalize(payload));
  const digest = toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
  return {
    title: "Verification Receipt — Demo",
    label: "DEMO — NOT A PRODUCTION SIGNATURE",
    platform: "MONOLITH",
    ...payload,
    digest,
    productionNotice: "Production signing and audit require the MONOLITH Trust Kernel."
  };
}
