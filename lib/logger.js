function shouldEnableLogger(options = {}) {
  return options.verbose === true
    || options.debug === true
    || process.env.OPSX_DEBUG === '1';
}

function createLogger(options = {}) {
  const enabled = shouldEnableLogger(options);
  const sink = typeof options.sink === 'function'
    ? options.sink
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
