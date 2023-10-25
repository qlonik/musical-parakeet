import { IdStr } from "./generic.js";
import * as S from "@effect/schema/Schema";

const FireflyUserId = IdStr.pipe(S.brand("firefly-user"));

export const FireflyPersonalAccessToken = S.string.pipe(
  S.brand("ff3-personal-access-token"),
);

export const FireflyTransaction = S.struct({
  type: S.literal("transactions"),
  id: IdStr.pipe(S.brand("firefly-transactions")),
  attributes: S.struct({
    created_at: S.Date,
    updated_at: S.Date,
    user: FireflyUserId,
    transactions: S.array(
      S.struct({
        user: FireflyUserId,
        transaction_journal_id: IdStr.pipe(
          S.brand("firefly-transaction-journal"),
        ),
        type: S.literal("withdrawal"),
        date: S.Date,
        currency_decimal_places: S.number,
        amount: S.string,
        description: S.string,
        tags: S.array(S.string),
        category_id: S.nullable(S.string),
        category_name: S.nullable(S.string),
      }),
    ),
  }),
});
