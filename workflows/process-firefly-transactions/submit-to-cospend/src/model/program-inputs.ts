import * as S from "@effect/schema/Schema";
import { addBrandedKey } from "../schema-extra.js";
import { IdStr } from "./generic.js";
import {
  CategoryName,
  MemberUserid,
  PaymentModeName,
  ProjectId,
} from "./cospend.js";
import { FireflyPersonalAccessToken, FireflyTransaction } from "./firefly.js";

export const transactionConfigurationInputS = S.struct({
  project: ProjectId,
  for: S.optional(S.union(S.literal("all"), MemberUserid), {
    default: () => "all" as const,
  }),
  category: S.optional(CategoryName),
  mode: S.optional(PaymentModeName),
});

export type FireflyTransactionInputId = S.Schema.To<typeof TransactionInputId>;
export const {
  TransactionInput: fireflyTransactionInputS,
  TransactionInputId,
} = addBrandedKey(
  "TransactionInput",
  ["id", IdStr],
  S.struct({
    info: S.struct({
      pat: FireflyPersonalAccessToken,
      cospend_payer_username: MemberUserid,
      cospend_payment_mode: PaymentModeName,
    }),
    transaction: FireflyTransaction,
  }),
);

// Do not delete. This type is a reference type for inputs used by
// `load-unprocessed.cjs` script.
export type PROCESS_FIREFLY_TRANSACTIONS = S.Schema.From<
  typeof PROCESS_FIREFLY_TRANSACTIONS
>;
const PROCESS_FIREFLY_TRANSACTIONS = S.struct({
  nc_user: MemberUserid,
  nc_password: S.string.pipe(S.brand("nextcloud-app-password")),
  firefly_users: S.array(
    S.struct({
      pat: FireflyPersonalAccessToken,
      accounts: S.record(
        S.identifier("ff3-account-id")(S.string),
        PaymentModeName,
      ),
      cospend_payer_username: MemberUserid,
    }),
  ),
});
