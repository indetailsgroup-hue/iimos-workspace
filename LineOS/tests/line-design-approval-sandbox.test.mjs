import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createSandboxDesignApprovalPort
} from "../line-design-approval-sandbox.mjs";
import {
  createSandboxVerificationRecord
} from "../line-design-approval-record.mjs";

const REVIEW_TOKEN = "rvw_A1_7L3n9Q2pV8xK";
const CROSS_SCOPE_TOKEN = "rvw_A1_crossScope01";
const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const SHA_C = "c".repeat(64);

const fixture = () => ({
  providerContext: "Daph Studio · A1 sandbox fixture",
  scopeContext: "Main kitchen review scope",
  workItemRef: "work_item_demo_001",
  approvalRequestRef: "approval_request_demo_001",
  revisionLabel: "D-07",
  revisionId: SHA_A,
  artifactManifestSha256: SHA_B,
  canonicalizationVersion: "line-design-approval-v1",
  expectedWorkflowVersion: 7,
  reviewArtifacts: [{
    kind: "rendered_preview",
    label: "Main kitchen perspective",
    uri: "https://example.com/monolith/demo/artifacts/main-kitchen.png"
  }],
  requestedCanonicalAction: "design.approve_revision",
  plainLanguageConsequence: "Records a sandbox confirmation attempt only.",
  reviewTtlMs: 15 * 60 * 1000,
  fixtureIdentity: "customer-internal-001",
  tenantId: "tenant-internal-001",
  role: "internal-reviewer",
  secret: "fixture-secret-value"
});

const createIdFactory = () => {
  const counts = new Map();
  const prefixes = {
    reviewSessionId: "review_session_demo_",
    serverIssuedIdempotencyKey: "idempotency_demo_",
    recordId: "record_demo_",
    correlationId: "correlation_demo_"
  };
  return (kind) => {
    const next = (counts.get(kind) ?? 0) + 1;
    counts.set(kind, next);
    return `${prefixes[kind]}${String(next).padStart(3, "0")}`;
  };
};

function createHarness(options = {}) {
  let now = options.now ?? "2026-08-02T03:00:00.000Z";
  const openedFixture = options.openedFixture ?? fixture();
  let currentFixture = options.currentFixture ?? structuredClone(openedFixture);
  const ledger = options.ledger ?? new Map();
  const source = options.fixtureSource ?? {
    async open(reviewToken) {
      if (reviewToken === CROSS_SCOPE_TOKEN) {
        throw new Error("cross-scope customer-internal-001 fixture-secret-value");
      }
      return reviewToken === REVIEW_TOKEN ? openedFixture : null;
    },
    async recheck() {
      return currentFixture;
    }
  };
  const port = createSandboxDesignApprovalPort({
    clock: () => now,
    idFactory: options.idFactory ?? createIdFactory(),
    fixtureSource: source,
    recordFactory: options.recordFactory ?? createSandboxVerificationRecord,
    ledger
  });
  return {
    ledger,
    openedFixture,
    port,
    setCurrent(changes) {
      currentFixture = { ...currentFixture, ...changes };
    },
    setNow(value) {
      now = value;
    }
  };
}

const confirmInput = (snapshot, changes = {}) => ({
  reviewSessionId: snapshot.reviewSessionId,
  serverIssuedIdempotencyKey: snapshot.serverIssuedIdempotencyKey,
  expectedRevisionId: snapshot.revisionId,
  decision: "confirm",
  ...changes
});

test("opens one adapter-owned deeply frozen A1 ReviewSnapshot", async () => {
  const harness = createHarness();
  const snapshot = await harness.port.openReview(REVIEW_TOKEN);

  assert.deepEqual(Object.keys(harness.port), ["openReview", "confirmReview"]);
  assert.deepEqual(snapshot, {
    reviewSessionId: "review_session_demo_001",
    serverIssuedIdempotencyKey: "idempotency_demo_001",
    mode: "sandbox",
    businessEffect: "none",
    providerContext: "Daph Studio · A1 sandbox fixture",
    workItemRef: "work_item_demo_001",
    approvalRequestRef: "approval_request_demo_001",
    revisionLabel: "D-07",
    revisionId: SHA_A,
    artifactManifestSha256: SHA_B,
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
    issuedAt: "2026-08-02T03:00:00.000Z",
    expiresAt: "2026-08-02T03:15:00.000Z"
  });
  assert.notEqual(snapshot, harness.openedFixture);
  assert.notEqual(snapshot.reviewArtifacts, harness.openedFixture.reviewArtifacts);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.reviewArtifacts), true);
  assert.equal(Object.isFrozen(snapshot.reviewArtifacts[0]), true);
  assert.throws(() => {
    snapshot.reviewArtifacts[0].label = "changed";
  }, TypeError);
});

test("collapses invalid, missing, and cross-scope lookups into one neutral result", async () => {
  const { port } = createHarness();
  const expected = { outcome: "not_available" };

  assert.deepEqual(await port.openReview("rvw_A1_missing00001"), expected);
  assert.deepEqual(await port.openReview(undefined), expected);
  assert.deepEqual(await port.openReview(CROSS_SCOPE_TOKEN), expected);
  for (const value of [
    await port.openReview("rvw_A1_missing00001"),
    await port.openReview(CROSS_SCOPE_TOKEN)
  ]) {
    assert.equal(JSON.stringify(value), '{"outcome":"not_available"}');
    assert.equal(Object.isFrozen(value), true);
  }
});

test("issues session and idempotency identity inside the adapter", async () => {
  const issued = [];
  const harness = createHarness({
    idFactory(kind) {
      issued.push(kind);
      return {
        reviewSessionId: "review_session_demo_002",
        serverIssuedIdempotencyKey: "idempotency_demo_002"
      }[kind] ?? `${kind}_unexpected`;
    }
  });
  const snapshot = await harness.port.openReview(REVIEW_TOKEN);

  assert.deepEqual(issued, ["reviewSessionId", "serverIssuedIdempotencyKey"]);
  assert.equal(snapshot.reviewSessionId, "review_session_demo_002");
  assert.equal(snapshot.serverIssuedIdempotencyKey, "idempotency_demo_002");
  assert.equal(JSON.stringify(snapshot).includes(REVIEW_TOKEN), false);
});

test("fails closed at the exact expiry boundary and remains expired", async () => {
  const harness = createHarness();
  const snapshot = await harness.port.openReview(REVIEW_TOKEN);
  harness.setNow(snapshot.expiresAt);

  assert.deepEqual(
    await harness.port.confirmReview(confirmInput(snapshot)),
    { outcome: "expired" }
  );
  harness.setNow("2026-08-02T03:16:00.000Z");
  assert.deepEqual(
    await harness.port.confirmReview(confirmInput(snapshot)),
    { outcome: "expired" }
  );
  assert.equal(harness.ledger.size, 0);
});

test("rechecks revision, artifact manifest, and workflow version before recording", async () => {
  for (const [changes, expected] of [
    [{ revisionId: SHA_C }, "stale_revision"],
    [{ artifactManifestSha256: SHA_C }, "stale_revision"],
    [{ expectedWorkflowVersion: 8 }, "version_conflict"]
  ]) {
    const harness = createHarness();
    const snapshot = await harness.port.openReview(REVIEW_TOKEN);
    harness.setCurrent(changes);
    assert.deepEqual(
      await harness.port.confirmReview(confirmInput(snapshot)),
      { outcome: expected }
    );
    assert.equal(harness.ledger.size, 0);
  }
});

test("enforces the exact confirm shape and records only the stored snapshot", async () => {
  const harness = createHarness();
  const snapshot = await harness.port.openReview(REVIEW_TOKEN);
  harness.openedFixture.providerContext = "Other Studio · A1 sandbox fixture";
  harness.openedFixture.scopeContext = "Guest bedroom review scope";
  harness.openedFixture.revisionLabel = "D-08";
  harness.setNow("2026-08-02T03:01:00.000Z");

  assert.deepEqual(
    await harness.port.confirmReview({
      ...confirmInput(snapshot),
      project: "editable-project",
      tenantId: "caller-tenant",
      recordId: "record_demo_999"
    }),
    { outcome: "invalid_request" }
  );
  const result = await harness.port.confirmReview(confirmInput(snapshot));

  assert.equal(result.outcome, "sandbox_recorded");
  assert.equal(result.record.providerContext, "Daph Studio · A1 sandbox fixture");
  assert.equal(result.record.scopeContext, "Main kitchen review scope");
  assert.equal(result.record.revisionLabel, "D-07");
  assert.equal(result.record.revisionId, SHA_A);
  assert.equal(result.record.outcome, "sandbox_recorded");
  assert.equal(harness.ledger.size, 1);
});

test("replays the exact same record for the same key and canonical payload", async () => {
  const harness = createHarness();
  const snapshot = await harness.port.openReview(REVIEW_TOKEN);
  harness.setNow("2026-08-02T03:01:00.000Z");
  const input = confirmInput(snapshot);

  const first = await harness.port.confirmReview(input);
  const replay = await harness.port.confirmReview({
    decision: input.decision,
    expectedRevisionId: input.expectedRevisionId,
    serverIssuedIdempotencyKey: input.serverIssuedIdempotencyKey,
    reviewSessionId: input.reviewSessionId
  });

  assert.equal(first.outcome, "sandbox_recorded");
  assert.equal(replay.outcome, "sandbox_replayed");
  assert.equal(replay.record, first.record);
  assert.equal(replay.record.recordDigest, first.record.recordDigest);
  assert.equal(replay.record.outcome, "sandbox_recorded");
  assert.equal(harness.ledger.size, 1);
});

test("rejects reuse of a recorded key with a different canonical payload", async () => {
  const harness = createHarness();
  const snapshot = await harness.port.openReview(REVIEW_TOKEN);
  harness.setNow("2026-08-02T03:01:00.000Z");
  await harness.port.confirmReview(confirmInput(snapshot));

  assert.deepEqual(
    await harness.port.confirmReview(confirmInput(snapshot, { expectedRevisionId: SHA_C })),
    { outcome: "idempotency_conflict" }
  );
  assert.equal(harness.ledger.size, 1);
});

test("single-flights concurrent identical confirms into one ledger record", async () => {
  let recordFactoryCalls = 0;
  const harness = createHarness({
    async recordFactory(input) {
      recordFactoryCalls += 1;
      await Promise.resolve();
      return createSandboxVerificationRecord(input);
    }
  });
  const snapshot = await harness.port.openReview(REVIEW_TOKEN);
  harness.setNow("2026-08-02T03:01:00.000Z");

  const results = await Promise.all(Array.from(
    { length: 12 },
    () => harness.port.confirmReview(confirmInput(snapshot))
  ));

  assert.equal(recordFactoryCalls, 1);
  assert.equal(harness.ledger.size, 1);
  assert.equal(results[0].outcome, "sandbox_recorded");
  assert.equal(results.slice(1).every((result) => result.outcome === "sandbox_replayed"), true);
  assert.equal(results.every((result) => result.record === results[0].record), true);
  assert.equal(new Set(results.map((result) => result.record.recordDigest)).size, 1);
});

test("allows same-key retry after a pre-commit record-factory failure", async () => {
  let attempts = 0;
  const harness = createHarness({
    async recordFactory(input) {
      attempts += 1;
      if (attempts === 1) throw new Error("database role secret raw failure");
      return createSandboxVerificationRecord(input);
    }
  });
  const snapshot = await harness.port.openReview(REVIEW_TOKEN);
  harness.setNow("2026-08-02T03:01:00.000Z");
  const input = confirmInput(snapshot);

  const failed = await harness.port.confirmReview(input);
  assert.deepEqual(failed, { outcome: "temporarily_unavailable" });
  assert.equal(JSON.stringify(failed).includes("database role secret"), false);
  assert.equal(harness.ledger.size, 0);

  const retried = await harness.port.confirmReview(input);
  assert.equal(retried.outcome, "sandbox_recorded");
  assert.equal(attempts, 2);
  assert.equal(harness.ledger.size, 1);
});

test("starts each default adapter with an empty session-only ledger", async () => {
  const firstLedger = new Map();
  const first = createHarness({ ledger: firstLedger });
  const snapshot = await first.port.openReview(REVIEW_TOKEN);
  first.setNow("2026-08-02T03:01:00.000Z");
  await first.port.confirmReview(confirmInput(snapshot));
  assert.equal(firstLedger.size, 1);

  const freshLedger = new Map();
  const fresh = createHarness({ ledger: freshLedger });
  assert.equal(freshLedger.size, 0);
  const freshSnapshot = await fresh.port.openReview(REVIEW_TOKEN);
  fresh.setNow("2026-08-02T03:01:00.000Z");
  const freshResult = await fresh.port.confirmReview(confirmInput(freshSnapshot));
  assert.equal(freshResult.outcome, "sandbox_recorded");
  assert.equal(freshLedger.size, 1);
});

test("uses no browser persistence, network, logging, or draft authority surface", async () => {
  const source = await readFile(
    new URL("../line-design-approval-sandbox.mjs", import.meta.url),
    "utf8"
  );
  for (const forbidden of [
    /localStorage/,
    /sessionStorage/,
    /indexedDB/,
    /\bfetch\s*\(/,
    /XMLHttpRequest/,
    /WebSocket/,
    /sendBeacon/,
    /console\./,
    /document\./,
    /editableDraft/
  ]) {
    assert.doesNotMatch(source, forbidden);
  }
});

test("never leaks tokens, fixture identity, authority values, secrets, or raw errors", async () => {
  const harness = createHarness();
  const snapshot = await harness.port.openReview(REVIEW_TOKEN);
  harness.setNow("2026-08-02T03:01:00.000Z");
  const result = await harness.port.confirmReview(confirmInput(snapshot));
  const serialized = JSON.stringify({ snapshot, result });

  for (const forbidden of [
    REVIEW_TOKEN,
    "customer-internal-001",
    "tenant-internal-001",
    "internal-reviewer",
    "fixture-secret-value"
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  assert.equal(Object.hasOwn(result.record, "token"), false);
  assert.equal(Object.hasOwn(result.record, "tenantId"), false);
  assert.equal(Object.hasOwn(result.record, "role"), false);
  assert.equal(Object.hasOwn(result.record, "secret"), false);
});
