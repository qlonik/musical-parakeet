import { Schema as S } from "effect";

import { addBrandedKeys } from "../schema-extra.js";
import { IdStr } from "./generic.js";
import {
  CategoryName,
  MemberUserid,
  PaymentModeName,
  ProjectId,
} from "./cospend.js";
import { FireflyPersonalAccessToken, FireflyTransaction } from "./firefly.js";

export const transactionConfigurationInputS = S.Struct({
  project: ProjectId,
  for: S.optionalWith(S.Union(S.Literal("all"), MemberUserid), {
    default: () => "all" as const,
  }),
  category: S.optional(CategoryName),
  mode: S.optional(PaymentModeName),
});

export type FireflyTransactionInputId = typeof TransactionInputId.Type;
export const {
  TransactionInput: fireflyTransactionInputS,
  TransactionInputId,
} = addBrandedKeys(
  "TransactionInput",
  S.Struct({
    info: S.Struct({
      pat: FireflyPersonalAccessToken,
      cospend_payer_username: MemberUserid,
      cospend_payment_mode: PaymentModeName,
    }),
    transaction: FireflyTransaction,
  }),
  ["id", IdStr],
);

// Do not delete. This type is a reference type for inputs used by
// `load-unprocessed.cjs` script.
export type PROCESS_FIREFLY_TRANSACTIONS =
  typeof PROCESS_FIREFLY_TRANSACTIONS.Encoded;
const PROCESS_FIREFLY_TRANSACTIONS = S.Struct({
  nc_user: MemberUserid,
  nc_password: S.String.pipe(S.brand("nextcloud-app-password")),
  firefly_users: S.Array(
    S.Struct({
      pat: FireflyPersonalAccessToken,
      accounts: S.Record({
        key: S.String.annotations({ identifier: "ff3-account-id" }),
        value: PaymentModeName,
      }),
      cospend_payer_username: MemberUserid,
    }),
  ),
});
