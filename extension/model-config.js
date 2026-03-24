(function attachModelConfig(global) {
  const MODEL_PRESETS = [
    {
      label: "FX共享",
      value: "MiniMax-M2.5",
      apiBaseUrl: "https://aihub.firstshare.cn",
      apiPath: "/v1/messages"
    }
  ];

  const API_PATH_OPTIONS = [
    {
      label: "Anthropic Messages （/v1/messages）",
      value: "/v1/messages"
    }
  ];

  function findModelPreset(value) {
    return MODEL_PRESETS.find((item) => item.value === value) || null;
  }

  function ensureSelectOptions(select, options, currentValue, customLabelPrefix) {
    if (!select) {
      return;
    }

    select.innerHTML = "";
    for (const option of options) {
      const node = document.createElement("option");
      node.value = option.value;
      node.textContent = option.label;
      select.appendChild(node);
    }

    if (currentValue && !options.some((option) => option.value === currentValue)) {
      const customOption = document.createElement("option");
      customOption.value = currentValue;
      customOption.textContent = `${customLabelPrefix}${currentValue}`;
      select.appendChild(customOption);
    }

    if (currentValue) {
      select.value = currentValue;
    }

    if (!select.value && options[0]) {
      select.value = options[0].value;
    }
  }

  function bindModelPreset(modelEl, apiBaseUrlEl, apiPathEl) {
    if (!modelEl || modelEl.dataset.modelPresetBound === "1") {
      return;
    }

    modelEl.addEventListener("change", () => {
      const preset = findModelPreset(modelEl.value);
      if (!preset) {
        return;
      }

      if (apiBaseUrlEl) {
        apiBaseUrlEl.value = preset.apiBaseUrl;
      }

      if (apiPathEl) {
        ensureSelectOptions(apiPathEl, API_PATH_OPTIONS, preset.apiPath, "当前自定义 Path：");
        apiPathEl.value = preset.apiPath;
      }
    });

    modelEl.dataset.modelPresetBound = "1";
  }

  function initializeForm(fields) {
    const values = fields?.values || {};
    ensureSelectOptions(fields?.modelEl, MODEL_PRESETS, values.model, "当前自定义模型：");
    ensureSelectOptions(fields?.apiPathEl, API_PATH_OPTIONS, values.apiPath, "当前自定义 Path：");
    bindModelPreset(fields?.modelEl, fields?.apiBaseUrlEl, fields?.apiPathEl);
  }

  global.FXModelConfig = {
    MODEL_PRESETS,
    API_PATH_OPTIONS,
    initializeForm,
    findModelPreset
  };
})(window);
