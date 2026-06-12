/**
 * Logger utility for Mines & Choo-Choos
 *
 * Usage:
 *   import { log } from '$lib/logger';
 *
 *   log.debug('context', 'message');
 *   log.info('context', 'message');
 *   log.warn('context', 'message');
 *   log.error('context', 'message');
 */

// Get current filename and line number for stack trace analysis
function getCallerInfo(): { file: string; line: number } {
    const err = new Error();
    const stackLines = err.stack?.split('\n') || [];

    // Skip first 2 lines (constructor + "at Object.<anonymous>")
    const callerLine = stackLines[2]?.match(/:(\d+)/)?.[1];

    return {
        file: stackLines[1]?.replace(/^.*?([^\/\\]+)\.ts$/, '$1') || 'unknown',
        line: callerLine || '?',
    };
}

// ANSI color codes for console output
const COLORS = {
    reset: '\x1b[0m',
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m', // Green
    warn: '\x1b[33m', // Yellow
    error: '\x1b[31m', // Red
};

export const log = {
    /**
     * Debug level - transient state, dev-only info
     * Example: miner merge animation, tile updates
     */
    debug: (context: string, message: string, ...args: any[]) => {
        const caller = getCallerInfo();
        console.debug(
            `${COLORS.debug}[DEBUG]${COLORS.reset} [${caller.file}:${caller.line}] [${context}] ${message}`,
            ...args,
        );
    },

    /**
     * Info level - lifecycle events, milestones
     * Example: tab switch, world load, age unlocked
     */
    info: (context: string, message: string, ...args: any[]) => {
        const caller = getCallerInfo();
        console.info(
            `${COLORS.info}[INFO]${COLORS.reset} [${caller.file}:${caller.line}] [${context}] ${message}`,
            ...args,
        );
    },

    /**
     * Warn level - recoverable issues, expected edge cases
     * Example: no miners available, resource shortage (non-fatal)
     */
    warn: (context: string, message: string, ...args: any[]) => {
        const caller = getCallerInfo();
        console.warn(
            `${COLORS.warn}[WARN]${COLORS.reset} [${caller.file}:${caller.line}] [${context}] ${message}`,
            ...args,
        );
    },

    /**
     * Error level - fatal logic bugs, data integrity issues
     * Example: negative resources, generation crash, save failure
     */
    error: (context: string, message: string, ...args: any[]) => {
        const caller = getCallerInfo();
        console.error(
            `${COLORS.error}[ERROR]${COLORS.reset} [${caller.file}:${caller.line}] [${context}] ${message}`,
            ...args,
        );
    },
};
