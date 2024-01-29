import { Schema as S } from "@effect/schema";
import { ParseError } from "@effect/schema/ParseResult";
import { Data, Effect as T, Request, RequestResolver } from "effect";
import { pipe } from "effect/Function";

import {
  CospendProjectDescriptionS,
  CospendProjectDescriptionTo,
  ProjectId,
} from "../model/cospend.js";
import { CospendApiService } from "./axios-instances.js";
import { convertErrorToMessage, NetworkError } from "./errors.js";

export class GetCospendProjectDescriptionError extends Data.TaggedError(
  "GetCospendProjectDescriptionError",
)<{ error: NetworkError | ParseError }> {
  override toString() {
    return convertErrorToMessage(this.error, "GetCospendProjectDescription");
  }
}

export interface GetCospendProjectDescription
  extends Request.Request<
    GetCospendProjectDescriptionError,
    CospendProjectDescriptionTo
  > {
  readonly _tag: "GetCospendProjectDescription";
  readonly project: ProjectId;
}
export const GetCospendProjectDescription =
  Request.tagged<GetCospendProjectDescription>("GetCospendProjectDescription");

export const GetCospendProjectDescriptionResolver = pipe(
  ({ project }: GetCospendProjectDescription) =>
    pipe(
      CospendApiService,
      T.flatMap(({ client }) =>
        client.request({ method: "get", url: `/api-priv/projects/${project}` }),
      ),
      T.map((_) => _.data),
      T.flatMap(S.decodeUnknown(CospendProjectDescriptionS, { errors: "all" })),
      T.mapError((error) => new GetCospendProjectDescriptionError({ error })),
    ),
  RequestResolver.fromEffect,
  RequestResolver.contextFromServices(CospendApiService),
);

export const getCospendProjectDescription = (project: ProjectId) =>
  T.request(
    GetCospendProjectDescription({ project }),
    GetCospendProjectDescriptionResolver,
  );
