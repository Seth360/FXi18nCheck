# Fxiaoke 多语质检助手

用于检查网页或本地 HTML 的多语文案质量的 Chrome 插件，支持生成结构化质检报告、查看历史记录，并可将报告导出到 macOS 备忘录与本地 Markdown 归档。

## GitHub 简介建议

可直接放到 GitHub 仓库简介中：

`用于网页多语文案质检的 Chrome 插件，支持 FX共享 模型分析、历史记录管理，以及桥接 macOS 备忘录导出报告。`

## 最短安装步骤

给首次安装的同事，建议直接按下面 3 步操作：

1. 在 Chrome 打开 `chrome://extensions`，开启“开发者模式”，加载当前仓库的 `extension/` 目录
2. 打开插件配置，在默认的 `FX共享` 卡片中填入自己的 `API Key`
3. 如果需要导出到 macOS 备忘录，在仓库根目录执行 `zsh scripts/start-apple-notes-bridge.sh`

完成后就可以打开任意页面，点击插件图标，在右侧边栏里执行“检查当前页面”。

## 功能介绍

- 采集当前网页或本地 HTML 的标题、按钮、表头、字段标签、占位符等文本
- 调用 FX共享 或自定义模型接口生成结构化多语质检报告
- 在浏览器右侧边栏查看历史记录、详情、评分和问题列表
- 支持忽略问题、复制单条问题、回看历史检查结果
- 支持将报告导出到 Apple Notes，并同时归档为本地 Markdown 文件
- 支持可选的 TAPD 需求创建能力

## 目录结构

```text
extension/
  manifest.json
  background.js
  content.js
  icon-16.png
  icon-32.png
  icon-48.png
  icon-128.png
  sidepanel.html
  sidepanel.js
  sidepanel.css
  popup.html
  popup.js
  options.html
  options.js
  styles.css
bridges/
  apple-notes-bridge.js
scripts/
  start-apple-notes-bridge.sh
  install-apple-notes-bridge-launchagent.sh
launchd/
  com.multilingual-check.apple-notes-bridge.plist.example
```

## 安装方法

### 1. 安装插件

1. 打开 Chrome 扩展管理页：`chrome://extensions`
2. 打开右上角“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择当前仓库根目录，或者直接选择 `extension/` 目录
5. 如果需要检查本地 HTML，请在扩展详情页打开“允许访问文件网址”

### 2. 首次配置模型

插件首次安装后会预置一张 FX共享 模型卡片。

默认配置如下：

- `配置名称`: `FX共享`
- `模型名称`: `MiniMax-M2.5`
- `API Base URL`: `https://aihub.firstshare.cn`
- `API 格式`: `/v1/messages`
- `认证 Header`: `Authorization`
- `认证 Scheme`: `Bearer`

需要你或你的同事自行补充：

- `API Key`

如果不使用预设厂商，也可以不选择“模型厂商”，直接手动填写：

- `API Base URL`
- `API 格式`
- `API Key`
- `模型名称`

## 使用说明

1. 打开要检查的网页，或本地 HTML 文件
2. 点击插件图标，打开右侧边栏
3. 确认模型配置中的 `API Key` 已填写
4. 点击“检查当前页面”
5. 等待报告生成后，在首页查看记录卡片
6. 点击某条记录进入详情页
7. 根据需要执行：
   - 忽略单条问题
   - 复制单条问题
   - 导出到备忘录
   - 创建 TAPD 需求

## 模型配置说明

### 厂商预设

“模型厂商”下拉中提供常用厂商预设，包括：

- FX共享
- MiniMax(国内)
- MiniMax(国际)
- OpenAI
- Anthropic
- Gemini
- DeepSeek
- Qwen
- Doubao

选择厂商后，会自动带出对应的：

- `API Base URL`
- `API 格式`
- `认证 Header`
- `认证 Scheme`
- 默认 `模型名称`

### 保存时校验

保存模型配置时会校验：

- `配置名称`
- `API Base URL`
- `API Key`
- `模型名称`

如果填写的是自有 API，可以不选“模型厂商”，直接手动填写以上字段。

### 获取模型列表

点击“获取”按钮时，会尝试根据当前配置读取可用模型列表。

会优先校验：

- `API Base URL`
- `API Key`

如果是 MiniMax 国内/国际地址，插件会直接返回内置的常用 MiniMax 模型选项，避免请求不存在的 `/v1/models` 接口。

## Mac 备忘录桥接说明

### 适用环境

- macOS
- 已安装 Node.js
- 当前账号允许使用 Apple Notes

### 方式一：手动启动 bridge

不要在任意目录直接运行 `node bridges/apple-notes-bridge.js`，否则终端当前目录如果不是仓库根目录，就会出现 `Cannot find module .../bridges/apple-notes-bridge.js`。

推荐直接运行仓库里提供的启动脚本：

在仓库根目录执行：

```bash
zsh scripts/start-apple-notes-bridge.sh
```

启动后，插件会把导出的报告发送到本机 `http://127.0.0.1:3894/note`，bridge 会完成两件事：

- 写入 Apple Notes 指定文件夹
- 在本地归档目录生成 `.md` 文件

### 方式二：开机自动启动 bridge

如果你希望登录 macOS 后自动启动 bridge，可执行：

```bash
zsh scripts/install-apple-notes-bridge-launchagent.sh
```

这个脚本会自动：

- 读取当前仓库路径
- 读取当前机器上的 `node` 可执行文件路径
- 生成 `~/Library/LaunchAgents/com.multilingual-check.apple-notes-bridge.plist`
- 注册并启动对应的 `launchd` 服务

日志位置：

- 标准输出：`/tmp/multilingual-check-apple-notes-bridge.log`
- 错误输出：`/tmp/multilingual-check-apple-notes-bridge.err.log`

如果导出到备忘录失败，建议按这个顺序排查：

1. 先确认本地 bridge 是否正在运行
2. 如果终端报 `Cannot find module .../bridges/apple-notes-bridge.js`，说明启动命令是在错误目录执行的，请改用 `zsh scripts/start-apple-notes-bridge.sh`
3. 再确认插件中的 `Apple Notes Bridge URL` 是否为 `http://127.0.0.1:3894/note`
4. 再确认当前 macOS 账号能正常打开和写入 Apple Notes
5. 查看日志文件确认错误原因

如果你更想手动维护 `plist`，可以参考仓库中的 `launchd/com.multilingual-check.apple-notes-bridge.plist.example`。

## TAPD 配置说明

如果你希望把检查结果直接转成 TAPD 需求，可额外填写：

- `TAPD API账号`
- `TAPD 创建人用户名`
- `TAPD Token`
- `TAPD 需求列表链接`

未配置时不会影响插件的页面检查与备忘录导出。

## 共享说明

这个共享版已经去掉了以下不适合直接公开的内容：

- 仓库中的个人绝对路径
- `launchd` 配置里的本机 Node 路径
- 安装脚本中的本机仓库路径
- 任意真实 API Key 值

当前保留的 FX共享 配置仅包含团队可共用的基础参数，不包含个人密钥。
