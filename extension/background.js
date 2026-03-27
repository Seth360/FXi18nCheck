const DEFAULT_PROMPT_SETTINGS = {
  singlePageSystemPrompt: [
    "你是资深的 B2B SaaS 多语言设计质量审查专家。",
    "你的任务是审查当前页面的多语设计质量，而不是代码质量。",
    "请重点检查：",
    "1. 中文、英文、数字、时间、货币、缩写的混用是否一致。",
    "2. 术语、按钮、表头、字段名、状态名、空状态、错误提示是否前后一致。",
    "3. 是否存在不利于国际化或本地化的文案设计，例如语序写死、语义歧义、拼接文案、过度依赖中文上下文。",
    "4. 是否存在潜在长度风险，例如英文变长后会截断、按钮过短、表头空间不足。",
    "5. 是否存在缺失文案、默认占位不清晰、提示语不完整、操作语义不明确的问题。",
    "6. 只根据输入数据做判断，不要编造页面上不存在的元素。",
    "6.1 如果 pageData.scope.mode 是 overlay，则只审查当前弹窗、整页弹层或侧滑层，不要把底层列表页或背景页面当成本次检查范围。",
    "7. 输出必须是 JSON 对象，不要输出 markdown code fence。",
    "8. JSON 必须严格合法：属性名和字符串值都使用双引号，属性之间不要漏逗号，字符串里的双引号必须转义。"
  ].join("\n"),
  singlePageOutputPrompt: [
    "请严格按以下 JSON 结构输出结果：",
    "{",
    '  "pageSummary": "string",',
    '  "score": 0,',
    '  "riskLevel": "low | medium | high",',
    '  "positives": ["做得好的点，最多 3 条"],',
    '  "findings": [',
    "    {",
    '      "severity": "high | medium | low",',
    '      "category": "术语一致性 | 国际化风险 | 文案清晰度 | 长度/布局风险 | 缺失状态 | 其他",',
    '      "title": "问题标题",',
    '      "description": "问题说明",',
    '      "evidence": ["可见文案或元素线索"],',
    '      "suggestion": "改进建议",',
    '      "locator": "用于回查的元素定位线索"',
    "    }",
    "  ],",
    '  "nextActions": ["建议的下一步"]',
    "}",
    "要求：",
    "- 只返回 JSON 对象，不要补充解释。",
    "- findings 必须是数组。",
    "- severity 只能是 high、medium、low。",
    "- riskLevel 只能是 low、medium、high。"
  ].join("\n"),
  continuousCaptureSystemPrompt: [
    "你是资深的 B2B SaaS 多语言设计质量审查专家。",
    "你的任务是审查用户在连续点击过程中经过的所有页面、弹窗、浮层的多语设计质量，并输出一份汇总报告。",
    "请重点检查：",
    "1. 多个步骤之间术语、按钮、表头、字段名、状态名是否一致。",
    "2. 页面与弹窗/浮层之间是否存在文案冲突、命名不一致、语义断裂。",
    "3. 是否存在国际化风险，例如语序写死、文案拼接、对中文上下文过度依赖。",
    "4. 是否存在长度/布局风险，例如英文变长后易截断、按钮过短、表头空间不足。",
    "5. 是否存在缺失文案、提示语不完整、操作语义不明确的问题。",
    "6. 同一个问题如果在多个步骤重复出现，请合并为一条 finding，并在 evidence 中写明涉及步骤。",
    "7. 只根据输入数据做判断，不要编造页面上不存在的元素。",
    "8. 输出必须是 JSON 对象，不要输出 markdown code fence。",
    "9. JSON 必须严格合法：属性名和字符串值都使用双引号，属性之间不要漏逗号，字符串里的双引号必须转义。"
  ].join("\n"),
  continuousCaptureOutputPrompt: [
    "请严格按以下 JSON 结构输出结果：",
    "{",
    '  "pageSummary": "string，概括整个连续操作流程的多语质量情况",',
    '  "score": 0,',
    '  "riskLevel": "low | medium | high",',
    '  "positives": ["做得好的点，最多 3 条"],',
    '  "findings": [',
    "    {",
    '      "severity": "high | medium | low",',
    '      "category": "术语一致性 | 国际化风险 | 文案清晰度 | 长度/布局风险 | 缺失状态 | 其他",',
    '      "title": "问题标题",',
    '      "description": "问题说明",',
    '      "evidence": ["可见文案、元素线索，或涉及的步骤号"],',
    '      "suggestion": "改进建议",',
    '      "locator": "用于回查的页面、弹窗或元素线索"',
    "    }",
    "  ],",
    '  "nextActions": ["建议的下一步"]',
    "}",
    "要求：",
    "- 只返回 JSON 对象，不要补充解释。",
    "- 重复问题要尽量合并。",
    "- findings 必须是数组。",
    "- severity 只能是 high、medium、low。",
    "- riskLevel 只能是 low、medium、high。"
  ].join("\n")
};

const DEFAULT_SETTINGS = {
  apiBaseUrl: "https://aihub.firstshare.cn",
  apiPath: "/v1/messages",
  apiKey: "",
  model: "MiniMax-M2.5",
  authHeader: "Authorization",
  authScheme: "Bearer",
  appleNotesBridgeUrl: "http://127.0.0.1:3894/note",
  appleNotesFolder: "多语质检",
  appleNotesArchiveDir: "~/Documents/Multilingual-QA-Reports",
  tapdApiAccount: "",
  tapdCreatorUsername: "",
  tapdApiToken: "",
  tapdStoryListUrl: "",
  modelTimeoutMs: "60000",
  bridgeTimeoutMs: "20000",
  extraRules: "",
  highlightFindings: true,
  ...DEFAULT_PROMPT_SETTINGS
};

const DEFAULT_MODEL_CONFIG = {
  id: "default",
  name: "FX共享",
  apiBaseUrl: "https://aihub.firstshare.cn",
  apiPath: "/v1/messages",
  apiKey: "",
  model: "MiniMax-M2.5",
  authHeader: "Authorization",
  authScheme: "Bearer"
};

const STORAGE_KEYS = {
  history: "reportHistory",
  progress: "analysisProgress",
  settings: Object.keys(DEFAULT_SETTINGS),
  modelConfigs: "modelConfigs",
  activeModelConfigId: "activeModelConfigId",
  captureSession: "continuousCaptureSession"
};

const API_PROTOCOLS = {
  CHAT_COMPLETIONS: "chat-completions",
  RESPONSES: "responses",
  ANTHROPIC_MESSAGES: "anthropic-messages"
};

const CONTENT_SCRIPT_PATH = resolveContentScriptPath();
const DEFAULT_CONTINUOUS_CAPTURE_LIMITS = {
  maxClicks: 12,
  maxDurationMs: 3 * 60 * 1000
};
const CONTINUOUS_CAPTURE_ALARM_PREFIX = "continuous-capture:";
const CAPTURE_ASSET_DB_NAME = "fxMultilingualCaptureAssets";
const CAPTURE_ASSET_STORE_NAME = "assets";
let captureClickQueue = Promise.resolve();

if (chrome.sidePanel?.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(DEFAULT_SETTINGS);
  const normalized = { ...current };
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (normalized[key] === undefined || normalized[key] === null || normalized[key] === "") {
      normalized[key] = value;
    }
  }
  await chrome.storage.local.set(normalized);

  const stored = await chrome.storage.local.get([STORAGE_KEYS.modelConfigs, STORAGE_KEYS.activeModelConfigId]);
  if (!Array.isArray(stored[STORAGE_KEYS.modelConfigs]) || stored[STORAGE_KEYS.modelConfigs].length === 0) {
    const migratedModel = normalized.model || DEFAULT_MODEL_CONFIG.model;
    const migratedBaseUrl = normalized.apiBaseUrl || DEFAULT_MODEL_CONFIG.apiBaseUrl;
    const migrated = {
      id: "default",
      name: DEFAULT_MODEL_CONFIG.name,
      apiBaseUrl: migratedBaseUrl,
      apiPath: normalized.apiPath || DEFAULT_MODEL_CONFIG.apiPath,
      apiKey: normalized.apiKey || "",
      model: migratedModel,
      authHeader: normalized.authHeader || DEFAULT_MODEL_CONFIG.authHeader,
      authScheme: normalized.authScheme || DEFAULT_MODEL_CONFIG.authScheme
    };
    await chrome.storage.local.set({
      [STORAGE_KEYS.modelConfigs]: [migrated],
      [STORAGE_KEYS.activeModelConfigId]: "default"
    });
  }
});

chrome.runtime.onStartup?.addListener(() => {
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }
});

chrome.alarms?.onAlarm.addListener((alarm) => {
  void handleContinuousCaptureAlarm(alarm);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    void handleContinuousCaptureTabUpdated(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void handleContinuousCaptureTabClosed(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch(async (error) => {
      const failureMessage = error.message || "处理失败";
      if (message?.action === "ANALYZE_CURRENT_PAGE" || message?.action === "STOP_CONTINUOUS_CAPTURE") {
        await reportProgress({
          phase: "error",
          percent: 100,
          message: failureMessage
        });
        await showCompletionNotification(
          message?.action === "STOP_CONTINUOUS_CAPTURE" ? "连续捕捉失败" : "检查失败",
          failureMessage
        );
      }
      sendResponse({
        ok: false,
        error: failureMessage
      });
    });
  return true;
});

async function handleMessage(message, sender) {
  switch (message?.action) {
    case "ANALYZE_CURRENT_PAGE":
      return analyzeCurrentPage();
    case "GET_LAST_REPORT":
      return getLastReport();
    case "GET_ANALYSIS_PROGRESS":
      return {
        ok: true,
        progress: (await chrome.storage.local.get([STORAGE_KEYS.progress]))[STORAGE_KEYS.progress] || null
      };
    case "GET_CONTINUOUS_CAPTURE_SESSION":
      return {
        ok: true,
        session: buildContinuousCaptureSessionView(await getContinuousCaptureSession())
      };
    case "GET_CAPTURE_ASSETS":
      return {
        ok: true,
        assets: await getCaptureAssets(message.keys || [])
      };
    case "START_CONTINUOUS_CAPTURE":
      return startContinuousCapture();
    case "STOP_CONTINUOUS_CAPTURE":
      return stopContinuousCapture({ reason: "manual-stop" });
    case "CANCEL_CONTINUOUS_CAPTURE":
      return cancelContinuousCapture();
    case "CAPTURE_TRACKED_CLICK":
      captureClickQueue = captureClickQueue
        .catch(() => {})
        .then(() => handleContinuousCaptureTrackedClick(sender, message));
      return captureClickQueue;
    case "GET_REPORT_HISTORY":
      return {
        ok: true,
        history: await getReportHistory()
      };
    case "CLEAR_REPORT_HISTORY":
      await chrome.storage.local.set({ [STORAGE_KEYS.history]: [] });
      await clearCaptureAssets();
      return { ok: true };
    case "SET_FINDING_IGNORED":
      return setFindingIgnored(message.reportId, message.findingId, message.ignored);
    case "EXPORT_REPORT_TO_NOTES":
      return exportReportToNotes(message.reportId);
    case "CREATE_TAPD_STORY":
      return createTapdStory(message.reportId);
    case "SYNC_PAGE_HIGHLIGHTS":
      return syncPageHighlights(message.pageUrl, message.findings);
    case "CLEAR_PAGE_HIGHLIGHTS":
      await clearAllPageHighlights();
      return { ok: true };
    case "GET_MODEL_CONFIGS":
      return getModelConfigs();
    case "SAVE_MODEL_CONFIG":
      return saveModelConfig(message.config);
    case "DELETE_MODEL_CONFIG":
      return deleteModelConfig(message.configId);
    case "SET_ACTIVE_MODEL_CONFIG":
      return setActiveModelConfig(message.configId);
    case "FETCH_REMOTE_MODELS":
      return fetchRemoteModels(message.baseUrl, message.apiKey, message.authHeader, message.authScheme);
    default:
      return { ok: false, error: "未知操作" };
  }
}

async function analyzeCurrentPage() {
  if (await getContinuousCaptureSession()) {
    throw new Error("连续捕捉进行中，请先停止捕捉后再执行单页检查");
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("未找到当前标签页");
  }

  await reportProgress({
    phase: "collecting",
    percent: 10,
    message: "正在读取当前页..."
  });

  const pageData = await collectPageData(tab);
  const settings = await resolveActiveModelSettings();
  validateSettings(settings);

  await reportProgress({
    phase: "analyzing",
    percent: 45,
    message: `正在调用${getProgressModelLabel(settings.model)}检查当前页...`
  });

  const modelReport = await requestModelReport(pageData, settings);
  const normalizedReport = normalizeReport(modelReport);
  const markdown = buildMarkdownReport(normalizedReport, pageData, normalizedReport.findings);
  const record = {
    id: makeRecordId(),
    createdAt: new Date().toISOString(),
    page: {
      title: pageData.title,
      url: pageData.url
    },
    pageData,
    report: normalizedReport,
    ignoredFindingIds: [],
    markdown,
    lastExport: null
  };

  const reportScreenshot = await captureAndStoreSinglePageReportScreenshot(record, normalizedReport.findings, tab).catch(() => null);
  if (reportScreenshot) {
    record.pageData = {
      ...record.pageData,
      reportScreenshot
    };
  }

  const history = await getReportHistory();
  history.unshift(record);
  await chrome.storage.local.set({
    [STORAGE_KEYS.history]: history.slice(0, 100)
  });

  await reportProgress({
    phase: "completed",
    percent: 100,
    message: "检查完成，已加入检查记录",
    recordId: record.id
  });
  await showCompletionNotification("多语设计检查完成", "报告已生成，可在侧边栏查看详情");

  return {
    ok: true,
    record
  };
}

async function getLastReport() {
  const history = await getReportHistory();
  return {
    ok: true,
    report: history[0] || null
  };
}

async function collectPageData(tab) {
  try {
    return await chrome.tabs.sendMessage(tab.id, { action: "COLLECT_PAGE_DATA" });
  } catch (_error) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [CONTENT_SCRIPT_PATH]
      });
      return chrome.tabs.sendMessage(tab.id, { action: "COLLECT_PAGE_DATA" });
    } catch (injectError) {
      if (String(tab.url || "").startsWith("file://")) {
        throw new Error("本地 HTML 需要先在扩展详情页打开“允许访问文件网址”");
      }
      throw new Error(`当前页面暂时无法注入检查脚本: ${injectError.message || injectError}`);
    }
  }
}

async function startContinuousCapture() {
  if (await getContinuousCaptureSession()) {
    throw new Error("当前已经在连续捕捉中");
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("未找到当前标签页");
  }

  const settings = await resolveActiveModelSettings();
  validateSettings(settings);

  const initialPageData = await collectPageData(tab);
  const startedAt = new Date();
  const session = {
    id: `capture-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tabId: tab.id,
    startedAt: startedAt.toISOString(),
    expiresAt: new Date(startedAt.getTime() + DEFAULT_CONTINUOUS_CAPTURE_LIMITS.maxDurationMs).toISOString(),
    maxClicks: DEFAULT_CONTINUOUS_CAPTURE_LIMITS.maxClicks,
    maxDurationMs: DEFAULT_CONTINUOUS_CAPTURE_LIMITS.maxDurationMs,
    clickCount: 0,
    steps: []
  };

  const initialStep = buildContinuousCaptureStep(initialPageData, {
    type: "start",
    clickIndex: 0,
    capturedAt: startedAt.toISOString()
  });
  initialStep.screenshot = await captureAndStoreContinuousCaptureStepScreenshot(session.id, initialStep, tab, 1).catch(() => null);

  session.steps = [initialStep];
  session.lastSignature = initialStep.signature;

  await setContinuousCaptureSession(session);
  await ensureContinuousCaptureTracking(session);
  await chrome.alarms?.create(getContinuousCaptureAlarmName(session.id), {
    when: new Date(session.expiresAt).getTime()
  });
  await reportProgress(buildContinuousCaptureProgress(session, "捕捉已开始，请点击页面操作。"));

  return {
    ok: true,
    session: buildContinuousCaptureSessionView(session)
  };
}

async function stopContinuousCapture(options = {}) {
  const session = options.session || await getContinuousCaptureSession();
  if (!session) {
    throw new Error("当前没有进行中的连续捕捉");
  }

  await chrome.alarms?.clear(getContinuousCaptureAlarmName(session.id));
  await stopContinuousCaptureTracking(session.tabId);
  await clearContinuousCaptureSession();

  return finalizeContinuousCaptureSession(session, options);
}

async function cancelContinuousCapture() {
  const session = await getContinuousCaptureSession();
  if (!session) {
    throw new Error("当前没有进行中的连续捕捉");
  }

  await chrome.alarms?.clear(getContinuousCaptureAlarmName(session.id));
  await stopContinuousCaptureTracking(session.tabId);
  await clearContinuousCaptureSession();
  await deleteCaptureAssetsByPrefix(`${session.id}:`);
  await reportProgress({
    phase: "idle",
    percent: 0,
    message: "已取消连续捕捉"
  });

  return {
    ok: true,
    cancelled: true
  };
}

async function finalizeContinuousCaptureSession(session, options = {}) {
  const settings = await resolveActiveModelSettings();
  validateSettings(settings);

  const captureData = buildContinuousCaptureFlowData(session, options);
  await reportProgress({
    phase: "analyzing",
    percent: 72,
    message: "正在整理捕捉内容..."
  });

  const modelReport = await requestContinuousCaptureReport(captureData, settings);
  const normalizedReport = normalizeReport(modelReport);
  const markdown = buildMarkdownReport(normalizedReport, captureData, normalizedReport.findings);
  const firstStep = captureData.captureFlow.steps[0] || {};
  const lastStep = captureData.captureFlow.steps[captureData.captureFlow.steps.length - 1] || firstStep;
  const record = {
    id: makeRecordId(),
    type: "continuous-capture",
    createdAt: new Date().toISOString(),
    page: {
      title: `连续捕捉 · ${firstStep.title || lastStep.title || "未命名流程"}`,
      url: firstStep.url || lastStep.url || ""
    },
    pageData: captureData,
    report: normalizedReport,
    ignoredFindingIds: [],
    markdown,
    lastExport: null
  };

  const history = await getReportHistory();
  history.unshift(record);
  await chrome.storage.local.set({
    [STORAGE_KEYS.history]: history.slice(0, 100)
  });

  const stopLabel = describeContinuousCaptureStopReason(options.reason);
  await reportProgress({
    phase: "completed",
    percent: 100,
    message: `连续捕捉完成，已生成汇总报告（${stopLabel}）`,
    recordId: record.id
  });
  await showCompletionNotification("连续捕捉完成", "汇总报告已生成，可在侧边栏查看详情");

  return {
    ok: true,
    record,
    stopReason: options.reason || "manual-stop"
  };
}

async function handleContinuousCaptureTrackedClick(sender, message) {
  const session = await getContinuousCaptureSession();
  if (!session?.id || session.id !== message?.sessionId || sender?.tab?.id !== session.tabId) {
    return { ok: true, ignored: true };
  }

  if (isContinuousCaptureExpired(session)) {
    return stopContinuousCapture({ session, reason: "time-limit" });
  }

  const nextClickCount = Number(session.clickCount || 0) + 1;
  session.clickCount = nextClickCount;
  await reportProgress(
    buildContinuousCaptureProgress(session, "捕捉已开始，请点击页面操作。", {
      reservePercent: 12
    })
  );

  const settledPageData = await collectSettledPageData(session.tabId);
  const nextStep = buildContinuousCaptureStep(settledPageData, {
    type: "click",
    clickIndex: nextClickCount,
    capturedAt: new Date().toISOString(),
    interaction: message?.click
  });

  if (nextStep.signature !== session.lastSignature) {
    const captureTab = await chrome.tabs.get(session.tabId).catch(() => null);
    nextStep.screenshot = await captureAndStoreContinuousCaptureStepScreenshot(
      session.id,
      nextStep,
      captureTab,
      session.steps.length + 1
    ).catch(() => null);
    session.steps.push(nextStep);
    session.lastSignature = nextStep.signature;
  }

  await setContinuousCaptureSession(session);

  if (nextClickCount >= Number(session.maxClicks || DEFAULT_CONTINUOUS_CAPTURE_LIMITS.maxClicks)) {
    return stopContinuousCapture({ session, reason: "click-limit" });
  }

  await reportProgress(buildContinuousCaptureProgress(session, "捕捉已开始，请点击页面操作。"));
  return {
    ok: true,
    session: buildContinuousCaptureSessionView(session)
  };
}

async function handleContinuousCaptureAlarm(alarm) {
  if (!alarm?.name || !alarm.name.startsWith(CONTINUOUS_CAPTURE_ALARM_PREFIX)) {
    return;
  }

  const session = await getContinuousCaptureSession();
  if (!session || getContinuousCaptureAlarmName(session.id) !== alarm.name) {
    return;
  }

  await stopContinuousCapture({ session, reason: "time-limit" }).catch(() => {});
}

async function handleContinuousCaptureTabUpdated(tabId) {
  const session = await getContinuousCaptureSession();
  if (!session || session.tabId !== tabId) {
    return;
  }

  if (isContinuousCaptureExpired(session)) {
    await stopContinuousCapture({ session, reason: "time-limit" }).catch(() => {});
    return;
  }

  await delay(250);
  await ensureContinuousCaptureTracking(session);
}

async function handleContinuousCaptureTabClosed(tabId) {
  const session = await getContinuousCaptureSession();
  if (!session || session.tabId !== tabId) {
    return;
  }

  await stopContinuousCapture({ session, reason: "tab-closed" }).catch(() => {});
}

async function collectSettledPageData(tabId) {
  const startedAt = Date.now();
  let lastError = null;

  await delay(700);

  while (Date.now() - startedAt < 8000) {
    let tab;
    try {
      tab = await chrome.tabs.get(tabId);
    } catch (error) {
      lastError = error;
      break;
    }

    if (!tab?.id) {
      throw new Error("未找到连续捕捉标签页");
    }

    if (tab.status !== "complete") {
      await delay(350);
      continue;
    }

    try {
      return await collectPageData(tab);
    } catch (error) {
      lastError = error;
      await delay(350);
    }
  }

  throw new Error(`连续捕捉后无法读取页面内容：${lastError?.message || lastError || "未知错误"}`);
}

async function ensureContinuousCaptureTracking(session) {
  if (!session?.tabId) {
    return;
  }

  try {
    await sendMessageToTab(session.tabId, {
      action: "START_CONTINUOUS_CAPTURE_TRACKING",
      session: { id: session.id }
    });
  } catch (_error) {
    // Ignore pages that cannot receive capture tracking.
  }
}

async function stopContinuousCaptureTracking(tabId) {
  if (!tabId) {
    return;
  }

  try {
    await sendMessageToTab(tabId, { action: "STOP_CONTINUOUS_CAPTURE_TRACKING" });
  } catch (_error) {
    // Ignore pages that cannot receive capture tracking.
  }
}

async function getContinuousCaptureSession() {
  const storage = await chrome.storage.local.get([STORAGE_KEYS.captureSession]);
  return storage[STORAGE_KEYS.captureSession] || null;
}

async function setContinuousCaptureSession(session) {
  await chrome.storage.local.set({ [STORAGE_KEYS.captureSession]: session });
  await notifyContinuousCaptureSession(session);
}

async function clearContinuousCaptureSession() {
  await chrome.storage.local.remove(STORAGE_KEYS.captureSession);
  await notifyContinuousCaptureSession(null);
}

async function notifyContinuousCaptureSession(session) {
  try {
    await chrome.runtime.sendMessage({
      action: "CONTINUOUS_CAPTURE_SESSION_UPDATED",
      session: buildContinuousCaptureSessionView(session)
    });
  } catch (_error) {
    // Side panel may not be open.
  }
}

function buildContinuousCaptureSessionView(session) {
  if (!session) {
    return null;
  }

  return {
    id: session.id,
    tabId: session.tabId,
    startedAt: session.startedAt,
    expiresAt: session.expiresAt,
    clickCount: Number(session.clickCount || 0),
    maxClicks: Number(session.maxClicks || DEFAULT_CONTINUOUS_CAPTURE_LIMITS.maxClicks),
    maxDurationMs: Number(session.maxDurationMs || DEFAULT_CONTINUOUS_CAPTURE_LIMITS.maxDurationMs),
    stepCount: Array.isArray(session.steps) ? session.steps.length : 0
  };
}

function buildContinuousCaptureProgress(session, message, options = {}) {
  const reservePercent = Number(options.reservePercent || 0);
  const maxPercent = Math.max(1, 68 - reservePercent);
  const clickCount = Number(session?.clickCount || 0);
  const maxClicks = Number(session?.maxClicks || DEFAULT_CONTINUOUS_CAPTURE_LIMITS.maxClicks);

  return {
    phase: "capturing",
    percent: Math.round((Math.min(clickCount, maxClicks) / maxClicks) * maxPercent),
    message,
    clickCount,
    maxClicks,
    expiresAt: session?.expiresAt || "",
    countdownSeconds: Math.max(0, Math.ceil((new Date(session?.expiresAt || 0).getTime() - Date.now()) / 1000))
  };
}

function buildContinuousCaptureStep(pageData, meta = {}) {
  const stepPageData = {
    title: pageData.title,
    url: pageData.url,
    hash: pageData.hash || "",
    lang: pageData.lang || "",
    scope: pageData.scope || null,
    elementCount: Number(pageData.elementCount || 0),
    textStats: pageData.textStats || {},
    sample: {
      headings: sanitizeCaptureTextEntries(pageData.sample?.headings, 10),
      actions: sanitizeCaptureTextEntries(pageData.sample?.actions, 10),
      inputs: sanitizeCaptureTextEntries(pageData.sample?.inputs, 10),
      rawTexts: sanitizeCaptureTextEntries(pageData.sample?.rawTexts, 20)
    }
  };

  return {
    id: `capture-step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: meta.type || "click",
    clickIndex: Number(meta.clickIndex || 0),
    capturedAt: meta.capturedAt || new Date().toISOString(),
    interaction: sanitizeCaptureInteraction(meta.interaction),
    signature: buildContinuousCaptureSignature(stepPageData),
    pageData: stepPageData,
    screenshot: meta.screenshot || null
  };
}

function buildContinuousCaptureSignature(pageData) {
  return JSON.stringify({
    url: pageData.url || "",
    scope: pageData.scope?.label || "",
    headings: (pageData.sample?.headings || []).slice(0, 4).map((item) => item.text),
    actions: (pageData.sample?.actions || []).slice(0, 4).map((item) => item.text),
    inputs: (pageData.sample?.inputs || []).slice(0, 4).map((item) => item.text)
  });
}

function sanitizeCaptureTextEntries(entries, limit) {
  return (Array.isArray(entries) ? entries : []).slice(0, limit).map((item) => ({
    kind: item.kind || "",
    text: String(item.text || "").slice(0, 120),
    locator: item.locator || ""
  }));
}

function sanitizeCaptureInteraction(interaction) {
  if (!interaction) {
    return null;
  }

  return {
    tagName: interaction.tagName || "",
    text: String(interaction.text || "").slice(0, 80),
    role: interaction.role || "",
    locator: interaction.locator || "",
    capturedAt: interaction.capturedAt || ""
  };
}

function buildContinuousCaptureFlowData(session, options = {}) {
  const steps = (Array.isArray(session.steps) ? session.steps : []).map((step, index) => ({
    index: index + 1,
    type: step.type || "click",
    clickIndex: Number(step.clickIndex || 0),
    capturedAt: step.capturedAt,
    title: step.pageData?.title || "",
    url: step.pageData?.url || "",
    scope: step.pageData?.scope || null,
    interaction: step.interaction || null,
    screenshot: step.screenshot || null,
    elementCount: Number(step.pageData?.elementCount || 0),
    textStats: step.pageData?.textStats || {},
    sample: step.pageData?.sample || {}
  }));

  return {
    title: steps[0]?.title || steps[steps.length - 1]?.title || "连续捕捉流程",
    url: steps[0]?.url || steps[steps.length - 1]?.url || "",
    lang: steps[0]?.lang || "",
    scope: {
      mode: "flow",
      label: "连续捕捉流程",
      locator: "continuous-capture"
    },
    captureFlow: {
      clickCount: Number(session.clickCount || 0),
      stepCount: steps.length,
      durationMs: Math.max(0, new Date().getTime() - new Date(session.startedAt).getTime()),
      startedAt: session.startedAt,
      stopReason: options.reason || "manual-stop",
      stopReasonLabel: describeContinuousCaptureStopReason(options.reason),
      steps
    }
  };
}

function isContinuousCaptureExpired(session) {
  return Date.now() >= new Date(session.expiresAt || 0).getTime();
}

function describeContinuousCaptureStopReason(reason) {
  if (reason === "click-limit") return "达到点击上限";
  if (reason === "time-limit") return "达到时间上限";
  if (reason === "tab-closed") return "页面已关闭";
  return "手动停止";
}

function getContinuousCaptureAlarmName(sessionId) {
  return `${CONTINUOUS_CAPTURE_ALARM_PREFIX}${sessionId}`;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function openCaptureAssetDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CAPTURE_ASSET_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CAPTURE_ASSET_STORE_NAME)) {
        db.createObjectStore(CAPTURE_ASSET_STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("无法打开截图存储"));
  });
}

async function saveCaptureAsset(key, value) {
  const db = await openCaptureAssetDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CAPTURE_ASSET_STORE_NAME, "readwrite");
    tx.objectStore(CAPTURE_ASSET_STORE_NAME).put({ key, ...value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("保存截图失败"));
  }).finally(() => db.close());
}

async function getCaptureAssets(keys) {
  if (!Array.isArray(keys) || !keys.length) {
    return {};
  }

  const db = await openCaptureAssetDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CAPTURE_ASSET_STORE_NAME, "readonly");
    const store = tx.objectStore(CAPTURE_ASSET_STORE_NAME);
    const result = {};
    let remaining = keys.length;

    keys.forEach((key) => {
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result) {
          result[key] = request.result;
        }
        remaining -= 1;
        if (remaining === 0) {
          resolve(result);
        }
      };
      request.onerror = () => {
        remaining -= 1;
        if (remaining === 0) {
          resolve(result);
        }
      };
    });

    tx.onerror = () => reject(tx.error || new Error("读取截图失败"));
  }).finally(() => db.close());
}

async function clearCaptureAssets() {
  const db = await openCaptureAssetDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CAPTURE_ASSET_STORE_NAME, "readwrite");
    tx.objectStore(CAPTURE_ASSET_STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("清理截图失败"));
  }).finally(() => db.close());
}

async function deleteCaptureAssetsByPrefix(prefix) {
  if (!prefix) {
    return;
  }

  const db = await openCaptureAssetDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CAPTURE_ASSET_STORE_NAME, "readwrite");
    const store = tx.objectStore(CAPTURE_ASSET_STORE_NAME);
    const request = store.openCursor();

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      if (String(cursor.key || "").startsWith(prefix)) {
        cursor.delete();
      }
      cursor.continue();
    };

    request.onerror = () => reject(request.error || new Error("删除截图失败"));
    tx.onerror = () => reject(tx.error || new Error("删除截图失败"));
  }).finally(() => db.close());
}

function validateSettings(settings) {
  if (!settings.apiBaseUrl || !settings.model) {
    throw new Error("请先在配置里填写 API Base URL 和 Model");
  }

  if (String(settings.authHeader || "").trim() && !settings.apiKey) {
    throw new Error("请先在配置里填写 API Key；如果你的网关使用浏览器登录态，请清空认证 Header");
  }
}

async function requestModelReport(pageData, settings) {
  return requestModelJson(buildPromptSpec(pageData, settings), settings);
}

async function requestContinuousCaptureReport(captureData, settings) {
  return requestModelJson(buildContinuousCapturePromptSpec(captureData, settings), settings);
}

async function requestModelJson(promptSpec, settings) {
  const apiProtocol = detectApiProtocol(settings.apiPath);
  const endpoint = normalizeEndpoint(settings.apiBaseUrl, settings.apiPath);
  const headers = {
    "Content-Type": "application/json"
  };
  const timeoutMs = Number(settings.modelTimeoutMs || 60000);

  if (settings.apiKey && settings.authHeader) {
    const authValue = settings.authScheme
      ? `${settings.authScheme} ${settings.apiKey}`.trim()
      : settings.apiKey;
    headers[settings.authHeader] = authValue;
  }
  applyProtocolHeaders(headers, apiProtocol);

  const controller = new AbortController();
  const startAt = Date.now();
  const heartbeat = setInterval(async () => {
    await reportProgress({
      phase: "analyzing",
      percent: 45,
      message: promptSpec.progressMessage || `正在调用${getProgressModelLabel(settings.model)}生成报告...`
    });
  }, 5000);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  const payload = buildModelRequestBody(promptSpec, settings, apiProtocol);
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      credentials: "include",
      signal: controller.signal,
      body: JSON.stringify(payload)
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`模型调用超时，已等待 ${Math.floor(timeoutMs / 1000)} 秒。请检查网络、模型名或 API Key。`);
    }
    throw error;
  } finally {
    clearInterval(heartbeat);
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(buildApiErrorMessage(response.status, endpoint, body));
  }

  const body = await response.text();
  const data = parseApiSuccessBody(body, endpoint);
  const directReport = extractStructuredReport(data);
  const modelOutput = directReport || extractAssistantContent(data, apiProtocol);
  const report = typeof modelOutput === "string" ? safeParseJson(modelOutput) : modelOutput;

  if (!report?.findings || !Array.isArray(report.findings)) {
    throw new Error("模型返回结果缺少 findings 数组，请检查 API 兼容性");
  }

  return report;
}

function buildPromptSpec(pageData, settings) {
  const system = String(settings.singlePageSystemPrompt || DEFAULT_PROMPT_SETTINGS.singlePageSystemPrompt).trim();

  const userPayload = {
    task: "请输出当前页面的多语设计质量报告",
    extraRules: settings.extraRules || "",
    outputFormatPrompt: String(settings.singlePageOutputPrompt || DEFAULT_PROMPT_SETTINGS.singlePageOutputPrompt).trim(),
    pageData
  };

  return {
    system,
    user: JSON.stringify(userPayload),
    progressMessage: `正在调用${getProgressModelLabel(settings.model)}检查当前页...`
  };
}

function buildContinuousCapturePromptSpec(captureData, settings) {
  const system = String(settings.continuousCaptureSystemPrompt || DEFAULT_PROMPT_SETTINGS.continuousCaptureSystemPrompt).trim();

  const userPayload = {
    task: "请输出连续捕捉流程的多语设计质量汇总报告",
    extraRules: settings.extraRules || "",
    outputFormatPrompt: String(settings.continuousCaptureOutputPrompt || DEFAULT_PROMPT_SETTINGS.continuousCaptureOutputPrompt).trim(),
    captureData
  };

  return {
    system,
    user: JSON.stringify(userPayload),
    progressMessage: `正在调用${getProgressModelLabel(settings.model)}生成报告...`
  };
}

function getProgressModelLabel(modelName) {
  const normalized = String(modelName || "").trim();
  if (!normalized) {
    return "模型";
  }
  if (/minimax/i.test(normalized)) {
    return "MiniMax";
  }
  if (/claude/i.test(normalized)) {
    return "Claude";
  }
  if (/gpt|openai/i.test(normalized)) {
    return "OpenAI";
  }
  return normalized;
}

function buildChatCompletionsMessages(promptSpec) {
  return [
    { role: "system", content: promptSpec.system },
    { role: "user", content: promptSpec.user }
  ];
}

function buildResponsesInput(promptSpec) {
  return {
    instructions: promptSpec.system,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: promptSpec.user
          }
        ]
      }
    ]
  };
}

function buildAnthropicRequest(promptSpec) {
  return {
    system: promptSpec.system,
    messages: [
      {
        role: "user",
        content: promptSpec.user
      }
    ]
  };
}

function buildModelRequestBody(promptSpec, settings, apiProtocol) {
  switch (apiProtocol) {
    case API_PROTOCOLS.RESPONSES: {
      const request = buildResponsesInput(promptSpec);
      return {
        model: settings.model,
        temperature: 0.2,
        text: {
          format: {
            type: "json_object"
          }
        },
        instructions: request.instructions,
        input: request.input
      };
    }
    case API_PROTOCOLS.ANTHROPIC_MESSAGES: {
      const request = buildAnthropicRequest(promptSpec);
      return {
        model: settings.model,
        max_tokens: 4096,
        temperature: 0.2,
        system: request.system,
        messages: request.messages
      };
    }
    case API_PROTOCOLS.CHAT_COMPLETIONS:
    default:
      if (isMiniMaxBaseUrl(settings.apiBaseUrl)) {
        return {
          model: settings.model,
          temperature: 0.2,
          messages: buildChatCompletionsMessages(promptSpec)
        };
      }

      return {
        model: settings.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: buildChatCompletionsMessages(promptSpec)
      };
  }
}

function normalizeReport(report) {
  const findings = Array.isArray(report.findings) ? report.findings : [];
  return {
    pageSummary: report.pageSummary || "",
    score: Number.isFinite(Number(report.score)) ? Math.round(Number(report.score)) : 0,
    riskLevel: String(report.riskLevel || "").toLowerCase() || "medium",
    positives: Array.isArray(report.positives) ? report.positives : [],
    nextActions: Array.isArray(report.nextActions) ? report.nextActions : [],
    findings: findings.map((finding, index) => ({
      id: finding.id || makeFindingId(index, finding),
      severity: String(finding.severity || "low").toLowerCase(),
      category: finding.category || "其他",
      title: finding.title || `问题 ${index + 1}`,
      description: finding.description || "",
      evidence: Array.isArray(finding.evidence) ? finding.evidence : [],
      suggestion: finding.suggestion || "",
      locator: finding.locator || ""
    }))
  };
}

function extractStructuredReport(data) {
  if (data && typeof data === "object" && Array.isArray(data.findings)) {
    return data;
  }

  return null;
}

function extractAssistantContent(data, apiProtocol) {
  switch (apiProtocol) {
    case API_PROTOCOLS.RESPONSES:
      return extractResponsesContent(data);
    case API_PROTOCOLS.ANTHROPIC_MESSAGES:
      return extractAnthropicContent(data);
    case API_PROTOCOLS.CHAT_COMPLETIONS:
    default:
      return extractChatCompletionsContent(data);
  }
}

function extractChatCompletionsContent(data) {
  const parsed = data?.choices?.[0]?.message?.parsed;
  if (parsed && typeof parsed === "object") {
    return parsed;
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const joined = content
      .map((item) => item?.text || item?.content || item?.value || "")
      .join("\n")
      .trim();
    if (joined) {
      return joined;
    }
  }

  const text = data?.choices?.[0]?.text;
  if (typeof text === "string" && text.trim()) {
    return text;
  }

  throw new Error("无法识别 Chat Completions 返回格式");
}

function extractResponsesContent(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  const textChunks = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      const text = content?.text || content?.content || content?.value || "";
      if (typeof text === "string" && text) {
        textChunks.push(text);
      }
    }
  }

  if (textChunks.length) {
    return textChunks.join("\n").trim();
  }

  throw new Error("无法识别 Responses 返回格式");
}

function extractAnthropicContent(data) {
  if (Array.isArray(data?.content)) {
    const joined = data.content
      .map((item) => item?.text || item?.content || item?.value || "")
      .join("\n")
      .trim();
    if (joined) {
      return joined;
    }
  }

  if (typeof data?.completion === "string" && data.completion.trim()) {
    return data.completion;
  }

  throw new Error("无法识别 Anthropic Messages 返回格式");
}

function applyProtocolHeaders(headers, apiProtocol) {
  if (apiProtocol === API_PROTOCOLS.ANTHROPIC_MESSAGES && !headers["anthropic-version"]) {
    headers["anthropic-version"] = "2023-06-01";
  }
}

function detectApiProtocol(path) {
  const normalizedPath = normalizeApiPath(path).toLowerCase();
  if (normalizedPath === "/responses" || normalizedPath === "/v1/responses") {
    return API_PROTOCOLS.RESPONSES;
  }
  if (normalizedPath === "/v1/messages") {
    return API_PROTOCOLS.ANTHROPIC_MESSAGES;
  }
  return API_PROTOCOLS.CHAT_COMPLETIONS;
}

function normalizeApiPath(path) {
  const trimmed = String(path || "").trim();
  if (!trimmed) {
    return "/v1/chat/completions";
  }
  return `/${trimmed.replace(/^\/+/, "")}`;
}

function safeParseJson(content) {
  const trimmed = content.trim();
  const cleaned = trimmed
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (_error) {
    const extracted = extractFirstJsonObject(cleaned);
    if (!extracted) {
      throw new Error(`模型返回了非 JSON 内容，前 200 字符: ${cleaned.slice(0, 200)}`);
    }

    const candidates = buildLooseJsonCandidates(extracted);
    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate);
      } catch (_candidateError) {
        // Try the next normalized variant.
      }
    }

    const preview = extracted.replace(/\s+/g, " ").slice(0, 240);
    throw new Error(`模型返回的 JSON 语法不合法，请重试。返回片段：${preview}`);
  }
}

function parseApiSuccessBody(body, endpoint) {
  const trimmedBody = String(body || "").trim();
  const compactBody = trimmedBody.replace(/\s+/g, " ").slice(0, 220);

  if (!trimmedBody) {
    throw new Error(`LLM API 返回了空内容，请检查接口 ${endpoint}`);
  }

  if (/<!doctype html>|<html[\s>]/i.test(trimmedBody)) {
    throw new Error(`LLM API 调用失败：请求地址 ${endpoint} 返回的是网页 HTML，不是模型 JSON。请检查 API Base URL、API Path，或确认当前接口是否依赖登录态、代理或内网访问。返回片段：${compactBody}`);
  }

  try {
    return JSON.parse(trimmedBody);
  } catch (_error) {
    throw new Error(`LLM API 调用失败：请求地址 ${endpoint} 返回的不是合法 JSON。返回片段：${compactBody}`);
  }
}

function buildApiErrorMessage(status, endpoint, body) {
  const trimmedBody = String(body || "").trim();
  const compactBody = trimmedBody.replace(/\s+/g, " ").slice(0, 220);
  const looksLikeHtml = /<!doctype html>|<html[\s>]/i.test(trimmedBody);

  if (looksLikeHtml) {
    return `LLM API 调用失败：${status}。当前请求地址是 ${endpoint}，服务端返回了网页 HTML，而不是模型接口 JSON。请优先核对 API Base URL、API Path，以及该接口是否需要登录态、代理或内网访问。返回片段：${compactBody}`;
  }

  return `LLM API 调用失败：${status}，请求地址：${endpoint}，返回内容：${compactBody}`;
}

function extractFirstJsonObject(input) {
  const start = input.indexOf("{");
  if (start === -1) {
    return "";
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < input.length; i += 1) {
    const char = input[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return input.slice(start, i + 1);
      }
    }
  }

  return "";
}

function buildLooseJsonCandidates(input) {
  const normalized = String(input || "")
    .replace(/^\uFEFF/, "")
    .replace(/[\u201C\u201D]/g, "\"")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u200B-\u200D\u2060]/g, "")
    .trim();

  const strippedTrailingCommas = normalized.replace(/,\s*([}\]])/g, "$1");
  const withoutControlChars = strippedTrailingCommas.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

  return [...new Set([
    normalized,
    strippedTrailingCommas,
    withoutControlChars
  ])];
}

function buildMarkdownReport(report, pageData, findings) {
  const activeFindings = Array.isArray(findings) ? findings : report.findings || [];
  const captureFlow = pageData.captureFlow || null;
  const lines = [];
  lines.push("# 多语设计质量报告");
  lines.push("");
  lines.push(`- 页面标题：${pageData.title}`);
  lines.push(`- 页面地址：${pageData.url}`);
  if (pageData.scope?.label) {
    lines.push(`- 检查范围：${pageData.scope.label}`);
  }
  if (captureFlow) {
    lines.push(`- 捕捉方式：连续捕捉`);
    lines.push(`- 点击次数：${captureFlow.clickCount}`);
    lines.push(`- 记录步骤：${captureFlow.stepCount}`);
    lines.push(`- 持续时长：${formatDuration(captureFlow.durationMs)}`);
    lines.push(`- 结束方式：${captureFlow.stopReasonLabel || describeContinuousCaptureStopReason(captureFlow.stopReason)}`);
  }
  lines.push(`- 检查时间：${formatExportDate(new Date().toISOString())}`);
  lines.push(`- 评分：${report.score ?? "未知"}`);
  lines.push(`- 风险等级：${String(report.riskLevel || "").toUpperCase()}`);
  lines.push(`- 问题数：${activeFindings.length}`);
  lines.push("");

  if (report.pageSummary) {
    lines.push("## 页面摘要");
    lines.push(report.pageSummary);
    lines.push("");
  }

  if (Array.isArray(report.positives) && report.positives.length) {
    lines.push("## 做得好的点");
    for (const item of report.positives) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  if (captureFlow?.steps?.length) {
    lines.push("## 捕捉步骤");
    captureFlow.steps.forEach((step) => {
      const stepTitle = step.title || step.url || `步骤 ${step.index}`;
      lines.push(`### 步骤 ${step.index}. ${stepTitle}`);
      lines.push(`- 范围：${step.scope?.label || "当前页面"}`);
      lines.push(`- 地址：${step.url || "未记录 URL"}`);
      if (step.interaction?.text || step.interaction?.locator) {
        lines.push(`- 触发点击：${step.interaction.text || step.interaction.locator}`);
      }
      if (Array.isArray(step.sample?.headings) && step.sample.headings.length) {
        lines.push(`- 关键标题：${step.sample.headings.map((item) => item.text).join(" | ")}`);
      }
      if (Array.isArray(step.sample?.actions) && step.sample.actions.length) {
        lines.push(`- 关键操作：${step.sample.actions.map((item) => item.text).join(" | ")}`);
      }
      lines.push("");
    });
  }

  lines.push("## 问题列表");
  if (!activeFindings.length) {
    lines.push("- 当前没有可导出的问题。");
    lines.push("");
  } else {
    activeFindings.forEach((finding, index) => {
      lines.push(`### ${index + 1}. ${finding.title}`);
      lines.push(`- 严重级别：${String(finding.severity || "").toUpperCase()}`);
      lines.push(`- 分类：${finding.category}`);
      if (finding.description) {
        lines.push(`- 问题说明：${finding.description}`);
      }
      if (Array.isArray(finding.evidence) && finding.evidence.length) {
        lines.push(`- 证据：${finding.evidence.join(" | ")}`);
      }
      if (finding.suggestion) {
        lines.push(`- 建议：${finding.suggestion}`);
      }
      if (finding.locator) {
        lines.push(`- 定位线索：${finding.locator}`);
      }
      lines.push("");
    });
  }

  return lines.join("\n");
}

async function getReportHistory() {
  const storage = await chrome.storage.local.get([STORAGE_KEYS.history]);
  return Array.isArray(storage[STORAGE_KEYS.history]) ? storage[STORAGE_KEYS.history] : [];
}

async function setFindingIgnored(reportId, findingId, ignored) {
  const history = await getReportHistory();
  const updated = history.map((record) => {
    if (record.id !== reportId) {
      return record;
    }
    const ignoredIds = new Set(record.ignoredFindingIds || []);
    if (ignored) {
      ignoredIds.add(findingId);
    } else {
      ignoredIds.delete(findingId);
    }
    return {
      ...record,
      ignoredFindingIds: [...ignoredIds]
    };
  });
  await chrome.storage.local.set({ [STORAGE_KEYS.history]: updated });
  return {
    ok: true,
    history: updated
  };
}

async function exportReportToNotes(reportId) {
  const history = await getReportHistory();
  const record = history.find((item) => item.id === reportId);
  if (!record) {
    throw new Error("未找到对应的检查记录");
  }

  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  const ignoredIds = new Set(record.ignoredFindingIds || []);
  const findings = (record.report?.findings || []).filter((item) => !ignoredIds.has(item.id));
  if (!findings.length) {
    throw new Error("当前详情页没有可导出的未忽略问题");
  }

  await reportProgress({
    phase: "exporting",
    percent: 82,
    message: "正在准备导出内容..."
  });

  const markdown = buildMarkdownReport(record.report, record.pageData, findings);
  const isContinuousCapture = Boolean(record.pageData?.captureFlow);
  const screenshots = isContinuousCapture
    ? await loadContinuousCaptureExportScreenshots(record)
    : [];
  const screenshot = isContinuousCapture
    ? null
    : await resolveSinglePageExportScreenshot(record, findings);

  await reportProgress({
    phase: "exporting",
    percent: 92,
    message: isContinuousCapture
      ? `正在导出当前详情和 ${screenshots.length} 张步骤截图到备忘录...`
      : screenshot?.ok
        ? "正在导出当前详情和高亮截图到备忘录..."
        : "正在导出当前详情到备忘录..."
  });

  let delivery;
  try {
    delivery = await sendToAppleNotesBridge(markdown, record.page, settings, {
      screenshot: screenshot?.ok ? screenshot : null,
      screenshots
    });
  } catch (error) {
    delivery = await exportReportToLocalMarkdown(markdown, record.page, settings, {
      noteError: error.message || "未连接到 Apple Notes Bridge，请检查配置"
    });
  }

  const updated = history.map((item) => {
    if (item.id !== reportId) {
      return item;
    }
    return {
      ...item,
      lastExport: {
        exportedAt: new Date().toISOString(),
        screenshotError: screenshot && !screenshot.ok ? screenshot.error : "",
        stepScreenshotCount: screenshots.length,
        ...delivery
      }
    };
  });
  await chrome.storage.local.set({ [STORAGE_KEYS.history]: updated });

  await reportProgress({
    phase: "completed",
    percent: 100,
    message: buildExportCompletionMessage(delivery)
  });
  await showCompletionNotification(
    delivery.noteExported === false ? "已导出到本地 Markdown" : "已导出到备忘录",
    delivery.message || delivery.storagePath || delivery.noteLocation || "导出完成"
  );

  return {
    ok: true,
    delivery
  };
}

async function createTapdStory(reportId) {
  const history = await getReportHistory();
  const record = history.find((item) => item.id === reportId);
  if (!record) {
    throw new Error("未找到对应的检查记录");
  }

  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  validateTapdSettings(settings);
  const tapdTarget = parseTapdStoryListUrl(settings.tapdStoryListUrl);
  const ignoredIds = new Set(record.ignoredFindingIds || []);
  const findings = (record.report?.findings || []).filter((item) => !ignoredIds.has(item.id));
  const endpoint = "https://api.tapd.cn/stories";
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    Accept: "application/json"
  };

  applyTapdAuthorization(headers, settings.tapdApiAccount, settings.tapdApiToken);

  const payload = new URLSearchParams();
  payload.set("workspace_id", tapdTarget.workspaceId);
  payload.set("name", buildTapdStoryTitle(record));
  payload.set("description", buildTapdStoryDescription(record, findings));
  if (settings.tapdCreatorUsername) {
    payload.set("creator", settings.tapdCreatorUsername);
  }
  if (tapdTarget.categoryId) {
    payload.set("category_id", tapdTarget.categoryId);
  }

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: payload.toString()
    });
  } catch (error) {
    throw new Error(`无法连接 TAPD 接口：${error.message || error}`);
  }

  const bodyText = await response.text();
  const body = parseTapdApiBody(bodyText, endpoint);
  if (!response.ok || Number(body.status) !== 1) {
    throw new Error(buildTapdApiErrorMessage(response.status, endpoint, body));
  }

  const story = body.data?.Story || body.data || {};
  const storyUrl = await resolveTapdStoryHref(tapdTarget.workspaceId, story.id, settings.tapdApiAccount, settings.tapdApiToken);
  const updated = history.map((item) => {
    if (item.id !== reportId) {
      return item;
    }
    return {
      ...item,
      lastTapdStory: {
        createdAt: new Date().toISOString(),
        storyId: story.id || "",
        storyUrl,
        workspaceId: tapdTarget.workspaceId,
        categoryId: tapdTarget.categoryId || ""
      }
    };
  });
  await chrome.storage.local.set({ [STORAGE_KEYS.history]: updated });

  await showCompletionNotification("TAPD 需求已创建", story.id ? `需求 #${story.id}` : buildTapdStoryTitle(record));

  return {
    ok: true,
    storyId: story.id || "",
    storyUrl,
    workspaceId: tapdTarget.workspaceId,
    categoryId: tapdTarget.categoryId || "",
    listUrl: settings.tapdStoryListUrl
  };
}

async function syncPageHighlights(pageUrl, findings) {
  await clearAllPageHighlights();
  const activeFindings = Array.isArray(findings) ? findings : [];
  if (!activeFindings.length) {
    return { ok: true, matched: false };
  }

  const tab = await findMatchingReportTab(pageUrl);
  if (!tab?.id) {
    return { ok: true, matched: false };
  }

  await sendMessageToTab(tab.id, {
    action: "APPLY_FINDING_HIGHLIGHTS",
    findings: activeFindings
  });

  return {
    ok: true,
    matched: true,
    tabId: tab.id
  };
}

async function captureReportScreenshot(record, findings) {
  const pageUrl = record.page?.url || "";
  const tab = await findMatchingReportTab(pageUrl);
  if (!tab?.id) {
    throw new Error("未找到对应页面标签页，无法生成高亮截图");
  }

  return captureReportScreenshotFromTab(record, findings, tab);
}

async function captureAndStoreSinglePageReportScreenshot(record, findings, tab) {
  if (!record?.id || !tab?.id) {
    return null;
  }

  const captured = await captureReportScreenshotFromTab(record, findings, tab);
  if (!captured?.ok || !captured.dataUrl) {
    return null;
  }

  const asset = {
    key: buildReportScreenshotAssetKey(record.id),
    filename: captured.filename,
    dataUrl: captured.dataUrl,
    capturedAt: new Date().toISOString()
  };
  await saveCaptureAsset(asset.key, asset);
  return {
    key: asset.key,
    filename: asset.filename,
    capturedAt: asset.capturedAt
  };
}

async function captureReportScreenshotFromTab(record, findings, tab) {
  if (!tab?.id) {
    throw new Error("未找到对应页面标签页，无法生成高亮截图");
  }

  if (tab.windowId !== chrome.windows.WINDOW_ID_NONE) {
    await chrome.tabs.update(tab.id, { active: true });
  }

  if (Array.isArray(findings) && findings.length) {
    await sendMessageToTab(tab.id, {
      action: "APPLY_FINDING_HIGHLIGHTS",
      findings
    });
  } else {
    await sendMessageToTab(tab.id, { action: "CLEAR_FINDING_HIGHLIGHTS" }).catch(() => {});
  }

  try {
    await delay(260);
    const dataUrl = await captureFullPageScreenshot(tab);
    return {
      ok: true,
      filename: buildReportScreenshotFileName(record),
      dataUrl
    };
  } finally {
    await sendMessageToTab(tab.id, { action: "CLEAR_FINDING_HIGHLIGHTS" }).catch(() => {});
  }
}

async function captureAndStoreContinuousCaptureStepScreenshot(sessionId, step, tab, stepIndex) {
  if (!sessionId || !step?.id || !tab?.windowId || tab.windowId === chrome.windows.WINDOW_ID_NONE) {
    return null;
  }

  await delay(180);
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
    format: "jpeg",
    quality: 72
  });
  const screenshot = {
    key: `${sessionId}:${step.id}`,
    filename: buildContinuousCaptureStepScreenshotFileName(stepIndex, step),
    dataUrl,
    capturedAt: step.capturedAt || new Date().toISOString()
  };
  await saveCaptureAsset(screenshot.key, screenshot);
  return {
    key: screenshot.key,
    filename: screenshot.filename,
    capturedAt: screenshot.capturedAt
  };
}

async function loadContinuousCaptureExportScreenshots(record) {
  const stepScreenshots = (record.pageData?.captureFlow?.steps || [])
    .map((step) => step.screenshot || null)
    .filter((item) => item?.key);

  if (!stepScreenshots.length) {
    return [];
  }

  const assets = await getCaptureAssets(stepScreenshots.map((item) => item.key));
  return stepScreenshots
    .map((item) => assets[item.key])
    .filter((asset) => asset?.dataUrl)
    .map((asset) => ({
      filename: asset.filename,
      dataUrl: asset.dataUrl,
      capturedAt: asset.capturedAt
    }));
}

async function resolveSinglePageExportScreenshot(record, findings) {
  const storedScreenshot = await loadStoredReportScreenshot(record).catch(() => null);
  if (storedScreenshot?.dataUrl) {
    return {
      ok: true,
      filename: storedScreenshot.filename || buildReportScreenshotFileName(record),
      dataUrl: storedScreenshot.dataUrl,
      capturedAt: storedScreenshot.capturedAt || "",
      source: "stored"
    };
  }

  return captureReportScreenshot(record, findings).catch((error) => ({
    ok: false,
    error: error.message || "截图失败"
  }));
}

async function loadStoredReportScreenshot(record) {
  const configuredKey = record?.pageData?.reportScreenshot?.key || "";
  const fallbackKey = record?.id ? buildReportScreenshotAssetKey(record.id) : "";
  const keys = [configuredKey, fallbackKey].filter(Boolean);
  if (!keys.length) {
    return null;
  }

  const assets = await getCaptureAssets([...new Set(keys)]);
  for (const key of keys) {
    const asset = assets[key];
    if (asset?.dataUrl) {
      return asset;
    }
  }

  return null;
}

async function captureFullPageScreenshot(tab) {
  const captureState = await sendMessageToTab(tab.id, { action: "GET_SCREENSHOT_CAPTURE_STATE" });
  if (!captureState?.viewportWidth || !captureState?.viewportHeight) {
    throw new Error("页面未返回可用的截图尺寸");
  }

  const viewportWidth = Math.max(1, Number(captureState.viewportWidth || 0));
  const viewportHeight = Math.max(1, Number(captureState.viewportHeight || 0));
  const fullWidth = Math.max(viewportWidth, Number(captureState.fullWidth || viewportWidth));
  const fullHeight = Math.max(viewportHeight, Number(captureState.fullHeight || viewportHeight));
  const originalX = Number(captureState.scrollX || 0);
  const originalY = Number(captureState.scrollY || 0);
  const scrollPositions = buildVerticalScrollPositions(fullHeight, viewportHeight);
  const segments = [];

  try {
    for (const y of scrollPositions) {
      await sendMessageToTab(tab.id, {
        action: "SET_SCREENSHOT_SCROLL",
        position: { x: 0, y }
      });
      await delay(320);
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
      segments.push({ y, dataUrl });
    }
  } finally {
    await sendMessageToTab(tab.id, {
      action: "SET_SCREENSHOT_SCROLL",
      position: { x: originalX, y: originalY }
    }).catch(() => {});
  }

  return stitchScreenshotSegments({
    viewportWidth,
    viewportHeight,
    fullWidth,
    fullHeight,
    segments
  });
}

function buildVerticalScrollPositions(fullHeight, viewportHeight) {
  const positions = [];
  const maxScrollTop = Math.max(0, fullHeight - viewportHeight);

  for (let y = 0; y <= maxScrollTop; y += viewportHeight) {
    positions.push(Math.min(y, maxScrollTop));
  }

  if (positions.length === 0) {
    positions.push(0);
  }

  return [...new Set(positions)];
}

async function stitchScreenshotSegments(payload) {
  const bitmaps = [];
  for (const segment of payload.segments) {
    bitmaps.push({
      y: segment.y,
      bitmap: await dataUrlToImageBitmap(segment.dataUrl)
    });
  }

  const firstBitmap = bitmaps[0]?.bitmap;
  if (!firstBitmap) {
    throw new Error("未采集到截图内容");
  }

  const scale = firstBitmap.width / payload.viewportWidth;
  const canvasWidth = Math.round(payload.fullWidth * scale);
  const canvasHeight = Math.round(payload.fullHeight * scale);
  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("无法初始化截图画布");
  }

  for (const item of bitmaps) {
    const drawY = Math.round(item.y * scale);
    const remainingHeight = Math.max(0, canvasHeight - drawY);
    if (remainingHeight <= 0) {
      continue;
    }

    const cropHeight = Math.min(item.bitmap.height, remainingHeight);
    context.drawImage(
      item.bitmap,
      0,
      0,
      Math.min(item.bitmap.width, canvasWidth),
      cropHeight,
      0,
      drawY,
      Math.min(item.bitmap.width, canvasWidth),
      cropHeight
    );
  }

  const blob = await canvas.convertToBlob({ type: "image/png" });
  return blobToDataUrl(blob);
}

async function dataUrlToImageBitmap(dataUrl) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return createImageBitmap(blob);
}

async function blobToDataUrl(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return `data:${blob.type || "image/png"};base64,${btoa(binary)}`;
}

function buildReportScreenshotFileName(record) {
  const safeTitle = String(record.page?.title || "page")
    .replace(/[\\/:*?"<>|]/g, "_")
    .slice(0, 80);
  return `${safeTitle || "page"}-highlights.png`;
}

function buildReportScreenshotAssetKey(recordId) {
  return `report:${recordId}`;
}

function buildContinuousCaptureStepScreenshotFileName(stepIndex, step) {
  const safeTitle = String(step?.pageData?.title || step?.pageData?.scope?.label || `step-${stepIndex}`)
    .replace(/[\\/:*?"<>|]/g, "_")
    .slice(0, 64);
  return `${String(stepIndex).padStart(2, "0")}-${safeTitle || "step"}.jpg`;
}

async function clearAllPageHighlights() {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map(async (tab) => {
    if (!tab.id) {
      return;
    }
    try {
      await sendMessageToTab(tab.id, { action: "CLEAR_FINDING_HIGHLIGHTS" });
    } catch (_error) {
      // Ignore tabs that cannot receive content-script messages.
    }
  }));
}

async function findMatchingReportTab(pageUrl) {
  const normalizedPageUrl = normalizeComparableUrl(pageUrl);
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab?.id && normalizeComparableUrl(activeTab.url) === normalizedPageUrl) {
    return activeTab;
  }

  const tabs = await chrome.tabs.query({ currentWindow: true });
  return tabs.find((tab) => normalizeComparableUrl(tab.url) === normalizedPageUrl) || null;
}

async function sendMessageToTab(tabId, payload) {
  try {
    return await chrome.tabs.sendMessage(tabId, payload);
  } catch (_error) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [CONTENT_SCRIPT_PATH]
    });
    return chrome.tabs.sendMessage(tabId, payload);
  }
}

function resolveContentScriptPath() {
  const contentScriptPath = chrome.runtime.getManifest?.()?.content_scripts?.[0]?.js?.[0];
  return contentScriptPath || "content.js";
}

async function sendToAppleNotesBridge(markdown, page, settings, screenshot) {
  const screenshotPayload = screenshot?.screenshot || null;
  const screenshotsPayload = Array.isArray(screenshot?.screenshots) ? screenshot.screenshots : [];
  const timeoutMs = Number(settings.bridgeTimeoutMs || 20000);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const bridgeUrl = String(settings.appleNotesBridgeUrl || "").trim();
  let response;
  try {
    response = await fetch(bridgeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        title: `多语质检 ${page.title}`,
        folder: settings.appleNotesFolder || "多语质检",
        archiveDir: settings.appleNotesArchiveDir || "~/Documents/Multilingual-QA-Reports",
        body: markdown,
        screenshot: screenshotPayload ? {
          filename: screenshotPayload.filename,
          dataUrl: screenshotPayload.dataUrl
        } : null,
        screenshots: screenshotsPayload.map((item) => ({
          filename: item.filename,
          dataUrl: item.dataUrl
        }))
      })
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`备忘录桥接超时，已等待 ${Math.floor(timeoutMs / 1000)} 秒。请确认本地 bridge 正在运行。`);
    }

    const message = String(error?.message || "");
    if (message === "Failed to fetch" || error instanceof TypeError) {
      throw new Error(
        `无法连接到本地备忘录桥接服务：${bridgeUrl || "未配置 URL"}。请确认 bridge 已启动，且配置页中的 Apple Notes Bridge URL 可访问。`
      );
    }

    throw new Error(`导出到备忘录失败：${message || "未知错误"}`);
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Apple Notes Bridge 发送失败: ${response.status} ${text}`);
  }

  let payload = {};
  try {
    payload = JSON.parse(text);
  } catch (_error) {
    payload = {};
  }

  return {
    mode: "appleNotes",
    message: payload.message || "已写入 Apple 备忘录",
    noteLocation: payload.noteLocation || "",
    storagePath: payload.archivePath || "",
    screenshotPath: payload.screenshotPath || "",
    screenshotPaths: Array.isArray(payload.screenshotPaths) ? payload.screenshotPaths : [],
    noteExported: payload.noteExported !== false,
    noteError: payload.noteError || "",
    requiresNotesSetup: Boolean(payload.requiresNotesSetup)
  };
}

async function exportReportToLocalMarkdown(markdown, page, settings, options = {}) {
  const relativePath = buildLocalMarkdownDownloadPath(page, settings);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const downloadId = await chrome.downloads.download({
      url,
      filename: relativePath,
      saveAs: false,
      conflictAction: "uniquify"
    });
    if (!downloadId && downloadId !== 0) {
      throw new Error("浏览器未返回下载任务");
    }

    return {
      mode: "localMarkdown",
      message: "已导出到本地 Markdown，但没有导出到备忘录，请检查 Apple Notes 配置",
      noteLocation: "",
      storagePath: `下载目录/${relativePath}`,
      screenshotPath: "",
      screenshotPaths: [],
      noteExported: false,
      noteError: options.noteError || "未连接到 Apple Notes Bridge，请检查配置",
      requiresNotesSetup: true,
      downloadId
    };
  } catch (error) {
    throw new Error(`本地 Markdown 导出失败：${error.message || error}`);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function buildLocalMarkdownDownloadPath(page, settings) {
  const folderName = sanitizeDownloadPathSegment(getLocalArchiveFolderName(settings?.appleNotesArchiveDir));
  const fileBaseName = sanitizeDownloadFileBaseName(`多语质检 ${page?.title || "未命名页面"}`);
  return `${folderName}/${fileBaseName}-${formatExportTimestamp(new Date())}.md`;
}

function getLocalArchiveFolderName(archiveDir) {
  const normalized = String(archiveDir || "").trim().replace(/[\\/]+$/g, "");
  const folderName = normalized.split(/[\\/]/).pop();
  return folderName || "Multilingual-QA-Reports";
}

function sanitizeDownloadPathSegment(input) {
  return String(input || "Multilingual-QA-Reports")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/^\.+$/, "_")
    .slice(0, 80) || "Multilingual-QA-Reports";
}

function sanitizeDownloadFileBaseName(input) {
  return String(input || "多语质检报告")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "多语质检报告";
}

function formatExportTimestamp(date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function buildExportCompletionMessage(delivery) {
  if (delivery?.message) {
    return delivery.message;
  }
  if (delivery?.storagePath) {
    return `导出完成，归档路径：${delivery.storagePath}`;
  }
  return "导出完成";
}

async function resolveActiveModelSettings() {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.modelConfigs,
    STORAGE_KEYS.activeModelConfigId,
    ...Object.keys(DEFAULT_SETTINGS)
  ]);
  const configs = Array.isArray(stored[STORAGE_KEYS.modelConfigs]) ? stored[STORAGE_KEYS.modelConfigs] : [];
  const activeId = stored[STORAGE_KEYS.activeModelConfigId] || "default";
  const activeConfig = configs.find((c) => c.id === activeId) || configs[0];

  const settings = {};
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    settings[key] = stored[key] === undefined ? value : stored[key];
  }

  if (activeConfig) {
    if ("apiBaseUrl" in activeConfig) {
      settings.apiBaseUrl = activeConfig.apiBaseUrl || settings.apiBaseUrl;
    }
    if ("apiPath" in activeConfig) {
      settings.apiPath = activeConfig.apiPath || settings.apiPath;
    }
    if ("apiKey" in activeConfig) {
      settings.apiKey = activeConfig.apiKey ?? "";
    }
    if ("model" in activeConfig) {
      settings.model = activeConfig.model || settings.model;
    }
    if ("authHeader" in activeConfig) {
      settings.authHeader = activeConfig.authHeader ?? "";
    }
    if ("authScheme" in activeConfig) {
      settings.authScheme = activeConfig.authScheme ?? "";
    }
  }

  return settings;
}

async function getModelConfigs() {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.modelConfigs, STORAGE_KEYS.activeModelConfigId]);
  return {
    ok: true,
    configs: Array.isArray(stored[STORAGE_KEYS.modelConfigs]) ? stored[STORAGE_KEYS.modelConfigs] : [],
    activeId: stored[STORAGE_KEYS.activeModelConfigId] || "default"
  };
}

async function saveModelConfig(config) {
  if (!config || !config.name) {
    throw new Error("模型配置名称不能为空");
  }
  const stored = await chrome.storage.local.get([STORAGE_KEYS.modelConfigs, STORAGE_KEYS.activeModelConfigId]);
  const configs = Array.isArray(stored[STORAGE_KEYS.modelConfigs]) ? stored[STORAGE_KEYS.modelConfigs] : [];
  let activeId = stored[STORAGE_KEYS.activeModelConfigId] || "default";

  if (config.id) {
    const index = configs.findIndex((c) => c.id === config.id);
    if (index >= 0) {
      configs[index] = { ...configs[index], ...config };
    } else {
      configs.push(config);
    }
  } else {
    config.id = `mc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    configs.push(config);
  }

  if (configs.length === 1) {
    activeId = configs[0].id;
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.modelConfigs]: configs,
    [STORAGE_KEYS.activeModelConfigId]: activeId
  });

  return { ok: true, configs, activeId, savedId: config.id };
}

async function deleteModelConfig(configId) {
  if (!configId) {
    throw new Error("配置 ID 不能为空");
  }
  const stored = await chrome.storage.local.get([STORAGE_KEYS.modelConfigs, STORAGE_KEYS.activeModelConfigId]);
  let configs = Array.isArray(stored[STORAGE_KEYS.modelConfigs]) ? stored[STORAGE_KEYS.modelConfigs] : [];
  let activeId = stored[STORAGE_KEYS.activeModelConfigId] || "default";

  configs = configs.filter((c) => c.id !== configId);
  if (activeId === configId) {
    activeId = configs.length > 0 ? configs[0].id : "";
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.modelConfigs]: configs,
    [STORAGE_KEYS.activeModelConfigId]: activeId
  });

  return { ok: true, configs, activeId };
}

async function setActiveModelConfig(configId) {
  await chrome.storage.local.set({ [STORAGE_KEYS.activeModelConfigId]: configId });
  return { ok: true, activeId: configId };
}

async function fetchRemoteModels(baseUrl, apiKey, authHeader, authScheme) {
  if (!baseUrl) {
    throw new Error("请先填写 API Base URL");
  }

  const normalizedBase = String(baseUrl).trim().replace(/\/+$/, "");
  const builtinModels = getBuiltinModelsForBaseUrl(normalizedBase);
  if (builtinModels.length) {
    return {
      ok: true,
      models: builtinModels
    };
  }

  const endpoint = `${normalizedBase}/v1/models`;
  const headers = { "Content-Type": "application/json" };
  if (apiKey && authHeader) {
    const authValue = authScheme ? `${authScheme} ${apiKey}`.trim() : apiKey;
    headers[authHeader] = authValue;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let response;
  try {
    response = await fetch(endpoint, {
      method: "GET",
      headers,
      credentials: "include",
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("获取模型列表超时（15秒）");
    }
    throw new Error(`无法连接到 ${endpoint}: ${error.message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(buildApiErrorMessage(response.status, endpoint, body));
  }

  const bodyText = await response.text();
  const body = parseApiSuccessBody(bodyText, endpoint);
  const models = Array.isArray(body.data) ? body.data : Array.isArray(body) ? body : [];
  return {
    ok: true,
    models: models.map((m) => ({
      id: m.id || m.name || "",
      name: m.name || m.id || "",
      owned_by: m.owned_by || ""
    })).filter((m) => m.id)
  };
}

function getBuiltinModelsForBaseUrl(baseUrl) {
  const normalizedBase = String(baseUrl || "").trim().toLowerCase();
  if (!normalizedBase) {
    return [];
  }

  if (/^https:\/\/api\.minimax\.io(?:\/|$)/.test(normalizedBase) || /^https:\/\/api\.minimaxi\.com(?:\/|$)/.test(normalizedBase)) {
    return [
      { id: "MiniMax-M2.5", name: "MiniMax-M2.5", owned_by: "MiniMax" },
      { id: "MiniMax-M2.5-highspeed", name: "MiniMax-M2.5-highspeed", owned_by: "MiniMax" },
      { id: "MiniMax-M2.1", name: "MiniMax-M2.1", owned_by: "MiniMax" },
      { id: "MiniMax-M2.1-highspeed", name: "MiniMax-M2.1-highspeed", owned_by: "MiniMax" },
      { id: "MiniMax-M2", name: "MiniMax-M2", owned_by: "MiniMax" }
    ];
  }

  return [];
}

async function reportProgress(progress) {
  const enriched = {
    updatedAt: new Date().toISOString(),
    ...progress
  };
  await chrome.storage.local.set({ [STORAGE_KEYS.progress]: enriched });
  try {
    await chrome.runtime.sendMessage({
      action: "ANALYSIS_PROGRESS",
      progress: enriched
    });
  } catch (_error) {
    // Side panel may not be open.
  }
}

async function showCompletionNotification(title, message) {
  try {
    await chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("icon.svg"),
      title,
      message
    });
  } catch (_error) {
    // ignore
  }
}

function validateTapdSettings(settings) {
  if (!settings.tapdApiAccount) {
    throw new Error("请先在配置里填写 TAPD API账号");
  }
  if (!settings.tapdApiToken) {
    throw new Error("请先在配置里填写 TAPD Token");
  }
  if (!settings.tapdStoryListUrl) {
    throw new Error("请先在配置里填写 TAPD 需求列表链接");
  }
}

function parseTapdStoryListUrl(input) {
  let url;
  try {
    url = new URL(String(input || "").trim());
  } catch (_error) {
    throw new Error("TAPD 需求列表链接格式不正确");
  }

  const workspaceMatch = url.pathname.match(/\/tapd_fe\/(\d+)\/story\/list/i);
  if (!workspaceMatch?.[1]) {
    throw new Error("无法从 TAPD 列表链接中识别 workspace_id");
  }

  return {
    workspaceId: workspaceMatch[1],
    categoryId: url.searchParams.get("categoryId") || ""
  };
}

function applyTapdAuthorization(headers, apiAccount, apiToken) {
  if (apiAccount) {
    headers.Authorization = `Basic ${btoa(`${apiAccount}:${apiToken}`)}`;
    return;
  }

  headers.Authorization = `Bearer ${apiToken}`;
}

function parseTapdApiBody(bodyText, endpoint) {
  const trimmedBody = String(bodyText || "").trim();
  const compactBody = trimmedBody.replace(/\s+/g, " ").slice(0, 220);
  if (!trimmedBody) {
    throw new Error(`TAPD 接口返回了空内容：${endpoint}`);
  }
  if (/<!doctype html>|<html[\s>]/i.test(trimmedBody)) {
    throw new Error(`TAPD 接口返回了网页而不是 JSON，请检查 Token 或接口权限。返回片段：${compactBody}`);
  }

  try {
    return JSON.parse(trimmedBody);
  } catch (_error) {
    throw new Error(`TAPD 接口返回的不是合法 JSON。返回片段：${compactBody}`);
  }
}

function buildTapdApiErrorMessage(status, endpoint, body) {
  const info = body?.info || body?.msg || body?.message || "未知错误";
  if (status === 401 || status === 403) {
    return `TAPD 创建需求失败：鉴权未通过。请检查 API账号、Token 和接口权限。接口：${endpoint}，返回：${info}`;
  }
  return `TAPD 创建需求失败：${status || body?.status || "未知状态"}，接口：${endpoint}，返回：${info}`;
}

async function resolveTapdStoryHref(workspaceId, storyId, apiAccount, apiToken) {
  if (!workspaceId || !storyId) {
    return "";
  }

  const endpoint = "https://api.tapd.cn/stories/ids_to_query_token";
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    Accept: "application/json"
  };
  applyTapdAuthorization(headers, apiAccount, apiToken);

  const payload = new URLSearchParams();
  payload.set("workspace_id", workspaceId);
  payload.set("ids", String(storyId));

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: payload.toString()
    });
  } catch (_error) {
    return "";
  }

  let body;
  try {
    const bodyText = await response.text();
    body = parseTapdApiBody(bodyText, endpoint);
  } catch (_error) {
    return "";
  }

  if (!response.ok || Number(body.status) !== 1) {
    return "";
  }

  return body.data?.href || "";
}

function buildTapdStoryTitle(record) {
  const baseTitle = String(record?.page?.title || "多语质检问题");
  return `【多语质检】${baseTitle}`.slice(0, 200);
}

function buildTapdStoryDescription(record, findings) {
  return [
    "以下内容由多语质检助手自动生成。",
    "",
    buildMarkdownReport(record.report, record.pageData, findings)
  ].join("\n");
}

function normalizeEndpoint(baseUrl, path) {
  const normalizedBaseUrl = String(baseUrl || "").trim().replace(/\/+$/, "");
  let normalizedPath = normalizeApiPath(path);

  if (/\/v1$/i.test(normalizedBaseUrl) && /^\/v1(\/|$)/i.test(normalizedPath)) {
    normalizedPath = normalizedPath.replace(/^\/v1/i, "");
  }

  return `${normalizedBaseUrl}/${normalizedPath.replace(/^\/+/, "")}`;
}

function isMiniMaxBaseUrl(baseUrl) {
  return /^https:\/\/api\.minimax\.io(?:\/|$)/i.test(String(baseUrl || "").trim())
    || /^https:\/\/api\.minimaxi\.com(?:\/|$)/i.test(String(baseUrl || "").trim());
}

function normalizeComparableUrl(input) {
  try {
    const url = new URL(String(input || ""));
    url.hash = "";
    return url.toString();
  } catch (_error) {
    return String(input || "").split("#")[0];
  }
}

function makeRecordId() {
  return `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeFindingId(index, finding) {
  const seed = `${index}-${finding.title || ""}-${finding.category || ""}`;
  return `finding-${seed.replace(/[^\w\u4e00-\u9fff-]+/g, "-").slice(0, 48)}`;
}

function formatExportDate(input) {
  const date = new Date(input);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}/${month}/${day} ${hours}：${minutes}`;
}

function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.round(Number(durationMs || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) {
    return `${seconds} 秒`;
  }
  if (seconds === 0) {
    return `${minutes} 分钟`;
  }
  return `${minutes} 分 ${seconds} 秒`;
}
