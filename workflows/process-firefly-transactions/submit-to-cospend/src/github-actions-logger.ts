import { Cause, FiberId, Logger, LogLevel } from "effect";
import * as os from "os";

export const ghaLogger = Logger.make(
  ({ cause, date, fiberId, logLevel, message }) => {
    const prettyMessage = serializeUnknown(message);
    const prettyCause =
      cause == null || cause._tag === "Empty" ? "" : Cause.pretty(cause);

    const output = getFormatterFunction(logLevel)(
      prettyMessage +
        (prettyCause === "" || prettyMessage === "" ? "" : "\n") +
        prettyCause,
      {
        timestamp: date.toISOString(),
        fiber: FiberId.threadName(fiberId),
      },
    );

    process.stdout.write(output + os.EOL);
  },
);

function getFormatterFunction(
  logLevel: LogLevel.LogLevel,
): (message: string, annotations: Record<string, unknown>) => string {
  return LogLevel.lessThanEqual(logLevel, LogLevel.Debug)
    ? debug
    : LogLevel.lessThanEqual(logLevel, LogLevel.Info)
      ? notice
      : LogLevel.lessThanEqual(logLevel, LogLevel.Warning)
        ? warning
        : error;
}

function serializeUnknown(u: unknown): string {
  try {
    return typeof u === "object" ? JSON.stringify(u) : String(u);
  } catch (_) {
    return String(u);
  }
}

// The functions below were imported from Github Actions toolkit
// from the following locations while removing side-effects:
// - https://github.com/actions/toolkit/blob/fe3e7ce9a7f995d29d1fcfd226a32bca407f9dc8/packages/core/src/core.ts
// - https://github.com/actions/toolkit/blob/fe3e7ce9a7f995d29d1fcfd226a32bca407f9dc8/packages/core/src/utils.ts
// - https://github.com/actions/toolkit/blob/fe3e7ce9a7f995d29d1fcfd226a32bca407f9dc8/packages/core/src/command.ts
//
// <editor-fold desc="github actions imported functions">
export function debug(
  message: string,
  properties: Record<string, unknown> = {},
): string {
  return new Command("debug", properties, message).toString();
}

export function error(
  message: string,
  properties: Record<string, unknown> = {},
): string {
  return new Command("error", properties, message).toString();
}

export function warning(
  message: string,
  properties: Record<string, unknown> = {},
): string {
  return new Command("warning", properties, message).toString();
}

export function notice(
  message: string,
  properties: Record<string, unknown> = {},
): string {
  return new Command("notice", properties, message).toString();
}

function toCommandValue(input: any): string {
  if (input === null || input === undefined) {
    return "";
  } else if (typeof input === "string" || input instanceof String) {
    return input as string;
  }
  return JSON.stringify(input);
}

interface CommandProperties {
  [key: string]: any;
}

const CMD_STRING = "::";

class Command {
  private readonly command: string;
  private readonly message: string;
  private readonly properties: CommandProperties;

  constructor(command: string, properties: CommandProperties, message: string) {
    if (!command) {
      command = "missing.command";
    }

    this.command = command;
    this.properties = properties;
    this.message = message;
  }

  toString(): string {
    let cmdStr = CMD_STRING + this.command;

    if (this.properties && Object.keys(this.properties).length > 0) {
      cmdStr += " ";
      let first = true;
      for (const key in this.properties) {
        if (this.properties.hasOwnProperty(key)) {
          const val = this.properties[key];
          if (val) {
            if (first) {
              first = false;
            } else {
              cmdStr += ",";
            }

            cmdStr += `${key}=${escapeProperty(val)}`;
          }
        }
      }
    }

    cmdStr += `${CMD_STRING}${escapeData(this.message)}`;
    return cmdStr;
  }
}

function escapeData(s: any): string {
  return toCommandValue(s)
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
}

function escapeProperty(s: any): string {
  return toCommandValue(s)
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A")
    .replace(/:/g, "%3A")
    .replace(/,/g, "%2C");
}
// </editor-fold>
