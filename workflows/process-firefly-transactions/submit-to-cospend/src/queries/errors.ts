import { Data, Match } from "effect";
import { type AxiosError } from "axios";
import { ParseError } from "@effect/schema/ParseResult";
import { pipe } from "effect/Function";
import * as os from "os";
import { TreeFormatter } from "@effect/schema";

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
  error: NetworkError<unknown, unknown> | ParseError,
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
      ({ errors }) =>
        "invalid response from " +
        type +
        os.EOL +
        TreeFormatter.formatErrors(errors),
    ),
    Match.exhaustive,
  );
