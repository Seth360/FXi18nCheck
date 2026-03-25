(function attachModelConfig(global) {
  const MODEL_PRESETS = [
    {
      label: "FX共享",
      key: "fx-shared",
      value: "MiniMax-M2.5",
      apiBaseUrl: "https://aihub.firstshare.cn",
      apiPath: "/v1/messages",
      authHeader: "Authorization",
      authScheme: "Bearer"
    },
    {
      label: "MiniMax(国内)",
      key: "minimax-cn",
      value: "MiniMax-M2.5",
      apiBaseUrl: "https://api.minimaxi.com",
      apiPath: "/v1/chat/completions",
      authHeader: "Authorization",
      authScheme: "Bearer"
    },
    {
      label: "MiniMax(国际)",
      key: "minimax-global",
      value: "MiniMax-M2.5",
      apiBaseUrl: "https://api.minimax.io",
      apiPath: "/v1/chat/completions",
      authHeader: "Authorization",
      authScheme: "Bearer"
    },
    {
      label: "OpenAI",
      key: "openai",
      value: "gpt-4.1",
      apiBaseUrl: "https://api.openai.com",
      apiPath: "/v1/responses",
      authHeader: "Authorization",
      authScheme: "Bearer"
    },
    {
      label: "Anthropic",
      key: "anthropic",
      value: "claude-sonnet-4-0",
      apiBaseUrl: "https://api.anthropic.com",
      apiPath: "/v1/messages",
      authHeader: "x-api-key",
      authScheme: ""
    },
    {
      label: "Gemini",
      key: "gemini",
      value: "gemini-2.5-pro",
      apiBaseUrl: "https://generativelanguage.googleapis.com",
      apiPath: "/v1beta/openai/chat/completions",
      authHeader: "Authorization",
      authScheme: "Bearer"
    },
    {
      label: "DeepSeek",
      key: "deepseek",
      value: "deepseek-chat",
      apiBaseUrl: "https://api.deepseek.com",
      apiPath: "/v1/chat/completions",
      authHeader: "Authorization",
      authScheme: "Bearer"
    },
    {
      label: "Qwen",
      key: "qwen",
      value: "qwen-max",
      apiBaseUrl: "https://dashscope.aliyuncs.com",
      apiPath: "/compatible-mode/v1/chat/completions",
      authHeader: "Authorization",
      authScheme: "Bearer"
    },
    {
      label: "Doubao",
      key: "doubao",
      value: "doubao-1-5-pro-32k-250115",
      apiBaseUrl: "https://ark.cn-beijing.volces.com",
      apiPath: "/api/v3/chat/completions",
      authHeader: "Authorization",
      authScheme: "Bearer"
    }
  ];

  const API_PATH_OPTIONS = [
    {
      label: "OpenAI Chat （/v1/chat/completions）",
      value: "/v1/chat/completions"
    },
    {
      label: "OpenAI Responses （/v1/responses）",
      value: "/v1/responses"
    },
    {
      label: "Anthropic Messages （/v1/messages）",
      value: "/v1/messages"
    }
  ];

  function findModelPreset(key) {
    return MODEL_PRESETS.find((item) => (item.key || item.value) === key) || null;
  }

  function inferPresetKey(config) {
    if (!config || typeof config !== "object") {
      return "";
    }

    if (config.presetKey && findModelPreset(config.presetKey)) {
      return config.presetKey;
    }

    const baseUrl = String(config.apiBaseUrl || "").trim();
    const apiPath = String(config.apiPath || "").trim();
    const model = String(config.model || "").trim();

    const preset = MODEL_PRESETS.find((item) => item.apiBaseUrl === baseUrl && item.apiPath === apiPath && item.value === model)
      || MODEL_PRESETS.find((item) => item.apiBaseUrl === baseUrl && item.apiPath === apiPath);

    return preset?.key || "";
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
    findModelPreset,
    inferPresetKey
  };
})(window);
