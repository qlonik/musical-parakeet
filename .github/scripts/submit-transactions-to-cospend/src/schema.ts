import * as S from "@effect/schema/Schema";
import { markdown } from "./template-tags.js";
import { addBrandedKey } from "./schema-extra.js";
import { pipe } from "@effect/data/Function";

const Id = S.number.pipe(
  // TODO(qlonik): `S.int()` adds a refinement which conflicts with
  //  `S.templateLiteral()`. Could add int after passed to templateLiteral?
  // S.int(),
  S.brand("ID")
);
const IdStr = S.string.pipe(S.brand("ID"));

const Email = S.string.pipe(S.brand("email"));

const DateFromUnixSeconds = pipe(
  S.number,
  S.finite(),
  S.transform(
    S.DateFromSelf,
    (i) => new Date(i * 1000),
    (d) => Math.trunc(d.getTime() / 1000)
  ),
  S.validDate()
);

// <editor-fold desc="Cospend model">
export const { Member, MemberId, MemberUserid } = pipe(
  S.struct({
    name: S.string,
    activated: S.boolean,
    weight: S.number,
    color: pipe(
      S.number,
      S.int(),
      S.between(0, 255),
      (color) => S.struct({ r: color, g: color, b: color }),
      S.identifier("Color")
    ),
    lastchanged: DateFromUnixSeconds,
  }),
  (_) =>
    addBrandedKey(
      "Member",
      [
        "userid",
        S.string.pipe(
          S.brand("userid"),
          S.documentation(
            // language=markdown
            markdown`
One of the user ids from cospend (usually nextcloud user id).
            `
          )
        ),
      ],
      _
    ),
  ({ Member, ...rest }) => ({
    ...addBrandedKey("Member", ["id", Id], Member),
    ...rest,
  })
);
const MemberIdStr = S.templateLiteral(MemberId);

export const { Category, CategoryId, CategoryName } = pipe(
  S.struct({
    icon: S.string,
    color: S.string,
    order: S.number,
  }),
  (_) =>
    addBrandedKey(
      "Category",
      [
        "name",
        S.string.pipe(
          S.documentation(
            // language=markdown
            markdown`
Category for the purchase. One of the values specified in the cospend project.
By default, cospend project has \`'Grocery'\`, \`'Restaurant'\`, \`'Shopping'\`,
\`'Rent'\` and \`'Utilities'\` among others.
            `
          )
        ),
      ],
      _
    ),
  ({ Category, ...rest }) => ({
    ...addBrandedKey("Category", ["id", Id], Category),
    ...rest,
  })
);
const CategoryIdStr = S.templateLiteral(CategoryId);

export const { PaymentMode, PaymentModeId, PaymentModeName } = pipe(
  S.struct({
    icon: S.string,
    color: S.string,
    order: S.number,
    old_id: S.nullable(S.string),
  }),
  (_) =>
    addBrandedKey(
      "PaymentMode",
      [
        "name",
        S.string.pipe(
          S.documentation(
            // language=markdown
            markdown`
Method of payment. One of the values specified in the cospend project. By
default, cospend project has \`'Debit card'\` and \`Credit card\` among others.
            `
          )
        ),
      ],
      _
    ),
  ({ PaymentMode, ...rest }) => ({
    ...addBrandedKey("PaymentMode", ["id", Id], PaymentMode),
    ...rest,
  })
);
const PaymentModeIdStr = S.templateLiteral(PaymentModeId);

const { Bill, BillId } = addBrandedKey(
  "Bill",
  ["id", Id],
  S.struct({
    amount: S.number.pipe(S.brand("PurchaseAmount")),
    what: S.string,
    comment: S.nullable(S.string),
    timestamp: DateFromUnixSeconds,
    date: S.Date,
    payer_id: MemberId,
    owers: Member.pipe(S.pick("id", "weight", "name", "activated"), S.array),
    owerIds: S.array(MemberId),
    repeat: S.string,
    paymentmode: S.string,
    paymentmodeid: PaymentModeId,
    categoryid: CategoryId,
    lastchanged: DateFromUnixSeconds,
    repeatallactive: S.number,
    repeatuntil: S.null,
    repeatfreq: S.number,
  })
);

export type CospendProjectDescriptionFrom = S.From<
  typeof CospendProjectDescriptionS
>;
export type CospendProjectDescriptionTo = S.To<
  typeof CospendProjectDescriptionS
>;
export type ProjectId = S.To<typeof ProjectId>;
export const { Project: CospendProjectDescriptionS, ProjectId } = addBrandedKey(
  "Project",
  ["id", IdStr],
  S.struct({
    name: S.string,
    contact_email: Email,

    guestaccesslevel: S.number,
    autoexport: S.string,
    currencyname: S.nullable(S.string),
    lastchanged: DateFromUnixSeconds,
    nb_bills: S.number.pipe(S.int()),
    total_spent: S.number,
    deletion_disabled: S.boolean,
    categorysort: S.string,
    paymentmodesort: S.string,
    myaccesslevel: S.number,

    active_members: pipe(
      Member,
      S.omit("activated"),
      S.extend(S.struct({ activated: S.literal(true) })),
      S.array
    ),
    members: S.array(Member),
    balance: S.record(MemberIdStr, S.number),
    categories: S.record(CategoryIdStr, Category),
    paymentmodes: S.record(PaymentModeIdStr, PaymentMode),
    shares: S.array(S.unknown),
    currencies: S.array(S.unknown),
  })
);

export type CospendProjectBillsFrom = S.From<typeof CospendProjectBillsS>;
export type CospendProjectBillsTo = S.To<typeof CospendProjectBillsS>;
export const CospendProjectBillsS = S.struct({
  bills: S.array(Bill),
  allBillIds: S.array(BillId),
  timestamp: DateFromUnixSeconds,
});
// </editor-fold>

// <editor-fold desc="Firefly model">
const FireflyUserId = IdStr.pipe(S.brand("firefly-user"));
const FireflyPersonalAccessToken = S.string.pipe(
  S.brand("ff3-personal-access-token")
);

const FireflyTransaction = S.struct({
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
          S.brand("firefly-transaction-journal")
        ),
        type: S.literal("withdrawal"),
        date: S.Date,
        currency_decimal_places: S.number,
        amount: S.string,
        description: S.string,
        tags: S.array(S.string),
      })
    ),
  }),
});
// </editor-fold>

export type transactionConfigurationInputS = S.To<
  typeof transactionConfigurationInputS
>;
export const transactionConfigurationInputS = S.struct({
  project: ProjectId,
  "pay-for": S.optional(S.union(S.literal("all"), MemberUserid)).withDefault(
    () => "all"
  ),
  category: S.optional(CategoryName),
  "payment-mode": S.optional(PaymentModeName),
});

export type FireflyTransactionInput = S.From<typeof fireflyTransactionInputS>;
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
  })
);

export type FIREFLY_TRANSACTIONS_SCRIPT = S.From<
  typeof FIREFLY_TRANSACTIONS_SCRIPT
>;
const FIREFLY_TRANSACTIONS_SCRIPT = S.struct({
  nc_user: MemberUserid,
  nc_password: S.string.pipe(S.brand("nextcloud-app-password")),
  firefly_users: S.array(
    S.struct({
      pat: FireflyPersonalAccessToken,
      accounts: S.record(
        S.identifier("ff3-account-id")(S.string),
        PaymentModeName
      ),
      cospend_payer_username: MemberUserid,
    })
  ),
});
