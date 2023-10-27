import { IdStr } from "./generic.js";
import * as S from "@effect/schema/Schema";

const FireflyUserId = IdStr.pipe(S.brand("firefly-user"));

export const FireflyPersonalAccessToken = S.string.pipe(
  S.brand("ff3-personal-access-token"),
);

export const FireflyTransactionId = IdStr.pipe(S.brand("firefly-transactions"));
export type FireflyTransactionId = S.Schema.To<typeof FireflyTransactionId>;

export const FireflyTransactionJournalId = IdStr.pipe(
  S.brand("firefly-transaction-journal"),
);
export type FireflyTransactionJournalId = S.Schema.To<
  typeof FireflyTransactionJournalId
>;

export const FireflyCategoryName = S.nullable(S.string);
export type FireflyCategoryName = S.Schema.To<typeof FireflyCategoryName>;

const FireflyTransactionJournal = S.struct({
  user: FireflyUserId,
  transaction_journal_id: FireflyTransactionJournalId,
  type: S.literal("withdrawal"),
  date: S.Date,
  currency_decimal_places: S.number,
  amount: S.string,
  description: S.string,
  tags: S.array(S.string),
  category_id: S.nullable(S.string),
  category_name: FireflyCategoryName,
});
type FireflyTransactionJournalFrom = S.Schema.From<
  typeof FireflyTransactionJournal
>;

export const FireflyTransaction = S.struct({
  type: S.literal("transactions"),
  id: FireflyTransactionId,
  attributes: S.struct({
    created_at: S.Date,
    updated_at: S.Date,
    user: FireflyUserId,
    transactions: S.array(FireflyTransactionJournal),
  }),
});

export interface DataToSubmitForUpdate {
  apply_rules: boolean;
  fire_webhooks: boolean;
  transactions: ReadonlyArray<Partial<FireflyTransactionJournalFrom>>;
}
