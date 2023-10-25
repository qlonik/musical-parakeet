import { Schema as S } from "@effect/schema";
import { ParseError } from "@effect/schema/ParseResult";
import Axios from "axios";
import { Data, Effect as T, Request, RequestResolver } from "effect";
import { pipe } from "effect/Function";

import {
  CospendProjectDescriptionS,
  CospendProjectDescriptionTo,
  ProjectId,
} from "../model/cospend.js";
import { CospendApiService } from "./axios-instances.js";
import { NetworkError } from "./errors.js";

export class GetCospendProjectDescriptionError extends Data.TaggedError(
  "GetCospendProjectDescriptionError",
)<{ error: NetworkError | ParseError }> {}

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
      T.flatMap(({ axios }) =>
        T.tryPromise((signal) =>
          axios.request({
            method: "get",
            url: `/api-priv/projects/${project}`,
            signal,
          }),
        ),
      ),
      T.catchAll((error) =>
        Axios.isAxiosError(error)
          ? new GetCospendProjectDescriptionError({
              error: new NetworkError({ error }),
            })
          : T.dieSync(() => {
              console.log(
                Axios.isCancel(error)
                  ? "cancellation was thrown"
                  : "something unknown was thrown",
              );
              return error;
            }),
      ),
      T.map((_) => _.data),
      T.flatMap((_) =>
        S.parse(CospendProjectDescriptionS)(_, { errors: "all" }),
      ),
      T.catchTag("ParseError", (error) =>
        T.fail(new GetCospendProjectDescriptionError({ error })),
      ),
    ),
  RequestResolver.fromFunctionEffect,
  RequestResolver.contextFromServices(CospendApiService),
);

export const getCospendProjectDescription = (project: ProjectId) =>
  T.request(
    GetCospendProjectDescription({ project }),
    GetCospendProjectDescriptionResolver,
  );
