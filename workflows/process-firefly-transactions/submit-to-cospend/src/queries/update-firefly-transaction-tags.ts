import {
  Data,
  Effect as T,
  Request,
  RequestResolver,
  ParseResult,
  pipe,
} from "effect";

import {
  DataToSubmitForUpdate,
  FireflyTransactionId,
  FireflyTransactionJournalId,
} from "../model/firefly.js";
import { FireflyApiService } from "./axios-instances.js";
import { convertErrorToMessage, NetworkError } from "./errors.js";

export class UpdateFireflyTransactionTagsError extends Data.TaggedError(
  "UpdateFireflyTransactionTagsError",
)<{
  error: NetworkError<unknown, DataToSubmitForUpdate> | ParseResult.ParseError;
}> {
  override get message() {
    return convertErrorToMessage(this.error, "UpdateFireflyTransactionTags");
  }
}

export interface UpdateFireflyTransactionTags
  extends Request.Request<void, UpdateFireflyTransactionTagsError> {
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
        client.request<unknown, DataToSubmitForUpdate>({
          method: "put",
          url: `/v1/transactions/${transactionId}`,
          data: {
            apply_rules: true,
            fire_webhooks: true,
            transactions,
          },
        }),
      ),
      T.asVoid,
      T.mapError((error) => new UpdateFireflyTransactionTagsError({ error })),
    ),
  RequestResolver.fromEffect,
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
