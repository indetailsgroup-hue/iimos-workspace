import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialStudioState, reduceStudioState, deriveStudioView
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
