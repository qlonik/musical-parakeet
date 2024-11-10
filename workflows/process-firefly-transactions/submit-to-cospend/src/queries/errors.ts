import { Data, Match, ParseResult, pipe } from "effect";
import { type AxiosError } from "axios";
import * as os from "os";

export class UnknownError extends Data.TaggedError("UnknownError")<{
  error: unknown;
}> {}

export class NetworkError<
  Result = unknown,
  InputData = never,
> extends Data.TaggedError("NetworkError")<{
  error: AxiosError<Result, InputData>;
}> {}

export const convertErrorToMessage = (
  error: NetworkError<unknown, unknown> | ParseResult.ParseError,
  type: string,
): string =>
  pipe(
    Match.value(error),
    Match.tag(
      "NetworkError",
      ({ error }) =>
        "networking error performing " + type + os.EOL + error.message,
    ),
    Match.tag(
      "ParseError",
      (error) =>
        "invalid response from " +
        type +
        os.EOL +
        ParseResult.TreeFormatter.formatError(error),
    ),
    Match.exhaustive,
  );
