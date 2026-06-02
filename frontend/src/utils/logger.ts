/* eslint-disable no-console */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';
type LogContext = Record<string, unknown>;

class Logger {
    private readonly prefix = '[MeTube]';

    private format(level: LogLevel, message: string, context?: LogContext): string {
        const timestamp = new Date().toISOString();
        const ctx = context ? ` | ${JSON.stringify(context)}` : '';
        return `${this.prefix} [${level.toUpperCase()}] [${timestamp}] ${message}${ctx}`;
    }

    error(message: string, context?: LogContext): void {
        console.error(this.format('error', message, context));
    }

    warn(message: string, context?: LogContext): void {
        console.warn(this.format('warn', message, context));
    }

    info(message: string, context?: LogContext): void {
        console.info(this.format('info', message, context));
    }

    debug(message: string, context?: LogContext): void {
        if (import.meta.env.DEV) {
            console.debug(this.format('debug', message, context));
        }
    }
}

export const logger = new Logger();
