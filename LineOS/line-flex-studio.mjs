import { createDraft, updateDraftAtPath } from "./line-flex-model.mjs";
import { PRESET_IDS, getPreset } from "./line-flex-presets.mjs";
import { buildFlexMessage, measureUtf8Bytes } from "./line-flex-json.mjs";
import { validateDraft } from "./line-flex-validator.mjs";
import {
  createDemoTransaction, confirmDemoTransaction
} from "./line-flex-actions.mjs";
import { createDemoReceipt } from "./line-flex-receipt.mjs";

export function createInitialStudioState() {
  const language = "th";
  const presetId = "design-approval";
  return {
    language,
    presetId,
    activeBlock: "header",
    draft: createDraft(getPreset(presetId), language),
    transaction: null,
    receipt: null
  };
}

export function reduceStudioState(state, event) {
  if (event.type === "language.changed") {
    return {
      ...state,
      language: event.language,
      draft: createDraft(getPreset(state.presetId), event.language),
      transaction: null,
      receipt: null
    };
  }
  if (event.type === "preset.changed") {
    return {
      ...state,
      presetId: event.presetId,
      draft: createDraft(getPreset(event.presetId), state.language),
      transaction: null,
      receipt: null
    };
  }
  if (event.type === "block.changed") {
    return { ...state, activeBlock: event.block };
  }
  if (event.type === "field.changed") {
    return {
      ...state,
      draft: updateDraftAtPath(state.draft, event.path, event.value),
      transaction: null,
      receipt: null
    };
  }
  if (event.type === "draft.reset") {
    return {
      ...state,
      draft: createDraft(getPreset(state.presetId), state.language),
      transaction: null,
      receipt: null
    };
  }
  return state;
}

export function deriveStudioView(state) {
  const message = buildFlexMessage(state.draft);
  const findings = validateDraft(state.draft, message);
  const hasBlockingErrors = findings.some((finding) => finding.severity === "error");
  return {
    ...state,
    message,
    jsonText: JSON.stringify(message, null, 2),
    payloadBytes: measureUtf8Bytes(message.contents),
    findings,
    hasBlockingErrors,
    canExport: !hasBlockingErrors,
    canRunJourney: !hasBlockingErrors,
    preview: state.draft
  };
}

const BLOCKS = ["header", "hero", "body", "footer"];
const FIELDS = {
  header: [
    ["header.eyebrow", "Eyebrow", "คิ้วหัวเรื่อง"],
    ["header.title", "Title", "หัวเรื่อง"],
    ["header.status", "Status", "สถานะ"],
    ["altText", "Alt text", "ข้อความสำรอง"]
  ],
  hero: [
    ["hero.exportUrl", "Export HTTPS URL", "URL HTTPS สำหรับส่งจริง"],
    ["hero.aspectRatio", "Aspect ratio", "อัตราส่วนภาพ"],
    ["hero.aspectMode", "Aspect mode", "รูปแบบการครอบภาพ"]
  ],
  body: [
    ["body.project", "Project", "โครงการ"],
    ["body.revision", "Revision", "Revision"],
    ["body.requester", "Requested by", "ผู้ส่งคำขอ"],
    ["body.amount", "Amount / scope", "มูลค่า / ขอบเขต"],
    ["body.deadline", "Due", "กำหนดเวลา"],
    ["body.summary", "Summary", "สรุป"],
    ["body.trustNote", "Trust note", "ข้อความยืนยันความน่าเชื่อถือ"]
  ],
  footer: [
    ["footer.primaryLabel", "Primary CTA", "ปุ่มหลัก"],
    ["footer.secondaryLabel", "Secondary CTA", "ปุ่มรอง"],
    ["intent.requestedActionType", "Requested action", "Action ที่ร้องขอ"]
  ]
};

const COPY = {
  en: {
    blocks: ["Header", "Hero", "Body", "Footer"],
    panes: ["Editor", "Preview", "JSON & Validation"],
    audiences: {
      customer: "Customer", internal: "Internal", customer_group: "Customer group",
      internal_group: "Internal group"
    },
    editorTitle: "Flex Message Studio", previewTitle: "LINE Preview",
    jsonTitle: "JSON Preview", validationTitle: "Validation",
    bytes: "bubble bytes", safeBytes: "within 24 KB", softBytes: "over 24 KB soft budget",
    hardBytes: "over 30 KB limit", run: "Run Journey", copyJson: "Copy JSON",
    downloadJson: "Download JSON", resetDraft: "Reset", copied: "JSON copied",
    downloaded: "JSON downloaded", reset: "Draft reset",
    copyFailed: "Copy failed. Select the JSON and copy manually.",
    downloadFailed: "Download failed. Copy the JSON manually.",
    blocked: "Resolve blocking validation errors first.", fix: "Fix",
    cancel: "Cancel", confirm: "Confirm demo intent", close: "Close",
    resetPrompt: "Reset all edits?", resetUnavailable: "Reset confirmation is unavailable.",
    languageLabel: "Switch interface to Thai", presetLabel: "Message presets",
    blockLabel: "Flex blocks", paneLabel: "Studio panes", skip: "Skip to workspace"
  },
  th: {
    blocks: ["ส่วนหัว", "ภาพหลัก", "เนื้อหา", "ส่วนท้าย"],
    panes: ["แก้ไข", "ตัวอย่าง", "JSON และตรวจสอบ"],
    audiences: {
      customer: "ลูกค้า", internal: "ภายใน", customer_group: "กลุ่มลูกค้า",
      internal_group: "กลุ่มภายใน"
    },
    editorTitle: "สตูดิโอ Flex Message", previewTitle: "ตัวอย่าง LINE",
    jsonTitle: "ตัวอย่าง JSON", validationTitle: "การตรวจสอบ",
    bytes: "ไบต์ของ bubble", safeBytes: "ไม่เกิน 24 KB", softBytes: "เกินงบแนะนำ 24 KB",
    hardBytes: "เกินขีดจำกัด 30 KB", run: "ทดลอง Journey", copyJson: "คัดลอก JSON",
    downloadJson: "ดาวน์โหลด JSON", resetDraft: "คืนค่า", copied: "คัดลอก JSON แล้ว",
    downloaded: "ดาวน์โหลด JSON แล้ว", reset: "คืนค่าแบบร่างแล้ว",
    copyFailed: "คัดลอกไม่สำเร็จ โปรดเลือก JSON แล้วคัดลอกด้วยตนเอง",
    downloadFailed: "ดาวน์โหลดไม่สำเร็จ โปรดคัดลอก JSON ด้วยตนเอง",
    blocked: "โปรดแก้ข้อผิดพลาดที่ปิดกั้นก่อน", fix: "แก้ไข",
    cancel: "ยกเลิก", confirm: "ยืนยันเจตนาใน Demo", close: "ปิด",
    resetPrompt: "คืนค่าการแก้ไขทั้งหมดหรือไม่", resetUnavailable: "ไม่สามารถเปิดคำยืนยันการคืนค่าได้",
    languageLabel: "เปลี่ยนหน้าจอเป็นภาษาอังกฤษ", presetLabel: "รูปแบบข้อความ",
    blockLabel: "ส่วนของ Flex", paneLabel: "พื้นที่ในสตูดิโอ", skip: "ข้ามไปพื้นที่ทำงาน"
  }
};

const pathParts = (path) => path.split(".");
const valueAt = (value, path) => pathParts(path).reduce((cursor, part) => cursor[part], value);

const make = (doc, tag, options = {}) => {
  const element = doc.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  for (const [name, value] of Object.entries(options.attributes ?? {})) {
    element.setAttribute(name, String(value));
  }
  return element;
};

const addText = (doc, parent, className, text) => {
  parent.append(make(doc, "div", { className, text }));
};

function renderPreview(doc, container, draft) {
  const message = make(doc, "div", { className: "phone-message" });
  const card = make(doc, "article", { className: "flex-card" });
  const header = make(doc, "header", { className: "flex-header" });
  addText(doc, header, "flex-eyebrow", draft.header.eyebrow);
  addText(doc, header, "flex-title", draft.header.title);
  addText(doc, header, "flex-status", draft.header.status);

  const hero = make(doc, "div", { className: "flex-hero" });
  const image = make(doc, "img", {
    attributes: { src: draft.hero.localAsset, alt: draft.hero.description ?? "" }
  });
  image.addEventListener("error", () => image.remove());
  hero.append(image);

  const body = make(doc, "div", { className: "flex-body" });
  addText(doc, body, "flex-project", draft.body.project);
  for (const [label, value] of [
    ["Revision", draft.body.revision],
    [draft.language === "th" ? "ผู้ส่ง" : "Requested by", draft.body.requester],
    [draft.language === "th" ? "มูลค่า / ขอบเขต" : "Amount / scope", draft.body.amount],
    [draft.language === "th" ? "ภายใน" : "Due", draft.body.deadline]
  ]) {
    const row = make(doc, "div", { className: "flex-fact" });
    addText(doc, row, "flex-fact-label", label);
    addText(doc, row, "flex-fact-value", value);
    body.append(row);
  }
  addText(doc, body, "flex-summary", draft.body.summary);
  addText(doc, body, "trust-note", draft.body.trustNote);

  const footer = make(doc, "footer", { className: "flex-footer" });
  footer.append(make(doc, "button", {
    className: "flex-primary",
    text: draft.footer.primaryLabel,
    attributes: { type: "button", tabindex: "-1" }
  }));
  card.append(header, hero, body, footer);
  message.append(card);
  container.replaceChildren(message);
}

function appendPair(doc, target, label, value) {
  const row = make(doc, "div", { className: "review-pair" });
  row.append(
    make(doc, "strong", { text: label }),
    make(doc, "span", { text: String(value) })
  );
  target.append(row);
}

function installJourney(doc, controller) {
  const liff = doc.getElementById("liff-dialog");
  const receiptDialog = doc.getElementById("receipt-dialog");
  const review = liff.querySelector("[data-liff-review]");
  const receiptTarget = receiptDialog.querySelector("[data-receipt]");
  const confirm = liff.querySelector("[data-confirm-demo]");
  const cancel = liff.querySelector('button[value="cancel"]');
  const closeReceipt = receiptDialog.querySelector("[data-close-receipt]");
  let transaction = null;
  let confirming = false;

  controller.nodes.run.addEventListener("click", () => {
    if (!controller.render().canRunJourney) {
      controller.announce(COPY[controller.getState().language].blocked);
      return;
    }
    if (typeof liff.showModal !== "function") {
      controller.announce("Dialog API unavailable. Demo journey cannot start.");
      return;
    }
    const draft = controller.getState().draft;
    transaction = createDemoTransaction(draft);
    review.replaceChildren(make(doc, "p", {
      className: "demo-ribbon", text: "PRIVATE REVIEW — DEMO"
    }));
    for (const [label, value] of [
      ["Tenant", draft.context.tenantName], ["Recipient", transaction.recipientRef],
      ["Project", draft.body.project], ["Revision", transaction.revision],
      ["Action", transaction.canonicalAction], ["Consequence", draft.body.trustNote],
      ["Action mode", transaction.actionMode], ["Expires", transaction.expiresAt]
    ]) appendPair(doc, review, label, value);
    liff.showModal();
  });

  cancel.addEventListener("click", () => {
    transaction = null;
    liff.close("cancel");
  });
  liff.addEventListener("cancel", () => {
    transaction = null;
  });
  liff.addEventListener("close", () => controller.nodes.run.focus());

  confirm.addEventListener("click", async () => {
    if (confirming || !transaction) return;
    confirming = true;
    confirm.disabled = true;
    confirm.setAttribute("aria-busy", "true");
    try {
      const confirmation = confirmDemoTransaction(
        transaction, controller.getState().draft
      );
      const receipt = await createDemoReceipt(transaction, confirmation);
      receiptTarget.replaceChildren(make(doc, "p", {
        className: "demo-ribbon", text: receipt.label
      }));
      for (const [label, value] of [
        ["Transaction", receipt.transactionId], ["Tenant", receipt.tenantId],
        ["Recipient", receipt.recipientRef], ["Revision", receipt.revision],
        ["Action", receipt.canonicalAction], ["Outcome", receipt.outcome],
        ["Confirmed", receipt.confirmedAt]
      ]) appendPair(doc, receiptTarget, label, value);
      receiptTarget.append(make(doc, "p", {
        className: "receipt-digest", text: receipt.digest
      }));
      receiptTarget.append(make(doc, "p", { text: receipt.productionNotice }));
      transaction = null;
      liff.close("confirmed");
      receiptDialog.showModal();
      controller.announce("Verification Receipt — Demo");
    } catch (error) {
      transaction = null;
      controller.announce(error.message === "transaction_expired" ?
        "Review expired. Start again." : "Bound values changed. Start review again.");
      liff.close("rejected");
    } finally {
      confirming = false;
      confirm.disabled = false;
      confirm.removeAttribute("aria-busy");
    }
  });

  closeReceipt.addEventListener("click", () => receiptDialog.close());
  receiptDialog.addEventListener("close", () => controller.nodes.run.focus());
}

function installResponsiveTabs(doc) {
  const panes = [
    ["editor", doc.querySelector(".editor-pane"), "Editor", "แก้ไข"],
    ["preview", doc.querySelector(".preview-pane"), "Preview", "ตัวอย่าง"],
    ["code", doc.querySelector(".code-pane"), "JSON & Validation", "JSON และตรวจสอบ"]
  ];
  let active = "editor";
  const tabs = make(doc, "nav", {
    attributes: {
      "data-mobile-tabs": "", role: "tablist", "aria-label": "Studio panes"
    }
  });
  const media = typeof doc.defaultView.matchMedia === "function" ?
    doc.defaultView.matchMedia("(max-width: 720px)") : { matches: false };
  const apply = () => {
    const mobile = media.matches;
    for (const [id, pane] of panes) pane.hidden = mobile && id !== active;
    for (const button of tabs.querySelectorAll("[role=tab]")) {
      const selected = button.dataset.pane === active;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
  };
  for (const [id, pane, en, th] of panes) {
    pane.id ||= "pane-" + id;
    pane.tabIndex = -1;
    const button = make(doc, "button", {
      text: doc.documentElement.lang === "th" ? th : en,
      attributes: {
        type: "button", role: "tab", "data-pane": id,
        "data-label-en": en, "data-label-th": th,
        "aria-controls": pane.id, "aria-selected": id === active
      }
    });
    button.addEventListener("click", () => {
      active = id;
      apply();
      pane.focus({ preventScroll: true });
    });
    tabs.append(button);
  }
  doc.getElementById("studio-main").before(tabs);
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", apply);
  } else if (typeof media.addListener === "function") {
    media.addListener(apply);
  }
  apply();
}

export function bindStudio(doc) {
  let state = createInitialStudioState();
  let dirty = false;
  const byId = (id) => doc.getElementById(id);
  const nodes = {
    language: byId("language-toggle"), tenant: byId("tenant-context"),
    presets: byId("preset-list"), blocks: byId("block-tabs"), fields: byId("field-panel"),
    preview: byId("phone-preview"), json: byId("json-output"),
    findings: byId("validation-list"), count: byId("payload-count"),
    copy: byId("copy-json"), download: byId("download-json"),
    reset: byId("reset-draft"), run: byId("run-journey"), toast: byId("toast-live"),
    editorTitle: byId("editor-title"), previewTitle: byId("preview-title"),
    jsonTitle: byId("json-title"), validationTitle: byId("validation-title"),
    liffTitle: byId("liff-title"), receiptTitle: byId("receipt-title"),
    cancel: byId("cancel-journey"), confirm: byId("confirm-journey"),
    closeReceipt: byId("close-receipt"), skip: doc.querySelector(".skip-link")
  };

  const announce = (message) => {
    nodes.toast.textContent = "";
    doc.defaultView.setTimeout(() => {
      nodes.toast.textContent = message;
    }, 0);
  };
  const dispatch = (event, marksDirty = true) => {
    state = reduceStudioState(state, event);
    if (marksDirty) dirty = true;
    render(event.type !== "field.changed");
  };

  function renderPresets() {
    const buttons = PRESET_IDS.map((id) => {
      const item = createDraft(getPreset(id), state.language);
      const button = make(doc, "button", {
        className: "preset-card", text: item.header.title,
        attributes: { type: "button", "aria-pressed": id === state.presetId }
      });
      button.append(make(doc, "small", {
        text: COPY[state.language].audiences[item.context.audience] ?? item.context.audience
      }));
      button.addEventListener("click", () => {
        dirty = false;
        dispatch({ type: "preset.changed", presetId: id }, false);
      });
      return button;
    });
    nodes.presets.replaceChildren(...buttons);
  }

  function renderBlocks() {
    nodes.blocks.replaceChildren(...BLOCKS.map((block, index) => {
      const selected = block === state.activeBlock;
      const button = make(doc, "button", {
        className: "block-tab", text: COPY[state.language].blocks[index],
        attributes: {
          type: "button", role: "tab", id: "block-tab-" + block,
          "aria-selected": selected, "aria-controls": "field-panel",
          tabindex: selected ? "0" : "-1"
        }
      });
      button.addEventListener("click", () => {
        dispatch({ type: "block.changed", block }, false);
      });
      return button;
    }));
  }

  function renderFields() {
    const controls = FIELDS[state.activeBlock].map(([path, en, th]) => {
      const wrapper = make(doc, "div", { className: "field-control" });
      const id = "field-" + path.replaceAll(".", "-");
      const label = make(doc, "label", {
        text: state.language === "th" ? th : en,
        attributes: { for: id }
      });
      const multiline = ["summary", "trustNote", "altText"].some((name) =>
        path.endsWith(name));
      const control = make(doc, multiline ? "textarea" : "input", {
        attributes: { id, name: path, "data-path": path }
      });
      control.value = valueAt(state.draft, path);
      control.addEventListener("input", () => {
        dispatch({
          type: "field.changed", path: pathParts(path), value: control.value
        });
      });
      wrapper.append(label, control);
      return wrapper;
    });
    const grid = make(doc, "div", { className: "field-grid" });
    grid.append(...controls);
    nodes.fields.replaceChildren(grid);
  }

  function focusField(field) {
    const target = [...nodes.fields.querySelectorAll("[data-path]")]
      .find((control) => control.dataset.path === field);
    target?.focus();
  }

  function renderFindings(view) {
    nodes.findings.replaceChildren(...view.findings.map((finding) => {
      const item = make(doc, "li", {
        className: "finding", attributes: { "data-severity": finding.severity }
      });
      addText(doc, item, "finding-title", finding.title);
      addText(doc, item, "finding-meta", finding.ruleId + " · " + finding.classification);
      addText(doc, item, "finding-copy", finding.explanation + " " + finding.remediation);
      const source = make(doc, "a", {
        text: "Source",
        attributes: { href: finding.sourceUrl, target: "_blank", rel: "noreferrer" }
      });
      item.append(source);
      if (finding.severity === "error") {
        const fix = make(doc, "button", {
          text: COPY[state.language].fix, attributes: { type: "button" }
        });
        fix.addEventListener("click", () => {
          dispatch({ type: "block.changed", block: finding.block }, false);
          focusField(finding.field);
        });
        item.append(fix);
      }
      return item;
    }));
  }

  function render(rebuildControls = true) {
    const view = deriveStudioView(state);
    const copy = COPY[state.language];
    doc.documentElement.lang = state.language;
    nodes.language.textContent = state.language === "th" ? "TH / EN" : "EN / TH";
    nodes.language.setAttribute("aria-pressed", String(state.language === "en"));
    nodes.language.setAttribute("aria-label", copy.languageLabel);
    nodes.tenant.textContent = state.draft.context.tenantName + " · " +
      state.draft.context.platformMark;
    nodes.presets.setAttribute("aria-label", copy.presetLabel);
    nodes.blocks.setAttribute("aria-label", copy.blockLabel);
    nodes.editorTitle.textContent = copy.editorTitle;
    nodes.previewTitle.textContent = copy.previewTitle;
    nodes.jsonTitle.textContent = copy.jsonTitle;
    nodes.validationTitle.textContent = copy.validationTitle;
    nodes.liffTitle.textContent = state.language === "th" ?
      "ตรวจแบบส่วนตัว · Demo" : "Private review · Demo";
    nodes.receiptTitle.textContent = "Verification Receipt — Demo";
    nodes.cancel.textContent = copy.cancel;
    nodes.confirm.textContent = copy.confirm;
    nodes.closeReceipt.textContent = copy.close;
    nodes.skip.textContent = copy.skip;
    if (rebuildControls) {
      renderPresets();
      renderBlocks();
      renderFields();
    }
    renderPreview(doc, nodes.preview, state.draft);
    nodes.json.textContent = view.jsonText;
    const byteState = view.payloadBytes > 30 * 1024 ? "error" :
      view.payloadBytes > 24 * 1024 ? "warning" : "safe";
    const byteCopy = byteState === "error" ? copy.hardBytes :
      byteState === "warning" ? copy.softBytes : copy.safeBytes;
    nodes.count.textContent = view.payloadBytes.toLocaleString(state.language) + " " +
      copy.bytes + " · " + byteCopy;
    nodes.count.setAttribute("data-state", byteState);
    renderFindings(view);
    for (const control of nodes.fields.querySelectorAll("[data-path]")) {
      control.setAttribute("aria-invalid", String(view.findings.some((finding) =>
        finding.severity === "error" && finding.field === control.dataset.path)));
    }
    nodes.run.textContent = copy.run;
    nodes.copy.textContent = copy.copyJson;
    nodes.download.textContent = copy.downloadJson;
    nodes.reset.textContent = copy.resetDraft;
    for (const tab of doc.querySelectorAll("[data-mobile-tabs] [role=tab]")) {
      tab.textContent = state.language === "th" ? tab.dataset.labelTh : tab.dataset.labelEn;
    }
    const paneTabs = doc.querySelector("[data-mobile-tabs]");
    paneTabs?.setAttribute("aria-label", copy.paneLabel);
    for (const button of [nodes.copy, nodes.download, nodes.run]) {
      button.disabled = view.hasBlockingErrors;
    }
    return view;
  }

  nodes.language.addEventListener("click", () => {
    dirty = false;
    dispatch({
      type: "language.changed", language: state.language === "th" ? "en" : "th"
    }, false);
  });

  nodes.copy.addEventListener("click", async () => {
    const view = deriveStudioView(state);
    if (!view.canExport) {
      announce(COPY[state.language].blocked);
      return;
    }
    try {
      const clipboard = doc.defaultView.navigator.clipboard;
      if (typeof clipboard?.writeText !== "function") throw new Error("clipboard_unavailable");
      await clipboard.writeText(view.jsonText);
      announce(COPY[state.language].copied);
    } catch {
      announce(COPY[state.language].copyFailed);
    }
  });

  nodes.download.addEventListener("click", () => {
    const view = deriveStudioView(state);
    if (!view.canExport) {
      announce(COPY[state.language].blocked);
      return;
    }
    let url = null;
    try {
      const BlobConstructor = doc.defaultView.Blob;
      const URLApi = doc.defaultView.URL;
      if (typeof BlobConstructor !== "function" ||
          typeof URLApi?.createObjectURL !== "function" ||
          typeof URLApi?.revokeObjectURL !== "function") {
        throw new Error("download_unavailable");
      }
      const blob = new BlobConstructor([view.jsonText], { type: "application/json" });
      url = URLApi.createObjectURL(blob);
      const anchor = make(doc, "a", {
        attributes: {
          href: url,
          download: "monolith-" + state.presetId + ".json",
          hidden: ""
        }
      });
      doc.body.append(anchor);
      anchor.click();
      anchor.remove();
      announce(COPY[state.language].downloaded);
    } catch {
      announce(COPY[state.language].downloadFailed);
    } finally {
      if (url) {
        doc.defaultView.setTimeout(() => doc.defaultView.URL.revokeObjectURL(url), 0);
      }
    }
  });

  nodes.reset.addEventListener("click", () => {
    if (dirty) {
      const confirmReset = doc.defaultView.confirm;
      if (typeof confirmReset !== "function") {
        announce(COPY[state.language].resetUnavailable);
        return;
      }
      if (!confirmReset.call(doc.defaultView, COPY[state.language].resetPrompt)) return;
    }
    dirty = false;
    dispatch({ type: "draft.reset" }, false);
    announce(COPY[state.language].reset);
  });

  const controller = { getState: () => state, dispatch, render, announce, nodes };
  installJourney(doc, controller);
  installResponsiveTabs(doc);
  render();
  return controller;
}

if (typeof document !== "undefined") bindStudio(document);
