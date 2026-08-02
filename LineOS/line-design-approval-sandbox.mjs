import {
  assertConfirmReviewInput,
  assertReviewSnapshot
} from "./line-design-approval-contract.mjs";
import {
  createSandboxVerificationRecord
} from "./line-design-approval-record.mjs";
import { canonicalize, deepFreeze } from "./line-flex-model.mjs";

const DEFAULT_REVIEW_TOKEN = "rvw_A1_7L3n9Q2pV8xK";
const MAX_REVIEW_TTL_MS = 60 * 60 * 1000;
const BOUND_SCALAR_FIELDS = deepFreeze([
  "providerContext",
  "scopeContext",
  "workItemRef",
  "approvalRequestRef",
  "revisionLabel",
  "requestedCanonicalAction",
  "plainLanguageConsequence"
]);
const CANONICAL_UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const OUTCOME = Object.fromEntries([
  "expired",
  "stale_revision",
  "version_conflict",
  "idempotency_conflict",
  "not_available",
  "invalid_request",
  "temporarily_unavailable"
].map((outcome) => [outcome, deepFreeze({ outcome })]));

const DEFAULT_FIXTURE = deepFreeze({
  providerContext: "Daph Studio · A1 sandbox fixture",
  scopeContext: "Main kitchen review scope",
  workItemRef: "work_item_demo_001",
  approvalRequestRef: "approval_request_demo_001",
  revisionLabel: "D-07",
  revisionId: "a".repeat(64),
  artifactManifestSha256: "b".repeat(64),
  canonicalizationVersion: "line-design-approval-v1",
  expectedWorkflowVersion: 7,
  reviewArtifacts: [{
    kind: "rendered_preview",
    label: "Main kitchen perspective",
    uri: "https://example.com/monolith/demo/artifacts/main-kitchen.png"
  }],
  requestedCanonicalAction: "design.approve_revision",
  plainLanguageConsequence: "Records a sandbox confirmation attempt only.",
  reviewTtlMs: 15 * 60 * 1000
});

const defaultFixtureSource = () => ({
  async open(reviewToken) {
    return reviewToken === DEFAULT_REVIEW_TOKEN ? DEFAULT_FIXTURE : null;
  },
  async recheck() {
    return DEFAULT_FIXTURE;
  }
});

const defaultIdFactory = () => {
  const counts = new Map();
  const prefixes = {
    reviewSessionId: "review_session_demo_",
    serverIssuedIdempotencyKey: "idempotency_demo_",
    recordId: "record_demo_",
    correlationId: "correlation_demo_"
  };
  return (kind) => {
    if (!Object.hasOwn(prefixes, kind)) throw new Error("unsupported_id_kind");
    const next = (counts.get(kind) ?? 0) + 1;
    counts.set(kind, next);
    return `${prefixes[kind]}${String(next).padStart(3, "0")}`;
  };
};

const timestampFor = (clock) => {
  const value = clock();
  const date = value instanceof Date ? value : new Date(value);
  const milliseconds = date.getTime();
  if (!Number.isFinite(milliseconds)) throw new Error("invalid_clock");
  const timestamp = date.toISOString();
  if (!CANONICAL_UTC_TIMESTAMP.test(timestamp)) throw new Error("invalid_clock");
  return { milliseconds, timestamp };
};

const cloneArtifacts = (artifacts) => artifacts.map((artifact) => ({
  kind: artifact.kind,
  label: artifact.label,
  uri: artifact.uri
}));

const boundFixtureFor = (fixture) => deepFreeze({
  providerContext: fixture.providerContext,
  scopeContext: fixture.scopeContext,
  workItemRef: fixture.workItemRef,
  approvalRequestRef: fixture.approvalRequestRef,
  revisionLabel: fixture.revisionLabel,
  revisionId: fixture.revisionId,
  artifactManifestSha256: fixture.artifactManifestSha256,
  canonicalizationVersion: fixture.canonicalizationVersion,
  expectedWorkflowVersion: fixture.expectedWorkflowVersion,
  reviewArtifacts: cloneArtifacts(fixture.reviewArtifacts),
  requestedCanonicalAction: fixture.requestedCanonicalAction,
  plainLanguageConsequence: fixture.plainLanguageConsequence,
  reviewTtlMs: fixture.reviewTtlMs
});

const snapshotFor = (bound, ids, issuedAt, expiresAt) => assertReviewSnapshot(deepFreeze({
  reviewSessionId: ids.reviewSessionId,
  serverIssuedIdempotencyKey: ids.serverIssuedIdempotencyKey,
  mode: "sandbox",
  businessEffect: "none",
  providerContext: bound.providerContext,
  workItemRef: bound.workItemRef,
  approvalRequestRef: bound.approvalRequestRef,
  revisionLabel: bound.revisionLabel,
  revisionId: bound.revisionId,
  artifactManifestSha256: bound.artifactManifestSha256,
  digestAlgorithm: "SHA-256",
  canonicalizationVersion: bound.canonicalizationVersion,
  expectedWorkflowVersion: bound.expectedWorkflowVersion,
  reviewArtifacts: cloneArtifacts(bound.reviewArtifacts),
  requestedCanonicalAction: bound.requestedCanonicalAction,
  plainLanguageConsequence: bound.plainLanguageConsequence,
  issuedAt,
  expiresAt
}));

const hasValidTtl = (value) => Number.isSafeInteger(value) &&
  value > 0 && value <= MAX_REVIEW_TTL_MS;

const replayResult = (record) => deepFreeze({
  outcome: "sandbox_replayed",
  record
});

const recordedResult = (record) => deepFreeze({
  outcome: "sandbox_recorded",
  record
});

const currentFixtureOutcome = (bound, current) => {
  if (!current || typeof current !== "object") return OUTCOME.not_available;
  if (current.revisionId !== bound.revisionId ||
      current.artifactManifestSha256 !== bound.artifactManifestSha256) {
    return OUTCOME.stale_revision;
  }
  if (current.expectedWorkflowVersion !== bound.expectedWorkflowVersion ||
      current.canonicalizationVersion !== bound.canonicalizationVersion) {
    return OUTCOME.version_conflict;
  }
  for (const field of BOUND_SCALAR_FIELDS) {
    if (current[field] !== bound[field]) return OUTCOME.not_available;
  }
  if (canonicalize(cloneArtifacts(current.reviewArtifacts)) !==
      canonicalize(bound.reviewArtifacts)) {
    return OUTCOME.stale_revision;
  }
  return null;
};

export function createSandboxDesignApprovalPort(dependencies = {}) {
  const clock = dependencies.clock ?? (() => new Date());
  const idFactory = dependencies.idFactory ?? defaultIdFactory();
  const fixtureSource = dependencies.fixtureSource ?? defaultFixtureSource();
  const recordFactory = dependencies.recordFactory ?? createSandboxVerificationRecord;
  const ledger = dependencies.ledger ?? new Map();

  if (typeof clock !== "function" || typeof idFactory !== "function" ||
      typeof fixtureSource?.open !== "function" ||
      typeof fixtureSource?.recheck !== "function" ||
      typeof recordFactory !== "function" || !(ledger instanceof Map)) {
    throw new Error("invalid_sandbox_design_approval_dependencies");
  }

  const sessions = new Map();
  const pendingByKey = new Map();

  const openReview = async (reviewToken) => {
    let fixture;
    try {
      fixture = await fixtureSource.open(reviewToken);
    } catch {
      return OUTCOME.not_available;
    }
    if (!fixture) return OUTCOME.not_available;

    try {
      const bound = boundFixtureFor(fixture);
      if (!hasValidTtl(bound.reviewTtlMs)) return OUTCOME.not_available;
      const issued = timestampFor(clock);
      const expiresAt = new Date(issued.milliseconds + bound.reviewTtlMs).toISOString();
      const ids = {
        reviewSessionId: idFactory("reviewSessionId"),
        serverIssuedIdempotencyKey: idFactory("serverIssuedIdempotencyKey")
      };
      const snapshot = snapshotFor(bound, ids, issued.timestamp, expiresAt);
      if (sessions.has(snapshot.reviewSessionId)) return OUTCOME.temporarily_unavailable;
      sessions.set(snapshot.reviewSessionId, {
        bound,
        expired: false,
        snapshot
      });
      return snapshot;
    } catch {
      return OUTCOME.temporarily_unavailable;
    }
  };

  const recordAttempt = async (session, input, canonicalPayload, confirmedAt) => {
    try {
      const current = await fixtureSource.recheck(session.bound);
      const recheckFailure = currentFixtureOutcome(session.bound, current);
      if (recheckFailure) return recheckFailure;
      const record = await recordFactory({
        recordId: idFactory("recordId"),
        correlationId: idFactory("correlationId"),
        reviewSessionId: session.snapshot.reviewSessionId,
        providerContext: session.bound.providerContext,
        scopeContext: session.bound.scopeContext,
        workItemRef: session.bound.workItemRef,
        approvalRequestRef: session.bound.approvalRequestRef,
        revisionLabel: session.bound.revisionLabel,
        revisionId: session.bound.revisionId,
        artifactManifestSha256: session.bound.artifactManifestSha256,
        canonicalizationVersion: session.bound.canonicalizationVersion,
        requestedCanonicalAction: session.bound.requestedCanonicalAction,
        outcome: "sandbox_recorded",
        createdAt: session.snapshot.issuedAt,
        confirmedAt
      });
      ledger.set(input.serverIssuedIdempotencyKey, deepFreeze({
        canonicalPayload,
        record
      }));
      return recordedResult(record);
    } catch {
      return OUTCOME.temporarily_unavailable;
    }
  };

  const confirmReview = async (input) => {
    try {
      assertConfirmReviewInput(input);
    } catch {
      return OUTCOME.invalid_request;
    }

    const session = sessions.get(input.reviewSessionId);
    if (!session ||
        input.serverIssuedIdempotencyKey !== session.snapshot.serverIssuedIdempotencyKey) {
      return OUTCOME.not_available;
    }

    let now;
    try {
      now = timestampFor(clock);
    } catch {
      return OUTCOME.temporarily_unavailable;
    }
    if (session.expired || now.milliseconds >= Date.parse(session.snapshot.expiresAt)) {
      session.expired = true;
      return OUTCOME.expired;
    }

    const canonicalPayload = canonicalize(input);
    const existing = ledger.get(input.serverIssuedIdempotencyKey);
    if (existing) {
      return existing.canonicalPayload === canonicalPayload
        ? replayResult(existing.record)
        : OUTCOME.idempotency_conflict;
    }

    const pending = pendingByKey.get(input.serverIssuedIdempotencyKey);
    if (pending) {
      if (pending.canonicalPayload !== canonicalPayload) {
        return OUTCOME.idempotency_conflict;
      }
      const completed = await pending.promise;
      return completed.outcome === "sandbox_recorded"
        ? replayResult(completed.record)
        : completed;
    }

    if (input.expectedRevisionId !== session.snapshot.revisionId) {
      return OUTCOME.stale_revision;
    }

    const promise = recordAttempt(session, input, canonicalPayload, now.timestamp);
    pendingByKey.set(input.serverIssuedIdempotencyKey, {
      canonicalPayload,
      promise
    });
    try {
      return await promise;
    } finally {
      if (pendingByKey.get(input.serverIssuedIdempotencyKey)?.promise === promise) {
        pendingByKey.delete(input.serverIssuedIdempotencyKey);
      }
    }
  };

  return deepFreeze({ openReview, confirmReview });
}
