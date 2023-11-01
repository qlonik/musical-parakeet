import { Schema as S } from "@effect/schema";
import { ParseError } from "@effect/schema/ParseResult";
import { Data, Effect as T, Request, RequestResolver } from "effect";
import { pipe } from "effect/Function";
import {
  CospendProjectBillsS,
  CospendProjectBillsTo,
  ProjectId,
} from "../model/cospend.js";
import { CospendApiService } from "./axios-instances.js";
import { convertErrorToMessage, NetworkError } from "./errors.js";

export class GetCospendProjectBillsError extends Data.TaggedError(
  "GetCospendProjectBillsError",
)<{ error: NetworkError | ParseError }> {
  override toString() {
    return convertErrorToMessage(this.error, "GetCospendProjectBills");
  }
}

export interface GetCospendProjectBills
  extends Request.Request<GetCospendProjectBillsError, CospendProjectBillsTo> {
  readonly _tag: "GetCospendProjectBills";
  readonly project: ProjectId;
}

export const GetCospendProjectBills = Request.tagged<GetCospendProjectBills>(
  "GetCospendProjectBills",
);

export const GetCospendProjectBillsResolver = pipe(
  ({ project }: GetCospendProjectBills) =>
    pipe(
      CospendApiService,
      T.flatMap(({ client }) =>
        client.request({
          method: "get",
          url: `/api-priv/projects/${project}/bills`,
        }),
      ),
      T.map((_) => _.data),
      T.flatMap((_) => S.parse(CospendProjectBillsS)(_, { errors: "all" })),
      T.mapError((error) => new GetCospendProjectBillsError({ error })),
    ),
  RequestResolver.fromFunctionEffect,
  RequestResolver.contextFromServices(CospendApiService),
);

export const getCospendProjectBills = (project: ProjectId) =>
  T.request(
    GetCospendProjectBills({ project }),
    GetCospendProjectBillsResolver,
  );
