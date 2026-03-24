(function attachModelConfig(global) {
  const MODEL_PRESETS = [
    {
      label: "FX共享",
      value: "MiniMax-M2.5",
      apiBaseUrl: "https://aihub.firstshare.cn",
      apiPath: "/v1/messages",
      authHeader: "Authorization",
      authScheme: "Bearer"
    },
    {
      label: "GPT-4.1",
      value: "gpt-4.1",
      apiBaseUrl: "https://api.openai.com",
      apiPath: "/v1/responses",
      authHeader: "Authorization",
      authScheme: "Bearer"
    },
    {
      label: "GPT-4o",
      value: "gpt-4o",
      apiBaseUrl: "https://api.openai.com",
      apiPath: "/v1/responses",
      authHeader: "Authorization",
      authScheme: "Bearer"
    },
    {
      label: "GPT-4o mini",
      value: "gpt-4o-mini",
      apiBaseUrl: "https://api.openai.com",
      apiPath: "/v1/responses",
      authHeader: "Authorization",
      authScheme: "Bearer"
    },
    {
      label: "o3",
      value: "o3",
      apiBaseUrl: "https://api.openai.com",
      apiPath: "/v1/responses",
      authHeader: "Authorization",
      authScheme: "Bearer"
    },
    {
      label: "Claude 3.7 Sonnet",
      value: "claude-3-7-sonnet-latest",
      apiBaseUrl: "https://api.anthropic.com",
      apiPath: "/v1/messages",
      authHeader: "x-api-key",
      authScheme: ""
    },
    {
      label: "Claude Sonnet 4",
      value: "claude-sonnet-4-0",
      apiBaseUrl: "https://api.anthropic.com",
      apiPath: "/v1/messages",
      authHeader: "x-api-key",
      authScheme: ""
    },
    {
      label: "Gemini 2.5 Pro",
      value: "gemini-2.5-pro",
      apiBaseUrl: "https://generativelanguage.googleapis.com",
      apiPath: "/v1beta/openai/chat/completions",
      authHeader: "Authorization",
      authScheme: "Bearer"
    },
    {
      label: "Gemini 2.5 Flash",
      value: "gemini-2.5-flash",
      apiBaseUrl: "https://generativelanguage.googleapis.com",
      apiPath: "/v1beta/openai/chat/completions",
      authHeader: "Authorization",
      authScheme: "Bearer"
    },
    {
      label: "DeepSeek V3",
      value: "deepseek-chat",
      apiBaseUrl: "https://api.deepseek.com",
      apiPath: "/v1/chat/completions",
      authHeader: "Authorization",
      authScheme: "Bearer"
    },
    {
      label: "DeepSeek R1",
      value: "deepseek-reasoner",
      apiBaseUrl: "https://api.deepseek.com",
      apiPath: "/v1/chat/completions",
      authHeader: "Authorization",
      authScheme: "Bearer"
    },
    {
      label: "Qwen Max",
      value: "qwen-max",
      apiBaseUrl: "https://dashscope.aliyuncs.com",
      apiPath: "/compatible-mode/v1/chat/completions",
      authHeader: "Authorization",
      authScheme: "Bearer"
    },
    {
      label: "Qwen Plus",
      value: "qwen-plus",
      apiBaseUrl: "https://dashscope.aliyuncs.com",
      apiPath: "/compatible-mode/v1/chat/completions",
      authHeader: "Authorization",
      authScheme: "Bearer"
    },
    {
      label: "Doubao 1.5 Pro",
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
