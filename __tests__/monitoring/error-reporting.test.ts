/**
 * @jest-environment node
 */

/**
 * Sentry was installed and never ran (#100): Sentry 10 initialises only from
 * `instrumentation.ts`, which did not exist, and the browser config read a
 * DSN that was never sent to the browser. These pin down when it reports, and
 * that it stays inert without a DSN — local development, CI, and any
 * self-hoster who does not use Sentry.
 */

jest.mock('@sentry/nextjs', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureRequestError: jest.fn(),
}));

type Sentry = {
  init: jest.Mock;
  captureException: jest.Mock;
  captureRequestError: jest.Mock;
};

const ENV = { ...process.env };

/**
 * Fresh copies of the modules under test and of the Sentry mock they import.
 * Not `isolateModules`: the client module imports Sentry lazily, after such a
 * callback has returned, and would get a different mock from the one held here.
 */
function load() {
  jest.resetModules();
  return {
    sentry: jest.requireMock<Sentry>('@sentry/nextjs'),
    instrumentation:
      jest.requireActual<typeof import('@/instrumentation')>(
        '@/instrumentation'
      ),
    client: jest.requireActual<
      typeof import('@/lib/monitoring/client-error-reporting')
    >('@/lib/monitoring/client-error-reporting'),
  };
}

/** Lets the client module's lazy import settle. */
const settle = () => new Promise(resolve => setImmediate(resolve));

afterEach(() => {
  process.env = { ...ENV };
  jest.clearAllMocks();
});

describe('server and edge (instrumentation.ts)', () => {
  it('initialises nothing without a DSN', async () => {
    delete process.env.SENTRY_DSN;
    const { instrumentation, sentry } = load();

    await instrumentation.register();

    expect(sentry.init).not.toHaveBeenCalled();
  });

  it('initialises with the DSN, the environment, and no personal data', async () => {
    process.env.SENTRY_DSN = 'https://key@o1.ingest.sentry.io/1';
    process.env.SENTRY_ENVIRONMENT = 'staging';
    const { instrumentation, sentry } = load();

    await instrumentation.register();

    expect(sentry.init).toHaveBeenCalledWith({
      dsn: 'https://key@o1.ingest.sentry.io/1',
      environment: 'staging',
      sendDefaultPii: false,
    });
  });

  it('reports errors thrown while serving a request', () => {
    const { instrumentation, sentry } = load();

    expect(instrumentation.onRequestError).toBe(sentry.captureRequestError);
  });
});

describe('browser (client-error-reporting.ts)', () => {
  it('reports nothing, and loads nothing, without a DSN', async () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    const { client, sentry } = load();

    client.startClientErrorReporting();
    client.reportCaughtError(new Error('render failed'));
    await settle();

    expect(sentry.init).not.toHaveBeenCalled();
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it('initialises once and reports an error a boundary caught', async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://key@o1.ingest.sentry.io/1';
    const { client, sentry } = load();
    const error = new Error('render failed');

    client.startClientErrorReporting();
    client.reportCaughtError(error);
    await settle();

    expect(sentry.init).toHaveBeenCalledTimes(1);
    expect(sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ sendDefaultPii: false })
    );
    expect(sentry.captureException).toHaveBeenCalledWith(error);
  });

  it('does not send a server error again from the browser', async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://key@o1.ingest.sentry.io/1';
    const { client, sentry } = load();

    client.reportCaughtError(
      Object.assign(new Error('redacted'), { digest: '1234567890' })
    );
    await settle();

    expect(sentry.captureException).not.toHaveBeenCalled();
  });
});
