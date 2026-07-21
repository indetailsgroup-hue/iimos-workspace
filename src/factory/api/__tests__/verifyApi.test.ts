/**
 * verifyJobApi - HTTP contract tests
 *
 * Focus: a 409 from the factory API means the job is not verifiable yet
 * (spec not RELEASED / no packet recorded). It is a legitimate business state
 * and must surface as NOT_READY - never as a verifier crash.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { verifyJobApi } from "../verifyApi";

type FetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  headers: Headers;
};

function response(status: number, body: unknown): FetchResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: new Headers(),
  };
}

/** Stub fetch with one response per call, in order. */
function stubFetch(responses: FetchResponse[]) {
  const calls: string[] = [];
  const fn = vi.fn(async (url: string) => {
    calls.push(url);
    const next = responses.shift();
    if (!next) throw new Error(`unexpected extra fetch: ${url}`);
    return next as unknown as Response;
  });
  vi.stubGlobal("fetch", fn);
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("verifyJobApi - job not ready (HTTP 409)", () => {
  it("returns NOT_READY instead of throwing when no packet is recorded", async () => {
    stubFetch([response(409, { ok: false, error: "no packet recorded" })]);

    const result = await verifyJobApi("JOB-1");

    expect(result.verdict).toBe("NOT_READY");
    expect(result.code).toBe("E_JOB_NOT_READY");
    expect(result.code).not.toBe("E_VERIFY_CRASH");
  });

  it("surfaces the server error text VERBATIM in the log", async () => {
    stubFetch([
      response(409, {
        ok: false,
        error: "packet verification requires RELEASED spec and recorded packet",
      }),
    ]);

    const result = await verifyJobApi("JOB-1");

    expect(result.log).toContain("requires RELEASED spec and recorded packet");
  });

  it("does not unlock export", async () => {
    stubFetch([response(409, { ok: false, error: "no packet recorded" })]);

    const result = await verifyJobApi("JOB-1");

    expect(result.verdict).not.toBe("PASS");
    expect(result.verdict).not.toBe("PASS_WITH_WARN");
  });

  it("stops probing further paths once a 409 is seen", async () => {
    const calls = stubFetch([response(409, { ok: false, error: "no packet recorded" })]);

    await verifyJobApi("JOB-1");

    expect(calls).toHaveLength(1);
  });
});

describe("verifyJobApi - other outcomes are unchanged", () => {
  it("falls through 404s to the next candidate path", async () => {
    const calls = stubFetch([
      response(404, { ok: false }),
      response(200, { verdict: "PASS", expected: "abc", computed: "abc", bytes: 10 }),
    ]);

    const result = await verifyJobApi("JOB-1");

    expect(calls).toHaveLength(2);
    expect(result.verdict).toBe("PASS");
  });

  it("still throws on a real server error", async () => {
    stubFetch([response(500, { ok: false, reason: "boom" })]);

    await expect(verifyJobApi("JOB-1")).rejects.toThrow("boom");
  });
});
