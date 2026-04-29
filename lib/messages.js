const MESSAGE_CATALOG = Object.freeze({
  en: Object.freeze({
    'language.switched': 'Language switched to English.',
    'language.required': 'Language command requires <en|zh>. Run `{command} --help` for usage.',
    'command.unknown': 'Unknown command: {command}. Run `{product} --help` for usage.'
  }),
  zh: Object.freeze({
    'language.switched': '语言已切换为中文。',
    'language.required': 'language 命令需要 <en|zh>。运行 `{command} --help` 查看用法。',
    'command.unknown': '未知命令：{command}。运行 `{product} --help` 查看用法。'
  })
});

function normalizeLanguage(language) {
  return language === 'zh' ? 'zh' : 'en';
}

function formatMessage(key, language = 'en', values = {}) {
  const normalizedLanguage = normalizeLanguage(language);
  const template = MESSAGE_CATALOG[normalizedLanguage][key] || MESSAGE_CATALOG.en[key] || key;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name) => {
    return Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match;
  });
}

module.exports = {
  formatMessage,
  normalizeLanguage
};
