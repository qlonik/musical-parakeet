import {
  Data,
  Effect as T,
  Request,
  RequestResolver,
  Schema as S,
  ParseResult,
  pipe,
} from "effect";

import { BillId, ProjectId } from "../model/cospend.js";
import { CospendApiService } from "./axios-instances.js";
import { convertErrorToMessage, NetworkError } from "./errors.js";

export class CreateCospendProjectBillError extends Data.TaggedError(
  "CreateCospendProjectBillError",
)<{
  error:
    | NetworkError<unknown, Record<string, unknown>>
    | ParseResult.ParseError;
}> {
  override get message() {
    return convertErrorToMessage(this.error, "CreateCospendProjectBill");
  }
}

export interface CreateCospendProjectBill
  extends Request.Request<BillId, CreateCospendProjectBillError> {
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
      T.flatMap(S.decodeUnknown(BillId, { errors: "all" })),
      T.mapError((error) => new CreateCospendProjectBillError({ error })),
    ),
  RequestResolver.fromEffect,
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
