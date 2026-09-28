# Prompt Optimizer Extension

一个浏览器插件，在 AI 对话页面（Kimi / ChatGPT 等）的输入框旁注入 ✨ 按钮，自动分析模糊提示词、匹配提示词工程框架、分步生成结构化 Prompt。

## ✨ 特性

- **模糊度分析**：5 维度评分（目标明确度、上下文完整度、输出格式、约束条件、受众与角色）
- **场景分类**：10 类场景自动识别（写作、编程、分析、学术等）
- **框架匹配**：8 个提示词工程框架（CO-STAR / CRISPE / RISEN / RTF / RACE / APE / TAG / ReAct）
- **分步生成**：按框架逐槽位生成，进度实时展示，结构 100% 合规
- **多 Provider 支持**：Z.ai / OpenAI / Anthropic / DeepSeek / Ollama 本地
- **纯插件环境**：通过 `declarativeNetRequest` 绕过 CORS，无需额外扩展或代理
- **一键替换**：结果可直接替换输入框内容

## 🌐 支持平台

- Kimi（www.kimi.com）
- ChatGPT（chatgpt.com）
- Claude（claude.ai）
- DeepSeek（chat.deepseek.com）
- Gemini（gemini.google.com）

## 📦 安装

### 从 Release 下载（推荐）

1. 访问 [Releases](https://github.com/NickCao-1999/prompt-optimizer-extension/releases)
2. 下载最新的 `*-chrome.zip`
3. 解压到本地文件夹
4. 打开 `opera://extensions` 或 `chrome://extensions`
5. 开启「开发者模式」
6. 点击「加载已解压的扩展程序」，选择解压后的文件夹

### 从源码构建

```bash
git clone https://github.com/NickCao-1999/prompt-optimizer-extension.git
cd prompt-optimizer-extension
npm install
npm run build
# 加载 .output/chrome-mv3 目录
```

## ⚙️ 配置

点击插件图标打开 Popup，选择 AI 提供商并填入 API Key。

### 推荐配置：Z.ai（快速、免费）

| 字段 | 值 |
|------|-----|
| 提供商 | Anthropic / Z.ai |
| Base URL | `https://api.z.ai/api/anthropic` |
| 模型 | `glm-4.7-flash` |
| API Key | 从 https://z.ai/manage-apikey/apikey-list 获取 |

### 本地 Ollama（隐私、免费）

| 字段 | 值 |
|------|-----|
| 提供商 | Ollama |
| Base URL | `http://localhost:11434/v1` |
| 模型 | `deepseek-r1:7b` |

**注意**：Ollama 需要设置 CORS 环境变量：
```bash
# Windows (PowerShell)
$env:OLLAMA_ORIGINS="*"
ollama serve
```

## 🚀 使用

1. 打开任意支持的 AI 对话页面
2. 在输入框旁点击 ✨ 按钮
3. 等待分析 + 生成（云端 10-30 秒，本地 Ollama 1-3 分钟）
4. 点击「一键替换」将结果填入输入框

## 🛠️ 技术栈

- **框架**：WXT + React + TypeScript
- **构建**：Vite
- **架构**：Manifest V3，Background Service Worker + Content Script
- **CORS**：`declarativeNetRequest` 动态规则
- **存储**：`chrome.storage.local`

## 📁 项目结构

```
src/
├── entrypoints/          # 插件入口
│   ├── background.ts     # Service Worker
│   ├── content.tsx       # Content Script
│   └── popup/            # 设置页
├── core/                 # 核心引擎
│   ├── analyzer.ts       # 模糊度检测
│   ├── classifier.ts     # 场景分类
│   ├── matcher.ts        # 框架匹配
│   ├── frameworks/       # 8 个框架定义
│   └── orchestrator/     # 分步生成编排
├── inference/            # 推理层
│   ├── provider-registry.ts
│   └── providers/        # OpenAI / Anthropic 适配器
├── platform/             # 平台适配
├── ui/                   # React UI 组件
└── tasks/                # 后台任务队列
```

## 📄 License

[MIT](LICENSE)

## 🤝 贡献

欢迎提交 Issue 和 PR。