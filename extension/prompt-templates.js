(function initFXPromptTemplates(globalScope) {
  const PROMPT_SETTING_FIELDS = [
    "singlePageSystemPrompt",
    "singlePageOutputPrompt",
    "continuousCaptureSystemPrompt",
    "continuousCaptureOutputPrompt"
  ];

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

  const BUILTIN_TEMPLATE_ID = "builtin-default";
  const DESIGN_EXPERIENCE_TEMPLATE_ID = "builtin-design-experience";
  const PROMPT_TEMPLATE_STORAGE_KEY = "promptTemplates";
  const SELECTED_PROMPT_TEMPLATE_STORAGE_KEY = "selectedPromptTemplateId";

  const DESIGN_EXPERIENCE_PROMPT_SETTINGS = {
    singlePageSystemPrompt: [
      "你是一名资深国际化 UI/UX 评审专家。请审查我提供的页面、设计稿、原型或组件方案，判断它是否满足多语言 UI 规范，并输出一份汇总报告。",
      "评审目标：",
      "确保界面在中文、英文及其他非 RTL 语言环境下，面对文案变长、语法变化、变量膨胀、日期货币格式差异、信息密度变化时，仍然清晰、完整、可读、可操作。",
      "请重点检查以下规则：",
      "1. 文本与排版",
      "- 常规英文单词不能被从中间粗暴切断，应优先按词换行。",
      "- 金额、数字、货币符号、单位必须整体显示，不能拆到两行。",
      "- 超长普通单词在不得不换行时应使用连字符；但 URL、API 字段、邮箱、路径、代码、IPv6、token 等技术字符串不能错误加连字符，且要保证可复制。",
      "- 西文多行文本优先左对齐，不要使用两端对齐。",
      "- 西文半角标点后保留半角空格；中文/日文/韩文按各自标点习惯处理，不要混用。",
      "- 大小写要合规：普通 UI 文案优先 Sentence case，标题/导航按场景使用 Title Case，缩写全大写，专有名词和品牌名保持正确写法。",
      "- 常规加粗英文文案可使用轻微负字距优化视觉紧凑度，建议值如 `letter-spacing: -0.14px`；但代码、技术字符串、超小字号、全大写缩写等内容不应机械套用，若影响可读性应优先回退。",
      "- 不要把输入框、下拉框、日期控件硬嵌在自然语言句子中；若必须嵌入，先翻译完整句子，再用变量占位符动态替换。",
      "- 弹窗、提示、详情、错误说明等受限空间内，不能依赖截断隐藏关键信息；应优先优化布局、预留换行空间、必要时精简文案。",
      "- 行高只服务于可读性，不要用超大 line-height 撑开垂直间距；间距应用 padding/margin 控制。",
      "",
      "2. 中英布局适配",
      "- 中文标签较短时可左右排布；英文标签较长时应改为上下排布。",
      "- 中文按钮可平铺；英文按钮过长时应收纳进“更多”菜单，而不是强行压缩或截断。",
      "- 中文适合高密度宫格；英文更适合列表或降低列数，优先保证完整可读。",
      "- 同一行内若存在数量、金额、状态、时间等可变长内容，英文场景下应允许整体换行，避免冲突。",
      "- 按钮组、选项卡、功能入口、网格列表要根据英文长度主动降列数、拉开间距、调整布局。",
      "",
      "3. 补充检查维度",
      "- 复数、语法、词序变化是否被正确处理，而不是只做字符串替换。",
      "- 日期、时间、时区、12/24 小时制是否符合 locale，且不会引起歧义或布局溢出。",
      "- 数字、货币、百分比、单位、千分位、小数点、负数格式是否本地化正确。",
      "- 姓名、地址、电话、邮编、州省国家等地区差异字段是否支持不同结构。",
      "- 用户名、组织名、商品名、文件名等动态变量是否会撑坏布局。",
      "- 搜索、筛选、表格列、表头、标签、状态字段是否因翻译变长而错位、拥挤或换行异常。",
      "- 空状态、错误态、Toast、Tooltip、表单校验文案、帮助文案是否被忽略。",
      "- 是否明确区分“可截断内容”和“不可截断内容”；例如金额、状态、订单号、错误信息、详情正文通常不应截断。",
      "- 图片中的嵌字、运营图、banner、插图是否也考虑了多语言替换。",
      "- 导出 PDF、打印页、邮件模板、推送通知、分享卡片等非主页面场景是否也能适配。",
      "- 可访问性是否受影响，包括语言标记、aria-label、朗读顺序、数字和单位的可理解性。"
    ].join("\n"),
    singlePageOutputPrompt: DEFAULT_PROMPT_SETTINGS.singlePageOutputPrompt,
    continuousCaptureSystemPrompt: [
      "你是一名资深国际化 UI/UX 评审专家。请审查我提供的页面、设计稿、原型或组件方案，判断它是否满足多语言 UI 规范，审查用户在连续点击过程中经过的所有页面、弹窗、浮层的多语设计质量，并输出一份汇总报告。",
      "评审目标：",
      "确保界面在中文、英文及其他非 RTL 语言环境下，面对文案变长、语法变化、变量膨胀、日期货币格式差异、信息密度变化时，仍然清晰、完整、可读、可操作。",
      "请重点检查以下规则：",
      "1.多个步骤之间术语、按钮、表头、字段名、状态名是否一致。",
      "2. 页面与弹窗/浮层之间是否存在文案冲突、命名不一致、语义断裂。",
      "3. 是否存在国际化风险，例如语序写死、文案拼接、对中文上下文过度依赖。",
      "4. 是否存在长度/布局风险，例如英文变长后易截断、按钮过短、表头空间不足。",
      "5. 是否存在缺失文案、提示语不完整、操作语义不明确的问题。",
      "6. 同一个问题如果在多个步骤重复出现，请合并为一条 finding，并在 evidence 中写明涉及步骤。",
      "7. 只根据输入数据做判断，不要编造页面上不存在的元素。",
      "8. 输出必须是 JSON 对象，不要输出 markdown code fence。",
      "9. JSON 必须严格合法：属性名和字符串值都使用双引号，属性之间不要漏逗号，字符串里的双引号必须转义。",
      "补充：",
      "1. 文本与排版",
      "- 常规英文单词不能被从中间粗暴切断，应优先按词换行。",
      "- 金额、数字、货币符号、单位必须整体显示，不能拆到两行。",
      "- 超长普通单词在不得不换行时应使用连字符；但 URL、API 字段、邮箱、路径、代码、IPv6、token 等技术字符串不能错误加连字符，且要保证可复制。",
      "- 西文多行文本优先左对齐，不要使用两端对齐。",
      "- 西文半角标点后保留半角空格；中文/日文/韩文按各自标点习惯处理，不要混用。",
      "- 大小写要合规：普通 UI 文案优先 Sentence case，标题/导航按场景使用 Title Case，缩写全大写，专有名词和品牌名保持正确写法。",
      "- 常规加粗英文文案可使用轻微负字距优化视觉紧凑度，建议值如 `letter-spacing: -0.14px`；但代码、技术字符串、超小字号、全大写缩写等内容不应机械套用，若影响可读性应优先回退。",
      "- 不要把输入框、下拉框、日期控件硬嵌在自然语言句子中；若必须嵌入，先翻译完整句子，再用变量占位符动态替换。",
      "- 弹窗、提示、详情、错误说明等受限空间内，不能依赖截断隐藏关键信息；应优先优化布局、预留换行空间、必要时精简文案。",
      "- 行高只服务于可读性，不要用超大 line-height 撑开垂直间距；间距应用 padding/margin 控制。",
      "",
      "2. 中英布局适配",
      "- 中文标签较短时可左右排布；英文标签较长时应改为上下排布。",
      "- 中文按钮可平铺；英文按钮过长时应收纳进“更多”菜单，而不是强行压缩或截断。",
      "- 中文适合高密度宫格；英文更适合列表或降低列数，优先保证完整可读。",
      "- 同一行内若存在数量、金额、状态、时间等可变长内容，英文场景下应允许整体换行，避免冲突。",
      "- 按钮组、选项卡、功能入口、网格列表要根据英文长度主动降列数、拉开间距、调整布局。",
      "",
      "3. 补充检查维度",
      "- 复数、语法、词序变化是否被正确处理，而不是只做字符串替换。",
      "- 日期、时间、时区、12/24 小时制是否符合 locale，且不会引起歧义或布局溢出。",
      "- 数字、货币、百分比、单位、千分位、小数点、负数格式是否本地化正确。",
      "- 姓名、地址、电话、邮编、州省国家等地区差异字段是否支持不同结构。",
      "- 用户名、组织名、商品名、文件名等动态变量是否会撑坏布局。",
      "- 搜索、筛选、表格列、表头、标签、状态字段是否因翻译变长而错位、拥挤或换行异常。",
      "- 空状态、错误态、Toast、Tooltip、表单校验文案、帮助文案是否被忽略。",
      "- 是否明确区分“可截断内容”和“不可截断内容”；例如金额、状态、订单号、错误信息、详情正文通常不应截断。",
      "- 图片中的嵌字、运营图、banner、插图是否也考虑了多语言替换。",
      "- 导出 PDF、打印页、邮件模板、推送通知、分享卡片等非主页面场景是否也能适配。",
      "- 可访问性是否受影响，包括语言标记、aria-label、朗读顺序、数字和单位的可理解性。"
    ].join("\n"),
    continuousCaptureOutputPrompt: DEFAULT_PROMPT_SETTINGS.continuousCaptureOutputPrompt
  };

  function clonePromptSettings(values) {
    const cloned = {};
    for (const key of PROMPT_SETTING_FIELDS) {
      const normalizedValue = String(values?.[key] ?? "").trim();
      cloned[key] = normalizedValue || DEFAULT_PROMPT_SETTINGS[key] || "";
    }
    return cloned;
  }

  function normalizePromptTemplate(template, index, builtinTemplateMap = new Map()) {
    if (!template || typeof template !== "object") {
      return null;
    }
    const normalizedId = String(template.id || `custom-template-${index || Date.now()}`).trim();
    const builtinTemplate = builtinTemplateMap.get(normalizedId) || null;
    const defaultName = builtinTemplate?.name || `自定义模板 ${index || 1}`;
    const normalizedName = String(template.name || defaultName).trim();
    const initialValues = clonePromptSettings(template.initialValues || builtinTemplate?.values || template.values);
    return {
      id: normalizedId,
      name: normalizedName || defaultName,
      builtIn: Boolean(template.builtIn || builtinTemplate),
      deleted: Boolean(template.deleted),
      initialValues,
      values: clonePromptSettings(template.values || initialValues)
    };
  }

  function getDefaultPromptSettings() {
    return clonePromptSettings(DEFAULT_PROMPT_SETTINGS);
  }

  function getBuiltinPromptTemplates() {
    return [
      {
        id: BUILTIN_TEMPLATE_ID,
        name: "通用",
        builtIn: true,
        values: getDefaultPromptSettings()
      },
      {
        id: DESIGN_EXPERIENCE_TEMPLATE_ID,
        name: "设计体验",
        builtIn: true,
        values: clonePromptSettings(DESIGN_EXPERIENCE_PROMPT_SETTINGS)
      }
    ];
  }

  function getBuiltinPromptTemplate(templateId = BUILTIN_TEMPLATE_ID) {
    return getBuiltinPromptTemplates().find((item) => item.id === templateId) || getBuiltinPromptTemplates()[0];
  }

  function createStoredPromptTemplate(template, { deleted = false } = {}) {
    const initialValues = clonePromptSettings(template.initialValues || template.values);
    return {
      id: template.id,
      name: template.name,
      builtIn: Boolean(template.builtIn),
      deleted,
      initialValues,
      values: clonePromptSettings(template.values || initialValues)
    };
  }

  function getStoredBuiltinPromptTemplates() {
    return getBuiltinPromptTemplates().map((template) => createStoredPromptTemplate(template));
  }

  function normalizeStoredPromptTemplates(templates) {
    const builtinTemplates = getBuiltinPromptTemplates();
    const builtinTemplateMap = new Map(builtinTemplates.map((item) => [item.id, item]));
    const builtinIds = new Set(builtinTemplates.map((item) => item.id));
    const normalizedTemplates = Array.isArray(templates)
      ? templates
          .map((item, index) => normalizePromptTemplate(item, index + 1, builtinTemplateMap))
          .filter(Boolean)
      : [];
    const templateMap = new Map(normalizedTemplates.map((item) => [item.id, item]));
    const hasStoredBuiltin = normalizedTemplates.some((item) => builtinIds.has(item.id));
    const result = [];

    if (!hasStoredBuiltin) {
      result.push(...getStoredBuiltinPromptTemplates());
    } else {
      result.push(templateMap.get(BUILTIN_TEMPLATE_ID) || createStoredPromptTemplate(getBuiltinPromptTemplate(BUILTIN_TEMPLATE_ID)));
      for (const builtinTemplate of builtinTemplates) {
        if (builtinTemplate.id === BUILTIN_TEMPLATE_ID) {
          continue;
        }
        const storedTemplate = templateMap.get(builtinTemplate.id);
        if (storedTemplate) {
          result.push(storedTemplate);
        }
      }
    }

    for (const template of normalizedTemplates) {
      if (!builtinIds.has(template.id)) {
        result.push(template);
      }
    }

    return result;
  }

  function mergeWithBuiltinTemplates(customTemplates) {
    return normalizeStoredPromptTemplates(customTemplates).filter((item) => !item.deleted);
  }

  function findPromptTemplate(templates, templateId) {
    return normalizeStoredPromptTemplates(templates).find((item) => item.id === templateId) || null;
  }

  function findMatchingTemplateId(values, templates) {
    const normalizedValues = clonePromptSettings(values);
    const matched = mergeWithBuiltinTemplates(templates).find((template) =>
      PROMPT_SETTING_FIELDS.every((field) => template.values[field] === normalizedValues[field])
    );
    return matched?.id || BUILTIN_TEMPLATE_ID;
  }

  globalScope.FXPromptTemplates = {
    PROMPT_SETTING_FIELDS,
    PROMPT_TEMPLATE_STORAGE_KEY,
    SELECTED_PROMPT_TEMPLATE_STORAGE_KEY,
    BUILTIN_TEMPLATE_ID,
    DESIGN_EXPERIENCE_TEMPLATE_ID,
    getDefaultPromptSettings,
    getBuiltinPromptTemplate,
    getBuiltinPromptTemplates,
    getStoredBuiltinPromptTemplates,
    normalizeStoredPromptTemplates,
    createStoredPromptTemplate,
    mergeWithBuiltinTemplates,
    findPromptTemplate,
    findMatchingTemplateId,
    clonePromptSettings
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
