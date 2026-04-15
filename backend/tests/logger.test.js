'use strict';

describe('logger', () => {
  let stdoutSpy;
  let stderrSpy;
  let logger;

  beforeEach(() => {
    // Isolate module so LOG_LEVEL changes take effect
    jest.resetModules();
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => {});
    logger = require('../utils/logger');
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  // ── output routing ───────────────────────────────────────────────────────

  test('info writes to stdout', () => {
    logger.info('hello');
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  test('debug writes to stdout', () => {
    process.env.LOG_LEVEL = 'debug';
    jest.resetModules();
    const l = require('../utils/logger');
    l.debug('dbg');
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
  });

  test('warn writes to stderr', () => {
    logger.warn('oops');
    expect(stderrSpy).toHaveBeenCalledTimes(1);
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  test('error writes to stderr', () => {
    logger.error('boom');
    expect(stderrSpy).toHaveBeenCalledTimes(1);
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  // ── JSON format ──────────────────────────────────────────────────────────

  test('log line is valid JSON with required fields', () => {
    logger.info('test msg', { foo: 'bar' });
    const raw = stdoutSpy.mock.calls[0][0];
    const parsed = JSON.parse(raw);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('test msg');
    expect(parsed.foo).toBe('bar');
    expect(typeof parsed.timestamp).toBe('string');
  });

  test('each log line ends with a newline', () => {
    logger.info('newline check');
    const raw = stdoutSpy.mock.calls[0][0];
    expect(raw.endsWith('\n')).toBe(true);
  });

  // ── Error serialisation ──────────────────────────────────────────────────

  test('Error in meta is serialised to name + message', () => {
    const err = new Error('something bad');
    logger.error('failed', { err });
    const raw = stderrSpy.mock.calls[0][0];
    const parsed = JSON.parse(raw);
    expect(parsed.err.name).toBe('Error');
    expect(parsed.err.message).toBe('something bad');
  });

  test('non-Error meta value is passed through unchanged', () => {
    logger.info('ctx', { count: 42 });
    const raw = stdoutSpy.mock.calls[0][0];
    const parsed = JSON.parse(raw);
    expect(parsed.count).toBe(42);
  });

  // ── Level filtering ──────────────────────────────────────────────────────

  test('messages below the active level are suppressed', () => {
    process.env.LOG_LEVEL = 'error';
    jest.resetModules();
    const l = require('../utils/logger');
    l.debug('silent');
    l.info('silent');
    l.warn('silent');
    expect(stdoutSpy).not.toHaveBeenCalled();
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  test('error messages are emitted even when level is error', () => {
    process.env.LOG_LEVEL = 'error';
    jest.resetModules();
    const l = require('../utils/logger');
    l.error('visible');
    expect(stderrSpy).toHaveBeenCalledTimes(1);
  });
});
