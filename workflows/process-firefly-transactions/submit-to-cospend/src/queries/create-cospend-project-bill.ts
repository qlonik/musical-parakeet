import { ParseError } from "@effect/schema/ParseResult";
import { Schema as S } from "@effect/schema";
import { Data, Effect as T, Request, RequestResolver, pipe } from "effect";
import { BillIdStr, BillIdStrTo, ProjectId } from "../model/cospend.js";
import { CospendApiService } from "./axios-instances.js";
import { NetworkError } from "./errors.js";

export class CreateCospendProjectBillError extends Data.TaggedError(
  "CreateCospendProjectBillError",
)<{ error: NetworkError<unknown, Record<string, unknown>> | ParseError }> {}

export interface CreateCospendProjectBill
  extends Request.Request<CreateCospendProjectBillError, BillIdStrTo> {
  readonly _tag: "CreateCospendProjectBill";
  readonly project: ProjectId;
  readonly data: /* should be `typeof OBJECT_TO_SEND` */ Record<
    string,
    unknown
  >;
}
export const CreateCospendProjectBill =
  Request.tagged<CreateCospendProjectBill>("CreateCospendProjectBill");

export const CreateCospendProjectBillResolver = pipe(
  ({ project, data }: CreateCospendProjectBill) =>
    pipe(
      CospendApiService,
      T.flatMap(({ client }) =>
        client.request<unknown, CreateCospendProjectBill["data"]>({
          method: "post",
          url: `/api-priv/projects/${project}/bills`,
          data,
        }),
      ),
      T.map((_) => _.data),
      T.flatMap((_) => S.parse(BillIdStr)(_, { errors: "all" })),
      T.mapError((error) => new CreateCospendProjectBillError({ error })),
    ),
  RequestResolver.fromFunctionEffect,
  RequestResolver.contextFromServices(CospendApiService),
);

export const createCospendProjectBill = (
  project: ProjectId,
  data: CreateCospendProjectBill["data"],
) =>
  T.request(
    CreateCospendProjectBill({ project, data }),
    CreateCospendProjectBillResolver,
  );
