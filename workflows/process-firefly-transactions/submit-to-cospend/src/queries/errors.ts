import { Data } from "effect";
import { type AxiosError } from "axios";

export class UnknownError extends Data.TaggedError("UnknownError")<{
  error: unknown;
}> {}

export class NetworkError<
  Result = unknown,
  InputData = never,
> extends Data.TaggedError("NetworkError")<{
  error: AxiosError<Result, InputData>;
}> {}
