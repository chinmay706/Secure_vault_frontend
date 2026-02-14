/**
 * Console management utility to control logging levels
 */

type LogLevel = "error" | "warn" | "info" | "log" | "debug";

interface ConsoleConfig {
  enabled: LogLevel[];
  production: LogLevel[];
  development: LogLevel[];
}

const defaultConfig: ConsoleConfig = {
  enabled: ["error"], // Only show errors by default
  production: ["error"], // Only errors in production
  development: ["error", "warn", "info", "log"], // Most logs in development
};

/**
 * Configure which console methods are active
 */
export const configureConsole = (config: Partial<ConsoleConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config };
  const activeLogLevels = import.meta.env.PROD
    ? finalConfig.production
    : finalConfig.development;

  // Override console methods
  const originalConsole = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    log: console.log,
    debug: console.debug,
  };

  // Disable methods not in activeLogLevels
  (["error", "warn", "info", "log", "debug"] as LogLevel[]).forEach((level) => {
    if (!activeLogLevels.includes(level)) {
      console[level] = () => {}; // No-op
    } else {
      console[level] = originalConsole[level]; // Keep original
    }
  });

  return originalConsole; // Return originals in case you need to restore
};

/**
 * Completely silence all console output
 */
export const silenceConsole = () => {
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.debug = () => {};
};

/**
 * Hide only warnings and info, keep errors and logs
 */
export const hideWarnings = () => {
  console.warn = () => {};
  console.info = () => {};
};
