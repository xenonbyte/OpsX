function renderTemplate(template, values) {
  return Object.keys(values).reduce((output, key) => {
    const pattern = new RegExp(`{{${key}}}`, 'g');
    return output.replace(pattern, String(values[key]));
  }, template);
}

module.exports = {
  renderTemplate
};
