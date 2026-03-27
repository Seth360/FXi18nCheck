chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action === "COLLECT_PAGE_DATA") {
    sendResponse(collectPageData());
    return true;
  }
  if (message?.action === "START_CONTINUOUS_CAPTURE_TRACKING") {
    sendResponse(startContinuousCaptureTracking(message.session));
    return true;
  }
  if (message?.action === "STOP_CONTINUOUS_CAPTURE_TRACKING") {
    stopContinuousCaptureTracking();
    sendResponse({ ok: true });
    return true;
  }
  if (message?.action === "APPLY_FINDING_HIGHLIGHTS") {
    sendResponse(applyFindingHighlights(message.findings));
    return true;
  }
  if (message?.action === "CLEAR_FINDING_HIGHLIGHTS") {
    clearFindingHighlights();
    sendResponse({ ok: true });
    return true;
  }
  if (message?.action === "GET_SCREENSHOT_CAPTURE_STATE") {
    sendResponse(getScreenshotCaptureState());
    return true;
  }
  if (message?.action === "SET_SCREENSHOT_SCROLL") {
    setScreenshotScroll(message.position);
    sendResponse({ ok: true });
    return true;
  }
  return false;
});

const HIGHLIGHT_STYLE_ID = "fx-lang-check-highlight-style";
const HIGHLIGHT_CLASS = "fx-lang-check-highlight";
const HIGHLIGHT_ATTR = "data-fx-lang-check-highlight";
const HIGHLIGHT_TEXT_CLASS = "fx-lang-check-highlight-text";
const HIGHLIGHT_TEXT_ATTR = "data-fx-lang-check-highlight-text";
let ACTIVE_SCOPE_ROOT = null;
let CAPTURE_TRACKING_ACTIVE = false;
let CAPTURE_TRACKING_SESSION_ID = "";
let captureClickHandler = null;

const ANALYSIS_SCOPE_SELECTOR = [
  "[role='dialog']",
  "[aria-modal='true']",
  ".ant-modal",
  ".ant-drawer",
  ".el-dialog",
  ".el-drawer",
  ".crm-full-screen-dialog",
  ".crm-c-dialog",
  ".fx-modal",
  ".fx-drawer",
  ".fx-dialog",
  "[class*='modal']",
  "[class*='drawer']",
  "[class*='dialog']",
  "[class*='sidepanel']",
  "[class*='sidebar']",
  "[class*='slide-panel']",
  "[class*='slideover']"
].join(", ");

const OVERLAY_FOREGROUND_SELECTOR = [
  ".crm-full-screen-dialog",
  ".crm-c-dialog",
  ".el-dialog",
  ".el-dialog__body",
  ".el-drawer",
  ".el-drawer__container",
  ".el-drawer__body",
  ".ant-modal-content",
  ".ant-drawer-content",
  ".fx-dialog",
  ".fx-dialog__body",
  ".fx-dialog__main",
  "[role='document']",
  "[class*='dialog__body']",
  "[class*='drawer__body']",
  "[class*='dialog-content']",
  "[class*='drawer-content']",
  "[class*='detail-dialog']",
  "[class*='slider']",
  "[class*='slide']",
  "[class*='panel']",
  "[class*='content']"
].join(", ");

const HIGHLIGHT_CANDIDATE_SELECTOR = [
  "button",
  "a",
  "span",
  "div",
  "p",
  "li",
  "dt",
  "dd",
  "strong",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "label",
  "th",
  "td",
  "input",
  "textarea",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[role='option']",
  "[role='menuitem']",
  "[title]",
  "[aria-label]",
  "[data-title]",
  "[data-testid]",
  ".fx-label",
  ".fx-form-item__label",
  ".fx-table__header",
  "[class*='label']",
  "[class*='title']",
  "[class*='text']"
].join(", ");

function collectPageData() {
  const scopeRoot = detectAnalysisScopeRoot();
  ACTIVE_SCOPE_ROOT = scopeRoot;
  const texts = [];
  const pushText = (kind, value, locator) => {
    const text = normalizeText(value);
    if (!text || text.length < 2) {
      return;
    }

    texts.push({
      kind,
      text,
      locator: locator || ""
    });
  };

  queryAllInScope(scopeRoot, "button, a, label, th, td, .fx-label, .fx-form-item__label, .fx-table__header")
    .forEach((node) => {
      pushText(node.tagName.toLowerCase(), node.innerText, buildLocator(node));
    });

  queryAllInScope(scopeRoot, "input, textarea")
    .forEach((node) => {
      pushText("placeholder", node.getAttribute("placeholder"), buildLocator(node));
      pushText("value", node.value, buildLocator(node));
      pushText("aria-label", node.getAttribute("aria-label"), buildLocator(node));
    });

  queryAllInScope(scopeRoot, "[title], [aria-label], [data-title]")
    .forEach((node) => {
      pushText("title", node.getAttribute("title"), buildLocator(node));
      pushText("aria-label", node.getAttribute("aria-label"), buildLocator(node));
      pushText("data-title", node.getAttribute("data-title"), buildLocator(node));
    });

  const deduped = dedupeTexts(texts);
  const sample = {
    headings: pickByKind(deduped, ["label", "th"]).slice(0, 20),
    actions: pickByKind(deduped, ["button", "a"]).slice(0, 20),
    inputs: pickByKind(deduped, ["placeholder", "aria-label", "value"]).slice(0, 20),
    rawTexts: deduped.slice(0, 80)
  };

  return {
    title: document.title,
    url: location.href,
    hash: location.hash,
    lang: document.documentElement.lang || "",
    scope: describeAnalysisScope(scopeRoot),
    elementCount: deduped.length,
    textStats: buildTextStats(deduped),
    sample
  };
}

function startContinuousCaptureTracking(session) {
  stopContinuousCaptureTracking();
  CAPTURE_TRACKING_ACTIVE = true;
  CAPTURE_TRACKING_SESSION_ID = String(session?.id || "");
  captureClickHandler = (event) => {
    handleContinuousCaptureClick(event);
  };
  document.addEventListener("click", captureClickHandler, true);
  return {
    ok: true,
    sessionId: CAPTURE_TRACKING_SESSION_ID
  };
}

function stopContinuousCaptureTracking() {
  CAPTURE_TRACKING_ACTIVE = false;
  CAPTURE_TRACKING_SESSION_ID = "";
  if (captureClickHandler) {
    document.removeEventListener("click", captureClickHandler, true);
    captureClickHandler = null;
  }
}

function handleContinuousCaptureClick(event) {
  if (!CAPTURE_TRACKING_ACTIVE || !event.isTrusted) {
    return;
  }

  const target = resolveContinuousCaptureTarget(event.target);
  if (!target || target === document.documentElement || target === document.body) {
    return;
  }

  const click = buildContinuousCaptureClickPayload(target);
  chrome.runtime.sendMessage({
    action: "CAPTURE_TRACKED_CLICK",
    sessionId: CAPTURE_TRACKING_SESSION_ID,
    click
  }).catch(() => {});
}

function resolveContinuousCaptureTarget(node) {
  if (!(node instanceof Element)) {
    return null;
  }

  return node.closest([
    "button",
    "a",
    "input",
    "textarea",
    "select",
    "label",
    "[role='button']",
    "[role='link']",
    "[role='tab']",
    "[role='option']",
    "[title]",
    "[aria-label]",
    "[data-testid]"
  ].join(", ")) || node;
}

function buildContinuousCaptureClickPayload(target) {
  const text = normalizeText(
    target.getAttribute("aria-label")
    || target.getAttribute("title")
    || target.innerText
    || target.textContent
    || target.value
  ).slice(0, 80);

  return {
    tagName: target.tagName.toLowerCase(),
    text,
    role: target.getAttribute("role") || "",
    locator: buildLocator(target),
    capturedAt: new Date().toISOString()
  };
}

function applyFindingHighlights(findings) {
  ensureHighlightStyle();
  clearFindingHighlights();

  const matchedTargets = [];
  for (const finding of Array.isArray(findings) ? findings : []) {
    const highlightTexts = getFindingHighlightTexts(finding);
    for (const node of resolveFindingNodes(finding)) {
      matchedTargets.push({ node, highlightTexts });
    }
  }

  let matchedCount = 0;
  let firstMatchedNode = null;

  matchedTargets.forEach(({ node, highlightTexts }) => {
    const applied = applyTextHighlightsToNode(node, highlightTexts);
    if (!applied) {
      applyNodeHighlight(node);
    }
    matchedCount += 1;
    if (!firstMatchedNode) {
      firstMatchedNode = node;
    }
  });

  if (firstMatchedNode) {
    firstMatchedNode.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  }

  return {
    ok: true,
    matchedCount
  };
}

function clearFindingHighlights() {
  document.querySelectorAll(`[${HIGHLIGHT_TEXT_ATTR}]`).forEach((node) => {
    const textNode = document.createTextNode(node.textContent || "");
    node.replaceWith(textNode);
  });
  document.querySelectorAll(`[${HIGHLIGHT_ATTR}]`).forEach((node) => {
    node.classList.remove(HIGHLIGHT_CLASS);
    node.removeAttribute(HIGHLIGHT_ATTR);
  });
}

function getScreenshotCaptureState() {
  const scrollingElement = document.scrollingElement || document.documentElement || document.body;
  return {
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    fullWidth: Math.max(
      scrollingElement?.scrollWidth || 0,
      document.documentElement?.scrollWidth || 0,
      document.body?.scrollWidth || 0,
      window.innerWidth
    ),
    fullHeight: Math.max(
      scrollingElement?.scrollHeight || 0,
      document.documentElement?.scrollHeight || 0,
      document.body?.scrollHeight || 0,
      window.innerHeight
    ),
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    devicePixelRatio: window.devicePixelRatio || 1
  };
}

function setScreenshotScroll(position) {
  const nextX = Math.max(0, Number(position?.x || 0));
  const nextY = Math.max(0, Number(position?.y || 0));
  window.scrollTo(nextX, nextY);
}

function ensureHighlightStyle() {
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = HIGHLIGHT_STYLE_ID;
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      box-shadow: inset 0 -0.28em 0 rgba(255, 217, 0, 0.38) !important;
      border-radius: 4px !important;
      transition: box-shadow 0.2s ease !important;
    }

    .${HIGHLIGHT_TEXT_CLASS} {
      background: linear-gradient(180deg, rgba(255, 240, 0, 0) 0%, rgba(255, 221, 51, 0.62) 100%) !important;
      border-radius: 3px !important;
      box-decoration-break: clone !important;
      -webkit-box-decoration-break: clone !important;
      padding: 0 1px !important;
    }
  `;
  document.documentElement.appendChild(style);
}

function resolveFindingNodes(finding) {
  const matchedNodes = [];
  const seen = new Set();
  const appendNode = (node) => {
    if (!node || seen.has(node) || !isRenderableNode(node)) {
      return;
    }
    seen.add(node);
    matchedNodes.push(node);
  };

  queryNodesByLocator(finding?.locator).forEach(appendNode);
  queryNodesByEvidence(finding).forEach(appendNode);

  return matchedNodes.slice(0, 8);
}

function queryNodesByLocator(locator) {
  const normalizedLocator = normalizeText(locator);
  if (!normalizedLocator) {
    return [];
  }

  const exactMatches = queryAllInScope(getActiveScopeRoot(), normalizedLocator).filter(isRenderableNode);
  if (exactMatches.length) {
    return exactMatches;
  }

  const candidates = getHighlightCandidates();
  return candidates.filter((node) => {
    const builtLocator = buildLocator(node);
    return builtLocator === normalizedLocator
      || builtLocator.includes(normalizedLocator)
      || normalizedLocator.includes(builtLocator);
  });
}

function queryNodesByEvidence(finding) {
  const evidenceTexts = expandEvidenceTexts([
    ...(Array.isArray(finding?.evidence) ? finding.evidence : []),
    finding?.title || ""
  ]);

  if (!evidenceTexts.length) {
    return [];
  }

  const candidates = getHighlightCandidates();
  return candidates.filter((node) => {
    const nodeText = extractNodeText(node);
    const compactNodeText = compactText(nodeText);
    return evidenceTexts.some((text) => {
      const compactEvidence = compactText(text);
      return nodeText.includes(text)
        || compactNodeText.includes(compactEvidence)
        || (compactEvidence.length >= 4 && compactEvidence.includes(compactNodeText));
    });
  });
}

function getHighlightCandidates() {
  return queryAllInScope(getActiveScopeRoot(), HIGHLIGHT_CANDIDATE_SELECTOR);
}

function getFindingHighlightTexts(finding) {
  return expandEvidenceTexts([
    ...(Array.isArray(finding?.evidence) ? finding.evidence : []),
    finding?.title || "",
    finding?.locator || ""
  ]).sort((a, b) => b.length - a.length);
}

function applyNodeHighlight(node) {
  node.classList.add(HIGHLIGHT_CLASS);
  node.setAttribute(HIGHLIGHT_ATTR, "true");
}

function applyTextHighlightsToNode(node, highlightTexts) {
  if (!node || !highlightTexts.length || /^(input|textarea)$/i.test(node.tagName || "")) {
    return false;
  }

  const textNodes = getTextNodes(node);
  let applied = false;

  for (const textNode of textNodes) {
    const match = findBestTextMatch(textNode.nodeValue || "", highlightTexts);
    if (!match) {
      continue;
    }

    wrapTextMatch(textNode, match.start, match.end);
    applied = true;
  }

  return applied;
}

function getTextNodes(node) {
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
    acceptNode(textNode) {
      if (!textNode.nodeValue || !textNode.nodeValue.trim()) {
        return NodeFilter.FILTER_REJECT;
      }
      if (textNode.parentElement?.closest(`[${HIGHLIGHT_TEXT_ATTR}]`)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }
  return textNodes;
}

function findBestTextMatch(text, highlightTexts) {
  let bestMatch = null;

  for (const candidate of highlightTexts) {
    const match = findTextMatch(text, candidate);
    if (!match) {
      continue;
    }

    if (!bestMatch || match.length > bestMatch.length || match.start < bestMatch.start) {
      bestMatch = match;
    }
  }

  return bestMatch;
}

function findTextMatch(text, candidate) {
  const normalizedCandidate = normalizeText(candidate);
  if (!normalizedCandidate || normalizedCandidate.length < 2) {
    return null;
  }

  const escaped = escapeRegExp(normalizedCandidate).replace(/\s+/g, "\\s+");
  const regex = new RegExp(escaped, "i");
  const match = regex.exec(text);
  if (!match) {
    return null;
  }

  return {
    start: match.index,
    end: match.index + match[0].length,
    length: match[0].length
  };
}

function wrapTextMatch(textNode, start, end) {
  if (!textNode.parentNode || start < 0 || end <= start) {
    return;
  }

  const text = textNode.nodeValue || "";
  const before = text.slice(0, start);
  const matched = text.slice(start, end);
  const after = text.slice(end);
  const fragment = document.createDocumentFragment();

  if (before) {
    fragment.appendChild(document.createTextNode(before));
  }

  const highlightNode = document.createElement("span");
  highlightNode.className = HIGHLIGHT_TEXT_CLASS;
  highlightNode.setAttribute(HIGHLIGHT_TEXT_ATTR, "true");
  highlightNode.textContent = matched;
  fragment.appendChild(highlightNode);

  if (after) {
    fragment.appendChild(document.createTextNode(after));
  }

  textNode.parentNode.replaceChild(fragment, textNode);
}

function extractNodeText(node) {
  return normalizeText([
    node.innerText,
    node.textContent,
    node.value,
    node.getAttribute("placeholder"),
    node.getAttribute("title"),
    node.getAttribute("aria-label"),
    node.getAttribute("data-title")
  ].filter(Boolean).join(" "));
}

function safeQuerySelectorAll(selector) {
  try {
    return Array.from(document.querySelectorAll(selector));
  } catch (_error) {
    return [];
  }
}

function safeQuerySelectorAllWithin(root, selector) {
  try {
    return Array.from(root.querySelectorAll(selector));
  } catch (_error) {
    return [];
  }
}

function queryAllInScope(root, selector) {
  const scopeRoot = root && root !== document.documentElement ? root : document.body;
  const matches = scopeRoot === document.body
    ? safeQuerySelectorAll(selector)
    : safeQuerySelectorAllWithin(scopeRoot, selector);

  if (scopeRoot !== document.body && safeElementMatches(scopeRoot, selector)) {
    matches.unshift(scopeRoot);
  }

  return matches;
}

function safeElementMatches(node, selector) {
  try {
    return Boolean(node?.matches?.(selector));
  } catch (_error) {
    return false;
  }
}

function isRenderableNode(node) {
  return Boolean(node?.isConnected && node.getClientRects().length);
}

function getActiveScopeRoot() {
  if (ACTIVE_SCOPE_ROOT?.isConnected) {
    return ACTIVE_SCOPE_ROOT;
  }
  return document.body;
}

function detectAnalysisScopeRoot() {
  const candidates = safeQuerySelectorAll(ANALYSIS_SCOPE_SELECTOR)
    .filter(isMeaningfulOverlayCandidate)
    .sort((a, b) => scoreOverlayCandidate(b) - scoreOverlayCandidate(a));

  const overlayRoot = candidates[0];
  if (!overlayRoot) {
    return document.body;
  }

  return resolveForegroundScopeRoot(overlayRoot);
}

function isMeaningfulOverlayCandidate(node) {
  if (!node || node === document.body || node === document.documentElement || !isRenderableNode(node)) {
    return false;
  }

  const rect = node.getBoundingClientRect();
  const viewportArea = Math.max(window.innerWidth * window.innerHeight, 1);
  const areaRatio = (rect.width * rect.height) / viewportArea;
  if (rect.width < 220 || rect.height < 120 || areaRatio < 0.08) {
    return false;
  }

  return scoreOverlayCandidate(node) >= 6;
}

function scoreOverlayCandidate(node) {
  const rect = node.getBoundingClientRect();
  const viewportArea = Math.max(window.innerWidth * window.innerHeight, 1);
  const areaRatio = Math.min((rect.width * rect.height) / viewportArea, 1);
  const style = getComputedStyle(node);
  const classText = `${node.className || ""} ${node.getAttribute("role") || ""}`.toLowerCase();
  const zIndex = Number.parseInt(style.zIndex, 10);

  let score = 0;
  if (node.getAttribute("role") === "dialog" || node.getAttribute("aria-modal") === "true") {
    score += 6;
  }
  if (/(modal|drawer|dialog|sidepanel|sidebar|slideover|slide-panel)/i.test(classText)) {
    score += 4;
  }
  if (style.position === "fixed") {
    score += 3;
  } else if (style.position === "absolute") {
    score += 1;
  }
  if (Number.isFinite(zIndex) && zIndex > 0) {
    score += Math.min(zIndex / 100, 4);
  }
  score += areaRatio * 4;

  return score;
}

function describeAnalysisScope(root) {
  const scopeRoot = root && root !== document.body ? root : null;
  if (!scopeRoot) {
    return {
      mode: "page",
      label: "当前页面",
      locator: "body"
    };
  }

  const rect = scopeRoot.getBoundingClientRect();
  return {
    mode: "overlay",
    label: inferScopeLabel(scopeRoot),
    locator: buildLocator(scopeRoot),
    rect: {
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }
  };
}

function inferScopeLabel(node) {
  const classText = `${node.className || ""}`.toLowerCase();
  if (/(drawer|slideover|sidebar|sidepanel|slide-panel)/i.test(classText)) {
    return "当前侧滑层";
  }
  if (/(full-screen-dialog|crm-c-dialog)/i.test(classText)) {
    return "当前新建页弹层";
  }
  if (node.getAttribute("role") === "dialog" || node.getAttribute("aria-modal") === "true" || /(modal|dialog)/i.test(classText)) {
    return "当前弹窗";
  }
  return "当前前景层";
}

function resolveForegroundScopeRoot(overlayRoot) {
  const contentRoot = findForegroundContentDescendant(overlayRoot);
  return contentRoot || overlayRoot;
}

function findForegroundContentDescendant(overlayRoot) {
  const overlayRect = overlayRoot.getBoundingClientRect();
  const overlayArea = Math.max(overlayRect.width * overlayRect.height, 1);
  const candidates = safeQuerySelectorAllWithin(overlayRoot, OVERLAY_FOREGROUND_SELECTOR)
    .filter((node) => isValidForegroundCandidate(node, overlayRoot, overlayArea))
    .sort((a, b) => scoreForegroundCandidate(b, overlayArea) - scoreForegroundCandidate(a, overlayArea));

  return candidates[0] || null;
}

function isValidForegroundCandidate(node, overlayRoot, overlayArea) {
  if (!node || node === overlayRoot || !isRenderableNode(node)) {
    return false;
  }

  const rect = node.getBoundingClientRect();
  const area = rect.width * rect.height;
  const areaRatio = area / overlayArea;
  const classText = `${node.className || ""}`.toLowerCase();

  if (rect.width < 220 || rect.height < 120 || areaRatio < 0.08 || areaRatio > 0.98) {
    return false;
  }

  if (/(mask|backdrop|overlay|wrapper)/i.test(classText) && !/(slider|slide|panel|body|content|detail-dialog)/i.test(classText)) {
    return false;
  }

  return true;
}

function scoreForegroundCandidate(node, overlayArea) {
  const rect = node.getBoundingClientRect();
  const areaRatio = Math.min((rect.width * rect.height) / overlayArea, 1);
  const classText = `${node.className || ""}`.toLowerCase();
  const style = getComputedStyle(node);

  let score = areaRatio * 10;
  if (/(crm-full-screen-dialog|crm-c-dialog)/i.test(classText)) {
    score += 8;
  }
  if (/(detail-dialog|dialog__body|drawer__body|dialog-content|drawer-content|panel|content|slider|slide)/i.test(classText)) {
    score += 6;
  }
  if (/(mask|backdrop|overlay)/i.test(classText)) {
    score -= 8;
  }
  if (style.overflowY === "auto" || style.overflowY === "scroll") {
    score += 2;
  }
  if (style.backgroundColor && style.backgroundColor !== "rgba(0, 0, 0, 0)") {
    score += 1;
  }

  return score;
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

function compactText(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function expandEvidenceTexts(values) {
  const result = new Set();

  for (const value of Array.isArray(values) ? values : []) {
    const normalized = normalizeText(value);
    if (!normalized) {
      continue;
    }

    result.add(normalized);

    normalized
      .split(/[：:；;|,，]/)
      .map(normalizeText)
      .filter((item) => item.length >= 2)
      .forEach((item) => result.add(item));

    const quoted = normalized.match(/[""'“”‘’《》【】](.+?)[""'“”‘’《》【】]/g) || [];
    quoted
      .map((item) => normalizeText(item.replace(/[""'“”‘’《》【】]/g, "")))
      .filter((item) => item.length >= 2)
      .forEach((item) => result.add(item));
  }

  return [...result].filter((item) => item.length >= 2);
}

function buildLocator(node) {
  if (!node) {
    return "";
  }

  const parts = [node.tagName.toLowerCase()];
  if (node.id) {
    parts.push(`#${node.id}`);
  }
  const testId = node.getAttribute("data-testid") || node.getAttribute("data-test-id");
  if (testId) {
    parts.push(`[data-testid="${testId}"]`);
  }
  const className = String(node.className || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join(".");
  if (className) {
    parts.push(`.${className}`);
  }
  return parts.join("");
}

function dedupeTexts(items) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = `${item.kind}__${item.text}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

function pickByKind(items, kinds) {
  return items.filter((item) => kinds.includes(item.kind));
}

function buildTextStats(items) {
  let chineseCount = 0;
  let englishCount = 0;
  let mixedCount = 0;

  for (const item of items) {
    const hasChinese = /[\u4e00-\u9fff]/.test(item.text);
    const hasEnglish = /[A-Za-z]/.test(item.text);
    if (hasChinese && hasEnglish) {
      mixedCount += 1;
    } else if (hasChinese) {
      chineseCount += 1;
    } else if (hasEnglish) {
      englishCount += 1;
    }
  }

  return {
    chineseCount,
    englishCount,
    mixedCount
  };
}
