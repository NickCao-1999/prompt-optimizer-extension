var background = (function() {
	//#region node_modules/wxt/dist/utils/define-background.mjs
	function defineBackground(arg) {
		if (arg == null || typeof arg === "function") return { main: arg };
		return arg;
	}
	//#endregion
	//#region src/tasks/task-queue.ts
	var QUEUE_KEY = "task_queue";
	var TaskQueue = class {
		tasks = /* @__PURE__ */ new Map();
		loaded = false;
		async load() {
			if (this.loaded) return;
			const list = (await chrome.storage.local.get(QUEUE_KEY))[QUEUE_KEY] ?? [];
			this.tasks = new Map(list.map((t) => [t.id, t]));
			this.loaded = true;
		}
		async persist() {
			await chrome.storage.local.set({ [QUEUE_KEY]: Array.from(this.tasks.values()) });
		}
		async create(originalPrompt, pageUrl, frameworkId) {
			await this.load();
			const task = {
				id: crypto.randomUUID(),
				originalPrompt,
				pageUrl,
				frameworkId,
				status: "queued",
				progress: {
					stage: "queued",
					currentSlot: "",
					completedSlots: 0,
					totalSlots: 0,
					elapsedMs: 0
				},
				createdAt: Date.now()
			};
			this.tasks.set(task.id, task);
			await this.persist();
			return task;
		}
		async update(id, patch) {
			await this.load();
			const task = this.tasks.get(id);
			if (!task) return void 0;
			const next = {
				...task,
				...patch
			};
			this.tasks.set(id, next);
			await this.persist();
			return next;
		}
		async updateProgress(id, progress) {
			await this.load();
			const task = this.tasks.get(id);
			if (!task) return;
			task.progress = {
				...task.progress,
				...progress
			};
			this.tasks.set(id, task);
			await this.persist();
		}
		async get(id) {
			await this.load();
			return this.tasks.get(id);
		}
		async list() {
			await this.load();
			return Array.from(this.tasks.values()).sort((a, b) => b.createdAt - a.createdAt);
		}
		async nextQueued() {
			await this.load();
			return Array.from(this.tasks.values()).filter((t) => t.status === "queued").sort((a, b) => a.createdAt - b.createdAt)[0];
		}
		async cancel(id) {
			await this.load();
			const task = this.tasks.get(id);
			if (!task) return false;
			if (task.status !== "queued") return false;
			task.status = "cancelled";
			this.tasks.set(id, task);
			await this.persist();
			return true;
		}
		async remove(id) {
			await this.load();
			this.tasks.delete(id);
			await this.persist();
		}
	};
	var taskQueue = new TaskQueue();
	//#endregion
	//#region src/core/frameworks/index.ts
	var FRAMEWORKS = [
		{
			id: "co-star",
			name: "CO-STAR",
			description: "适用于内容创作、营销文案、学术写作的结构化框架，强调上下文与受众。",
			complexity: "medium",
			applicableScenes: [
				"writing",
				"creative",
				"academic",
				"translation"
			],
			aliases: [
				"costar",
				"co star",
				"COSTAR"
			],
			template: [
				"# Context\n{context}",
				"# Objective\n{objective}",
				"# Style\n{style}",
				"# Tone\n{tone}",
				"# Audience\n{audience}",
				"# Response\n{response}"
			].join("\n\n"),
			slots: [
				{
					id: "context",
					name: "Context",
					description: "任务的背景、场景、受众所处的环境",
					required: true,
					generationOrder: 1,
					jsonSchema: {
						type: "string",
						minLength: 10,
						maxLength: 300
					},
					maxTokens: 200,
					systemPrompt: [
						"你是提示词工程专家。请为 CO-STAR 框架生成 \"Context\"（背景）部分。",
						"要求：",
						"1. 只输出 Context 部分的内容，不要加任何前缀或标签。",
						"2. 简洁、具体，提供任务必要的背景信息。",
						"3. 长度控制在 300 字以内。"
					].join("\n"),
					fewShotExamples: [{
						userInput: "帮我写一篇关于AI的文章",
						generatedValue: "用户需要一篇面向大众的 AI 科普文章，用于发布在科技博客上，读者对 AI 有基础认知但非技术背景。"
					}, {
						userInput: "写个小红书文案推广咖啡",
						generatedValue: "用户需要一条小红书风格的种草文案，用于推广一款新上市的手冲咖啡，目标读者是 20-35 岁都市白领。"
					}]
				},
				{
					id: "objective",
					name: "Objective",
					description: "明确任务目标，即希望达成的结果",
					required: true,
					generationOrder: 2,
					dependsOn: ["context"],
					jsonSchema: {
						type: "string",
						minLength: 10,
						maxLength: 200
					},
					maxTokens: 150,
					systemPrompt: [
						"你是提示词工程专家。请为 CO-STAR 框架生成 \"Objective\"（目标）部分。",
						"要求：",
						"1. 只输出 Objective 部分的内容。",
						"2. 目标需具体、可验证。",
						"3. 长度控制在 200 字以内。"
					].join("\n"),
					fewShotExamples: [{
						userInput: "帮我写一篇关于AI的文章",
						generatedValue: "写一篇 800 字左右的科普文章，用通俗语言解释 AI 的基本原理、典型应用和潜在风险。"
					}]
				},
				{
					id: "style",
					name: "Style",
					description: "指定写作风格",
					required: true,
					generationOrder: 3,
					jsonSchema: {
						type: "string",
						minLength: 5,
						maxLength: 100
					},
					maxTokens: 80,
					systemPrompt: "你是提示词工程专家。请为 CO-STAR 框架生成 \"Style\"（风格）部分，只输出内容，控制在 100 字以内。",
					fewShotExamples: [{
						userInput: "帮我写一篇关于AI的文章",
						generatedValue: "科普风格，类比丰富，避免专业术语。"
					}]
				},
				{
					id: "tone",
					name: "Tone",
					description: "指定语气",
					required: true,
					generationOrder: 4,
					jsonSchema: {
						type: "string",
						minLength: 3,
						maxLength: 80
					},
					maxTokens: 60,
					systemPrompt: "你是提示词工程专家。请为 CO-STAR 框架生成 \"Tone\"（语气）部分，只输出内容，控制在 80 字以内。",
					fewShotExamples: [{
						userInput: "帮我写一篇关于AI的文章",
						generatedValue: "友好、易懂、略带趣味，避免说教。"
					}]
				},
				{
					id: "audience",
					name: "Audience",
					description: "明确目标受众",
					required: true,
					generationOrder: 5,
					jsonSchema: {
						type: "string",
						minLength: 5,
						maxLength: 120
					},
					maxTokens: 80,
					systemPrompt: "你是提示词工程专家。请为 CO-STAR 框架生成 \"Audience\"（受众）部分，只输出内容，控制在 120 字以内。",
					fewShotExamples: [{
						userInput: "帮我写一篇关于AI的文章",
						generatedValue: "对 AI 有基础认知但非技术背景的普通读者。"
					}]
				},
				{
					id: "response",
					name: "Response",
					description: "期望的输出格式，例如字数、结构、是否用 Markdown、包含哪些章节",
					required: true,
					generationOrder: 6,
					jsonSchema: {
						type: "string",
						minLength: 10,
						maxLength: 250
					},
					maxTokens: 200,
					systemPrompt: [
						"你是提示词工程专家。请为 CO-STAR 框架生成 \"Response\"（输出格式）部分。",
						"要求：",
						"1. 只描述\"输出应该长什么样\"，例如：字数范围、章节结构、格式（Markdown/表格/列表）、是否需要图表。",
						"2. 不要写背景、目标、受众等已有槽位的内容。",
						"3. 长度控制在 250 字以内。"
					].join("\n"),
					fewShotExamples: [{
						userInput: "帮我写一篇关于AI的文章",
						generatedValue: "Markdown 格式，包含引言、3 个核心章节、结语。每节 200-300 字，适当使用小标题。全文 800 字左右。"
					}, {
						userInput: "帮我撰写一份换热器 EI 论文大纲",
						generatedValue: "使用多级 Markdown 标题（## / ###）。每章列出 3-5 条要点，每条 ≤40 字。方法章节注明具体手段。附预期图表清单，含图题与表题。"
					}]
				}
			],
			examples: [{
				originalPrompt: "帮我写一篇关于AI的文章",
				optimizedPrompt: [
					"# Context",
					"用户需要一篇面向大众的 AI 科普文章，用于发布在科技博客上。",
					"",
					"# Objective",
					"写一篇 800 字的科普文章，解释 AI 基本原理、应用和风险。",
					"",
					"# Style",
					"科普风格，类比丰富，避免专业术语。",
					"",
					"# Tone",
					"友好、易懂、略带趣味。",
					"",
					"# Audience",
					"对 AI 有基础认知但非技术背景的普通读者。",
					"",
					"# Response",
					"Markdown 格式，包含引言、3 个核心章节、结语。"
				].join("\n")
			}]
		},
		{
			id: "crispe",
			name: "CRISPE",
			description: "适用于商业分析、项目管理、Agent 编排的六要素框架。",
			complexity: "medium",
			applicableScenes: [
				"business",
				"analysis",
				"agent"
			],
			aliases: ["crispe"],
			template: [
				"# Capacity and Role\n{capacity}",
				"# Request\n{request}",
				"# Insight\n{insight}",
				"# Style\n{style}",
				"# Personality\n{personality}",
				"# Experiment\n{experiment}"
			].join("\n\n"),
			slots: [
				{
					id: "capacity",
					name: "Capacity and Role",
					description: "AI 应扮演的角色和能力",
					required: true,
					generationOrder: 1,
					jsonSchema: {
						type: "string",
						minLength: 10,
						maxLength: 200
					},
					maxTokens: 150,
					systemPrompt: ["你是提示词工程专家。请为 CRISPE 框架生成 \"Capacity and Role\"（角色与能力）部分。", "要求：只输出该部分内容，简洁具体，控制在 200 字以内。"].join("\n"),
					fewShotExamples: [{
						userInput: "帮我分析一下这个季度的销售数据",
						generatedValue: "你是一位拥有 10 年经验的高级数据分析师，擅长从销售数据中发现增长机会和风险信号。"
					}]
				},
				{
					id: "request",
					name: "Request",
					description: "具体请求的任务",
					required: true,
					generationOrder: 2,
					dependsOn: ["capacity"],
					jsonSchema: {
						type: "string",
						minLength: 10,
						maxLength: 300
					},
					maxTokens: 200,
					systemPrompt: "你是提示词工程专家。请为 CRISPE 框架生成 \"Request\"（请求）部分，只输出内容，控制在 300 字以内。",
					fewShotExamples: [{
						userInput: "帮我分析一下这个季度的销售数据",
						generatedValue: "分析本季度销售数据，识别同比增长和下降的关键品类，指出 Top 3 增长机会和 Top 3 风险点。"
					}]
				},
				{
					id: "insight",
					name: "Insight",
					description: "提供背景洞察和上下文",
					required: true,
					generationOrder: 3,
					jsonSchema: {
						type: "string",
						minLength: 10,
						maxLength: 300
					},
					maxTokens: 200,
					systemPrompt: "你是提示词工程专家。请为 CRISPE 框架生成 \"Insight\"（洞察）部分，只输出内容，控制在 300 字以内。",
					fewShotExamples: [{
						userInput: "帮我分析一下这个季度的销售数据",
						generatedValue: "公司主营业务为快消品，本季度受季节性因素和促销活动影响较大，需重点关注线上渠道表现。"
					}]
				},
				{
					id: "style",
					name: "Style",
					description: "输出风格",
					required: true,
					generationOrder: 4,
					jsonSchema: {
						type: "string",
						minLength: 5,
						maxLength: 100
					},
					maxTokens: 80,
					systemPrompt: "你是提示词工程专家。请为 CRISPE 框架生成 \"Style\"（风格）部分，只输出内容，控制在 100 字以内。",
					fewShotExamples: [{
						userInput: "帮我分析一下这个季度的销售数据",
						generatedValue: "结构化分析报告风格，数据驱动，结论先行。"
					}]
				},
				{
					id: "personality",
					name: "Personality",
					description: "AI 的语气和个性",
					required: true,
					generationOrder: 5,
					jsonSchema: {
						type: "string",
						minLength: 5,
						maxLength: 100
					},
					maxTokens: 80,
					systemPrompt: "你是提示词工程专家。请为 CRISPE 框架生成 \"Personality\"（语气个性）部分，只输出内容，控制在 100 字以内。",
					fewShotExamples: [{
						userInput: "帮我分析一下这个季度的销售数据",
						generatedValue: "专业、客观、直接，避免模棱两可的表述。"
					}]
				},
				{
					id: "experiment",
					name: "Experiment",
					description: "期望的实验或多种输出",
					required: false,
					generationOrder: 6,
					jsonSchema: {
						type: "string",
						minLength: 5,
						maxLength: 200
					},
					maxTokens: 120,
					systemPrompt: "你是提示词工程专家。请为 CRISPE 框架生成 \"Experiment\"（实验）部分，如无明确需求可输出\"无需额外实验\"。只输出内容，控制在 200 字以内。",
					fewShotExamples: [{
						userInput: "帮我分析一下这个季度的销售数据",
						generatedValue: "请提供两种分析视角：乐观情形与保守情形，并说明各自假设。"
					}]
				}
			],
			examples: [{
				originalPrompt: "帮我分析一下这个季度的销售数据",
				optimizedPrompt: "# Capacity and Role\n你是一位高级数据分析师...\n\n# Request\n分析本季度销售数据...\n\n# Insight\n公司主营业务为快消品...\n\n# Style\n结构化分析报告风格...\n\n# Personality\n专业、客观、直接...\n\n# Experiment\n请提供两种分析视角..."
			}]
		},
		{
			id: "risen",
			name: "RISEN",
			description: "适用于编程、学术、教育场景的结构化框架。",
			complexity: "medium",
			applicableScenes: [
				"coding",
				"academic",
				"education"
			],
			aliases: ["risen"],
			template: [
				"# Role\n{role}",
				"# Instructions\n{instructions}",
				"# Steps\n{steps}",
				"# End Goal\n{end_goal}",
				"# Narrowing\n{narrowing}"
			].join("\n\n"),
			slots: [
				{
					id: "role",
					name: "Role",
					description: "AI 扮演的角色",
					required: true,
					generationOrder: 1,
					jsonSchema: {
						type: "string",
						minLength: 5,
						maxLength: 150
					},
					maxTokens: 100,
					systemPrompt: "你是提示词工程专家。请为 RISEN 框架生成 \"Role\"（角色）部分，只输出内容，控制在 150 字以内。",
					fewShotExamples: [{
						userInput: "帮我写个 Python 爬虫",
						generatedValue: "你是一位资深 Python 后端工程师，精通网络爬虫、反爬策略与数据清洗。"
					}]
				},
				{
					id: "instructions",
					name: "Instructions",
					description: "具体指令",
					required: true,
					generationOrder: 2,
					dependsOn: ["role"],
					jsonSchema: {
						type: "string",
						minLength: 10,
						maxLength: 300
					},
					maxTokens: 200,
					systemPrompt: "你是提示词工程专家。请为 RISEN 框架生成 \"Instructions\"（指令）部分，只输出内容，控制在 300 字以内。",
					fewShotExamples: [{
						userInput: "帮我写个 Python 爬虫",
						generatedValue: "编写一个爬取某电商网站商品列表的 Python 爬虫，包含请求、解析、存储三个模块。"
					}]
				},
				{
					id: "steps",
					name: "Steps",
					description: "执行步骤",
					required: true,
					generationOrder: 3,
					jsonSchema: {
						type: "string",
						minLength: 10,
						maxLength: 400
					},
					maxTokens: 250,
					systemPrompt: "你是提示词工程专家。请为 RISEN 框架生成 \"Steps\"（步骤）部分，只输出内容，控制在 400 字以内。",
					fewShotExamples: [{
						userInput: "帮我写个 Python 爬虫",
						generatedValue: "1. 分析目标页面结构\n2. 使用 requests 获取列表页\n3. 用 BeautifulSoup 解析商品信息\n4. 存入 CSV 文件\n5. 加入随机延迟与 User-Agent 轮换"
					}]
				},
				{
					id: "end_goal",
					name: "End Goal",
					description: "最终目标",
					required: true,
					generationOrder: 4,
					jsonSchema: {
						type: "string",
						minLength: 5,
						maxLength: 200
					},
					maxTokens: 120,
					systemPrompt: "你是提示词工程专家。请为 RISEN 框架生成 \"End Goal\"（最终目标）部分，只输出内容，控制在 200 字以内。",
					fewShotExamples: [{
						userInput: "帮我写个 Python 爬虫",
						generatedValue: "交付一个可直接运行、结构清晰、具备基础反爬能力的爬虫脚本。"
					}]
				},
				{
					id: "narrowing",
					name: "Narrowing",
					description: "范围限制",
					required: false,
					generationOrder: 5,
					jsonSchema: {
						type: "string",
						minLength: 5,
						maxLength: 200
					},
					maxTokens: 120,
					systemPrompt: "你是提示词工程专家。请为 RISEN 框架生成 \"Narrowing\"（范围限制）部分，只输出内容，控制在 200 字以内。",
					fewShotExamples: [{
						userInput: "帮我写个 Python 爬虫",
						generatedValue: "仅处理静态页面，不涉及登录和验证码，代码不超过 150 行。"
					}]
				}
			],
			examples: [{
				originalPrompt: "帮我写个 Python 爬虫",
				optimizedPrompt: "# Role\n你是一位资深 Python 后端工程师...\n\n# Instructions\n编写一个爬取某电商网站商品列表的 Python 爬虫...\n\n# Steps\n1. 分析目标页面结构...\n\n# End Goal\n交付一个可直接运行的爬虫脚本...\n\n# Narrowing\n仅处理静态页面..."
			}]
		},
		{
			id: "rtf",
			name: "RTF",
			description: "最简三要素框架，适合快速明确任务。",
			complexity: "simple",
			applicableScenes: ["coding", "general"],
			aliases: ["rtf"],
			template: [
				"# Role\n{role}",
				"# Task\n{task}",
				"# Format\n{format}"
			].join("\n\n"),
			slots: [
				{
					id: "role",
					name: "Role",
					description: "AI 扮演的角色",
					required: true,
					generationOrder: 1,
					jsonSchema: {
						type: "string",
						minLength: 5,
						maxLength: 100
					},
					maxTokens: 80,
					systemPrompt: "你是提示词工程专家。请为 RTF 框架生成 \"Role\"（角色）部分，只输出内容，控制在 100 字以内。",
					fewShotExamples: [{
						userInput: "帮我写一段正则匹配邮箱",
						generatedValue: "你是一位精通正则表达式的高级工程师。"
					}]
				},
				{
					id: "task",
					name: "Task",
					description: "具体任务",
					required: true,
					generationOrder: 2,
					dependsOn: ["role"],
					jsonSchema: {
						type: "string",
						minLength: 10,
						maxLength: 300
					},
					maxTokens: 200,
					systemPrompt: "你是提示词工程专家。请为 RTF 框架生成 \"Task\"（任务）部分，只输出内容，控制在 300 字以内。",
					fewShotExamples: [{
						userInput: "帮我写一段正则匹配邮箱",
						generatedValue: "编写一段用于匹配标准邮箱地址的正则表达式，并附上使用示例。"
					}]
				},
				{
					id: "format",
					name: "Format",
					description: "输出格式",
					required: true,
					generationOrder: 3,
					jsonSchema: {
						type: "string",
						minLength: 5,
						maxLength: 150
					},
					maxTokens: 100,
					systemPrompt: "你是提示词工程专家。请为 RTF 框架生成 \"Format\"（格式）部分，只输出内容，控制在 150 字以内。",
					fewShotExamples: [{
						userInput: "帮我写一段正则匹配邮箱",
						generatedValue: "先给出正则表达式代码块，再用 3-5 行说明匹配规则。"
					}]
				}
			],
			examples: [{
				originalPrompt: "帮我写一段正则匹配邮箱",
				optimizedPrompt: "# Role\n你是一位精通正则表达式的高级工程师。\n\n# Task\n编写一段用于匹配标准邮箱地址的正则表达式...\n\n# Format\n先给出正则表达式代码块..."
			}]
		},
		{
			id: "race",
			name: "RACE",
			description: "适用于分析、翻译、教育场景的四要素框架。",
			complexity: "simple",
			applicableScenes: [
				"analysis",
				"translation",
				"education"
			],
			aliases: ["race"],
			template: [
				"# Role\n{role}",
				"# Action\n{action}",
				"# Context\n{context}",
				"# Explanation\n{explanation}"
			].join("\n\n"),
			slots: [
				{
					id: "role",
					name: "Role",
					description: "AI 扮演的角色",
					required: true,
					generationOrder: 1,
					jsonSchema: {
						type: "string",
						minLength: 5,
						maxLength: 150
					},
					maxTokens: 100,
					systemPrompt: "你是提示词工程专家。请为 RACE 框架生成 \"Role\"（角色）部分，只输出内容，控制在 150 字以内。",
					fewShotExamples: [{
						userInput: "把这段英文翻译成中文",
						generatedValue: "你是一位专业中英互译译者，精通技术文档翻译。"
					}]
				},
				{
					id: "action",
					name: "Action",
					description: "要执行的动作",
					required: true,
					generationOrder: 2,
					dependsOn: ["role"],
					jsonSchema: {
						type: "string",
						minLength: 10,
						maxLength: 300
					},
					maxTokens: 200,
					systemPrompt: "你是提示词工程专家。请为 RACE 框架生成 \"Action\"（动作）部分，只输出内容，控制在 300 字以内。",
					fewShotExamples: [{
						userInput: "把这段英文翻译成中文",
						generatedValue: "将用户提供的英文段落翻译成中文，保持原意与技术准确性。"
					}]
				},
				{
					id: "context",
					name: "Context",
					description: "背景上下文",
					required: true,
					generationOrder: 3,
					jsonSchema: {
						type: "string",
						minLength: 10,
						maxLength: 300
					},
					maxTokens: 200,
					systemPrompt: "你是提示词工程专家。请为 RACE 框架生成 \"Context\"（上下文）部分，只输出内容，控制在 300 字以内。",
					fewShotExamples: [{
						userInput: "把这段英文翻译成中文",
						generatedValue: "文本属于技术文档，面向中文开发者读者，需保持术语一致。"
					}]
				},
				{
					id: "explanation",
					name: "Explanation",
					description: "期望的说明或补充",
					required: false,
					generationOrder: 4,
					jsonSchema: {
						type: "string",
						minLength: 5,
						maxLength: 200
					},
					maxTokens: 120,
					systemPrompt: "你是提示词工程专家。请为 RACE 框架生成 \"Explanation\"（说明）部分，只输出内容，控制在 200 字以内。",
					fewShotExamples: [{
						userInput: "把这段英文翻译成中文",
						generatedValue: "对生僻术语附上英文原文，必要时给出 1-2 句译注。"
					}]
				}
			],
			examples: [{
				originalPrompt: "把这段英文翻译成中文",
				optimizedPrompt: "# Role\n你是一位专业中英互译译者...\n\n# Action\n将用户提供的英文段落翻译成中文...\n\n# Context\n文本属于技术文档...\n\n# Explanation\n对生僻术语附上英文原文..."
			}]
		},
		{
			id: "ape",
			name: "APE",
			description: "最简三要素框架，适合写作与通用场景。",
			complexity: "simple",
			applicableScenes: [
				"writing",
				"general",
				"creative"
			],
			aliases: ["ape"],
			template: [
				"# Action\n{action}",
				"# Purpose\n{purpose}",
				"# Execution\n{execution}"
			].join("\n\n"),
			slots: [
				{
					id: "action",
					name: "Action",
					description: "要执行的动作",
					required: true,
					generationOrder: 1,
					jsonSchema: {
						type: "string",
						minLength: 10,
						maxLength: 200
					},
					maxTokens: 120,
					systemPrompt: "你是提示词工程专家。请为 APE 框架生成 \"Action\"（动作）部分，只输出内容，控制在 200 字以内。",
					fewShotExamples: [{
						userInput: "帮我写个产品介绍",
						generatedValue: "撰写一段面向潜在客户的产品介绍文案。"
					}]
				},
				{
					id: "purpose",
					name: "Purpose",
					description: "目的",
					required: true,
					generationOrder: 2,
					dependsOn: ["action"],
					jsonSchema: {
						type: "string",
						minLength: 10,
						maxLength: 200
					},
					maxTokens: 120,
					systemPrompt: "你是提示词工程专家。请为 APE 框架生成 \"Purpose\"（目的）部分，只输出内容，控制在 200 字以内。",
					fewShotExamples: [{
						userInput: "帮我写个产品介绍",
						generatedValue: "突出产品的核心卖点，激发读者兴趣并促成咨询。"
					}]
				},
				{
					id: "execution",
					name: "Execution",
					description: "执行方式",
					required: true,
					generationOrder: 3,
					jsonSchema: {
						type: "string",
						minLength: 5,
						maxLength: 200
					},
					maxTokens: 120,
					systemPrompt: "你是提示词工程专家。请为 APE 框架生成 \"Execution\"（执行）部分，只输出内容，控制在 200 字以内。",
					fewShotExamples: [{
						userInput: "帮我写个产品介绍",
						generatedValue: "三段式结构：痛点共鸣、产品亮点、行动号召，总字数 200 字以内。"
					}]
				}
			],
			examples: [{
				originalPrompt: "帮我写个产品介绍",
				optimizedPrompt: "# Action\n撰写一段面向潜在客户的产品介绍文案。\n\n# Purpose\n突出产品的核心卖点...\n\n# Execution\n三段式结构..."
			}]
		},
		{
			id: "tag",
			name: "TAG",
			description: "极简三要素框架，适合快速任务。",
			complexity: "simple",
			applicableScenes: ["general", "creative"],
			aliases: ["tag"],
			template: [
				"# Task\n{task}",
				"# Action\n{action}",
				"# Goal\n{goal}"
			].join("\n\n"),
			slots: [
				{
					id: "task",
					name: "Task",
					description: "任务",
					required: true,
					generationOrder: 1,
					jsonSchema: {
						type: "string",
						minLength: 5,
						maxLength: 150
					},
					maxTokens: 100,
					systemPrompt: "你是提示词工程专家。请为 TAG 框架生成 \"Task\"（任务）部分，只输出内容，控制在 150 字以内。",
					fewShotExamples: [{
						userInput: "帮我想几个活动主题",
						generatedValue: "为一次线下读书会构思活动主题。"
					}]
				},
				{
					id: "action",
					name: "Action",
					description: "行动",
					required: true,
					generationOrder: 2,
					dependsOn: ["task"],
					jsonSchema: {
						type: "string",
						minLength: 10,
						maxLength: 200
					},
					maxTokens: 120,
					systemPrompt: "你是提示词工程专家。请为 TAG 框架生成 \"Action\"（行动）部分，只输出内容，控制在 200 字以内。",
					fewShotExamples: [{
						userInput: "帮我想几个活动主题",
						generatedValue: "围绕\"阅读与成长\"构思 5 个主题，每个主题附一句简短文案。"
					}]
				},
				{
					id: "goal",
					name: "Goal",
					description: "目标",
					required: true,
					generationOrder: 3,
					jsonSchema: {
						type: "string",
						minLength: 5,
						maxLength: 150
					},
					maxTokens: 100,
					systemPrompt: "你是提示词工程专家。请为 TAG 框架生成 \"Goal\"（目标）部分，只输出内容，控制在 150 字以内。",
					fewShotExamples: [{
						userInput: "帮我想几个活动主题",
						generatedValue: "主题需简洁、有画面感、易传播。"
					}]
				}
			],
			examples: [{
				originalPrompt: "帮我想几个活动主题",
				optimizedPrompt: "# Task\n为一次线下读书会构思活动主题。\n\n# Action\n围绕\"阅读与成长\"构思 5 个主题...\n\n# Goal\n主题需简洁、有画面感、易传播。"
			}]
		},
		{
			id: "react",
			name: "ReAct",
			description: "用于 Agent 推理与工具调用的经典框架。",
			complexity: "medium",
			applicableScenes: ["agent"],
			aliases: ["react", "reason+act"],
			template: [
				"# Thought\n{thought}",
				"# Action\n{action}",
				"# Observation\n{observation}"
			].join("\n\n"),
			slots: [
				{
					id: "thought",
					name: "Thought",
					description: "推理思路",
					required: true,
					generationOrder: 1,
					jsonSchema: {
						type: "string",
						minLength: 10,
						maxLength: 300
					},
					maxTokens: 200,
					systemPrompt: "你是提示词工程专家。请为 ReAct 框架生成 \"Thought\"（思考）部分，只输出内容，控制在 300 字以内。",
					fewShotExamples: [{
						userInput: "帮我查一下北京明天的天气并推荐穿搭",
						generatedValue: "需要先获取北京明天的天气数据，再根据温度与降水情况推荐合适穿搭。"
					}]
				},
				{
					id: "action",
					name: "Action",
					description: "采取的行动",
					required: true,
					generationOrder: 2,
					dependsOn: ["thought"],
					jsonSchema: {
						type: "string",
						minLength: 10,
						maxLength: 300
					},
					maxTokens: 200,
					systemPrompt: "你是提示词工程专家。请为 ReAct 框架生成 \"Action\"（行动）部分，只输出内容，控制在 300 字以内。",
					fewShotExamples: [{
						userInput: "帮我查一下北京明天的天气并推荐穿搭",
						generatedValue: "调用天气查询工具，参数为城市=北京、日期=明天。"
					}]
				},
				{
					id: "observation",
					name: "Observation",
					description: "观察结果",
					required: true,
					generationOrder: 3,
					jsonSchema: {
						type: "string",
						minLength: 10,
						maxLength: 300
					},
					maxTokens: 200,
					systemPrompt: "你是提示词工程专家。请为 ReAct 框架生成 \"Observation\"（观察）部分，只输出内容，控制在 300 字以内。",
					fewShotExamples: [{
						userInput: "帮我查一下北京明天的天气并推荐穿搭",
						generatedValue: "根据天气工具返回的温度、风力、降水概率，结合常见穿搭规则给出推荐。"
					}]
				}
			],
			examples: [{
				originalPrompt: "帮我查一下北京明天的天气并推荐穿搭",
				optimizedPrompt: "# Thought\n需要先获取北京明天的天气数据...\n\n# Action\n调用天气查询工具...\n\n# Observation\n根据天气工具返回的数据..."
			}]
		}
	];
	var FRAMEWORK_MAP = Object.fromEntries(FRAMEWORKS.map((f) => [f.id, f]));
	function getFramework(id) {
		return FRAMEWORK_MAP[id];
	}
	function getFrameworksByScene(sceneId) {
		return FRAMEWORKS.filter((f) => f.applicableScenes.includes(sceneId));
	}
	//#endregion
	//#region src/core/analyzer.ts
	var DIMENSIONS = [
		{
			id: "objective_clarity",
			weight: .3,
			name: "目标明确度"
		},
		{
			id: "context_completeness",
			weight: .25,
			name: "上下文完整度"
		},
		{
			id: "output_specification",
			weight: .2,
			name: "输出格式约束"
		},
		{
			id: "constraint_clarity",
			weight: .15,
			name: "约束条件明确度"
		},
		{
			id: "audience_role",
			weight: .1,
			name: "受众与角色定义"
		}
	];
	var VAGUE_VERBS = [
		"优化",
		"处理",
		"搞",
		"弄",
		"看看",
		"随便",
		"帮我",
		"整理"
	];
	var FORMAT_KEYWORDS = [
		"字数",
		"格式",
		"列表",
		"表格",
		"段落",
		"markdown",
		"字以内",
		"条目"
	];
	var CONSTRAINT_KEYWORDS = [
		"不要",
		"必须",
		"不能",
		"限制",
		"排除",
		"避免",
		"仅限",
		"只允许"
	];
	var ROLE_PATTERN = /(你是一[个位名]|作为一[个位名]|扮演|充当)/;
	var AUDIENCE_KEYWORDS = [
		"面向",
		"受众",
		"读者",
		"用户是"
	];
	async function analyzePrompt(prompt, engine) {
		const ruleResult = applyRules(prompt);
		if (!(ruleResult.unmatched.length > 0 && prompt.length > 8)) return finalize(ruleResult.scores, true);
		try {
			const llmScores = await scoreWithLLM(prompt, engine, ruleResult.unmatched);
			return finalize(mergeScores(ruleResult.scores, llmScores), false);
		} catch {
			return finalize(ruleResult.scores, true);
		}
	}
	function applyRules(prompt) {
		const scores = {};
		const unmatched = [];
		if (VAGUE_VERBS.some((v) => prompt.includes(v))) scores.objective_clarity = {
			dimension: "objective_clarity",
			score: 1,
			reasoning: "包含模糊动词，目标不明确"
		};
		else if (prompt.length > 20) scores.objective_clarity = {
			dimension: "objective_clarity",
			score: 2,
			reasoning: "目标基本可推断"
		};
		else unmatched.push("objective_clarity");
		if (prompt.length < 15) scores.context_completeness = {
			dimension: "context_completeness",
			score: 1,
			reasoning: "上下文极少"
		};
		else if (prompt.length > 60) scores.context_completeness = {
			dimension: "context_completeness",
			score: 3,
			reasoning: "上下文充分"
		};
		else unmatched.push("context_completeness");
		const hasFormat = FORMAT_KEYWORDS.some((k) => prompt.includes(k));
		scores.output_specification = {
			dimension: "output_specification",
			score: hasFormat ? 3 : 1,
			reasoning: hasFormat ? "明确了输出格式" : "未指定输出格式"
		};
		if (CONSTRAINT_KEYWORDS.some((k) => prompt.includes(k))) scores.constraint_clarity = {
			dimension: "constraint_clarity",
			score: 3,
			reasoning: "包含明确约束"
		};
		else unmatched.push("constraint_clarity");
		const hasRole = ROLE_PATTERN.test(prompt);
		const hasAudience = AUDIENCE_KEYWORDS.some((k) => prompt.includes(k));
		if (hasRole && hasAudience) scores.audience_role = {
			dimension: "audience_role",
			score: 3,
			reasoning: "明确指定了角色和受众"
		};
		else if (hasRole || hasAudience) scores.audience_role = {
			dimension: "audience_role",
			score: 2,
			reasoning: "指定了角色或受众之一"
		};
		else scores.audience_role = {
			dimension: "audience_role",
			score: 1,
			reasoning: "未指定角色和受众"
		};
		for (const dim of DIMENSIONS) if (!scores[dim.id]) scores[dim.id] = {
			dimension: dim.id,
			score: 2,
			reasoning: "规则未覆盖，待 LLM 补充"
		};
		return {
			scores,
			unmatched
		};
	}
	async function scoreWithLLM(prompt, engine, dimensions) {
		const systemPrompt = [
			"你是提示词工程专家。请为以下维度各打一个 1-3 分的评分：",
			dimensions.map((d) => `- ${d}: ${DIMENSIONS.find((x) => x.id === d)?.name}`).join("\n"),
			"",
			"评分标准：1=模糊/缺失，2=基本清晰，3=清晰明确。",
			"严格按 JSON 格式输出，不要添加任何解释或 markdown 代码块：",
			"{\"<dimension>\": {\"score\": N, \"reasoning\": \"简短理由\"}, ...}"
		].join("\n");
		const parsed = safeParseJson$1((await engine.generate({
			systemPrompt,
			userPrompt: prompt,
			maxTokens: 300,
			temperature: .3
		})).text);
		const out = {};
		for (const dim of dimensions) {
			const entry = parsed?.[dim];
			if (entry && typeof entry.score === "number") out[dim] = {
				dimension: dim,
				score: Math.max(1, Math.min(3, Math.round(entry.score))),
				reasoning: String(entry.reasoning ?? "")
			};
		}
		return out;
	}
	function mergeScores(rule, llm) {
		const merged = { ...rule };
		for (const [dim, score] of Object.entries(llm)) merged[dim] = score;
		return merged;
	}
	function finalize(scores, usedRulesOnly) {
		const ordered = DIMENSIONS.map((d) => scores[d.id]);
		const total = ordered.reduce((acc, s) => {
			return acc + DIMENSIONS.find((d) => d.id === s.dimension).weight * (3 - s.score);
		}, 0);
		const totalScore = Math.round(total / 3 * 100);
		let level;
		if (totalScore <= 25) level = "clear";
		else if (totalScore <= 50) level = "mostly_clear";
		else if (totalScore <= 75) level = "ambiguous";
		else level = "very_ambiguous";
		return {
			ambiguityScores: ordered,
			totalScore,
			level,
			usedRulesOnly
		};
	}
	function safeParseJson$1(text) {
		const trimmed = text.trim();
		const first = trimmed.indexOf("{");
		const last = trimmed.lastIndexOf("}");
		if (first === -1 || last === -1) return null;
		try {
			return JSON.parse(trimmed.slice(first, last + 1));
		} catch {
			return null;
		}
	}
	//#endregion
	//#region src/core/frameworks/scenes.ts
	var SCENES = [
		{
			id: "coding",
			name: "编程开发",
			description: "代码生成、调试、审查、架构设计、API 使用",
			keywords: [
				"代码",
				"函数",
				"bug",
				"调试",
				"重构",
				"优化性能",
				"API",
				"报错",
				"异常",
				"单元测试",
				"code",
				"function",
				"debug",
				"refactor",
				"compile",
				"exception",
				"stack trace"
			],
			recommendedFrameworks: [
				"rtf",
				"crispe",
				"risen"
			]
		},
		{
			id: "writing",
			name: "写作与内容创作",
			description: "文章、营销文案、报告、邮件、博客、社交媒体内容",
			keywords: [
				"写",
				"文章",
				"文案",
				"博客",
				"报告",
				"邮件",
				"公众号",
				"小红书",
				"标题",
				"正文",
				"write",
				"article",
				"blog",
				"copywriting",
				"essay"
			],
			recommendedFrameworks: [
				"co-star",
				"ape",
				"tag"
			]
		},
		{
			id: "analysis",
			name: "数据分析",
			description: "数据清洗、趋势分析、报告撰写、指标解读",
			keywords: [
				"数据",
				"分析",
				"趋势",
				"指标",
				"统计",
				"图表",
				"报表",
				"同比",
				"环比",
				"data",
				"analyze",
				"trend",
				"metric",
				"statistics",
				"dashboard"
			],
			recommendedFrameworks: [
				"crispe",
				"risen",
				"race"
			]
		},
		{
			id: "academic",
			name: "学术与科研",
			description: "论文写作、文献综述、研究方法、实验设计",
			keywords: [
				"论文",
				"文献",
				"综述",
				"研究",
				"学术",
				"实验",
				"假设",
				"引用",
				"paper",
				"thesis",
				"literature",
				"research",
				"citation",
				"abstract"
			],
			recommendedFrameworks: [
				"risen",
				"co-star",
				"react"
			]
		},
		{
			id: "translation",
			name: "翻译与本地化",
			description: "文档翻译、术语统一、文化适配",
			keywords: [
				"翻译",
				"译成",
				"中文",
				"英文",
				"日文",
				"本地化",
				"术语",
				"translate",
				"translation",
				"localization"
			],
			recommendedFrameworks: [
				"co-star",
				"race",
				"ape"
			]
		},
		{
			id: "education",
			name: "教育与培训",
			description: "课程设计、习题生成、概念解释、学习计划",
			keywords: [
				"教学",
				"课程",
				"习题",
				"讲解",
				"解释",
				"学习",
				"知识点",
				"teach",
				"course",
				"explain",
				"tutorial",
				"lesson"
			],
			recommendedFrameworks: [
				"risen",
				"co-star",
				"race"
			]
		},
		{
			id: "business",
			name: "商业与运营",
			description: "商业计划、市场分析、策略规划、运营方案",
			keywords: [
				"商业",
				"市场",
				"营销",
				"运营",
				"策略",
				"增长",
				"转化",
				"GMV",
				"business",
				"marketing",
				"strategy",
				"growth",
				"operation"
			],
			recommendedFrameworks: [
				"crispe",
				"co-star",
				"risen"
			]
		},
		{
			id: "creative",
			name: "创意与策划",
			description: "故事创作、角色设定、头脑风暴、创意策划",
			keywords: [
				"创意",
				"故事",
				"角色",
				"情节",
				"头脑风暴",
				"策划",
				"脚本",
				"story",
				"character",
				"brainstorm",
				"creative",
				"plot"
			],
			recommendedFrameworks: [
				"co-star",
				"risen",
				"tag"
			]
		},
		{
			id: "agent",
			name: "Agent 与工具调用",
			description: "多步任务编排、工具选择、工作流设计",
			keywords: [
				"agent",
				"智能体",
				"工作流",
				"编排",
				"工具调用",
				"多步",
				"workflow",
				"orchestration",
				"tool use",
				"multi-step"
			],
			recommendedFrameworks: [
				"react",
				"crispe",
				"risen"
			]
		},
		{
			id: "general",
			name: "通用问答",
			description: "日常咨询、知识查询、简单任务",
			keywords: [],
			recommendedFrameworks: [
				"ape",
				"tag",
				"rtf"
			]
		}
	];
	var SCENE_MAP = Object.fromEntries(SCENES.map((s) => [s.id, s]));
	function getScene(id) {
		return SCENE_MAP[id] ?? SCENE_MAP.general;
	}
	//#endregion
	//#region src/core/classifier.ts
	async function classifyPrompt(prompt, engine) {
		const keywordResult = matchByKeywords(prompt);
		if (keywordResult.confidence >= .7) return {
			scene: keywordResult.scene,
			confidence: keywordResult.confidence,
			secondaryScenes: keywordResult.secondary,
			usedRulesOnly: true
		};
		try {
			const llmResult = await classifyWithLLM(prompt, engine);
			if (llmResult) return llmResult;
		} catch {}
		return {
			scene: keywordResult.scene,
			confidence: keywordResult.confidence,
			secondaryScenes: keywordResult.secondary,
			usedRulesOnly: true
		};
	}
	function matchByKeywords(prompt) {
		const scores = [];
		for (const scene of SCENES) {
			if (scene.id === "general") continue;
			let hit = 0;
			for (const keyword of scene.keywords) if (prompt.toLowerCase().includes(keyword.toLowerCase())) hit++;
			if (hit > 0) scores.push({
				scene,
				hit
			});
		}
		scores.sort((a, b) => b.hit - a.hit);
		if (scores.length === 0) return {
			scene: getScene("general"),
			confidence: .3,
			secondary: []
		};
		const top = scores[0];
		const confidence = Math.min(.9, .5 + top.hit * .1);
		const secondary = scores.slice(1, 3).map((s) => ({
			scene: s.scene,
			confidence: Math.min(.7, .4 + s.hit * .1)
		}));
		return {
			scene: top.scene,
			confidence,
			secondary
		};
	}
	async function classifyWithLLM(prompt, engine) {
		const systemPrompt = [
			"你是提示词工程专家。请判断以下提示词最适合的场景类别。",
			"可选场景：",
			SCENES.map((s) => `- ${s.id}（${s.name}）：${s.description}`).join("\n"),
			"",
			"严格按 JSON 输出，不要 markdown 代码块：",
			"{\"scene\": \"<id>\", \"confidence\": 0.0-1.0, \"reasoning\": \"简短理由\"}"
		].join("\n");
		const parsed = safeParseJson((await engine.generate({
			systemPrompt,
			userPrompt: prompt,
			maxTokens: 200,
			temperature: .3
		})).text);
		if (!parsed || typeof parsed.scene !== "string") return null;
		const scene = getScene(parsed.scene);
		if (!scene) return null;
		return {
			scene,
			confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || .6)),
			secondaryScenes: [],
			usedRulesOnly: false
		};
	}
	function safeParseJson(text) {
		const trimmed = text.trim();
		const first = trimmed.indexOf("{");
		const last = trimmed.lastIndexOf("}");
		if (first === -1 || last === -1) return null;
		try {
			return JSON.parse(trimmed.slice(first, last + 1));
		} catch {
			return null;
		}
	}
	//#endregion
	//#region src/core/matcher.ts
	function matchFrameworks(scene, _prompt) {
		const candidates = [];
		for (const id of scene.recommendedFrameworks) {
			const fw = getFramework(id);
			if (fw) candidates.push(fw);
		}
		const sceneFrameworks = getFrameworksByScene(scene.id);
		for (const fw of sceneFrameworks) if (!candidates.find((c) => c.id === fw.id)) candidates.push(fw);
		return candidates.slice(0, 3).map((fw, index) => ({
			framework: fw,
			matchScore: Math.max(.6, .95 - index * .1),
			reason: buildReason(fw, scene)
		}));
	}
	function buildReason(fw, scene) {
		const slotNames = fw.slots.map((s) => s.name).join("、");
		return `适用于「${scene.name}」场景，包含 ${fw.slots.length} 个要素：${slotNames}`;
	}
	//#endregion
	//#region src/core/orchestrator/context-injector.ts
	/** 每个槽位的职责边界说明（避免职责重叠） */
	var SLOT_ROLE_BOUNDARY = {
		context: "只描述背景、场景、受众所处的环境。不要写目标，不要写输出格式。",
		objective: "只写\"要达成什么\"。用动词开头，一句话说清目标。不要写背景，不要写输出格式。",
		style: "只写\"写作风格\"。例如：学术论文体、科普风格、营销文案体。用 1-2 句话描述风格特征。不要写语气。",
		tone: "只写\"情绪语气\"。例如：客观严谨、亲切活泼、权威严肃。用 1-2 句话描述语气。不要写风格。",
		audience: "只写\"目标读者是谁\"及其特点。不要重复背景。",
		response: "只写\"输出格式要求\"。例如：字数、章节结构、是否使用 Markdown、是否包含图表。绝对不要复述背景或目标。",
		capacity: "只写 AI 应扮演的角色和能力范围。",
		request: "只写用户希望 AI 完成的具体任务。",
		insight: "只写完成任务所需的背景信息、约束或洞察。",
		personality: "只写 AI 表达时的个性特征。",
		experiment: "只写希望 AI 尝试的多种输出或实验方向。",
		role: "只写 AI 应扮演的角色。",
		instructions: "只写具体指令。",
		steps: "只写分步操作流程。",
		end_goal: "只写最终目标。",
		narrowing: "只写范围限制、边界条件。",
		task: "只写任务描述。",
		action: "只写要执行的动作。",
		format: "只写输出格式要求。",
		explanation: "只写解释说明的深度与方式。",
		purpose: "只写目的。",
		execution: "只写执行方式。",
		goal: "只写目标。",
		thought: "只写推理思路。",
		observation: "只写观察结果。"
	};
	function buildSlotSystemPrompt(slot, ctx) {
		const slotList = ctx.allSlots.map((s) => `- ${s.name}: ${s.description}`).join("\n");
		const generatedList = Object.entries(ctx.generatedSlots).map(([id, value]) => {
			const def = ctx.allSlots.find((s) => s.id === id);
			return def ? `- ${def.name}: ${value}` : "";
		}).filter(Boolean).join("\n");
		const maxLen = slot.jsonSchema.maxLength ?? 300;
		const roleBoundary = SLOT_ROLE_BOUNDARY[slot.id] ?? `只写 ${slot.name} 对应的内容，不要涉及其他槽位。`;
		const parts = [
			`你是提示词工程专家。请为 ${ctx.frameworkName} 框架生成 "${slot.name}"（${slot.description}）部分。`,
			"",
			`框架全部要素：`,
			slotList,
			"",
			`当前场景：${ctx.sceneName}`,
			"",
			`⚠️ 本槽位职责边界：`,
			roleBoundary
		];
		if (generatedList) parts.push("", `已生成的其他槽位（仅供参考上下文，**禁止复述或改写**）：`, generatedList);
		parts.push("", "要求：", "1. 只输出该槽位的内容，不要加任何标题、标签、前缀或说明。", "2. 不要重复其他槽位已经表达过的信息。", "3. 不要写\"内容将…\"\"本部分…\"\"该任务…\"这类元描述。", `4. 长度控制在 ${maxLen} 字以内。`, "5. 不要输出思考过程，不要使用 <think> 标签。");
		if (slot.fewShotExamples.length > 0) {
			parts.push("", "参考示例：");
			for (const ex of slot.fewShotExamples.slice(0, 2)) parts.push(`用户输入：${ex.userInput}`, `期望输出：${ex.generatedValue}`);
		}
		return parts.join("\n");
	}
	function buildSlotUserPrompt(ctx) {
		return `用户原始需求：${ctx.userPrompt}`;
	}
	//#endregion
	//#region src/core/orchestrator/validator.ts
	function validateSlotContent(content, slot) {
		const trimmed = content.trim();
		if (!trimmed) return {
			valid: false,
			reason: "内容为空"
		};
		if (trimmed.includes("<think>") || trimmed.includes("</think>")) return {
			valid: false,
			reason: "包含未剥离的 think 标签"
		};
		const schema = slot.jsonSchema;
		if (schema.minLength && trimmed.length < schema.minLength) return {
			valid: false,
			reason: `长度 ${trimmed.length} 小于最小要求 ${schema.minLength}`
		};
		if (schema.maxLength && trimmed.length > schema.maxLength * 2) return {
			valid: false,
			reason: `长度 ${trimmed.length} 严重超出上限 ${schema.maxLength}`
		};
		const badPrefixes = [
			"好的，",
			"根据您的要求，",
			"以下是",
			`${slot.name}:`
		];
		for (const prefix of badPrefixes) if (trimmed.startsWith(prefix)) return {
			valid: false,
			reason: `包含多余前缀：${prefix}`
		};
		return { valid: true };
	}
	function cleanSlotContent(content, slot) {
		let cleaned = content;
		const lastClose = cleaned.lastIndexOf("</think>");
		if (lastClose !== -1) cleaned = cleaned.slice(lastClose + 8);
		cleaned = cleaned.replace(/^\s+/, "").trim();
		cleaned = cleaned.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "");
		const escaped = slot.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const prefixPatterns = [
			new RegExp(`^\\*\\*${escaped}\\*\\*\\s*[:：]\\s*`, "i"),
			new RegExp(`^\\*\\*${escaped}\\*\\*\\s*`, "i"),
			new RegExp(`^#{1,6}\\s+${escaped}\\s*[:：]?\\s*`, "i"),
			new RegExp(`^${escaped}\\s*[:：]\\s*`, "i")
		];
		for (const pattern of prefixPatterns) cleaned = cleaned.replace(pattern, "");
		if (cleaned.startsWith("\"") && cleaned.endsWith("\"") || cleaned.startsWith("「") && cleaned.endsWith("」")) cleaned = cleaned.slice(1, -1);
		return cleaned.trim();
	}
	//#endregion
	//#region src/core/orchestrator/retry-controller.ts
	async function withRetry(fn, options) {
		let lastError = /* @__PURE__ */ new Error("Unknown error");
		for (let attempt = 1; attempt <= options.maxAttempts; attempt++) try {
			return await fn();
		} catch (e) {
			lastError = e;
			if (attempt < options.maxAttempts && options.shouldRetry(attempt, lastError)) {
				options.onRetry?.(attempt, lastError);
				continue;
			}
			throw lastError;
		}
		throw lastError;
	}
	//#endregion
	//#region src/core/orchestrator/slot-generator.ts
	/** R1 蒸馏版额外 think 预算 */
	var THINK_BUDGET_TOKENS = 500;
	async function generateSlot(params) {
		const { slot, framework, scene, userPrompt, generatedSlots, engine } = params;
		const ctx = {
			userPrompt,
			frameworkName: framework.name,
			allSlots: framework.slots,
			generatedSlots,
			sceneName: scene.name
		};
		const systemPrompt = buildSlotSystemPrompt(slot, ctx);
		const userPromptForSlot = buildSlotUserPrompt(ctx);
		const totalMaxTokens = (slot.maxTokens ?? 300) + THINK_BUDGET_TOKENS;
		let lastContent = "";
		let attemptsUsed = 0;
		try {
			const result = await withRetry(async () => {
				attemptsUsed++;
				const cleaned = cleanSlotContent((await engine.generate({
					systemPrompt,
					userPrompt: userPromptForSlot,
					maxTokens: totalMaxTokens,
					temperature: .5
				})).text, slot);
				const validation = validateSlotContent(cleaned, slot);
				if (!validation.valid) throw new Error(validation.reason ?? "校验失败");
				lastContent = cleaned;
				return cleaned;
			}, {
				maxAttempts: 3,
				shouldRetry: (attempt, error) => {
					return attempt < 3 && error.message.length > 0;
				}
			});
			return {
				slotId: slot.id,
				content: result,
				status: "success",
				attempts: attemptsUsed
			};
		} catch (e) {
			return {
				slotId: slot.id,
				content: lastContent,
				status: "failed",
				attempts: attemptsUsed,
				error: e.message
			};
		}
	}
	//#endregion
	//#region src/core/orchestrator/composer.ts
	function composePrompt(framework, slots) {
		let result = framework.template;
		for (const slot of framework.slots) {
			const value = slots[slot.id] ?? "";
			result = result.replace(new RegExp(`\\{${slot.id}\\}`, "g"), value);
		}
		result = result.replace(/\{[a-z_]+\}/g, "");
		return result.trim();
	}
	//#endregion
	//#region src/core/orchestrator/index.ts
	async function orchestrateGeneration(params) {
		const { userPrompt, framework, scene, ambiguityScore, engine, signal } = params;
		const startTime = Date.now();
		const sortedSlots = [...framework.slots].sort((a, b) => a.generationOrder - b.generationOrder);
		const slotStatus = Object.fromEntries(sortedSlots.map((s) => [s.id, "pending"]));
		const generatedSlots = {};
		const slotResults = {};
		params.onProgress?.({
			frameworkId: framework.id,
			totalSlots: sortedSlots.length,
			completedSlots: 0,
			currentSlot: "",
			slotStatus: { ...slotStatus }
		});
		for (const slot of sortedSlots) {
			if (signal?.aborted) throw new Error("Generation aborted");
			slotStatus[slot.id] = "generating";
			params.onProgress?.({
				frameworkId: framework.id,
				totalSlots: sortedSlots.length,
				completedSlots: Object.keys(generatedSlots).length,
				currentSlot: slot.id,
				slotStatus: { ...slotStatus }
			});
			const result = await generateSlot({
				slot,
				framework,
				scene,
				userPrompt,
				generatedSlots,
				engine
			});
			slotResults[slot.id] = result;
			if (result.status === "success") {
				generatedSlots[slot.id] = result.content;
				slotStatus[slot.id] = "done";
				params.onSlotComplete?.(slot.id, result.content);
			} else {
				slotStatus[slot.id] = "failed";
				generatedSlots[slot.id] = `[生成失败：${result.error ?? "未知错误"}]`;
			}
			params.onProgress?.({
				frameworkId: framework.id,
				totalSlots: sortedSlots.length,
				completedSlots: Object.keys(generatedSlots).length,
				currentSlot: slot.id,
				slotStatus: { ...slotStatus }
			});
		}
		const finalPrompt = composePrompt(framework, generatedSlots);
		return {
			frameworkId: framework.id,
			frameworkName: framework.name,
			slots: slotResults,
			finalPrompt,
			metadata: {
				scene: scene.id,
				ambiguityScore,
				generationTimeMs: Date.now() - startTime,
				modelUsed: engine.id,
				usedFallback: false
			}
		};
	}
	//#endregion
	//#region src/inference/constraint-adapter.ts
	/**
	* 剥离 think 块，提取实际内容
	*/
	function extractStructuredContent(text) {
		if (!text) return "";
		let cleaned = text;
		const lastClose = cleaned.lastIndexOf("</think>");
		if (lastClose !== -1) cleaned = cleaned.slice(lastClose + 8);
		else if (cleaned.includes("<think>")) return "";
		cleaned = cleaned.replace(/^\s+/, "");
		const fence = cleaned.match(/```(?:json|markdown|md)?\s*([\s\S]*?)```/i);
		if (fence) cleaned = fence[1].trim();
		return cleaned.trim();
	}
	//#endregion
	//#region src/inference/providers/openai-compatible.ts
	var OpenAICompatibleAdapter = class {
		id = "openai-compatible";
		name = "OpenAI Compatible";
		buildUrl(config) {
			return `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;
		}
		buildHeaders(config) {
			return {
				"Content-Type": "application/json",
				Authorization: `Bearer ${config.apiKey}`,
				...config.headers
			};
		}
		buildRequestBody(systemPrompt, userPrompt, opts) {
			return {
				model: opts.model,
				messages: [{
					role: "system",
					content: systemPrompt
				}, {
					role: "user",
					content: userPrompt
				}],
				temperature: opts.temperature ?? .6,
				max_tokens: opts.maxTokens,
				stream: !!opts.onToken
			};
		}
		parseResponse(data) {
			return data.choices?.[0]?.message?.content ?? "";
		}
		parseStreamChunk(line) {
			if (!line.startsWith("data: ")) return null;
			const json = line.slice(6).trim();
			if (json === "[DONE]") return null;
			try {
				return JSON.parse(json).choices?.[0]?.delta?.content ?? null;
			} catch {
				return null;
			}
		}
	};
	//#endregion
	//#region src/inference/providers/anthropic.ts
	var AnthropicAdapter = class {
		id = "anthropic";
		name = "Anthropic";
		buildUrl(config) {
			return `${config.baseUrl.replace(/\/$/, "")}/v1/messages`;
		}
		buildHeaders(config) {
			return {
				"Content-Type": "application/json",
				"x-api-key": config.apiKey,
				"anthropic-version": "2023-06-01",
				"Origin": "chrome-extension:://minikhnieamfofidfieidenbnjefpkik"
			};
		}
		buildRequestBody(systemPrompt, userPrompt, opts) {
			return {
				model: opts.model,
				max_tokens: opts.maxTokens,
				system: systemPrompt,
				messages: [{
					role: "user",
					content: userPrompt
				}],
				temperature: opts.temperature ?? .6,
				stream: !!opts.onToken
			};
		}
		parseResponse(data) {
			return data.content?.[0]?.text ?? "";
		}
		parseStreamChunk(line) {
			if (!line.startsWith("data: ")) return null;
			try {
				const chunk = JSON.parse(line.slice(6));
				if (chunk.type === "content_block_delta") return chunk.delta?.text ?? null;
				return null;
			} catch {
				return null;
			}
		}
	};
	//#endregion
	//#region src/inference/provider-registry.ts
	var PRESETS = [
		{
			id: "ollama",
			name: "Ollama（本地）",
			adapter: new OpenAICompatibleAdapter(),
			defaultBaseUrl: "http://localhost:11434/v1",
			defaultModel: "deepseek-r1:7b",
			openaiCompatible: true
		},
		{
			id: "zai",
			name: "Z.ai (GLM)",
			adapter: new OpenAICompatibleAdapter(),
			defaultBaseUrl: "https://api.z.ai/api/paas/v4",
			defaultModel: "glm-5.3",
			openaiCompatible: true
		},
		{
			id: "openai",
			name: "OpenAI",
			adapter: new OpenAICompatibleAdapter(),
			defaultBaseUrl: "https://api.openai.com/v1",
			defaultModel: "gpt-4o",
			openaiCompatible: true
		},
		{
			id: "deepseek",
			name: "DeepSeek",
			adapter: new OpenAICompatibleAdapter(),
			defaultBaseUrl: "https://api.deepseek.com/v1",
			defaultModel: "deepseek-chat",
			openaiCompatible: true
		},
		{
			id: "anthropic",
			name: "Anthropic Claude",
			adapter: new AnthropicAdapter(),
			defaultBaseUrl: "https://api.anthropic.com",
			defaultModel: "claude-sonnet-4-20250514",
			openaiCompatible: false
		}
	];
	var ProviderRegistry = class {
		presets = /* @__PURE__ */ new Map();
		constructor() {
			for (const p of PRESETS) this.presets.set(p.id, p);
		}
		getPreset(id) {
			return this.presets.get(id);
		}
		listPresets() {
			return Array.from(this.presets.values());
		}
		getAdapter(id) {
			return this.presets.get(id)?.adapter ?? new OpenAICompatibleAdapter();
		}
	};
	var providerRegistry = new ProviderRegistry();
	//#endregion
	//#region src/inference/http-engine.ts
	var ProviderHttpEngine = class {
		getSettings;
		config;
		id = "provider-http";
		constructor(getSettings, config = {}) {
			this.getSettings = getSettings;
			this.config = config;
		}
		isReady() {
			return true;
		}
		async generate(opts) {
			const settings = await this.getSettings();
			const adapter = providerRegistry.getAdapter(settings.providerId);
			const providerConfig = {
				id: settings.providerId,
				name: settings.providerId,
				baseUrl: settings.baseUrl,
				apiKey: settings.apiKey,
				model: settings.model
			};
			const url = adapter.buildUrl(providerConfig);
			const headers = adapter.buildHeaders(providerConfig);
			const body = adapter.buildRequestBody(opts.systemPrompt, opts.userPrompt, {
				...opts,
				model: settings.model
			});
			const start = performance.now();
			const response = await fetch(url, {
				method: "POST",
				headers,
				body: JSON.stringify(body),
				signal: AbortSignal.timeout(this.config.timeoutMs ?? 18e4)
			});
			if (!response.ok) {
				const errText = await response.text().catch(() => "");
				throw new Error(`${adapter.name} API error: ${response.status} ${errText.slice(0, 200)}`);
			}
			let fullText = "";
			let tokensGenerated = 0;
			if (opts.onToken && response.body) {
				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let buffer = "";
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n");
					buffer = lines.pop() ?? "";
					for (const line of lines) {
						if (!line.trim()) continue;
						const token = adapter.parseStreamChunk?.(line);
						if (token) {
							fullText += token;
							tokensGenerated++;
							opts.onToken(token);
						}
					}
				}
			} else {
				const data = await response.json();
				fullText = adapter.parseResponse(data);
				tokensGenerated = fullText.length;
			}
			return {
				text: extractStructuredContent(fullText),
				json: void 0,
				tokensGenerated,
				elapsedMs: performance.now() - start
			};
		}
	};
	//#endregion
	//#region src/shared/storage.ts
	var PREF_KEY = "user_preferences";
	var DEFAULT_PREFERENCES = {
		enabled: true,
		triggerMode: "button",
		showClarification: true,
		maxClarificationQuestions: 3,
		autoReplaceInput: false,
		cloudFallbackEnabled: false,
		provider: {
			providerId: "ollama",
			baseUrl: "http://localhost:11434/v1",
			apiKey: "",
			model: "deepseek-r1:7b"
		}
	};
	async function getPreferences() {
		const stored = (await chrome.storage.local.get(PREF_KEY))[PREF_KEY] ?? {};
		return {
			...DEFAULT_PREFERENCES,
			...stored,
			provider: {
				...DEFAULT_PREFERENCES.provider,
				...stored.provider ?? {}
			}
		};
	}
	async function setPreferences(patch) {
		const current = await getPreferences();
		const next = {
			...current,
			...patch,
			provider: patch.provider ? {
				...current.provider,
				...patch.provider
			} : current.provider
		};
		await chrome.storage.local.set({ [PREF_KEY]: next });
		return next;
	}
	//#endregion
	//#region src/inference/model-manager.ts
	var ConnectionManager = class {
		engine = null;
		getEngine() {
			if (!this.engine) this.engine = new ProviderHttpEngine(async () => {
				return (await getPreferences()).provider;
			});
			return this.engine;
		}
		async healthCheck() {
			const config = (await getPreferences()).provider;
			const adapter = providerRegistry.getAdapter(config.providerId);
			try {
				const url = config.providerId === "ollama" ? `${config.baseUrl.replace(/\/v1\/?$/, "")}/api/tags` : `${config.baseUrl.replace(/\/$/, "")}/models`;
				const res = await fetch(url, {
					headers: adapter.buildHeaders({
						id: config.providerId,
						name: config.providerId,
						baseUrl: config.baseUrl,
						apiKey: config.apiKey,
						model: config.model
					}),
					signal: AbortSignal.timeout(8e3)
				});
				return {
					connected: res.ok,
					baseUrl: config.baseUrl,
					model: config.model,
					error: res.ok ? void 0 : `HTTP ${res.status}`,
					checkedAt: Date.now()
				};
			} catch (e) {
				return {
					connected: false,
					baseUrl: config.baseUrl,
					model: config.model,
					error: e.message,
					checkedAt: Date.now()
				};
			}
		}
	};
	var connectionManager = new ConnectionManager();
	//#endregion
	//#region src/tasks/task-worker.ts
	var TaskWorker = class {
		running = false;
		currentTaskId = null;
		abortController = null;
		onProgress = null;
		loopScheduled = false;
		setProgressCallback(cb) {
			this.onProgress = cb;
		}
		isRunning() {
			return this.running;
		}
		getCurrentTaskId() {
			return this.currentTaskId;
		}
		async tick() {
			if (this.running || this.loopScheduled) return;
			this.loopScheduled = true;
			try {
				while (true) {
					const task = await taskQueue.nextQueued();
					if (!task) break;
					this.running = true;
					this.currentTaskId = task.id;
					this.abortController = new AbortController();
					try {
						await this.processTask(task);
					} catch (e) {
						await taskQueue.update(task.id, {
							status: "failed",
							error: e.message,
							completedAt: Date.now()
						});
						this.emit(task.id, {
							status: "failed",
							error: e.message
						});
					} finally {
						this.running = false;
						this.currentTaskId = null;
						this.abortController = null;
					}
				}
			} finally {
				this.loopScheduled = false;
			}
		}
		async processTask(task) {
			const engine = connectionManager.getEngine();
			await taskQueue.update(task.id, { status: "analyzing" });
			this.emit(task.id, {
				status: "analyzing",
				stage: "analyzing"
			});
			const [analysis, classification] = await Promise.all([analyzePrompt(task.originalPrompt, engine), classifyPrompt(task.originalPrompt, engine)]);
			const scene = classification.scene;
			const ambiguityScore = analysis.totalScore;
			this.emit(task.id, {
				stage: "analysis_done",
				scene: scene.id,
				sceneName: scene.name,
				ambiguityScore,
				ambiguityLevel: analysis.level,
				usedRulesOnly: analysis.usedRulesOnly && classification.usedRulesOnly
			});
			let framework = task.frameworkId ? getFramework(task.frameworkId) : void 0;
			let recommendedFrameworks = [];
			if (!framework) {
				recommendedFrameworks = matchFrameworks(scene, task.originalPrompt);
				framework = recommendedFrameworks[0]?.framework;
			}
			if (!framework) throw new Error("无法匹配到合适的框架");
			this.emit(task.id, {
				stage: "framework_selected",
				frameworkId: framework.id,
				frameworkName: framework.name,
				recommendedFrameworks: recommendedFrameworks.map((r) => ({
					id: r.framework.id,
					name: r.framework.name,
					matchScore: r.matchScore,
					reason: r.reason
				}))
			});
			await taskQueue.update(task.id, { status: "generating" });
			const result = await orchestrateGeneration({
				userPrompt: task.originalPrompt,
				framework,
				scene,
				ambiguityScore,
				engine,
				signal: this.abortController?.signal,
				onProgress: (progress) => {
					this.emit(task.id, {
						stage: "generating",
						frameworkId: progress.frameworkId,
						totalSlots: progress.totalSlots,
						completedSlots: progress.completedSlots,
						currentSlot: progress.currentSlot,
						slotStatus: progress.slotStatus
					});
				},
				onSlotComplete: (slotId, content) => {
					this.emit(task.id, {
						stage: "slot_complete",
						slotId,
						content
					});
				}
			});
			await taskQueue.update(task.id, {
				status: "done",
				result,
				completedAt: Date.now(),
				progress: {
					stage: "done",
					currentSlot: "",
					completedSlots: framework.slots.length,
					totalSlots: framework.slots.length,
					elapsedMs: result.metadata.generationTimeMs
				}
			});
			this.emit(task.id, {
				status: "done",
				stage: "done",
				result
			});
		}
		emit(taskId, patch) {
			this.onProgress?.(taskId, patch);
		}
		cancel() {
			this.abortController?.abort();
		}
	};
	var taskWorker = new TaskWorker();
	//#endregion
	//#region src/background/cors-rules.ts
	var CORS_TARGETS = ["api.z.ai", "open.bigmodel.cn"];
	var RULE_ID_BASE = 1e4;
	async function setupCorsRules() {
		if (typeof chrome === "undefined" || !chrome.declarativeNetRequest) {
			console.warn("[cors] declarativeNetRequest not available");
			return;
		}
		const rules = CORS_TARGETS.map((domain, index) => ({
			id: RULE_ID_BASE + index,
			priority: 1,
			action: {
				type: "modifyHeaders",
				responseHeaders: [
					{
						header: "access-control-allow-origin",
						operation: "set",
						value: "*"
					},
					{
						header: "access-control-allow-methods",
						operation: "set",
						value: "GET, POST, PUT, DELETE, OPTIONS"
					},
					{
						header: "access-control-allow-headers",
						operation: "set",
						value: "Content-Type, Authorization, x-api-key, anthropic-version"
					}
				]
			},
			condition: {
				urlFilter: `||${domain}`,
				resourceTypes: ["xmlhttprequest", "other"]
			}
		}));
		try {
			const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
			await chrome.declarativeNetRequest.updateDynamicRules({
				removeRuleIds: oldRules.map((r) => r.id),
				addRules: rules
			});
			console.log("[cors] rules installed:", rules.length);
		} catch (e) {
			console.error("[cors] failed to install rules:", e);
		}
	}
	//#endregion
	//#region src/entrypoints/background.ts
	var KEEPALIVE_INTERVAL_MS = 2e4;
	var keepaliveTimer = null;
	function startKeepalive() {
		if (keepaliveTimer) return;
		keepaliveTimer = setInterval(() => {
			chrome.runtime.getPlatformInfo(() => {});
		}, KEEPALIVE_INTERVAL_MS);
	}
	var background_default = defineBackground(() => {
		console.log("[prompt-optimizer] background loaded");
		setupCorsRules().catch((e) => {
			console.error("[prompt-optimizer] CORS setup failed:", e);
		});
		taskQueue.load().then(() => {
			taskWorker.tick();
			startKeepalive();
		});
		taskWorker.setProgressCallback((taskId, patch) => {
			chrome.tabs.query({}).then((tabs) => {
				for (const tab of tabs) {
					if (tab.id == null) continue;
					chrome.tabs.sendMessage(tab.id, {
						type: "GENERATION_PROGRESS",
						payload: {
							taskId,
							...patch
						}
					}).catch(() => {});
				}
			});
		});
		chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
			handleMessage(message).then(sendResponse).catch((e) => sendResponse({
				type: "ANALYSIS_ERROR",
				payload: { error: e.message }
			}));
			return true;
		});
	});
	async function handleMessage(message) {
		switch (message.type) {
			case "GET_PREFERENCES": return {
				type: "PREFERENCES",
				payload: await getPreferences()
			};
			case "SET_PREFERENCES": return {
				type: "PREFERENCES",
				payload: await setPreferences(message.payload)
			};
			case "HEALTH_CHECK": {
				const status = await connectionManager.healthCheck();
				return {
					type: "CONNECTION_STATUS",
					payload: {
						connected: status.connected,
						error: status.error
					}
				};
			}
			case "PROMPT_ANALYZE": {
				const task = await taskQueue.create(message.payload.text, message.payload.pageUrl, message.payload.frameworkId);
				taskWorker.tick();
				return {
					type: "TASK_CREATED",
					payload: { taskId: task.id }
				};
			}
			case "GENERATION_START": {
				const task = await taskQueue.create(message.payload.userPrompt, "", message.payload.frameworkId);
				taskWorker.tick();
				return {
					type: "TASK_CREATED",
					payload: { taskId: task.id }
				};
			}
			case "RETRY_SLOT": throw new Error("Not implemented yet: RETRY_SLOT");
			default: throw new Error(`Unknown message type: ${message.type}`);
		}
	}
	//#endregion
	//#region node_modules/wxt/dist/browser.mjs
	/**
	* Contains the `browser` export which you should use to access the extension
	* APIs in your project:
	*
	* ```ts
	* import { browser } from 'wxt/browser';
	*
	* browser.runtime.onInstalled.addListener(() => {
	*   // ...
	* });
	* ```
	*
	* @module wxt/browser
	*/
	var browser = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome;
	//#endregion
	//#region node_modules/@webext-core/match-patterns/lib/index.mjs
	/**
	* Class for parsing and performing operations on match patterns.
	*
	* @example
	*   const pattern = new MatchPattern('*://google.com/*');
	*
	*   pattern.includes('https://google.com'); // true
	*   pattern.includes('http://youtube.com/watch?v=123'); // false
	*/
	var MatchPattern = class MatchPattern {
		static {
			this.PROTOCOLS = [
				"http",
				"https",
				"file",
				"ftp",
				"urn",
				"ws",
				"wss"
			];
		}
		/**
		* Parse a match pattern string. If it is invalid, the constructor will throw an
		* `InvalidMatchPattern` error.
		*
		* @param matchPattern The match pattern to parse.
		*/
		constructor(matchPattern) {
			if (matchPattern === "<all_urls>") {
				this.isAllUrls = true;
				this.protocolMatches = [...MatchPattern.PROTOCOLS];
				this.hostnameMatch = "*";
				this.pathnameMatch = "*";
			} else {
				const groups = /(.*):\/\/(.*?)(\/.*)/.exec(matchPattern);
				if (groups == null) throw new InvalidMatchPattern(matchPattern, "Incorrect format");
				const [_, protocol, hostname, pathname] = groups;
				validateProtocol(matchPattern, protocol);
				validateHostname(matchPattern, hostname);
				this.protocolMatches = protocol === "*" ? ["http", "https"] : [protocol];
				this.hostnameMatch = hostname;
				this.pathnameMatch = pathname;
			}
		}
		/** Check if a URL is included in a pattern. */
		includes(url) {
			const u = typeof url === "string" ? new URL(url) : url instanceof Location ? new URL(url.href) : url;
			if (this.isAllUrls) return !this.isUnknownProtocol(u);
			return !!this.protocolMatches.find((protocol) => {
				if (protocol === "http") return this.isHttpMatch(u);
				if (protocol === "https") return this.isHttpsMatch(u);
				if (protocol === "file") return this.isFileMatch(u);
				if (protocol === "ftp") return this.isFtpMatch(u);
				if (protocol === "urn") return this.isUrnMatch(u);
			});
		}
		isHttpMatch(url) {
			return url.protocol === "http:" && this.isHostPathMatch(url);
		}
		isHttpsMatch(url) {
			return url.protocol === "https:" && this.isHostPathMatch(url);
		}
		isHostPathMatch(url) {
			if (!this.hostnameMatch || !this.pathnameMatch) return false;
			const hostnameMatchRegexs = [this.convertPatternToRegex(this.hostnameMatch), this.convertPatternToRegex(this.hostnameMatch.replace(/^\*\./, ""))];
			const pathnameMatchRegex = this.convertPatternToRegex(this.pathnameMatch);
			return !!hostnameMatchRegexs.find((regex) => regex.test(url.hostname)) && pathnameMatchRegex.test(url.pathname);
		}
		isUnknownProtocol(url) {
			return !this.protocolMatches.includes(url.protocol.slice(0, -1));
		}
		isPathMatch(url) {
			if (!this.pathnameMatch) return false;
			return this.convertPatternToRegex(this.pathnameMatch).test(url.pathname);
		}
		isFileMatch(url) {
			return url.protocol === "file:" && this.isPathMatch(url);
		}
		isFtpMatch(_url) {
			throw Error("Not implemented: ftp:// pattern matching. Open a PR to add support");
		}
		isUrnMatch(_url) {
			throw Error("Not implemented: urn:// pattern matching. Open a PR to add support");
		}
		convertPatternToRegex(pattern) {
			const starsReplaced = this.escapeForRegex(pattern).replace(/\\\*/g, ".*");
			return RegExp(`^${starsReplaced}$`);
		}
		escapeForRegex(string) {
			return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		}
	};
	var InvalidMatchPattern = class extends Error {
		constructor(matchPattern, reason) {
			super(`Invalid match pattern "${matchPattern}": ${reason}`);
		}
	};
	function validateProtocol(matchPattern, protocol) {
		if (!MatchPattern.PROTOCOLS.includes(protocol) && protocol !== "*") throw new InvalidMatchPattern(matchPattern, `${protocol} not a valid protocol (${MatchPattern.PROTOCOLS.join(", ")})`);
	}
	function validateHostname(matchPattern, hostname) {
		if (hostname.includes(":")) throw new InvalidMatchPattern(matchPattern, `Hostname cannot include a port`);
		if (hostname.includes("*") && hostname.length > 1 && !hostname.startsWith("*.")) throw new InvalidMatchPattern(matchPattern, `If using a wildcard (*), it must go at the start of the hostname`);
	}
	//#endregion
	//#region \0virtual:wxt-background-entrypoint?D:/rubbish bin/prompt-optimizer-extension/src/entrypoints/background.ts
	function print(method, ...args) {
		if (typeof args[0] === "string") method(`[wxt] ${args.shift()}`, ...args);
		else method("[wxt]", ...args);
	}
	/** Wrapper around `console` with a "[wxt]" prefix */
	var logger = {
		debug: (...args) => print(console.debug, ...args),
		log: (...args) => print(console.log, ...args),
		warn: (...args) => print(console.warn, ...args),
		error: (...args) => print(console.error, ...args)
	};
	var ws;
	/** Connect to the websocket and listen for messages. */
	function getDevServerWebSocket() {
		if (ws == null) {
			const serverUrl = "ws://localhost:3000";
			logger.debug("Connecting to dev server @", serverUrl);
			ws = new WebSocket(serverUrl, "vite-hmr");
			ws.addWxtEventListener = ws.addEventListener.bind(ws);
			ws.sendCustom = (event, payload) => ws?.send(JSON.stringify({
				type: "custom",
				event,
				payload
			}));
			ws.addEventListener("open", () => {
				logger.debug("Connected to dev server");
			});
			ws.addEventListener("close", () => {
				logger.debug("Disconnected from dev server");
			});
			ws.addEventListener("error", (event) => {
				logger.error("Failed to connect to dev server", event);
			});
			ws.addEventListener("message", (e) => {
				try {
					const message = JSON.parse(e.data);
					if (message.type === "custom") ws?.dispatchEvent(new CustomEvent(message.event, { detail: message.data }));
				} catch (err) {
					logger.error("Failed to handle message", err);
				}
			});
		}
		return ws;
	}
	/** https://developer.chrome.com/blog/longer-esw-lifetimes/ */
	function keepServiceWorkerAlive() {
		setInterval(async () => {
			await browser.runtime.getPlatformInfo();
		}, 5e3);
	}
	function reloadContentScript(payload) {
		if (browser.runtime.getManifest().manifest_version == 2) reloadContentScriptMv2(payload);
		else reloadContentScriptMv3(payload);
	}
	async function reloadContentScriptMv3({ registration, contentScript }) {
		if (registration === "runtime") await reloadRuntimeContentScriptMv3(contentScript);
		else await reloadManifestContentScriptMv3(contentScript);
	}
	async function reloadManifestContentScriptMv3(contentScript) {
		const id = `wxt:${contentScript.js[0]}`;
		logger.log("Reloading content script:", contentScript);
		const registered = await browser.scripting.getRegisteredContentScripts();
		logger.debug("Existing scripts:", registered);
		const existing = registered.find((cs) => cs.id === id);
		if (existing) {
			logger.debug("Updating content script", existing);
			await browser.scripting.updateContentScripts([{
				...contentScript,
				id,
				css: contentScript.css ?? []
			}]);
		} else {
			logger.debug("Registering new content script...");
			await browser.scripting.registerContentScripts([{
				...contentScript,
				id,
				css: contentScript.css ?? []
			}]);
		}
		await reloadTabsForContentScript(contentScript);
	}
	async function reloadRuntimeContentScriptMv3(contentScript) {
		logger.log("Reloading content script:", contentScript);
		const registered = await browser.scripting.getRegisteredContentScripts();
		logger.debug("Existing scripts:", registered);
		const matches = registered.filter((cs) => {
			const hasJs = contentScript.js?.find((js) => cs.js?.includes(js));
			const hasCss = contentScript.css?.find((css) => cs.css?.includes(css));
			return hasJs || hasCss;
		});
		if (matches.length === 0) {
			logger.log("Content script is not registered yet, nothing to reload", contentScript);
			return;
		}
		await browser.scripting.updateContentScripts(matches);
		await reloadTabsForContentScript(contentScript);
	}
	async function reloadTabsForContentScript(contentScript) {
		const allTabs = await browser.tabs.query({});
		const matchPatterns = contentScript.matches.map((match) => new MatchPattern(match));
		const matchingTabs = allTabs.filter((tab) => {
			const url = tab.url;
			if (!url) return false;
			return !!matchPatterns.find((pattern) => pattern.includes(url));
		});
		await Promise.all(matchingTabs.map(async (tab) => {
			try {
				await browser.tabs.reload(tab.id);
			} catch (err) {
				logger.warn("Failed to reload tab:", err);
			}
		}));
	}
	async function reloadContentScriptMv2(_payload) {
		throw Error("TODO: reloadContentScriptMv2");
	}
	try {
		const ws = getDevServerWebSocket();
		ws.addWxtEventListener("wxt:reload-extension", () => {
			browser.runtime.reload();
		});
		ws.addWxtEventListener("wxt:reload-content-script", (event) => {
			reloadContentScript(event.detail);
		});
		ws.addEventListener("open", () => ws.sendCustom("wxt:background-initialized"));
		keepServiceWorkerAlive();
	} catch (err) {
		logger.error("Failed to setup web socket connection with dev server", err);
	}
	browser.commands.onCommand.addListener((command) => {
		if (command === "wxt:reload-extension") browser.runtime.reload();
	});
	var result;
	try {
		result = background_default.main();
		if (result instanceof Promise) console.warn("The background's main() function return a promise, but it must be synchronous");
	} catch (err) {
		logger.error("The background crashed on startup!");
		throw err;
	}
	//#endregion
	return result;
})();
