import { canonicalize } from "./line-flex-model.mjs";

export function selectActionMode(intent) {
  if (intent.risk === "high") return "liff_uri";
  return intent.requestedActionType;
}

const digestInputFor = (draft) => ({
  tenantId: draft.context.tenantId,
  recipientRef: draft.context.recipientRef,
  targetRef: draft.intent.targetRef,
  revision: draft.body.revision,
  canonicalAction: draft.intent.canonicalAction,
  amount: draft.body.amount,
  deadline: draft.body.deadline
});

export function createDemoTransaction(draft, options = {}) {
  const createdAt = options.now ?? new Date().toISOString();
  const ttl = draft.intent.expiresInMinutes;
  const expiresAt = new Date(Date.parse(createdAt) + ttl * 60_000).toISOString();
  const input = digestInputFor(draft);
  return {
    id: options.id ?? crypto.randomUUID(),
    ...input,
    actionMode: selectActionMode(draft.intent),
    createdAt,
    expiresAt,
    boundPayload: canonicalize(input)
  };
}

export function confirmDemoTransaction(transaction, currentDraft, now = new Date().toISOString()) {
  if (Date.parse(now) > Date.parse(transaction.expiresAt)) {
    throw new Error("transaction_expired");
  }
  const current = canonicalize(digestInputFor(currentDraft));
  if (current !== transaction.boundPayload) throw new Error("bound_value_changed");
  return {
    transactionId: transaction.id,
    tenantId: transaction.tenantId,
    recipientRef: transaction.recipientRef,
    targetRef: transaction.targetRef,
    revision: transaction.revision,
    canonicalAction: transaction.canonicalAction,
    confirmedAt: now,
    outcome: "confirmed_demo"
  };
}
