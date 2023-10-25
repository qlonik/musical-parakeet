import { ParseError } from "@effect/schema/ParseResult";
import { Data, Effect as T, Request, RequestResolver, pipe } from "effect";
import {
  DataToSubmitForUpdate,
  FireflyTransactionId,
  FireflyTransactionJournalId,
} from "../model/firefly.js";
import { FireflyApiService } from "./axios-instances.js";
import { NetworkError } from "./errors.js";

export class UpdateFireflyTransactionTagsError extends Data.TaggedError(
  "UpdateFireflyTransactionTagsError",
)<{ error: NetworkError | ParseError }> {}

export interface UpdateFireflyTransactionTags
  extends Request.Request<UpdateFireflyTransactionTagsError, void> {
  readonly _tag: "UpdateFireflyTransactionTags";
  readonly transactionId: FireflyTransactionId;
  readonly transactions: ReadonlyArray<{
    transaction_journal_id: FireflyTransactionJournalId;
    tags?: ReadonlyArray<string>;
  }>;
}

export const UpdateFireflyTransactionTags =
  Request.tagged<UpdateFireflyTransactionTags>("UpdateFireflyTransactionTags");

export const UpdateFireflyTransactionTagsResolver = pipe(
  ({ transactionId, transactions }: UpdateFireflyTransactionTags) =>
    pipe(
      FireflyApiService,
      T.flatMap(({ client }) =>
        client.request<DataToSubmitForUpdate>({
          method: "put",
          url: `/v1/transactions/${transactionId}`,
          data: {
            apply_rules: true,
            fire_webhooks: true,
            transactions,
          },
        }),
      ),
      T.asUnit,
      T.mapError((error) => new UpdateFireflyTransactionTagsError({ error })),
    ),
  RequestResolver.fromFunctionEffect,
  RequestResolver.contextFromServices(FireflyApiService),
);

export const updateFireflyTransactionTags = (
  transactionId: FireflyTransactionId,
  transactions: ReadonlyArray<{
    transaction_journal_id: FireflyTransactionJournalId;
    tags?: ReadonlyArray<string>;
  }>,
) =>
  T.request(
    UpdateFireflyTransactionTags({ transactionId, transactions }),
    UpdateFireflyTransactionTagsResolver,
  );
