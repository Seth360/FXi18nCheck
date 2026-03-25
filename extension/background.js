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
  highlightFindings: true
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
  activeModelConfigId: "activeModelConfigId"
};

const API_PROTOCOLS = {
  CHAT_COMPLETIONS: "chat-completions",
  RESPONSES: "responses",
  ANTHROPIC_MESSAGES: "anthropic-messages"
};

const CONTENT_SCRIPT_PATH = resolveContentScriptPath();

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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch(async (error) => {
      const failureMessage = error.message || "处理失败";
      if (message?.action === "ANALYZE_CURRENT_PAGE") {
        await reportProgress({
          phase: "error",
          percent: 100,
          message: failureMessage
        });
        await showCompletionNotification("检查失败", failureMessage);
      }
      sendResponse({
        ok: false,
        error: failureMessage
      });
    });
  return true;
});

async function handleMessage(message) {
  switch (message?.action) {
    case "ANALYZE_CURRENT_PAGE":
      return analyzeCurrentPage();
    case "GET_ANALYSIS_PROGRESS":
      return {
        ok: true,
        progress: (await chrome.storage.local.get([STORAGE_KEYS.progress]))[STORAGE_KEYS.progress] || null
      };
    case "GET_REPORT_HISTORY":
      return {
        ok: true,
        history: await getReportHistory()
      };
    case "CLEAR_REPORT_HISTORY":
      await chrome.storage.local.set({ [STORAGE_KEYS.history]: [] });
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
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("未找到当前标签页");
  }

  await reportProgress({
    phase: "collecting",
    percent: 10,
    message: "正在采集当前页面文本和控件信息..."
  });

  const pageData = await collectPageData(tab);
  const settings = await resolveActiveModelSettings();
  validateSettings(settings);

  await reportProgress({
    phase: "analyzing",
    percent: 45,
    message: `正在调用模型 ${settings.model} 分析多语设计质量...`
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

function validateSettings(settings) {
  if (!settings.apiBaseUrl || !settings.model) {
    throw new Error("请先在配置里填写 API Base URL 和 Model");
  }

  if (String(settings.authHeader || "").trim() && !settings.apiKey) {
    throw new Error("请先在配置里填写 API Key；如果你的网关使用浏览器登录态，请清空认证 Header");
  }
}

async function requestModelReport(pageData, settings) {
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
    const elapsedSeconds = Math.floor((Date.now() - startAt) / 1000);
    await reportProgress({
      phase: "analyzing",
      percent: 45,
      message: `正在调用模型 ${settings.model} 分析多语设计质量... 已等待 ${elapsedSeconds} 秒`
    });
  }, 5000);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  const payload = buildModelRequestBody(pageData, settings, apiProtocol);
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
  const system = [
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
  ].join("\n");

  const userPayload = {
    task: "请输出当前页面的多语设计质量报告",
    extraRules: settings.extraRules || "",
    outputSchema: {
      pageSummary: "string",
      score: "0-100 的整数，分数越高问题越少",
      riskLevel: "low | medium | high",
      positives: ["做得好的点，最多 3 条"],
      findings: [
        {
          severity: "high | medium | low",
          category: "术语一致性 | 国际化风险 | 文案清晰度 | 长度/布局风险 | 缺失状态 | 其他",
          title: "问题标题",
          description: "问题说明",
          evidence: ["可见文案或元素线索"],
          suggestion: "改进建议",
          locator: "用于回查的元素定位线索"
        }
      ],
      nextActions: ["建议的下一步"]
    },
    pageData
  };

  return {
    system,
    user: JSON.stringify(userPayload)
  };
}

function buildChatCompletionsMessages(pageData, settings) {
  const prompt = buildPromptSpec(pageData, settings);
  return [
    { role: "system", content: prompt.system },
    { role: "user", content: prompt.user }
  ];
}

function buildResponsesInput(pageData, settings) {
  const prompt = buildPromptSpec(pageData, settings);
  return {
    instructions: prompt.system,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: prompt.user
          }
        ]
      }
    ]
  };
}

function buildAnthropicRequest(pageData, settings) {
  const prompt = buildPromptSpec(pageData, settings);
  return {
    system: prompt.system,
    messages: [
      {
        role: "user",
        content: prompt.user
      }
    ]
  };
}

function buildModelRequestBody(pageData, settings, apiProtocol) {
  switch (apiProtocol) {
    case API_PROTOCOLS.RESPONSES: {
      const request = buildResponsesInput(pageData, settings);
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
      const request = buildAnthropicRequest(pageData, settings);
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
          messages: buildChatCompletionsMessages(pageData, settings)
        };
      }

      return {
        model: settings.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: buildChatCompletionsMessages(pageData, settings)
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
  const lines = [];
  lines.push("# 多语设计质量报告");
  lines.push("");
  lines.push(`- 页面标题：${pageData.title}`);
  lines.push(`- 页面地址：${pageData.url}`);
  if (pageData.scope?.label) {
    lines.push(`- 检查范围：${pageData.scope.label}`);
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
    percent: 90,
    message: "正在导出当前详情到备忘录..."
  });

  const markdown = buildMarkdownReport(record.report, record.pageData, findings);
  const delivery = await sendToAppleNotesBridge(markdown, record.page, settings);

  const updated = history.map((item) => {
    if (item.id !== reportId) {
      return item;
    }
    return {
      ...item,
      lastExport: {
        exportedAt: new Date().toISOString(),
        ...delivery
      }
    };
  });
  await chrome.storage.local.set({ [STORAGE_KEYS.history]: updated });

  await reportProgress({
    phase: "completed",
    percent: 100,
    message: delivery.storagePath
      ? `导出完成，归档路径：${delivery.storagePath}`
      : "导出完成"
  });
  await showCompletionNotification("已导出到备忘录", delivery.storagePath || delivery.noteLocation || "导出完成");

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

async function sendToAppleNotesBridge(markdown, page, settings) {
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
        body: markdown
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
    storagePath: payload.archivePath || ""
  };
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
