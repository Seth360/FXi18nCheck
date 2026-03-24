const analyzeBtn = document.getElementById("analyzeBtn");
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
  highlightFindings: true
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
  "highlightFindings"
];

let modelConfigs = [];
let activeModelConfigId = "";

chrome.runtime.onMessage.addListener((message) => {
  if (message?.action === "ANALYSIS_PROGRESS") {
    renderProgress(message.progress);
    if (message.progress?.message) {
      setStatus(message.progress.message);
    }
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

    renderResult(response.report, response.delivery);
    renderProgress({
      percent: 100,
      message: response.delivery?.storagePath
        ? `已完成，归档路径：${response.delivery.storagePath}`
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
  }
});

toggleSettingsBtn.addEventListener("click", async () => {
  settingsPanel.classList.toggle("hidden");
  if (!settingsPanel.classList.contains("hidden")) {
    await loadSettings();
  }
});

saveSettingsBtn.addEventListener("click", saveSettings);
addModelConfigBtn.addEventListener("click", () => openModelEditor(null));
saveModelConfigBtn.addEventListener("click", handleSaveModelConfig);
cancelModelConfigBtn.addEventListener("click", closeModelEditor);
editPresetSelectEl.addEventListener("change", handlePresetSelect);
fetchModelsBtn.addEventListener("click", handleFetchModels);
document.addEventListener("click", handleDocumentClick);

loadLastReport();
loadCurrentProgress();

async function loadLastReport() {
  const response = await chrome.runtime.sendMessage({ action: "GET_LAST_REPORT" });
  if (response?.ok && response.report?.report) {
    renderResult(response.report.report, response.report.delivery);
    setStatus("已加载上一次结果");
  }
}

async function loadCurrentProgress() {
  const response = await chrome.runtime.sendMessage({ action: "GET_ANALYSIS_PROGRESS" });
  if (response?.ok && response.progress) {
    renderProgress(response.progress);
  }
}

async function loadSettings() {
  const values = await chrome.storage.local.get(settingFields);
  const resolvedValues = {};
  for (const key of settingFields) {
    resolvedValues[key] = values[key] === undefined ? defaultFormValues[key] : values[key];
  }

  for (const key of settingFields) {
    const node = document.getElementById(key);
    if (node) {
      applySettingNodeValue(node, resolvedValues[key]);
    }
  }

  await loadModelConfigs();
  initPresetSelect();
  saveStatusEl.textContent = "已加载配置";
}

async function saveSettings() {
  const payload = {};
  for (const key of settingFields) {
    const node = document.getElementById(key);
    payload[key] = node ? getSettingNodeValue(node) : "";
  }

  await chrome.storage.local.set(payload);
  saveStatusEl.textContent = "保存成功";
  setStatus("配置已保存，可以直接执行检查");
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
  editPresetSelectEl.innerHTML = '<option value="">-- 手动填写 --</option>';
  for (const preset of presets) {
    const opt = document.createElement("option");
    opt.value = preset.value;
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
  if (path === "/v1/messages") return "Anthropic";
  return path || "";
}

function openModelEditor(configId) {
  modelConfigEditor.classList.remove("hidden");
  editPresetSelectEl.value = "";
  while (editConfigApiPathEl.options.length > 1) {
    editConfigApiPathEl.remove(1);
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
    editConfigApiPathEl.value = config.apiPath || "/v1/messages";
    editConfigApiKeyEl.value = config.apiKey || "";
    editConfigAuthHeaderEl.value = config.authHeader ?? "Authorization";
    editConfigAuthSchemeEl.value = config.authScheme ?? "Bearer";
  } else {
    modelEditorTitle.textContent = "添加模型配置";
    editConfigIdEl.value = "";
    editConfigNameEl.value = "FX共享";
    editConfigModelEl.value = "MiniMax-M2.5";
    editConfigBaseUrlEl.value = "https://aihub.firstshare.cn";
    editConfigApiPathEl.value = "/v1/messages";
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
  const baseUrl = editConfigBaseUrlEl.value.trim();
  if (!baseUrl) {
    saveStatusEl.textContent = "请先填写 API Base URL";
    return;
  }
  fetchModelsBtn.disabled = true;
  fetchModelsBtn.textContent = "...";
  fetchedModelListEl.classList.add("hidden");
  fetchedModelListEl.innerHTML = "";
  try {
    const response = await chrome.runtime.sendMessage({
      action: "FETCH_REMOTE_MODELS",
      baseUrl,
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
    saveStatusEl.textContent = error.message || "获取模型列表失败";
  } finally {
    fetchModelsBtn.disabled = false;
    fetchModelsBtn.textContent = "Fetch";
  }
}

async function handleSaveModelConfig() {
  const name = editConfigNameEl.value.trim();
  if (!name) {
    saveStatusEl.textContent = "请填写配置名称";
    return;
  }
  const config = {
    name,
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
  progressMetaEl.textContent = progress?.updatedAt
    ? `最后更新：${new Date(progress.updatedAt).toLocaleTimeString("zh-CN", { hour12: false })}`
    : "";
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

function escapeHtml(input) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
