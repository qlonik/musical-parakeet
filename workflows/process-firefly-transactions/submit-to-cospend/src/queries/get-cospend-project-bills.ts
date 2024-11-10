import {
  Data,
  Effect as T,
  Schema as S,
  Request,
  RequestResolver,
  ParseResult,
  pipe,
} from "effect";

import {
  CospendProjectBillsS,
  CospendProjectBillsTo,
  ProjectId,
} from "../model/cospend.js";
import { CospendApiService } from "./axios-instances.js";
import { convertErrorToMessage, NetworkError } from "./errors.js";

export class GetCospendProjectBillsError extends Data.TaggedError(
  "GetCospendProjectBillsError",
)<{ error: NetworkError | ParseResult.ParseError }> {
  override get message() {
    return convertErrorToMessage(this.error, "GetCospendProjectBills");
  }
}

export interface GetCospendProjectBills
  extends Request.Request<CospendProjectBillsTo, GetCospendProjectBillsError> {
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
      T.flatMap(S.decodeUnknown(CospendProjectBillsS, { errors: "all" })),
      T.mapError((error) => new GetCospendProjectBillsError({ error })),
    ),
  RequestResolver.fromEffect,
  RequestResolver.contextFromServices(CospendApiService),
);

export const getCospendProjectBills = (project: ProjectId) =>
  T.request(
    GetCospendProjectBills({ project }),
    GetCospendProjectBillsResolver,
  );
