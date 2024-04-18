import { IdStr } from "./generic.js";
import * as S from "@effect/schema/Schema";

export const FireflyPersonalAccessToken = S.String.pipe(
  S.brand("ff3-personal-access-token"),
);

export const FireflyTransactionId = IdStr.pipe(S.brand("firefly-transactions"));
export type FireflyTransactionId = S.Schema.Type<typeof FireflyTransactionId>;

export const FireflyTransactionJournalId = IdStr.pipe(
  S.brand("firefly-transaction-journal"),
);
export type FireflyTransactionJournalId = S.Schema.Type<
  typeof FireflyTransactionJournalId
>;

const FireflyTransactionJournal = S.Struct({
  transaction_journal_id: FireflyTransactionJournalId,
  date: S.Date,
  amount: S.String,
  description: S.String,
  tags: S.Array(S.String),
  category_name: S.NullOr(S.String),
});
type FireflyTransactionJournalFrom = S.Schema.Encoded<
  typeof FireflyTransactionJournal
>;
export type FireflyTransactionJournalTo = S.Schema.Type<
  typeof FireflyTransactionJournal
>;

export const FireflyTransaction = S.Struct({
  id: FireflyTransactionId,
  attributes: S.Struct({
    transactions: S.Array(FireflyTransactionJournal),
  }),
});

export interface DataToSubmitForUpdate {
  apply_rules: boolean;
  fire_webhooks: boolean;
  transactions: ReadonlyArray<Partial<FireflyTransactionJournalFrom>>;
}
