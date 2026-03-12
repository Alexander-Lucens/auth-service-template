import { Injectable, ConsoleLogger, LogLevel } from '@nestjs/common';

@Injectable()
export class LoggerService extends ConsoleLogger {
  private readonly logLevels: LogLevel[] = [
    'error',
    'warn',
    'log',
    'debug',
    'verbose',
  ];
  private currentLogLevel: number;

  constructor() {
    super();
    this.currentLogLevel = parseInt(process.env.LOG_LEVEL) || 2;
    this.setLogLevels(this.logLevels.slice(0, this.currentLogLevel + 1));
  }

  log(message: any, ...optionalParams: any[]) {
    this.writeStructured('log', message, ...optionalParams);
  }

  error(message: any, ...optionalParams: any[]) {
    this.writeStructured('error', message, ...optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    this.writeStructured('warn', message, ...optionalParams);
  }

  debug(message: any, ...optionalParams: any[]) {
    this.writeStructured('debug', message, ...optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]) {
    this.writeStructured('verbose', message, ...optionalParams);
  }

  private writeStructured(
    level: LogLevel,
    message: any,
    ...optionalParams: any[]
  ) {
    if (this.logLevels.indexOf(level as LogLevel) > this.currentLogLevel) {
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      params: optionalParams,
    };

    // Loki / promtail-friendly: одна JSON-строка в stdout
    // (stdout/stderr собираются как логи контейнера)
    // error -> stderr, остальные -> stdout
    const serialized = JSON.stringify(payload);
    if (level === 'error') {
      // eslint-disable-next-line no-console
      console.error(serialized);
    } else {
      // eslint-disable-next-line no-console
      console.log(serialized);
    }
  }
}
