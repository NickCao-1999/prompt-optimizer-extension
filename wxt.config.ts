import { defineConfig } from 'wxt';
import { resolve } from 'path';

export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'Prompt Optimizer Extension',
    description: 'Analyze ambiguous prompts, match prompt engineering frameworks, and auto-fill',
    version: '0.1.0',
    permissions: [
      'storage',
      'activeTab',
      'scripting',
      'declarativeNetRequest',
      'declarativeNetRequestWithHostAccess'
    ],
    host_permissions: [
      'https://kimi.com/*',
      'https://www.kimi.com/*',
      'https://kimi.moonshot.cn/*',
      'https://chatgpt.com/*',
      'https://chat.openai.com/*',
      'https://claude.ai/*',
      'https://chat.deepseek.com/*',
      'https://gemini.google.com/*',
      'https://api.z.ai/*',
      'https://api.openai.com/*',
      'https://api.anthropic.com/*',
      'https://api.deepseek.com/*',
      'https://open.bigmodel.cn/*',
      'http://localhost/*',
      'http://127.0.0.1/*'
    ]
  },
  vite: () => ({
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    build: {
      minify: false,
      sourcemap: false
    }
  })
});
