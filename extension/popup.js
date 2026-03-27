const promptTemplateHelpers = window.FXPromptTemplates;
const promptSettingFields = promptTemplateHelpers?.PROMPT_SETTING_FIELDS || [];
const promptDefaultValues = promptTemplateHelpers?.getDefaultPromptSettings?.() || {};

const analyzeBtn = document.getElementById("analyzeBtn");
const continuousCaptureBtn = document.getElementById("continuousCaptureBtn");
const toggleSettingsBtn = document.getElementById("toggleSettingsBtn");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const scoreEl = document.getElementById("score");
const riskLevelEl = document.getElementById("riskLevel");
const findingCountEl = document.getElementById("findingCount");
const findingsEl = document.getElementById("findings");
const settingsPanel = document.getElementById("settingsPanel");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const saveStatusEl = document.getElementById("saveStatus");
const promptTemplateSelectEl = document.getElementById("promptTemplateSelect");
const saveCurrentPromptTemplateBtn = document.getElementById("saveCurrentPromptTemplateBtn");
const savePromptTemplateBtn = document.getElementById("savePromptTemplateBtn");
const deletePromptTemplateBtn = document.getElementById("deletePromptTemplateBtn");
const resetPromptTemplateBtn = document.getElementById("resetPromptTemplateBtn");
const progressPanel = document.getElementById("progressPanel");
const progressFillEl = document.getElementById("progressFill");
const progressTextEl = document.getElementById("progressText");
const progressMetaEl = document.getElementById("progressMeta");
const deliveryPanel = document.getElementById("deliveryPanel");
const noteLocationEl = document.getElementById("noteLocation");
const storagePathEl = document.getElementById("storagePath");

const modelConfigListEl = document.getElementById("modelConfigList");
const addModelConfigBtn = document.getElementById("addModelConfigBtn");
const modelConfigEditor = document.getElementById("modelConfigEditor");
const modelEditorTitle = document.getElementById("modelEditorTitle");
const editConfigIdEl = document.getElementById("editConfigId");
const editConfigNameEl = document.getElementById("editConfigName");
const editPresetSelectEl = document.getElementById("editPresetSelect");
const editConfigModelEl = document.getElementById("editConfigModel");
const editConfigBaseUrlEl = document.getElementById("editConfigBaseUrl");
const editConfigApiPathEl = document.getElementById("editConfigApiPath");
const editConfigApiKeyEl = document.getElementById("editConfigApiKey");
const editConfigAuthHeaderEl = document.getElementById("editConfigAuthHeader");
const editConfigAuthSchemeEl = document.getElementById("editConfigAuthScheme");
const saveModelConfigBtn = document.getElementById("saveModelConfigBtn");
const cancelModelConfigBtn = document.getElementById("cancelModelConfigBtn");
const fetchModelsBtn = document.getElementById("fetchModelsBtn");
const fetchedModelListEl = document.getElementById("fetchedModelList");

const defaultFormValues = {
  sinkType: "appleNotes",
  webhookUrl: "",
  webhookToken: "",
  webdavBaseUrl: "",
  webdavFolder: "multilingual-check-reports",
  webdavUsername: "",
  webdavPassword: "",
  appleNotesBridgeUrl: "http://127.0.0.1:3894/note",
  appleNotesFolder: "多语质检",
  appleNotesArchiveDir: "~/Documents/Multilingual-QA-Reports",
  modelTimeoutMs: "60000",
  bridgeTimeoutMs: "20000",
  extraRules: "",
  highlightFindings: true,
  ...promptDefaultValues
};

const settingFields = [
  "sinkType",
  "webhookUrl",
  "webhookToken",
  "webdavBaseUrl",
  "webdavFolder",
  "webdavUsername",
  "webdavPassword",
  "appleNotesBridgeUrl",
  "appleNotesFolder",
  "appleNotesArchiveDir",
  "modelTimeoutMs",
  "bridgeTimeoutMs",
  "extraRules",
  "highlightFindings",
  ...promptSettingFields
];

let modelConfigs = [];
let activeModelConfigId = "";
let captureSession = null;
let progressTimer = null;
let promptTemplates = [];
let selectedPromptTemplateId = promptTemplateHelpers?.BUILTIN_TEMPLATE_ID || "builtin-default";

chrome.runtime.onMessage.addListener((message) => {
  if (message?.action === "ANALYSIS_PROGRESS") {
    renderProgress(message.progress);
    if (message.progress?.message) {
      setStatus(message.progress.message);
    }
    return;
  }

  if (message?.action === "CONTINUOUS_CAPTURE_SESSION_UPDATED") {
    captureSession = message.session || null;
    renderContinuousCaptureButton();
  }
});

analyzeBtn.addEventListener("click", async () => {
  resultEl.classList.add("hidden");
  deliveryPanel.classList.add("hidden");
  renderProgress({
    percent: 5,
    message: "已开始检查..."
  });
  setStatus("正在执行检查，请保持当前页面打开");
  analyzeBtn.disabled = true;
  try {
    const response = await chrome.runtime.sendMessage({ action: "ANALYZE_CURRENT_PAGE" });
    if (!response?.ok) {
      throw new Error(response?.error || "执行失败");
    }

    renderResult(response.record?.report || response.report, response.record?.lastExport || response.delivery);
    renderProgress({
      percent: 100,
      message: response.record?.lastExport?.storagePath
        ? `已完成，归档路径：${response.record.lastExport.storagePath}`
        : "已完成"
    });
    setStatus("检查完成");
  } catch (error) {
    renderProgress({
      percent: 100,
      message: error.message || "分析失败"
    });
    setStatus(error.message || "分析失败");
  } finally {
    analyzeBtn.disabled = false;
    renderContinuousCaptureButton();
  }
});

continuousCaptureBtn.addEventListener("click", async (event) => {
  if (event.target?.closest?.("[data-capture-action='cancel']") && captureSession) {
    try {
      const response = await chrome.runtime.sendMessage({ action: "CANCEL_CONTINUOUS_CAPTURE" });
      if (!response?.ok) {
        throw new Error(response?.error || "取消连续捕捉失败");
      }
      setStatus("已取消连续捕捉");
    } catch (error) {
      setStatus(error.message || "取消连续捕捉失败");
    }
    return;
  }

  const action = captureSession ? "STOP_CONTINUOUS_CAPTURE" : "START_CONTINUOUS_CAPTURE";
  try {
    const response = await chrome.runtime.sendMessage({ action });
    if (!response?.ok) {
      throw new Error(response?.error || "连续捕捉操作失败");
    }
    if (action === "START_CONTINUOUS_CAPTURE") {
      setStatus("连续捕捉已开始，请回到页面继续点击");
    }
  } catch (error) {
    setStatus(error.message || "连续捕捉操作失败");
  }
});

toggleSettingsBtn.addEventListener("click", async () => {
  settingsPanel.classList.toggle("hidden");
  if (!settingsPanel.classList.contains("hidden")) {
    await loadSettings();
  }
});

saveSettingsBtn.addEventListener("click", saveSettings);
promptTemplateSelectEl?.addEventListener("change", handlePromptTemplateSelectionChange);
saveCurrentPromptTemplateBtn.addEventListener("click", handleSaveCurrentPromptTemplate);
savePromptTemplateBtn.addEventListener("click", handleSavePromptTemplate);
deletePromptTemplateBtn.addEventListener("click", handleDeletePromptTemplate);
resetPromptTemplateBtn.addEventListener("click", handleResetPromptTemplate);
addModelConfigBtn.addEventListener("click", () => openModelEditor(null));
saveModelConfigBtn.addEventListener("click", handleSaveModelConfig);
cancelModelConfigBtn.addEventListener("click", closeModelEditor);
editPresetSelectEl.addEventListener("change", handlePresetSelect);
fetchModelsBtn.addEventListener("click", handleFetchModels);
document.addEventListener("click", handleDocumentClick);
for (const field of promptSettingFields) {
  document.getElementById(field)?.addEventListener("input", handlePromptFieldInput);
}
initPromptTabs();

loadLastReport();
loadCurrentProgress();
loadContinuousCaptureSession();

async function loadLastReport() {
  const response = await chrome.runtime.sendMessage({ action: "GET_LAST_REPORT" });
  if (response?.ok && response.report?.report) {
    renderResult(response.report.report, response.report.lastExport);
    setStatus("已加载上一次结果");
  }
}

async function loadCurrentProgress() {
  const response = await chrome.runtime.sendMessage({ action: "GET_ANALYSIS_PROGRESS" });
  if (response?.ok && response.progress) {
    renderProgress(response.progress);
  }
}

async function loadContinuousCaptureSession() {
  const response = await chrome.runtime.sendMessage({ action: "GET_CONTINUOUS_CAPTURE_SESSION" });
  if (response?.ok) {
    captureSession = response.session || null;
    renderContinuousCaptureButton();
  }
}

async function loadSettings() {
  const values = await chrome.storage.local.get([
    ...settingFields,
    promptTemplateHelpers?.PROMPT_TEMPLATE_STORAGE_KEY || "promptTemplates",
    promptTemplateHelpers?.SELECTED_PROMPT_TEMPLATE_STORAGE_KEY || "selectedPromptTemplateId"
  ]);
  const resolvedValues = {};
  for (const key of settingFields) {
    resolvedValues[key] = values[key] === undefined ? defaultFormValues[key] : values[key];
  }
  const normalizedPromptValues = promptTemplateHelpers?.clonePromptSettings?.(resolvedValues) || {};

  for (const key of settingFields) {
    const node = document.getElementById(key);
    if (node) {
      applySettingNodeValue(node, key in normalizedPromptValues ? normalizedPromptValues[key] : resolvedValues[key]);
    }
  }

  promptTemplates = promptTemplateHelpers?.normalizeStoredPromptTemplates?.(
    values[promptTemplateHelpers?.PROMPT_TEMPLATE_STORAGE_KEY || "promptTemplates"] || []
  ) || [];
  const visibleTemplates = getVisiblePromptTemplates();
  const preferredTemplateId = values[promptTemplateHelpers?.SELECTED_PROMPT_TEMPLATE_STORAGE_KEY || "selectedPromptTemplateId"]
    || promptTemplateHelpers?.findMatchingTemplateId?.(normalizedPromptValues, promptTemplates)
    || promptTemplateHelpers?.BUILTIN_TEMPLATE_ID
    || "builtin-default";
  selectedPromptTemplateId = visibleTemplates.some((item) => item.id === preferredTemplateId)
    ? preferredTemplateId
    : (promptTemplateHelpers?.BUILTIN_TEMPLATE_ID || "builtin-default");
  renderPromptTemplateOptions();
  await loadModelConfigs();
  initPresetSelect();
  saveStatusEl.textContent = "已加载配置";
}

async function saveSettings() {
  const payload = {};
  const normalizedPromptValues = getPromptFieldValues();
  for (const key of settingFields) {
    const node = document.getElementById(key);
    payload[key] = key in normalizedPromptValues
      ? normalizedPromptValues[key]
      : node
        ? getSettingNodeValue(node)
        : "";
  }

  await chrome.storage.local.set(payload);
  applyPromptFieldValues(normalizedPromptValues);
  renderPromptTemplateOptions();
  saveStatusEl.textContent = "保存成功";
  setStatus("配置已保存，可以直接执行检查");
}

function getPromptFieldValues() {
  const values = {};
  for (const key of promptSettingFields) {
    const node = document.getElementById(key);
    values[key] = node ? String(getSettingNodeValue(node) || "") : "";
  }
  return promptTemplateHelpers?.clonePromptSettings?.(values) || values;
}

function applyPromptFieldValues(values) {
  const normalized = promptTemplateHelpers?.clonePromptSettings?.(values) || values;
  for (const key of promptSettingFields) {
    const node = document.getElementById(key);
    if (node) {
      applySettingNodeValue(node, normalized[key] || "");
    }
  }
}

function renderPromptTemplateOptions() {
  if (!promptTemplateSelectEl) {
    return;
  }
  const templates = getVisiblePromptTemplates();
  promptTemplateSelectEl.innerHTML = "";

  for (const template of templates) {
    const option = document.createElement("option");
    option.value = template.id;
    option.textContent = template.name;
    promptTemplateSelectEl.appendChild(option);
  }

  promptTemplateSelectEl.value = Array.from(promptTemplateSelectEl.options).some((item) => item.value === selectedPromptTemplateId)
    ? selectedPromptTemplateId
    : (promptTemplateHelpers?.BUILTIN_TEMPLATE_ID || "builtin-default");
  updatePromptTemplateActionState();
}

async function handlePromptTemplateSelectionChange() {
  const templateId = promptTemplateSelectEl?.value;
  const template = findSelectedPromptTemplate(templateId);
  if (!template) {
    setStatus("未找到对应模板");
    return;
  }
  selectedPromptTemplateId = template.id;
  applyPromptFieldValues(template.values);
  renderPromptTemplateOptions();
  await persistSelectedPromptTemplateId();
  saveStatusEl.textContent = `已切换模板：${template.name}`;
  setStatus(`已切换模板：${template.name}`);
}

async function handleSaveCurrentPromptTemplate() {
  const template = findSelectedPromptTemplate();
  if (!template) {
    setStatus("请先选择一个模板");
    return;
  }
  const nextValues = getPromptFieldValues();
  promptTemplates = promptTemplates.map((item) => (
    item.id === template.id
      ? {
          ...item,
          values: nextValues
        }
      : item
  ));
  await persistPromptTemplates();
  renderPromptTemplateOptions();
  saveStatusEl.textContent = `已保存到模板：${template.name}`;
  setStatus(`已保存到模板：${template.name}`);
}

async function handleSavePromptTemplate() {
  const name = window.prompt("请输入模板名称", "我的提示词模板");
  if (!name) {
    return;
  }
  const nextTemplate = {
    id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || "未命名模板",
    builtIn: false,
    deleted: false,
    initialValues: getPromptFieldValues(),
    values: getPromptFieldValues()
  };
  promptTemplates = [
    ...promptTemplates.filter((item) => !item.deleted),
    promptTemplateHelpers?.createStoredPromptTemplate?.(nextTemplate) || nextTemplate
  ];
  selectedPromptTemplateId = nextTemplate.id;
  await persistPromptTemplates();
  renderPromptTemplateOptions();
  if (promptTemplateSelectEl) {
    promptTemplateSelectEl.value = nextTemplate.id;
  }
  saveStatusEl.textContent = `模板已保存：${nextTemplate.name}`;
  setStatus(`模板已保存：${nextTemplate.name}`);
}

async function handleDeletePromptTemplate() {
  const template = findSelectedPromptTemplate();
  if (!template) {
    setStatus("请先选择一个模板");
    return;
  }
  if (template.id === (promptTemplateHelpers?.BUILTIN_TEMPLATE_ID || "builtin-default")) {
    setStatus("通用模板不能删除");
    return;
  }

  if (template.builtIn) {
    promptTemplates = promptTemplates.map((item) => (
      item.id === template.id
        ? { ...item, deleted: true }
        : item
    ));
  } else {
    promptTemplates = promptTemplates.filter((item) => item.id !== template.id);
  }

  const fallbackTemplate = findVisibleTemplateById(promptTemplateHelpers?.BUILTIN_TEMPLATE_ID || "builtin-default");
  selectedPromptTemplateId = fallbackTemplate?.id || (promptTemplateHelpers?.BUILTIN_TEMPLATE_ID || "builtin-default");
  if (fallbackTemplate) {
    applyPromptFieldValues(fallbackTemplate.values);
  }
  await persistPromptTemplates();
  renderPromptTemplateOptions();
  saveStatusEl.textContent = `已删除模板：${template.name}`;
  setStatus(`已删除模板：${template.name}`);
}

async function handleResetPromptTemplate() {
  const template = findSelectedPromptTemplate();
  if (!template) {
    setStatus("请先选择一个模板");
    return;
  }
  const initialValues = promptTemplateHelpers?.clonePromptSettings?.(template.initialValues) || template.initialValues || promptDefaultValues;
  promptTemplates = promptTemplates.map((item) => (
    item.id === template.id
      ? {
          ...item,
          values: initialValues
        }
      : item
  ));
  applyPromptFieldValues(initialValues);
  await persistPromptTemplates();
  renderPromptTemplateOptions();
  if (promptTemplateSelectEl) {
    promptTemplateSelectEl.value = template.id;
  }
  saveStatusEl.textContent = `已恢复模板初始内容：${template.name}`;
  setStatus(`已恢复模板初始内容：${template.name}`);
}

async function loadModelConfigs() {
  const response = await chrome.runtime.sendMessage({ action: "GET_MODEL_CONFIGS" });
  if (response?.ok) {
    modelConfigs = response.configs || [];
    activeModelConfigId = response.activeId || "";
    renderModelConfigList();
  }
}

function initPresetSelect() {
  const presets = window.FXModelConfig?.MODEL_PRESETS || [];
  editPresetSelectEl.innerHTML = '<option value="">-- 请选择 --</option>';
  for (const preset of presets) {
    const opt = document.createElement("option");
    opt.value = preset.key || preset.value;
    opt.textContent = preset.label;
    editPresetSelectEl.appendChild(opt);
  }
}

function handlePresetSelect() {
  const presetValue = editPresetSelectEl.value;
  if (!presetValue) return;
  const preset = window.FXModelConfig?.findModelPreset(presetValue);
  if (!preset) return;
  editConfigModelEl.value = preset.value;
  editConfigBaseUrlEl.value = preset.apiBaseUrl;
  const pathOptions = Array.from(editConfigApiPathEl.options).map((o) => o.value);
  if (pathOptions.includes(preset.apiPath)) {
    editConfigApiPathEl.value = preset.apiPath;
  } else {
    const customOpt = document.createElement("option");
    customOpt.value = preset.apiPath;
    customOpt.textContent = `自定义：${preset.apiPath}`;
    editConfigApiPathEl.appendChild(customOpt);
    editConfigApiPathEl.value = preset.apiPath;
  }
  if (!editConfigNameEl.value) {
    editConfigNameEl.value = preset.label;
  }
  editConfigAuthHeaderEl.value = preset.authHeader ?? "Authorization";
  editConfigAuthSchemeEl.value = preset.authScheme ?? "Bearer";
}

function validateModelConfigForm(requireModel = true) {
  const model = editConfigModelEl.value.trim();
  const baseUrl = editConfigBaseUrlEl.value.trim();
  const apiKey = editConfigApiKeyEl.value.trim();

  if (!baseUrl) return "请先填写 API Base URL";
  try {
    const parsed = new URL(baseUrl);
    if (!/^https?:$/.test(parsed.protocol)) {
      return "API Base URL 需以 http:// 或 https:// 开头";
    }
  } catch (_error) {
    return "请填写正确的 API Base URL";
  }
  if (!apiKey) return "请先填写 API Key";
  if (requireModel && !model) return "请先填写模型名称";
  return "";
}

function renderModelConfigList() {
  modelConfigListEl.innerHTML = "";
  if (modelConfigs.length === 0) {
    modelConfigListEl.innerHTML = '<div style="padding:12px;color:#6b7280;font-size:13px;">暂无模型配置</div>';
    return;
  }
  for (const config of modelConfigs) {
    const isActive = config.id === activeModelConfigId;
    const card = document.createElement("div");
    card.style.cssText = `padding:8px 10px;border:1px solid ${isActive ? "#ff8000" : "#d1d5db"};border-radius:8px;margin-bottom:6px;background:${isActive ? "#fff8f0" : "#fff"}`;
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong style="font-size:12px">${escapeHtml(config.name || "未命名")}</strong>
          <span style="font-size:11px;color:#6b7280;margin-left:6px">${escapeHtml(config.model || "")} · ${escapeHtml(formatApiPath(config.apiPath))}</span>
        </div>
        ${isActive ? '<span style="font-size:10px;background:#ff8000;color:#fff;padding:1px 6px;border-radius:8px">使用中</span>' : ""}
      </div>
      <div style="display:flex;gap:10px;margin-top:4px;font-size:12px">
        ${isActive ? "" : `<a href="#" data-activate-config="${escapeHtml(config.id)}" style="color:#0c6cff;text-decoration:none">启用</a>`}
        <a href="#" data-edit-config="${escapeHtml(config.id)}" style="color:#0c6cff;text-decoration:none">编辑</a>
        <a href="#" data-delete-config="${escapeHtml(config.id)}" style="color:#ff522a;text-decoration:none">删除</a>
      </div>
    `;
    modelConfigListEl.appendChild(card);
  }
}

function formatApiPath(path) {
  if (path === "/v1/chat/completions") return "Chat";
  if (path === "/v1/responses") return "Responses";
  if (path === "/v1/messages") return "Anthropic";
  return path || "";
}

function openModelEditor(configId) {
  modelConfigEditor.classList.remove("hidden");
  editPresetSelectEl.value = "";
  while (editConfigApiPathEl.options.length > 3) {
    editConfigApiPathEl.remove(3);
  }

  if (configId) {
    const config = modelConfigs.find((c) => c.id === configId);
    if (!config) return;
    modelEditorTitle.textContent = "编辑模型配置";
    editConfigIdEl.value = config.id;
    editConfigNameEl.value = config.name || "";
    editConfigModelEl.value = config.model || "";
    editConfigBaseUrlEl.value = config.apiBaseUrl || "";
    const pathOptions = Array.from(editConfigApiPathEl.options).map((o) => o.value);
    if (config.apiPath && !pathOptions.includes(config.apiPath)) {
      const customOpt = document.createElement("option");
      customOpt.value = config.apiPath;
      customOpt.textContent = `自定义：${config.apiPath}`;
      editConfigApiPathEl.appendChild(customOpt);
    }
    editConfigApiPathEl.value = config.apiPath || "/v1/chat/completions";
    editConfigApiKeyEl.value = config.apiKey || "";
    editConfigAuthHeaderEl.value = config.authHeader ?? "Authorization";
    editConfigAuthSchemeEl.value = config.authScheme ?? "Bearer";
    editPresetSelectEl.value = window.FXModelConfig?.inferPresetKey(config) || "";
  } else {
    modelEditorTitle.textContent = "添加模型配置";
    editConfigIdEl.value = "";
    editConfigNameEl.value = "";
    editConfigModelEl.value = "";
    editConfigBaseUrlEl.value = "";
    editConfigApiPathEl.value = "/v1/chat/completions";
    editConfigApiKeyEl.value = "";
    editConfigAuthHeaderEl.value = "Authorization";
    editConfigAuthSchemeEl.value = "Bearer";
  }
}

function closeModelEditor() {
  modelConfigEditor.classList.add("hidden");
  fetchedModelListEl.classList.add("hidden");
  fetchedModelListEl.innerHTML = "";
}

async function handleFetchModels() {
  const validationMessage = validateModelConfigForm(false);
  if (validationMessage) {
    saveStatusEl.textContent = validationMessage;
    return;
  }
  fetchModelsBtn.disabled = true;
  fetchModelsBtn.textContent = "获取中";
  fetchedModelListEl.classList.add("hidden");
  fetchedModelListEl.innerHTML = "";
  try {
    const response = await chrome.runtime.sendMessage({
      action: "FETCH_REMOTE_MODELS",
      baseUrl: editConfigBaseUrlEl.value.trim(),
      apiKey: editConfigApiKeyEl.value.trim(),
      authHeader: editConfigAuthHeaderEl.value.trim(),
      authScheme: editConfigAuthSchemeEl.value.trim()
    });
    if (!response?.ok) {
      throw new Error(response?.error || "获取失败");
    }
    const models = response.models || [];
    if (models.length === 0) {
      saveStatusEl.textContent = "未获取到可用模型";
      return;
    }
    fetchedModelListEl.classList.remove("hidden");
    for (const model of models) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "fetched-model-item";
      item.textContent = model.id;
      item.addEventListener("click", () => {
        editConfigModelEl.value = model.id;
        fetchedModelListEl.classList.add("hidden");
        if (!editConfigNameEl.value) {
          editConfigNameEl.value = model.id;
        }
      });
      fetchedModelListEl.appendChild(item);
    }
  } catch (error) {
    saveStatusEl.textContent = "获取模型列表失败，请检查 API Base URL、API 格式和 API Key";
  } finally {
    fetchModelsBtn.disabled = false;
    fetchModelsBtn.textContent = "获取";
  }
}

async function handleSaveModelConfig() {
  const name = editConfigNameEl.value.trim();
  if (!name) {
    saveStatusEl.textContent = "请填写配置名称";
    return;
  }
  const validationMessage = validateModelConfigForm(true);
  if (validationMessage) {
    saveStatusEl.textContent = validationMessage;
    return;
  }
  const config = {
    name,
    presetKey: editPresetSelectEl.value.trim(),
    model: editConfigModelEl.value.trim(),
    apiBaseUrl: editConfigBaseUrlEl.value.trim(),
    apiPath: editConfigApiPathEl.value,
    apiKey: editConfigApiKeyEl.value.trim(),
    authHeader: editConfigAuthHeaderEl.value.trim(),
    authScheme: editConfigAuthSchemeEl.value.trim()
  };
  const existingId = editConfigIdEl.value;
  if (existingId) {
    config.id = existingId;
  }

  const response = await chrome.runtime.sendMessage({ action: "SAVE_MODEL_CONFIG", config });
  if (response?.ok) {
    modelConfigs = response.configs;
    activeModelConfigId = response.activeId;
    renderModelConfigList();
    closeModelEditor();
    saveStatusEl.textContent = "模型配置已保存";
  } else {
    saveStatusEl.textContent = response?.error || "保存失败";
  }
}

async function handleDocumentClick(event) {
  const activateLink = event.target.closest("[data-activate-config]");
  if (activateLink) {
    event.preventDefault();
    const response = await chrome.runtime.sendMessage({ action: "SET_ACTIVE_MODEL_CONFIG", configId: activateLink.dataset.activateConfig });
    if (response?.ok) {
      activeModelConfigId = response.activeId;
      renderModelConfigList();
    }
    return;
  }

  const editLink = event.target.closest("[data-edit-config]");
  if (editLink) {
    event.preventDefault();
    openModelEditor(editLink.dataset.editConfig);
    return;
  }

  const deleteLink = event.target.closest("[data-delete-config]");
  if (deleteLink) {
    event.preventDefault();
    const response = await chrome.runtime.sendMessage({ action: "DELETE_MODEL_CONFIG", configId: deleteLink.dataset.deleteConfig });
    if (response?.ok) {
      modelConfigs = response.configs;
      activeModelConfigId = response.activeId;
      renderModelConfigList();
    }
    return;
  }
}

function renderResult(report, delivery) {
  if (!report) {
    return;
  }
  resultEl.classList.remove("hidden");
  scoreEl.textContent = report.score ?? "-";
  riskLevelEl.textContent = report.riskLevel ?? "-";
  findingCountEl.textContent = String(report.findings?.length || 0);
  findingsEl.innerHTML = "";

  const items = (report.findings || []).slice(0, 5);
  if (!items.length) {
    const empty = document.createElement("li");
    empty.textContent = "未发现明显问题";
    findingsEl.appendChild(empty);
  } else {
    for (const finding of items) {
      const li = document.createElement("li");
      li.textContent = `[${finding.severity}] ${finding.title}：${finding.suggestion || finding.description || ""}`;
      findingsEl.appendChild(li);
    }
  }

  if (delivery?.noteLocation || delivery?.storagePath) {
    deliveryPanel.classList.remove("hidden");
    noteLocationEl.textContent = delivery.noteLocation || "未写入备忘录";
    storagePathEl.textContent = delivery.storagePath || "未生成本地归档";
  }
}

function renderProgress(progress) {
  progressPanel.classList.remove("hidden");
  const percent = Number(progress?.percent || 0);
  progressFillEl.style.width = `${Math.max(0, Math.min(percent, 100))}%`;
  progressTextEl.textContent = progress?.message || "等待执行";
  updateProgressMeta(progress);
  resetProgressTimer(progress);
}

function updateProgressMeta(progress) {
  if (progress?.phase === "capturing" && Number.isFinite(Number(progress?.maxClicks))) {
    const clickCount = Math.max(0, Number(progress?.clickCount || 0));
    const maxClicks = Math.max(0, Number(progress?.maxClicks || 0));
    const remainingSeconds = getRemainingProgressSeconds(progress);
    progressMetaEl.textContent = `${clickCount}/${maxClicks}｜${remainingSeconds}s`;
    return;
  }

  progressMetaEl.textContent = progress?.updatedAt
    ? `最后更新：${new Date(progress.updatedAt).toLocaleTimeString("zh-CN", { hour12: false })}`
    : "";
}

function resetProgressTimer(progress) {
  clearInterval(progressTimer);
  progressTimer = null;

  if (progress?.phase !== "capturing" || !progress?.expiresAt) {
    return;
  }

  progressTimer = setInterval(() => {
    updateProgressMeta(progress);
    if (getRemainingProgressSeconds(progress) <= 0) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  }, 1000);
}

function getRemainingProgressSeconds(progress) {
  if (!progress?.expiresAt) {
    return Math.max(0, Number(progress?.countdownSeconds || 0));
  }
  return Math.max(0, Math.ceil((new Date(progress.expiresAt).getTime() - Date.now()) / 1000));
}

function renderContinuousCaptureButton() {
  const isCapturing = Boolean(captureSession);
  continuousCaptureBtn.classList.toggle("is-capturing", isCapturing);
  continuousCaptureBtn.querySelector(".capture-cancel-segment")?.classList.toggle("hidden", !isCapturing);
  const label = continuousCaptureBtn.querySelector(".capture-label");
  if (label) {
    label.textContent = isCapturing ? "捕捉中" : "连续捕捉";
  }
  analyzeBtn.disabled = isCapturing;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function getSettingNodeValue(node) {
  if (node.type === "checkbox") {
    return node.checked;
  }
  return node.value.trim();
}

function applySettingNodeValue(node, value) {
  if (node.type === "checkbox") {
    node.checked = Boolean(value);
    return;
  }
  node.value = value ?? "";
}

function handlePromptFieldInput() {
  updatePromptTemplateActionState();
}

function getVisiblePromptTemplates() {
  return (promptTemplateHelpers?.mergeWithBuiltinTemplates?.(promptTemplates) || []).filter((item) => !item.deleted);
}

function findVisibleTemplateById(templateId) {
  return getVisiblePromptTemplates().find((item) => item.id === templateId) || null;
}

function findSelectedPromptTemplate(templateId = selectedPromptTemplateId) {
  return promptTemplateHelpers?.findPromptTemplate?.(promptTemplates, templateId) || null;
}

function updatePromptTemplateActionState() {
  const selectedTemplate = findSelectedPromptTemplate();
  if (deletePromptTemplateBtn) {
    deletePromptTemplateBtn.disabled = !selectedTemplate || selectedTemplate.id === (promptTemplateHelpers?.BUILTIN_TEMPLATE_ID || "builtin-default");
  }
  if (saveCurrentPromptTemplateBtn) {
    saveCurrentPromptTemplateBtn.disabled = !selectedTemplate;
  }
  if (resetPromptTemplateBtn) {
    resetPromptTemplateBtn.disabled = !selectedTemplate;
  }
}

async function persistSelectedPromptTemplateId() {
  await chrome.storage.local.set({
    [promptTemplateHelpers?.SELECTED_PROMPT_TEMPLATE_STORAGE_KEY || "selectedPromptTemplateId"]: selectedPromptTemplateId
  });
}

async function persistPromptTemplates() {
  promptTemplates = promptTemplateHelpers?.normalizeStoredPromptTemplates?.(promptTemplates) || promptTemplates;
  await chrome.storage.local.set({
    [promptTemplateHelpers?.PROMPT_TEMPLATE_STORAGE_KEY || "promptTemplates"]: promptTemplates,
    [promptTemplateHelpers?.SELECTED_PROMPT_TEMPLATE_STORAGE_KEY || "selectedPromptTemplateId"]: selectedPromptTemplateId
  });
}

function initPromptTabs() {
  const tabButtons = Array.from(document.querySelectorAll("[data-prompt-tab-target]"));
  const tabPanels = Array.from(document.querySelectorAll("[data-prompt-tab-panel]"));
  if (!tabButtons.length || !tabPanels.length) {
    return;
  }

  const activateTab = (target) => {
    for (const button of tabButtons) {
      const isActive = button.dataset.promptTabTarget === target;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
      button.tabIndex = isActive ? 0 : -1;
    }

    for (const panel of tabPanels) {
      panel.hidden = panel.dataset.promptTabPanel !== target;
    }
  };

  for (const button of tabButtons) {
    button.addEventListener("click", () => activateTab(button.dataset.promptTabTarget || ""));
  }

  activateTab(tabButtons[0].dataset.promptTabTarget || "");
}

function escapeHtml(input) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
