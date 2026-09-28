(function () {
  var PREF_KEY = 'user_preferences';
  var PRESETS = {
    ollama:    { baseUrl: 'http://localhost:11434/v1',      model: 'deepseek-r1:7b' },
    anthropic: { baseUrl: 'https://api.z.ai/api/anthropic', model: 'glm-4.7-flash' },
    openai:    { baseUrl: 'https://api.openai.com/v1',      model: 'gpt-4o' },
    deepseek:  { baseUrl: 'https://api.deepseek.com/v1',    model: 'deepseek-chat' }
  };
  function $(id) { return document.getElementById(id); }
  function showStatus(msg, ok) {
    var el = $('status');
    el.textContent = msg;
    el.className = 'status ' + (ok ? 'ok' : 'err');
  }
  function getPrefs() {
    return new Promise(function (resolve) {
      chrome.storage.local.get(PREF_KEY, function (r) { resolve(r[PREF_KEY] || {}); });
    });
  }
  function setPrefs(patch) {
    return getPrefs().then(function (cur) {
      var next = Object.assign({}, cur, patch);
      return new Promise(function (resolve) {
        chrome.storage.local.set({ [PREF_KEY]: next }, function () { resolve(next); });
      });
    });
  }
  function collectForm() {
    return {
      enabled: $('enabled').checked,
      provider: {
        providerId: $('provider').value,
        baseUrl: $('baseUrl').value.trim(),
        apiKey: $('apiKey').value.trim(),
        model: $('model').value.trim()
      }
    };
  }
  function handleSave() {
    var form = collectForm();
    if (!form.provider.apiKey) { showStatus('请填写 API Key', false); return; }
    setPrefs(form).then(function () {
      showStatus('已保存', true);
      setTimeout(function () { $('status').textContent = ''; $('status').className = 'status'; }, 2500);
    });
  }
  function handleTest() {
    var form = collectForm();
    if (!form.provider.apiKey) { showStatus('请先填写 API Key', false); return; }
    showStatus('正在测试连接...', true);
    var url, headers, body;
    if (form.provider.providerId === 'anthropic') {
      url = form.provider.baseUrl + '/v1/messages';
      headers = { 'Content-Type': 'application/json', 'x-api-key': form.provider.apiKey, 'anthropic-version': '2023-06-01' };
      body = JSON.stringify({ model: form.provider.model, max_tokens: 20, messages: [{ role: 'user', content: 'OK' }] });
    } else {
      url = form.provider.baseUrl + '/chat/completions';
      headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + form.provider.apiKey };
      body = JSON.stringify({ model: form.provider.model, max_tokens: 20, messages: [{ role: 'user', content: 'OK' }] });
    }
    fetch(url, { method: 'POST', headers: headers, body: body })
      .then(function (r) { return r.text().then(function (t) { return { status: r.status, text: t }; }); })
      .then(function (res) {
        if (res.status === 200) showStatus('连接成功', true);
        else showStatus('HTTP ' + res.status + ': ' + res.text.slice(0, 80), false);
      })
      .catch(function (e) { showStatus('连接失败：' + e.message, false); });
  }
  function init() {
    getPrefs().then(function (prefs) {
      var p = prefs.provider || { providerId: 'anthropic', baseUrl: 'https://api.z.ai/api/anthropic', apiKey: '', model: 'glm-4.7-flash' };
      $('enabled').checked = prefs.enabled !== false;
      $('provider').value = p.providerId || 'anthropic';
      $('baseUrl').value = p.baseUrl || '';
      $('apiKey').value = p.apiKey || '';
      $('model').value = p.model || '';
      $('provider').addEventListener('change', function (e) {
        var preset = PRESETS[e.target.value];
        if (preset) { $('baseUrl').value = preset.baseUrl; $('model').value = preset.model; }
      });
      $('saveBtn').addEventListener('click', handleSave);
      $('testBtn').addEventListener('click', handleTest);
      $('enabled').addEventListener('change', function (e) { setPrefs({ enabled: e.target.checked }); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
