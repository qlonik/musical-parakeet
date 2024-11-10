import { Schema as S } from "effect";

import { IdStr } from "./generic.js";

export const FireflyPersonalAccessToken = S.String.pipe(
  S.brand("ff3-personal-access-token"),
);

export const FireflyTransactionId = IdStr.pipe(S.brand("firefly-transactions"));
export type FireflyTransactionId = typeof FireflyTransactionId.Type;

export const FireflyTransactionJournalId = IdStr.pipe(
  S.brand("firefly-transaction-journal"),
);
export type FireflyTransactionJournalId =
  typeof FireflyTransactionJournalId.Type;

const FireflyTransactionJournal = S.Struct({
  transaction_journal_id: FireflyTransactionJournalId,
  date: S.Date,
  amount: S.String,
  description: S.String,
  tags: S.Array(S.String),
  category_name: S.NullOr(S.String),
});
type FireflyTransactionJournalFrom = typeof FireflyTransactionJournal.Encoded;
export type FireflyTransactionJournalTo = typeof FireflyTransactionJournal.Type;

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
