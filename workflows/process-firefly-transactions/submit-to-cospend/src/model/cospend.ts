import { pipe } from "effect/Function";
import * as S from "@effect/schema/Schema";
import { DateFromUnixSeconds, Email, Id, IdStr } from "./generic.js";
import { addBrandedKey } from "../schema-extra.js";
import { markdown } from "../template-tags.js";

export type MemberUseridTo = S.Schema.To<typeof MemberUserid>;

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
      S.identifier("Color"),
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
            `,
          ),
        ),
      ],
      _,
    ),
  ({ Member, ...rest }) => ({
    ...addBrandedKey("Member", ["id", Id], Member),
    ...rest,
  }),
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
            `,
          ),
        ),
      ],
      _,
    ),
  ({ Category, ...rest }) => ({
    ...addBrandedKey("Category", ["id", Id], Category),
    ...rest,
  }),
);
const CategoryIdStr = S.templateLiteral(CategoryId);

export type PaymentModeNameTo = S.Schema.To<typeof PaymentModeName>;

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
            `,
          ),
        ),
      ],
      _,
    ),
  ({ PaymentMode, ...rest }) => ({
    ...addBrandedKey("PaymentMode", ["id", Id], PaymentMode),
    ...rest,
  }),
);
const PaymentModeIdStr = S.templateLiteral(PaymentModeId);

export type BillId = S.Schema.To<typeof BillId>;
export const { Bill, BillId } = addBrandedKey(
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
  }),
);

export type CospendCategoriesTo = S.Schema.To<typeof CospendCategories>;
export const CospendCategories = S.record(CategoryIdStr, Category);

export type CospendProjectDescriptionFrom = S.Schema.From<
  typeof CospendProjectDescriptionS
>;
export type CospendProjectDescriptionTo = S.Schema.To<
  typeof CospendProjectDescriptionS
>;
export type ProjectId = S.Schema.To<typeof ProjectId>;
export const { Project: CospendProjectDescriptionS, ProjectId } = addBrandedKey(
  "Project",
  ["id", IdStr],
  S.struct({
    name: S.string,
    contact_email: S.optional(Email),

    guestaccesslevel: S.optional(S.number),
    autoexport: S.string,
    currencyname: S.nullable(S.string),
    lastchanged: DateFromUnixSeconds,
    nb_bills: S.number.pipe(S.int()),
    total_spent: S.number,
    deletion_disabled: S.optional(S.boolean),
    categorysort: S.string,
    paymentmodesort: S.string,
    myaccesslevel: S.number,

    active_members: pipe(
      Member,
      S.omit("activated"),
      S.extend(S.struct({ activated: S.literal(true) })),
      S.array,
    ),
    members: S.array(Member),
    balance: S.record(MemberIdStr, S.number),
    categories: CospendCategories,
    paymentmodes: S.record(PaymentModeIdStr, PaymentMode),
    shares: S.array(S.unknown),
    currencies: S.array(S.unknown),
  }),
);

export type CospendProjectBillsFrom = S.Schema.From<
  typeof CospendProjectBillsS
>;
export type CospendProjectBillsTo = S.Schema.To<typeof CospendProjectBillsS>;
export const CospendProjectBillsS = S.struct({
  bills: S.array(Bill),
  allBillIds: S.array(BillId),
  timestamp: DateFromUnixSeconds,
});
