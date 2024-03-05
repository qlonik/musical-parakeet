import { IdStr } from "./generic.js";
import * as S from "@effect/schema/Schema";

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

const FireflyTransactionJournal = S.struct({
  transaction_journal_id: FireflyTransactionJournalId,
  date: S.Date,
  amount: S.string,
  description: S.string,
  tags: S.array(S.string),
  category_name: S.nullable(S.string),
});
type FireflyTransactionJournalFrom = S.Schema.From<
  typeof FireflyTransactionJournal
>;
export type FireflyTransactionJournalTo = S.Schema.To<
  typeof FireflyTransactionJournal
>;

export const FireflyTransaction = S.struct({
  id: FireflyTransactionId,
  attributes: S.struct({
    transactions: S.array(FireflyTransactionJournal),
  }),
});

export interface DataToSubmitForUpdate {
  apply_rules: boolean;
  fire_webhooks: boolean;
  transactions: ReadonlyArray<Partial<FireflyTransactionJournalFrom>>;
}
