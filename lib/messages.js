const MESSAGE_CATALOG = Object.freeze({
  en: Object.freeze({
    'cli.help': [
      '{productName} v{version}',
      '{productLongName}',
      '',
      'Usage:',
      '  {short} install --platform <claude|codex|gemini[,...]>',
      '  {short} uninstall --platform <claude|codex|gemini[,...]>',
      '  {short} check',
      '  {short} doc',
      '  {short} language <en|zh>',
      '  {short} migrate --dry-run',
      '  {short} migrate [--verbose]',
      '  {short} status',
      '  {short} --help',
      '  {short} --version',
      '',
      'Compatibility aliases:',
      '  {short} --check',
      '  {short} --doc',
      '  {short} --language <en|zh>',
      '',
      'Codex usage:',
      '  - Use explicit `${short}-*` routes:',
      '    `${short}-onboard`, `${short}-propose`, `${short}-status`, `${short}-apply`'
    ].join('\n'),
    'install.success': 'Installed workflow commands for {path}',
    'uninstall.removed': 'Uninstalled: {platforms}',
    'uninstall.none': 'Nothing to uninstall.',
    'language.switched': 'Language switched to English.',
    'language.required': 'Language command requires <en|zh>. Run `{command} --help` for usage.',
    'language.invalid': 'Language must be en or zh.',
    'doc.guideName': 'GUIDE-en.md',
    'command.unknown': 'Unknown command: {command}. Run `{product} --help` for usage.'
  }),
  zh: Object.freeze({
    'cli.help': [
      '{productName} v{version}',
      '{productLongName}',
      '',
      'Usage:',
      '  {short} install --platform <claude|codex|gemini[,...]>',
      '  {short} uninstall --platform <claude|codex|gemini[,...]>',
      '  {short} check',
      '  {short} doc',
      '  {short} language <en|zh>',
      '  {short} migrate --dry-run',
      '  {short} migrate [--verbose]',
      '  {short} status',
      '  {short} --help',
      '  {short} --version',
      '',
      'Compatibility aliases:',
      '  {short} --check',
      '  {short} --doc',
      '  {short} --language <en|zh>',
      '',
      'Codex usage:',
      '  - Use explicit `${short}-*` routes:',
      '    `${short}-onboard`, `${short}-propose`, `${short}-status`, `${short}-apply`'
    ].join('\n'),
    'install.success': '已安装 workflow commands：{path}',
    'uninstall.removed': '已卸载：{platforms}',
    'uninstall.none': '没有可卸载内容。',
    'language.switched': '语言已切换为中文。',
    'language.required': 'language 命令需要 <en|zh>。运行 `{command} --help` 查看用法。',
    'language.invalid': 'Language must be en or zh.',
    'doc.guideName': 'GUIDE-zh.md',
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
