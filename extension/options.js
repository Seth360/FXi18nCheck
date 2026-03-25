const fields = [
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

const saveBtn = document.getElementById("saveBtn");
const saveStatus = document.getElementById("saveStatus");
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

let modelConfigs = [];
let activeModelConfigId = "";

loadSettings();
saveBtn.addEventListener("click", saveSettings);
addModelConfigBtn.addEventListener("click", () => openModelEditor(null));
saveModelConfigBtn.addEventListener("click", handleSaveModelConfig);
cancelModelConfigBtn.addEventListener("click", closeModelEditor);
editPresetSelectEl.addEventListener("change", handlePresetSelect);
fetchModelsBtn.addEventListener("click", handleFetchModels);
document.addEventListener("click", handleDocumentClick);

async function loadSettings() {
  const values = await chrome.storage.local.get(fields);
  const resolvedValues = {};
  for (const key of fields) {
    resolvedValues[key] = values[key] === undefined ? defaultFormValues[key] : values[key];
  }

  for (const key of fields) {
    const node = document.getElementById(key);
    if (node) {
      applySettingNodeValue(node, resolvedValues[key]);
    }
  }

  await loadModelConfigs();
  initPresetSelect();
  saveStatus.textContent = "已加载现有配置";
}

async function saveSettings() {
  const payload = {};
  for (const key of fields) {
    const node = document.getElementById(key);
    payload[key] = node ? getSettingNodeValue(node) : "";
  }

  await chrome.storage.local.set(payload);
  saveStatus.textContent = "保存成功";
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
    modelConfigListEl.innerHTML = '<div style="padding:12px;color:#6b7280;font-size:13px;">暂无模型配置，请点击下方按钮添加</div>';
    return;
  }
  for (const config of modelConfigs) {
    const isActive = config.id === activeModelConfigId;
    const card = document.createElement("div");
    card.style.cssText = `padding:10px 12px;border:1px solid ${isActive ? "#ff8000" : "#d1d5db"};border-radius:8px;margin-bottom:8px;background:${isActive ? "#fff8f0" : "#fff"}`;
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong style="font-size:13px">${escapeHtml(config.name || "未命名")}</strong>
          <span style="font-size:12px;color:#6b7280;margin-left:8px">${escapeHtml(config.model || "")} · ${escapeHtml(formatApiPath(config.apiPath))}</span>
        </div>
        ${isActive ? '<span style="font-size:11px;background:#ff8000;color:#fff;padding:2px 8px;border-radius:10px">使用中</span>' : ""}
      </div>
      <div style="display:flex;gap:12px;margin-top:6px;font-size:13px">
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
    saveStatus.textContent = validationMessage;
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
      saveStatus.textContent = "未获取到可用模型";
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
    saveStatus.textContent = "获取模型列表失败，请检查 API Base URL、API 格式和 API Key";
  } finally {
    fetchModelsBtn.disabled = false;
    fetchModelsBtn.textContent = "获取";
  }
}

async function handleSaveModelConfig() {
  const name = editConfigNameEl.value.trim();
  if (!name) {
    saveStatus.textContent = "请填写配置名称";
    return;
  }
  const validationMessage = validateModelConfigForm(true);
  if (validationMessage) {
    saveStatus.textContent = validationMessage;
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
    saveStatus.textContent = "模型配置已保存";
  } else {
    saveStatus.textContent = response?.error || "保存失败";
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
