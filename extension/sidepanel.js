const VIEW_HOME = "home";
const VIEW_DETAIL = "detail";
const VIEW_SETTINGS = "settings";
const SETTINGS_MODE_MAIN = "main";
const SETTINGS_MODE_MODEL_EDITOR = "model-editor";
const promptTemplateHelpers = window.FXPromptTemplates;
const promptSettingFields = promptTemplateHelpers?.PROMPT_SETTING_FIELDS || [];
const promptDefaultValues = promptTemplateHelpers?.getDefaultPromptSettings?.() || {};

const state = {
  history: [],
  selectedReportId: null,
  selectedFindingId: null,
  highlightAllFindings: false,
  currentView: VIEW_HOME,
  lastAutoOpenedRecordId: null,
  settingsMode: SETTINGS_MODE_MAIN,
  captureSession: null,
  captureStepPreviews: {},
  imageLightbox: null,
  promptTemplates: []
};

const defaultFormValues = {
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
  ...promptDefaultValues
};

const settingFields = [
  "appleNotesBridgeUrl",
  "appleNotesFolder",
  "appleNotesArchiveDir",
  "tapdApiAccount",
  "tapdCreatorUsername",
  "tapdApiToken",
  "tapdStoryListUrl",
  "modelTimeoutMs",
  "bridgeTimeoutMs",
  "extraRules",
  "highlightFindings",
  ...promptSettingFields
];

let modelConfigs = [];
let activeModelConfigId = "";
let progressTimer = null;
let selectedPromptTemplateId = promptTemplateHelpers?.BUILTIN_TEMPLATE_ID || "builtin-default";

const homeView = document.getElementById("homeView");
const detailView = document.getElementById("detailView");
const settingsView = document.getElementById("settingsView");
const recordsListEl = document.getElementById("recordsList");
const emptyStateEl = document.getElementById("emptyState");
const analyzeBtn = document.getElementById("analyzeBtn");
const continuousCaptureBtn = document.getElementById("continuousCaptureBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const progressPanel = document.getElementById("progressPanel");
const progressFillEl = document.getElementById("progressFill");
const progressTextEl = document.getElementById("progressText");
const progressMetaEl = document.getElementById("progressMeta");
const detailContentEl = document.getElementById("detailContent");
const backBtn = document.getElementById("backBtn");
const detailBackBtn = document.getElementById("detailBackBtn");
const createTapdStoryBtn = document.getElementById("createTapdStoryBtn");
const exportBtn = document.getElementById("exportBtn");
const toastEl = document.getElementById("toast");
const imageLightboxEl = document.getElementById("imageLightbox");
const imageLightboxImgEl = document.getElementById("imageLightboxImg");
const imageLightboxTitleEl = document.getElementById("imageLightboxTitle");
const imageLightboxCloseBtn = document.getElementById("imageLightboxCloseBtn");
const openSettingsBtn = document.getElementById("openSettingsBtn");
const settingsBackBtn = document.getElementById("settingsBackBtn");
const settingsFooterBackBtn = document.getElementById("settingsFooterBackBtn");
const settingsMainPage = document.getElementById("settingsMainPage");
const settingsMainFooter = document.getElementById("settingsMainFooter");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const saveStatusEl = document.getElementById("saveStatus");
const promptTemplateSelectEl = document.getElementById("promptTemplateSelect");
const saveCurrentPromptTemplateBtn = document.getElementById("saveCurrentPromptTemplateBtn");
const savePromptTemplateBtn = document.getElementById("savePromptTemplateBtn");
const deletePromptTemplateBtn = document.getElementById("deletePromptTemplateBtn");
const resetPromptTemplateBtn = document.getElementById("resetPromptTemplateBtn");
const modelConfigListEl = document.getElementById("modelConfigList");
const addModelConfigBtn = document.getElementById("addModelConfigBtn");
const modelConfigEditor = document.getElementById("modelConfigEditor");
const modelEditorBackBtn = document.getElementById("modelEditorBackBtn");
const modelEditorFooter = document.getElementById("modelEditorFooter");
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

document.addEventListener("click", handleDocumentClick);
document.addEventListener("keydown", handleGlobalKeydown);
analyzeBtn.addEventListener("click", handleAnalyze);
continuousCaptureBtn.addEventListener("click", (event) => {
  void handleToggleContinuousCapture(event);
});
continuousCaptureBtn.addEventListener("keydown", handleContinuousCaptureKeydown);
clearHistoryBtn.addEventListener("click", handleClearHistory);
backBtn.addEventListener("click", handleDetailBack);
detailBackBtn.addEventListener("click", handleDetailBack);
createTapdStoryBtn.addEventListener("click", handleCreateTapdStory);
exportBtn.addEventListener("click", handleExportCurrent);
openSettingsBtn.addEventListener("click", openSettingsView);
settingsBackBtn.addEventListener("click", showHomeView);
settingsFooterBackBtn.addEventListener("click", showHomeView);
saveSettingsBtn.addEventListener("click", saveSettings);
promptTemplateSelectEl?.addEventListener("change", handlePromptTemplateSelectionChange);
saveCurrentPromptTemplateBtn.addEventListener("click", handleSaveCurrentPromptTemplate);
savePromptTemplateBtn.addEventListener("click", handleSavePromptTemplate);
deletePromptTemplateBtn.addEventListener("click", handleDeletePromptTemplate);
resetPromptTemplateBtn.addEventListener("click", handleResetPromptTemplate);
addModelConfigBtn.addEventListener("click", () => openModelEditor(null));
modelEditorBackBtn.addEventListener("click", closeModelEditor);
saveModelConfigBtn.addEventListener("click", handleSaveModelConfig);
cancelModelConfigBtn.addEventListener("click", closeModelEditor);
editPresetSelectEl.addEventListener("change", handlePresetSelect);
fetchModelsBtn.addEventListener("click", handleFetchModels);
imageLightboxCloseBtn.addEventListener("click", closeImageLightbox);
for (const field of promptSettingFields) {
  document.getElementById(field)?.addEventListener("input", handlePromptFieldInput);
}
initPromptTabs();

chrome.runtime.onMessage.addListener((message) => {
  if (message?.action === "ANALYSIS_PROGRESS") {
    renderProgress(message.progress);
    if (message.progress?.recordId) {
      void openRecordDetail(message.progress.recordId, true);
    }
    return;
  }

  if (message?.action === "CONTINUOUS_CAPTURE_SESSION_UPDATED") {
    state.captureSession = message.session || null;
    renderContinuousCaptureButton();
  }
});

init();

async function init() {
  await Promise.all([
    loadHistory(),
    loadSettings(),
    loadCurrentProgress(),
    loadContinuousCaptureSession()
  ]);
  setView(VIEW_HOME);
}

async function loadHistory() {
  const response = await chrome.runtime.sendMessage({ action: "GET_REPORT_HISTORY" });
  if (response?.ok) {
    state.history = response.history || [];
    renderHome();
    renderDetail();
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
    state.captureSession = response.session || null;
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
    const input = document.getElementById(key);
    if (input) {
      const value = key in normalizedPromptValues ? normalizedPromptValues[key] : resolvedValues[key];
      applySettingNodeValue(input, value);
    }
  }

  state.promptTemplates = promptTemplateHelpers?.normalizeStoredPromptTemplates?.(
    values[promptTemplateHelpers?.PROMPT_TEMPLATE_STORAGE_KEY || "promptTemplates"] || []
  ) || [];
  const visibleTemplates = getVisiblePromptTemplates();
  const preferredTemplateId = values[promptTemplateHelpers?.SELECTED_PROMPT_TEMPLATE_STORAGE_KEY || "selectedPromptTemplateId"]
    || promptTemplateHelpers?.findMatchingTemplateId?.(normalizedPromptValues, state.promptTemplates)
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
    const input = document.getElementById(key);
    payload[key] = key in normalizedPromptValues
      ? normalizedPromptValues[key]
      : input
        ? getSettingNodeValue(input)
        : "";
  }
  await chrome.storage.local.set(payload);
  applyPromptFieldValues(normalizedPromptValues);
  renderPromptTemplateOptions();
  saveStatusEl.textContent = "保存成功";
  showToast("配置已保存");
  showHomeView();
}

function getPromptFieldValues() {
  const values = {};
  for (const key of promptSettingFields) {
    const input = document.getElementById(key);
    values[key] = input ? String(getSettingNodeValue(input) || "") : "";
  }
  return promptTemplateHelpers?.clonePromptSettings?.(values) || values;
}

function applyPromptFieldValues(values) {
  const normalized = promptTemplateHelpers?.clonePromptSettings?.(values) || values;
  for (const key of promptSettingFields) {
    const input = document.getElementById(key);
    if (input) {
      applySettingNodeValue(input, normalized[key] || "");
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
    saveStatusEl.textContent = "未找到对应模板";
    return;
  }
  selectedPromptTemplateId = template.id;
  applyPromptFieldValues(template.values);
  renderPromptTemplateOptions();
  await persistSelectedPromptTemplateId();
  saveStatusEl.textContent = `已切换模板：${template.name}`;
  showToast(`已切换模板：${template.name}`);
}

async function handleSaveCurrentPromptTemplate() {
  const template = findSelectedPromptTemplate();
  if (!template) {
    saveStatusEl.textContent = "请先选择一个模板";
    showToast("请先选择一个模板");
    return;
  }
  const nextValues = getPromptFieldValues();
  state.promptTemplates = state.promptTemplates.map((item) => (
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
  showToast(`已保存到模板：${template.name}`);
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
  state.promptTemplates = [
    ...state.promptTemplates.filter((item) => !item.deleted),
    promptTemplateHelpers?.createStoredPromptTemplate?.(nextTemplate) || nextTemplate
  ];
  selectedPromptTemplateId = nextTemplate.id;
  await persistPromptTemplates();
  renderPromptTemplateOptions();
  if (promptTemplateSelectEl) {
    promptTemplateSelectEl.value = nextTemplate.id;
  }
  saveStatusEl.textContent = `模板已保存：${nextTemplate.name}`;
  showToast(`模板已保存：${nextTemplate.name}`);
}

async function handleDeletePromptTemplate() {
  const template = findSelectedPromptTemplate();
  if (!template) {
    saveStatusEl.textContent = "请先选择一个模板";
    showToast("请先选择一个模板");
    return;
  }
  if (template.id === (promptTemplateHelpers?.BUILTIN_TEMPLATE_ID || "builtin-default")) {
    saveStatusEl.textContent = "通用模板不能删除";
    showToast("通用模板不能删除");
    return;
  }

  if (template.builtIn) {
    state.promptTemplates = state.promptTemplates.map((item) => (
      item.id === template.id
        ? { ...item, deleted: true }
        : item
    ));
  } else {
    state.promptTemplates = state.promptTemplates.filter((item) => item.id !== template.id);
  }

  const fallbackTemplate = findVisibleTemplateById(promptTemplateHelpers?.BUILTIN_TEMPLATE_ID || "builtin-default");
  selectedPromptTemplateId = fallbackTemplate?.id || (promptTemplateHelpers?.BUILTIN_TEMPLATE_ID || "builtin-default");
  if (fallbackTemplate) {
    applyPromptFieldValues(fallbackTemplate.values);
  }
  await persistPromptTemplates();
  renderPromptTemplateOptions();
  saveStatusEl.textContent = `已删除模板：${template.name}`;
  showToast(`已删除模板：${template.name}`);
}

async function handleResetPromptTemplate() {
  const template = findSelectedPromptTemplate();
  if (!template) {
    saveStatusEl.textContent = "请先选择一个模板";
    showToast("请先选择一个模板");
    return;
  }
  const initialValues = promptTemplateHelpers?.clonePromptSettings?.(template.initialValues) || template.initialValues || promptDefaultValues;
  state.promptTemplates = state.promptTemplates.map((item) => (
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
  showToast(`已恢复模板初始内容：${template.name}`);
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
    modelConfigListEl.innerHTML = '<div class="model-config-empty">暂无模型配置，请点击下方按钮添加</div>';
    return;
  }
  for (const config of modelConfigs) {
    const isActive = config.id === activeModelConfigId;
    const card = document.createElement("div");
    card.className = `model-config-card${isActive ? " model-config-active" : ""}`;
    card.innerHTML = `
      <div class="model-config-card-head">
        <div class="model-config-card-info">
          <span class="model-config-card-name">${escapeHtml(config.name || "未命名")}</span>
          <span class="model-config-card-detail">${escapeHtml(config.model || "")} · ${escapeHtml(formatApiPath(config.apiPath))}</span>
        </div>
        ${isActive ? '<span class="model-config-badge-active">使用中</span>' : ""}
      </div>
      <div class="model-config-card-actions">
        ${isActive ? "" : `<button class="sp-link-button" type="button" data-activate-config="${escapeAttr(config.id)}">启用</button>`}
        <button class="sp-link-button" type="button" data-edit-config="${escapeAttr(config.id)}">编辑</button>
        <button class="sp-link-button model-config-delete" type="button" data-delete-config="${escapeAttr(config.id)}">删除</button>
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
  setSettingsMode(SETTINGS_MODE_MODEL_EDITOR);
  editPresetSelectEl.value = "";
  fetchedModelListEl.classList.add("hidden");
  fetchedModelListEl.innerHTML = "";
  // Reset custom options in apiPath select
  const apiPathSelect = editConfigApiPathEl;
  while (apiPathSelect.options.length > 3) {
    apiPathSelect.remove(3);
  }

  if (configId) {
    const config = modelConfigs.find((c) => c.id === configId);
    if (!config) return;
    modelEditorTitle.textContent = "编辑模型配置";
    editConfigIdEl.value = config.id;
    editConfigNameEl.value = config.name || "";
    editConfigModelEl.value = config.model || "";
    editConfigBaseUrlEl.value = config.apiBaseUrl || "";
    const pathOptions = Array.from(apiPathSelect.options).map((o) => o.value);
    if (config.apiPath && !pathOptions.includes(config.apiPath)) {
      const customOpt = document.createElement("option");
      customOpt.value = config.apiPath;
      customOpt.textContent = `自定义：${config.apiPath}`;
      apiPathSelect.appendChild(customOpt);
    }
    apiPathSelect.value = config.apiPath || "/v1/chat/completions";
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
    apiPathSelect.value = "/v1/chat/completions";
    editConfigApiKeyEl.value = "";
    editConfigAuthHeaderEl.value = "Authorization";
    editConfigAuthSchemeEl.value = "Bearer";
  }
}

function closeModelEditor() {
  setSettingsMode(SETTINGS_MODE_MAIN);
  fetchedModelListEl.classList.add("hidden");
  fetchedModelListEl.innerHTML = "";
}

async function handleSaveModelConfig() {
  const name = editConfigNameEl.value.trim();
  if (!name) {
    showToast("请填写配置名称");
    return;
  }
  const validationMessage = validateModelConfigForm(true);
  if (validationMessage) {
    showToast(validationMessage);
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

  try {
    const response = await chrome.runtime.sendMessage({ action: "SAVE_MODEL_CONFIG", config });
    if (!response?.ok) {
      throw new Error(response?.error || "保存失败");
    }
    modelConfigs = response.configs;
    activeModelConfigId = response.activeId;
    renderModelConfigList();
    closeModelEditor();
    showToast("模型配置已保存");
  } catch (error) {
    showToast(error.message || "保存失败");
  }
}

async function handleDeleteModelConfig(configId) {
  try {
    const response = await chrome.runtime.sendMessage({ action: "DELETE_MODEL_CONFIG", configId });
    if (!response?.ok) {
      throw new Error(response?.error || "删除失败");
    }
    modelConfigs = response.configs;
    activeModelConfigId = response.activeId;
    renderModelConfigList();
    showToast("已删除");
  } catch (error) {
    showToast(error.message || "删除失败");
  }
}

async function handleActivateModelConfig(configId) {
  try {
    const response = await chrome.runtime.sendMessage({ action: "SET_ACTIVE_MODEL_CONFIG", configId });
    if (!response?.ok) {
      throw new Error(response?.error || "切换失败");
    }
    activeModelConfigId = response.activeId;
    renderModelConfigList();
    showToast("已切换模型");
  } catch (error) {
    showToast(error.message || "切换失败");
  }
}

async function handleFetchModels() {
  const validationMessage = validateModelConfigForm(false);
  if (validationMessage) {
    showToast(validationMessage);
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
      showToast("未获取到可用模型");
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
    showToast("获取模型列表失败，请检查 API Base URL、API 格式和 API Key");
  } finally {
    fetchModelsBtn.disabled = false;
    fetchModelsBtn.textContent = "获取";
  }
}

async function handleAnalyze() {
  analyzeBtn.disabled = true;
  renderProgress({
    percent: 5,
    message: "已开始检查...",
    updatedAt: new Date().toISOString()
  });
  try {
    const response = await chrome.runtime.sendMessage({ action: "ANALYZE_CURRENT_PAGE" });
    if (!response?.ok) {
      throw new Error(response?.error || "执行失败");
    }
    if (!response.record?.id || state.selectedReportId === response.record.id) {
      await loadHistory();
    } else {
      await openRecordDetail(response.record.id, false);
    }
  } catch (error) {
    renderProgress({
      percent: 100,
      message: error.message || "分析失败",
      updatedAt: new Date().toISOString()
    });
    showToast(error.message || "分析失败");
  } finally {
    analyzeBtn.disabled = false;
    renderContinuousCaptureButton();
  }
}

async function handleToggleContinuousCapture(event) {
  const cancelSegment = event?.target?.closest?.("[data-capture-action='cancel']");
  if (cancelSegment && state.captureSession) {
    await handleCancelContinuousCapture();
    return;
  }

  const action = state.captureSession ? "STOP_CONTINUOUS_CAPTURE" : "START_CONTINUOUS_CAPTURE";
  try {
    const response = await chrome.runtime.sendMessage({ action });
    if (!response?.ok) {
      throw new Error(response?.error || "连续捕捉操作失败");
    }

    if (action === "START_CONTINUOUS_CAPTURE") {
      showToast("连续捕捉已开始，请回到页面继续点击");
    }
  } catch (error) {
    showToast(error.message || "连续捕捉操作失败");
  }
}

async function handleContinuousCaptureKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }
  event.preventDefault();
  await handleToggleContinuousCapture(event);
}

async function handleCancelContinuousCapture() {
  try {
    const response = await chrome.runtime.sendMessage({ action: "CANCEL_CONTINUOUS_CAPTURE" });
    if (!response?.ok) {
      throw new Error(response?.error || "取消连续捕捉失败");
    }
    showToast("已取消连续捕捉");
  } catch (error) {
    showToast(error.message || "取消连续捕捉失败");
  }
}

async function handleClearHistory() {
  await chrome.runtime.sendMessage({ action: "CLEAR_REPORT_HISTORY" });
  state.history = [];
  state.selectedReportId = null;
  renderHome();
  renderDetail();
  showHomeView();
  showToast("检查记录已清除");
}

async function handleExportCurrent() {
  const record = getSelectedRecord();
  if (!record) {
    return;
  }

  exportBtn.disabled = true;
  try {
    const response = await chrome.runtime.sendMessage({
      action: "EXPORT_REPORT_TO_NOTES",
      reportId: record.id
    });
    if (!response?.ok) {
      throw new Error(response?.error || "导出失败");
    }
    await loadHistory();
    showToast(response.delivery?.message || response.delivery?.storagePath || "已导出到备忘录");
  } catch (error) {
    showToast(error.message || "导出失败");
  } finally {
    exportBtn.disabled = false;
  }
}

function handleDetailBack() {
  showHomeView();
}

function openSettingsView() {
  setSettingsMode(SETTINGS_MODE_MAIN);
  setView(VIEW_SETTINGS);
}

function setSettingsMode(mode) {
  state.settingsMode = mode;
  const isEditorMode = mode === SETTINGS_MODE_MODEL_EDITOR;
  settingsMainPage.classList.toggle("hidden", isEditorMode);
  settingsMainFooter.classList.toggle("hidden", isEditorMode);
  modelConfigEditor.classList.toggle("hidden", !isEditorMode);
  modelEditorFooter.classList.toggle("hidden", !isEditorMode);
}

async function handleDocumentClick(event) {
  const previewTrigger = event.target.closest("[data-preview-asset-key]");
  if (previewTrigger) {
    event.preventDefault();
    openImageLightbox(previewTrigger.dataset.previewAssetKey, previewTrigger.dataset.previewTitle || "");
    return;
  }

  const closePreviewTrigger = event.target.closest("[data-close-image-lightbox]");
  if (closePreviewTrigger) {
    closeImageLightbox();
    return;
  }

  const activateBtn = event.target.closest("[data-activate-config]");
  if (activateBtn) {
    await handleActivateModelConfig(activateBtn.dataset.activateConfig);
    return;
  }

  const editBtn = event.target.closest("[data-edit-config]");
  if (editBtn) {
    openModelEditor(editBtn.dataset.editConfig);
    return;
  }

  const deleteBtn = event.target.closest("[data-delete-config]");
  if (deleteBtn) {
    await handleDeleteModelConfig(deleteBtn.dataset.deleteConfig);
    return;
  }

  const card = event.target.closest("[data-record-id]");
  if (card) {
    await openRecordDetail(card.dataset.recordId, false);
    return;
  }

  const ignoreButton = event.target.closest("[data-ignore-finding-id]");
  if (ignoreButton) {
    const record = getSelectedRecord();
    if (!record) {
      return;
    }
    const findingId = ignoreButton.dataset.ignoreFindingId;
    await chrome.runtime.sendMessage({
      action: "SET_FINDING_IGNORED",
      reportId: record.id,
      findingId,
      ignored: true
    });
    await loadHistory();
    showToast("已忽略该问题");
    return;
  }

  const copyButton = event.target.closest("[data-copy-finding-id]");
  if (copyButton) {
    const record = getSelectedRecord();
    if (!record) {
      return;
    }
    const findingId = copyButton.dataset.copyFindingId;
    const finding = (record.report?.findings || []).find((item) => item.id === findingId);
    if (!finding) {
      return;
    }
    await navigator.clipboard.writeText(formatFindingText(finding));
    showToast("问题内容已复制");
    return;
  }

  const findingCard = event.target.closest("[data-focus-finding-id]");
  if (findingCard) {
    await handleFocusFinding(findingCard.dataset.focusFindingId);
  }
}

function renderHome() {
  recordsListEl.innerHTML = "";
  emptyStateEl.classList.toggle("hidden", state.history.length > 0);

  for (const record of state.history) {
    const activeFindingCount = getActiveFindingCount(record);
    const card = document.createElement("button");
    card.className = "record-card";
    card.type = "button";
    card.dataset.recordId = record.id;
    card.innerHTML = `
      <div class="record-card-head">
        <p class="record-card-title">${escapeHtml(record.page.title || "[页面标题]")}</p>
        <span class="record-card-badge">${activeFindingCount}</span>
      </div>
      <p class="record-card-summary">${escapeHtml(record.report?.pageSummary || "暂无页面摘要")}</p>
      <p class="record-card-time">${formatDisplayDate(record.createdAt)}</p>
    `;
    recordsListEl.appendChild(card);
  }
}

function renderDetail() {
  const record = getSelectedRecord();
  if (!record) {
    state.captureStepPreviews = {};
    detailContentEl.innerHTML = "";
    closeImageLightbox();
    void clearPageHighlights();
    if (state.currentView === VIEW_DETAIL) {
      showHomeView();
    }
    return;
  }

  const activeFindings = getActiveFindings(record);
  const captureFlow = record.pageData?.captureFlow || null;
  const supportsHighlight = !captureFlow;
  if (state.selectedFindingId && !activeFindings.some((item) => item.id === state.selectedFindingId)) {
    state.selectedFindingId = null;
  }
  const issueCards = activeFindings.length
    ? activeFindings.map(renderFindingCard).join("")
    : `<div class="issue-empty">当前没有未忽略的问题卡片</div>`;

  detailContentEl.innerHTML = `
    <section class="detail-summary">
      <div class="detail-header-line">
        <p class="detail-page-title">${escapeHtml(record.page.title || "[页面标题]")}</p>
        <p class="detail-date">${formatDisplayDate(record.createdAt)}</p>
      </div>
      <p class="detail-page-summary">${escapeHtml(record.report?.pageSummary || "暂无页面摘要")}</p>
    </section>

    ${renderDetailReportScreenshot(record)}

    <section class="metric-row">
      ${renderMetricCard("评分", String(record.report?.score ?? "-"), "danger")}
      ${renderMetricCard("风险等级", String(record.report?.riskLevel || "-").toUpperCase(), "danger")}
      ${renderMetricCard("问题数", String(activeFindings.length), "default")}
    </section>

    ${captureFlow ? renderCaptureFlowSection(captureFlow) : ""}

    <section class="detail-section">
      <div class="detail-section-head">
        <div class="detail-section-title-row">
          <h2 class="detail-section-title">问题列表</h2>
        </div>
        ${supportsHighlight ? `
          <label class="detail-highlight-toggle">
            <input id="detailInlineHighlightAllToggle" type="checkbox" ${state.highlightAllFindings ? "checked" : ""}>
            <span>高亮显示全部</span>
          </label>
        ` : '<span class="detail-section-tip">连续捕捉汇总报告不支持页面高亮</span>'}
      </div>
      <div class="issue-list">${issueCards}</div>
    </section>

    ${(record.lastExport || record.lastTapdStory) ? `
      <section class="detail-export-meta">
        ${record.lastExport ? `
          <p>最近导出：${formatDisplayDate(record.lastExport.exportedAt)}</p>
          <p>备忘录：${escapeHtml(record.lastExport.noteLocation || "未写入备忘录")}</p>
          <p>归档：${escapeHtml(record.lastExport.storagePath || "未生成本地归档")}</p>
          ${record.lastExport.noteError ? `<p>备忘录结果：${escapeHtml(record.lastExport.noteError)}</p>` : ""}
          ${record.lastExport.screenshotPath ? `<p>截图：${escapeHtml(record.lastExport.screenshotPath)}</p>` : ""}
          ${record.lastExport.stepScreenshotCount ? `<p>步骤截图数：${escapeHtml(String(record.lastExport.stepScreenshotCount))}</p>` : ""}
          ${record.lastExport.screenshotError ? `<p>截图结果：${escapeHtml(record.lastExport.screenshotError)}</p>` : ""}
        ` : ""}
        ${record.lastTapdStory ? `
          <p>最近创建需求：${formatDisplayDate(record.lastTapdStory.createdAt)}</p>
          <p>需求ID：${escapeHtml(String(record.lastTapdStory.storyId || "未返回ID"))}</p>
          <p>需求地址：${renderExternalLink(record.lastTapdStory.storyUrl)}</p>
        ` : ""}
      </section>
    ` : ""}
  `;

  bindDetailControls();

  void syncPageHighlights();
}

function renderFindingCard(finding) {
  const severity = String(finding.severity || "low").toUpperCase();
  const evidenceText = Array.isArray(finding.evidence) ? finding.evidence.join("；") : "";
  const isActive = finding.id === state.selectedFindingId;
  return `
    <article class="issue-card${isActive ? " issue-card-active" : ""}" data-focus-finding-id="${escapeAttr(finding.id)}" role="button" tabindex="0">
      <div class="issue-card-top">
        <span class="severity-pill severity-${escapeAttr(finding.severity || "low")}">${escapeHtml(severity)}</span>
        <span class="category-text category-${getCategoryClass(finding.category)}">${escapeHtml(finding.category || "其他")}</span>
      </div>
      <h3 class="issue-title">${escapeHtml(finding.title || "未命名问题")}</h3>
      <div class="issue-block">
        <p class="issue-label">问题说明</p>
        <p class="issue-text">${escapeHtml(finding.description || "暂无问题说明")}</p>
      </div>
      <div class="issue-block">
        <p class="issue-label">证据</p>
        <p class="issue-text">${escapeHtml(evidenceText || "暂无证据")}</p>
      </div>
      <div class="issue-block">
        <p class="issue-label">建议</p>
        <p class="issue-text">${escapeHtml(finding.suggestion || "暂无建议")}</p>
      </div>
      <div class="issue-actions">
        <button class="sp-button sp-button-secondary" type="button" data-ignore-finding-id="${escapeAttr(finding.id)}">忽略</button>
        <button class="sp-button sp-button-secondary" type="button" data-copy-finding-id="${escapeAttr(finding.id)}">复制</button>
      </div>
    </article>
  `;
}

function renderMetricCard(label, value, tone) {
  return `
    <div class="metric-card">
      <p class="metric-card-label">${escapeHtml(label)}</p>
      <p class="metric-card-value ${tone === "danger" ? "metric-danger" : ""}">${escapeHtml(value)}</p>
    </div>
  `;
}

function renderDetailReportScreenshot(record) {
  const screenshot = record?.pageData?.reportScreenshot || null;
  if (!screenshot?.key) {
    return "";
  }

  const asset = state.captureStepPreviews[screenshot.key] || null;
  const title = `${record.page?.title || "当前页"} 截图`;
  return `
    <section class="detail-section">
      <div class="detail-section-head">
        <div class="detail-section-title-row">
          <h2 class="detail-section-title">当前页截图</h2>
        </div>
        <span class="detail-section-tip">保留问题高亮，可点击放大查看</span>
      </div>
      ${renderPreviewAssetButton({
        assetKey: screenshot.key,
        asset,
        title,
        buttonClassName: "detail-report-screenshot-button",
        imageClassName: "detail-report-screenshot-image",
        placeholderClassName: "detail-report-screenshot-placeholder"
      })}
    </section>
  `;
}

function renderCaptureFlowSection(captureFlow) {
  const stepCards = (captureFlow.steps || []).map((step) => `
    <article class="capture-step-card">
      <div class="capture-step-head">
        <span class="capture-step-index">步骤 ${step.index}</span>
        <span class="capture-step-scope">${escapeHtml(step.scope?.label || "当前页面")}</span>
      </div>
      <div class="capture-step-body">
        ${renderCaptureStepPreview(step)}
        <div class="capture-step-content">
          <p class="capture-step-title">${escapeHtml(step.title || step.url || "未命名页面")}</p>
          ${renderCaptureStepLink(step)}
        </div>
      </div>
      ${step.interaction?.text || step.interaction?.locator ? `<p class="capture-step-meta">触发点击：${escapeHtml(step.interaction.text || step.interaction.locator)}</p>` : ""}
    </article>
  `).join("");

  return `
    <section class="detail-section">
      <div class="detail-section-head">
        <div class="detail-section-title-row">
          <h2 class="detail-section-title">捕捉轨迹</h2>
        </div>
        <span class="detail-section-tip">${captureFlow.clickCount} 次点击 · ${formatDuration(captureFlow.durationMs)} · ${escapeHtml(captureFlow.stopReasonLabel || "手动停止")}</span>
      </div>
      <div class="capture-step-list">${stepCards || '<div class="issue-empty">暂无捕捉步骤</div>'}</div>
    </section>
  `;
}

function renderCaptureStepPreview(step) {
  const assetKey = step?.screenshot?.key;
  if (!assetKey) {
    return '<div class="capture-step-preview-placeholder">未保存截图</div>';
  }
  const preview = assetKey ? state.captureStepPreviews[assetKey] : null;
  return renderPreviewAssetButton({
    assetKey,
    asset: preview,
    title: step.title || `步骤 ${step.index}`,
    buttonClassName: "capture-step-preview-trigger",
    imageClassName: "capture-step-preview",
    placeholderClassName: "capture-step-preview-placeholder"
  });
}

function renderCaptureStepLink(step) {
  const url = step?.url || "";
  if (!url) {
    return '<p class="capture-step-link">未记录 URL</p>';
  }
  return `
    <a
      class="capture-step-link"
      href="${escapeAttr(url)}"
      target="_blank"
      rel="noreferrer"
      title="${escapeAttr(url)}"
    >${escapeHtml(url)}</a>
  `;
}

function renderPreviewAssetButton({ assetKey, asset, title, buttonClassName, imageClassName, placeholderClassName }) {
  if (asset?.dataUrl) {
    return `
      <button
        class="${buttonClassName}"
        type="button"
        data-preview-asset-key="${escapeAttr(assetKey)}"
        data-preview-title="${escapeAttr(title || "截图预览")}"
      >
        <img class="${imageClassName}" src="${escapeAttr(asset.dataUrl)}" alt="${escapeAttr(title || "截图预览")}">
      </button>
    `;
  }
  return `<div class="${placeholderClassName}">截图加载中</div>`;
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
  const isCapturing = Boolean(state.captureSession);
  continuousCaptureBtn.classList.toggle("is-capturing", isCapturing);
  continuousCaptureBtn.querySelector(".sp-capture-cancel-segment")?.classList.toggle("hidden", !isCapturing);
  const label = continuousCaptureBtn.querySelector(".sp-capture-label");
  if (label) {
    label.textContent = isCapturing ? "捕捉中" : "连续捕捉";
  }
  analyzeBtn.disabled = isCapturing;
}

function setView(viewName) {
  state.currentView = viewName;
  homeView.classList.toggle("hidden", viewName !== VIEW_HOME);
  detailView.classList.toggle("hidden", viewName !== VIEW_DETAIL);
  settingsView.classList.toggle("hidden", viewName !== VIEW_SETTINGS);
  if (viewName !== VIEW_DETAIL) {
    void clearPageHighlights();
  }
}

function showHomeView() {
  setView(VIEW_HOME);
}

function showDetailView() {
  setView(VIEW_DETAIL);
}

function getSelectedRecord() {
  return state.history.find((item) => item.id === state.selectedReportId) || null;
}

function getActiveFindings(record) {
  const ignoredIds = new Set(record?.ignoredFindingIds || []);
  return (record?.report?.findings || []).filter((item) => !ignoredIds.has(item.id));
}

function getActiveFindingCount(record) {
  return getActiveFindings(record).length;
}

async function openRecordDetail(recordId, showAutoToast) {
  if (!recordId) {
    return;
  }

  await loadHistory();
  state.selectedReportId = recordId;
  state.selectedFindingId = null;
  renderDetail();
  await loadCaptureStepPreviewsForSelectedRecord();
  showDetailView();

  if (showAutoToast && state.lastAutoOpenedRecordId !== recordId) {
    state.lastAutoOpenedRecordId = recordId;
    showToast("检查完成，已自动打开详情");
  }
}

async function loadCaptureStepPreviewsForSelectedRecord() {
  const record = getSelectedRecord();
  const reportScreenshotKey = record?.pageData?.reportScreenshot?.key || "";
  const steps = record?.pageData?.captureFlow?.steps || [];
  const keys = [reportScreenshotKey, ...steps
    .map((step) => step?.screenshot?.key)
    .filter(Boolean)]
    .filter(Boolean);

  if (!keys.length) {
    state.captureStepPreviews = {};
    renderDetail();
    return;
  }

  const response = await chrome.runtime.sendMessage({
    action: "GET_CAPTURE_ASSETS",
    keys
  }).catch(() => null);

  state.captureStepPreviews = response?.ok ? (response.assets || {}) : {};
  renderDetail();
}

function handleGlobalKeydown(event) {
  if (event.key === "Escape" && !imageLightboxEl.classList.contains("hidden")) {
    closeImageLightbox();
  }
}

function openImageLightbox(assetKey, title) {
  const asset = assetKey ? state.captureStepPreviews[assetKey] : null;
  if (!asset?.dataUrl) {
    showToast("截图仍在加载中");
    return;
  }

  state.imageLightbox = {
    assetKey,
    title: title || asset.filename || "截图预览"
  };
  imageLightboxImgEl.src = asset.dataUrl;
  imageLightboxImgEl.alt = state.imageLightbox.title;
  imageLightboxTitleEl.textContent = state.imageLightbox.title;
  imageLightboxEl.classList.remove("hidden");
  imageLightboxEl.setAttribute("aria-hidden", "false");
  document.body.classList.add("sp-lightbox-open");
}

function closeImageLightbox() {
  state.imageLightbox = null;
  imageLightboxImgEl.removeAttribute("src");
  imageLightboxImgEl.alt = "";
  imageLightboxTitleEl.textContent = "";
  imageLightboxEl.classList.add("hidden");
  imageLightboxEl.setAttribute("aria-hidden", "true");
  document.body.classList.remove("sp-lightbox-open");
}

async function syncPageHighlights() {
  const record = getSelectedRecord();
  if (!record || state.currentView !== VIEW_DETAIL) {
    await clearPageHighlights();
    return;
  }
  if (record.pageData?.captureFlow) {
    await clearPageHighlights();
    return;
  }

  const settings = await chrome.storage.local.get(["highlightFindings"]);
  if (settings.highlightFindings === false) {
    await clearPageHighlights();
    return;
  }

  const activeFindings = getActiveFindings(record);
  const findingsToHighlight = state.highlightAllFindings
    ? activeFindings
    : activeFindings.filter((item) => item.id === state.selectedFindingId);

  if (!findingsToHighlight.length) {
    await clearPageHighlights();
    return;
  }

  await chrome.runtime.sendMessage({
    action: "SYNC_PAGE_HIGHLIGHTS",
    pageUrl: record.page?.url || "",
    findings: findingsToHighlight
  }).catch(() => {});
}

async function clearPageHighlights() {
  await chrome.runtime.sendMessage({
    action: "CLEAR_PAGE_HIGHLIGHTS"
  }).catch(() => {});
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
  return (promptTemplateHelpers?.mergeWithBuiltinTemplates?.(state.promptTemplates) || []).filter((item) => !item.deleted);
}

function findVisibleTemplateById(templateId) {
  return getVisiblePromptTemplates().find((item) => item.id === templateId) || null;
}

function findSelectedPromptTemplate(templateId = selectedPromptTemplateId) {
  return promptTemplateHelpers?.findPromptTemplate?.(state.promptTemplates, templateId) || null;
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
  state.promptTemplates = promptTemplateHelpers?.normalizeStoredPromptTemplates?.(state.promptTemplates) || state.promptTemplates;
  await chrome.storage.local.set({
    [promptTemplateHelpers?.PROMPT_TEMPLATE_STORAGE_KEY || "promptTemplates"]: state.promptTemplates,
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

function formatDisplayDate(input) {
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

function formatFindingText(finding) {
  return [
    `优先级：${String(finding.severity || "low").toUpperCase()}`,
    `分类：${finding.category || "其他"}`,
    `标题：${finding.title || ""}`,
    `问题说明：${finding.description || ""}`,
    `证据：${Array.isArray(finding.evidence) ? finding.evidence.join("；") : ""}`,
    `建议：${finding.suggestion || ""}`,
    `定位线索：${finding.locator || ""}`
  ].join("\n");
}

async function handleFocusFinding(findingId) {
  if (!findingId || state.selectedFindingId === findingId) {
    return;
  }

  state.selectedFindingId = findingId;
  renderDetail();
  await syncPageHighlights();
}

async function handleToggleHighlightAll() {
  const toggle = document.getElementById("detailInlineHighlightAllToggle");
  state.highlightAllFindings = Boolean(toggle?.checked);
  await syncPageHighlights();
}

function bindDetailControls() {
  const toggle = document.getElementById("detailInlineHighlightAllToggle");
  if (toggle) {
    toggle.checked = state.highlightAllFindings;
    toggle.addEventListener("change", handleToggleHighlightAll);
  }
}

async function handleCreateTapdStory() {
  const record = getSelectedRecord();
  if (!record) {
    showToast("未找到当前质检报告");
    return;
  }

  createTapdStoryBtn.disabled = true;
  try {
    const response = await chrome.runtime.sendMessage({
      action: "CREATE_TAPD_STORY",
      reportId: record.id
    });
    if (!response?.ok) {
      throw new Error(response?.error || "创建需求失败");
    }
    await loadHistory();
    renderDetail();
    showToast(response.storyId ? `已创建 TAPD 需求 #${response.storyId}` : "已创建 TAPD 需求");
  } catch (error) {
    showToast(error.message || "创建需求失败");
  } finally {
    createTapdStoryBtn.disabled = false;
  }
}

function getCategoryClass(category) {
  if (category === "国际化风险") return "purple";
  if (category === "文案清晰度") return "green";
  if (category === "术语一致性") return "blue";
  return "gray";
}

let toastTimer = null;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.add("hidden");
  }, 2400);
}

function escapeHtml(input) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(input) {
  return escapeHtml(input);
}

function renderExternalLink(url) {
  const safeUrl = String(url || "").trim();
  if (!safeUrl) {
    return "未返回链接";
  }

  return `<a class="detail-meta-link" href="${escapeAttr(safeUrl)}" target="_blank" rel="noreferrer">${escapeHtml(safeUrl)}</a>`;
}
