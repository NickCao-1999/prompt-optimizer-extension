const CORS_TARGETS = ['api.z.ai', 'open.bigmodel.cn'];

const RULE_ID_BASE = 10000;

export async function setupCorsRules(): Promise<void> {
  if (
    typeof chrome === 'undefined' ||
    !chrome.declarativeNetRequest
  ) {
    console.warn('[cors] declarativeNetRequest not available');
    return;
  }

  const rules: chrome.declarativeNetRequest.Rule[] = CORS_TARGETS.map(
    (domain, index) => ({
      id: RULE_ID_BASE + index,
      priority: 1,
      action: {
        type: 'modifyHeaders' as chrome.declarativeNetRequest.RuleActionType,
        responseHeaders: [
          {
            header: 'access-control-allow-origin',
            operation: 'set' as chrome.declarativeNetRequest.HeaderOperation,
            value: '*'
          },
          {
            header: 'access-control-allow-methods',
            operation: 'set' as chrome.declarativeNetRequest.HeaderOperation,
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            header: 'access-control-allow-headers',
            operation: 'set' as chrome.declarativeNetRequest.HeaderOperation,
            value:
              'Content-Type, Authorization, x-api-key, anthropic-version'
          }
        ]
      },
      condition: {
        urlFilter: `||${domain}`,
        resourceTypes: [
          'xmlhttprequest' as chrome.declarativeNetRequest.ResourceType,
          'other' as chrome.declarativeNetRequest.ResourceType
        ]
      }
    })
  );

  try {
    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRules.map((r) => r.id),
      addRules: rules
    });
    console.log('[cors] rules installed:', rules.length);
  } catch (e) {
    console.error('[cors] failed to install rules:', e);
  }
}