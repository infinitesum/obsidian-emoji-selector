/**
 * Centralized logging system for the Emoji Selector plugin
 * Provides controlled logging that can be easily disabled in production
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}

export class Logger {
    private static instance: Logger;
    private logLevel: LogLevel = LogLevel.WARN; // Default to WARN and above
    private prefix = '[Emoji Selector]';

    private constructor() { }

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    /**
     * Set the minimum log level to display
     */
    setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    /**
     * Enable debug logging (shows all logs)
     */
    enableDebug(): void {
        this.logLevel = LogLevel.DEBUG;
    }

    /**
     * Disable all logging
     */
    disable(): void {
        this.logLevel = LogLevel.NONE;
    }

    /**
     * Debug level logging - for development only
     */
    debug(message: string, ...args: unknown[]): void {
        if (this.logLevel <= LogLevel.DEBUG) {
            console.log(`${this.prefix} [DEBUG]`, message, ...args);
        }
    }

    /**
     * Info level logging - for general information
     */
    info(message: string, ...args: unknown[]): void {
        if (this.logLevel <= LogLevel.INFO) {
            console.log(`${this.prefix} [INFO]`, message, ...args);
        }
    }

    /**
     * Warning level logging - for non-critical issues
     */
    warn(message: string, ...args: unknown[]): void {
        if (this.logLevel <= LogLevel.WARN) {
            console.warn(`${this.prefix} [WARN]`, message, ...args);
        }
    }

    /**
     * Error level logging - for critical issues
     */
    error(message: string, ...args: unknown[]): void {
        if (this.logLevel <= LogLevel.ERROR) {
            console.error(`${this.prefix} [ERROR]`, message, ...args);
        }
    }

    /**
     * Performance logging with grouping
     */
    performanceGroup(title: string, callback: () => void): void {
        if (this.logLevel <= LogLevel.DEBUG) {
            console.group(`${this.prefix} ${title}`);
            callback();
            console.groupEnd();
        }
    }

    /**
     * Benchmark logging - only shows in debug mode
     */
    benchmark(message: string, ...args: unknown[]): void {
        if (this.logLevel <= LogLevel.DEBUG) {
            console.log(`${this.prefix} [BENCHMARK]`, message, ...args);
        }
    }
}

// Export a singleton instance for easy use
export const logger = Logger.getInstance();