# 多语质检助手

一个适合团队内部共享的 Chrome 插件初始版，用来检查网页或本地 HTML 中的多语文案质量，并支持将检查报告导出到 macOS 备忘录与本地 Markdown 归档。

## 功能介绍

- 采集当前网页或本地 HTML 的标题、按钮、表头、字段标签、占位符等文本
- 调用你配置的大模型接口生成结构化多语质检报告
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
  install-apple-notes-bridge-launchagent.sh
launchd/
  com.multilingual-check.apple-notes-bridge.plist.example
```

## 安装插件

1. 打开 Chrome 扩展管理页：`chrome://extensions`
2. 打开右上角“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择当前仓库根目录，或者直接选择 `extension/` 目录
5. 如果需要检查本地 HTML，请在扩展详情页打开“允许访问文件网址”

## 配置说明

### 1. 模型配置

在插件侧边栏或配置页中添加一个模型配置，至少需要填写：

- `配置名称`
- `Model`
- `API Base URL`
- `API 格式`

常见配置方式：

- OpenAI Responses
  - `API Base URL`: `https://api.openai.com`
  - `API 格式`: `/v1/responses`
  - `认证 Header`: `Authorization`
  - `认证 Scheme`: `Bearer`
- Anthropic Messages
  - `API Base URL`: `https://api.anthropic.com`
  - `API 格式`: `/v1/messages`
- 兼容 OpenAI Chat 的网关
  - `API 格式`: `/v1/chat/completions`

补充说明：

- 如果接口需要鉴权，请填写 `API Key`
- 如果接口使用自定义鉴权头，可以改 `认证 Header`
- 如果接口不需要 `Bearer` 前缀，可以清空 `认证 Scheme`
- 如果你的网关依赖浏览器登录态或其他 Cookie/代理机制，可以清空 `认证 Header`

### 2. 导出配置

默认提供 Apple Notes 本地桥接导出方式，常用字段如下：

- `Apple Notes Bridge URL`：默认 `http://127.0.0.1:3894/note`
- `Apple Notes 文件夹`：默认 `多语质检`
- `本地归档目录`：默认 `~/Documents/Multilingual-QA-Reports`
- `备忘录桥接超时毫秒`：默认 `20000`

### 3. TAPD 配置

如果你希望把检查结果直接转成 TAPD 需求，可额外填写：

- `TAPD API账号`
- `TAPD 创建人用户名`
- `TAPD Token`
- `TAPD 需求列表链接`

未配置时不会影响插件的页面检查与备忘录导出。

## 使用说明

1. 打开要检查的网页，或本地 HTML 文件
2. 点击插件图标，打开右侧边栏
3. 点击“检查当前页面”
4. 等待报告生成后，在首页查看记录卡片
5. 点击某条记录进入详情页
6. 根据需要执行：
   - 忽略单条问题
   - 复制单条问题
   - 导出到备忘录
   - 创建 TAPD 需求

## Mac 备忘录接入说明

### 方式一：手动启动 bridge

在仓库根目录执行：

```bash
node bridges/apple-notes-bridge.js
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

如果你更想手动维护 `plist`，可以参考仓库中的 `launchd/com.multilingual-check.apple-notes-bridge.plist.example`。

## 共享到 GitHub 前的说明

这个初始版已经去掉了以下高风险内容：

- 仓库中的个人绝对路径
- `launchd` 配置里的本机 Node 路径
- 安装脚本中的本机仓库路径
- 默认内网 API 地址和内部专用模型预设

仍然建议在发布前再确认两件事：

- 你自己的浏览器扩展本地存储里是否还保留真实 API Key
- 你准备推送到 GitHub 的仓库是公开仓库还是团队私有仓库
