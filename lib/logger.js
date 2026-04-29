function shouldEnableLogger(options = {}) {
  const source = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
  return source.verbose === true
    || source.debug === true
    || process.env.OPSX_DEBUG === '1';
}

function createLogger(options = {}) {
  const source = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
  const enabled = shouldEnableLogger(source);
  const sink = typeof source.sink === 'function'
    ? source.sink
    : (line) => process.stderr.write(`${line}\n`);

  function write(level, event, fields = {}) {
    if (!enabled) return;
    const payload = Object.assign({
      time: new Date().toISOString(),
      level,
      event: String(event || '')
    }, fields && typeof fields === 'object' && !Array.isArray(fields) ? fields : {});
    sink(JSON.stringify(payload));
  }

  return {
    enabled,
    debug: (event, fields) => write('debug', event, fields),
    info: (event, fields) => write('info', event, fields),
    warn: (event, fields) => write('warn', event, fields),
    error: (event, fields) => write('error', event, fields)
  };
}

module.exports = {
  createLogger
};
