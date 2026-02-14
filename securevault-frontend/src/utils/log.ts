/**
 * Global logging utilities with structured prefixes and lifecycle tracking
 */

type Scope =
  | "[AUTH]"
  | "[GQL]"
  | "[REST]"
  | "[NAV]"
  | "[UPLOAD]"
  | "[ADMIN]"
  | "[PREVIEW]"
  | "[ENV]";

export interface LogTimer {
  ok: (extra?: Record<string, unknown>) => void;
  err: (error: unknown) => void;
}

/**
 * Start a timed operation with structured logging
 */
export const logStart = (
  scope: Scope,
  action: string,
  meta?: Record<string, unknown>
): LogTimer => {
  const ts = new Date().toISOString();
  const t0 = performance.now();

  console.info(`${ts} ${scope} ${action}:start`, meta ?? {});

  return {
    ok: (extra?: Record<string, unknown>) => {
      const ms = Math.round(performance.now() - t0);
      console.info(`${new Date().toISOString()} ${scope} ${action}:ok`, {
        ms,
        ...(extra ?? {}),
      });
    },
    err: (error: unknown) => {
      const ms = Math.round(performance.now() - t0);
      console.error(`${new Date().toISOString()} ${scope} ${action}:err`, {
        ms,
        message: error instanceof Error ? error.message : String(error),
        error,
      });
    },
  };
};

/**
 * Log informational message with scope
 */
export const logInfo = (
  scope: Scope,
  msg: string,
  extra?: Record<string, unknown>
) => {
  const ts = new Date().toISOString();
  console.info(`${ts} ${scope} ${msg}`, extra ?? {});
};

/**
 * Log error message with scope
 */
export const logError = (
  scope: Scope,
  msg: string,
  extra?: Record<string, unknown>
) => {
  const ts = new Date().toISOString();
  console.error(`${ts} ${scope} ${msg}`, extra ?? {});
};
