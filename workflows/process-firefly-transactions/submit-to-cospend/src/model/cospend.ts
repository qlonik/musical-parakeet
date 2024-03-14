import { pipe } from "effect/Function";
import * as S from "@effect/schema/Schema";
import { Id, IdStr } from "./generic.js";
import { addBrandedKey } from "../schema-extra.js";
import { markdown } from "../template-tags.js";

export type MemberUseridTo = S.Schema.Type<typeof MemberUserid>;
export const { Member, MemberId, MemberUserid } = pipe(
  S.struct({}),
  (_) =>
    addBrandedKey(
      "Member",
      [
        "userid",
        S.string.pipe(
          S.brand("userid", {
            // language=markdown
            documentation: markdown`
One of the user ids from cospend (usually nextcloud user id).
            `,
          }),
        ),
      ],
      _,
    ),
  ({ Member, ...rest }) => ({
    ...addBrandedKey("Member", ["id", Id], Member),
    ...rest,
  }),
);

export const { Category, CategoryId, CategoryName } = pipe(
  S.struct({}),
  (_) =>
    addBrandedKey(
      "Category",
      [
        "name",
        S.string.annotations({
          // language=markdown
          documentation: markdown`
Category for the purchase. One of the values specified in the cospend project.
By default, cospend project has \`'Grocery'\`, \`'Restaurant'\`, \`'Shopping'\`,
\`'Rent'\` and \`'Utilities'\` among others.
          `,
        }),
      ],
      _,
    ),
  ({ Category, ...rest }) => ({
    ...addBrandedKey("Category", ["id", Id], Category),
    ...rest,
  }),
);

export type PaymentModeNameTo = S.Schema.Type<typeof PaymentModeName>;
export const { PaymentMode, PaymentModeId, PaymentModeName } = pipe(
  S.struct({}),
  (_) =>
    addBrandedKey(
      "PaymentMode",
      [
        "name",
        S.string.annotations({
          // language=markdown
          documentation: markdown`
Method of payment. One of the values specified in the cospend project. By
default, cospend project has \`'Debit card'\` and \`Credit card\` among others.
          `,
        }),
      ],
      _,
    ),
  ({ PaymentMode, ...rest }) => ({
    ...addBrandedKey("PaymentMode", ["id", Id], PaymentMode),
    ...rest,
  }),
);

export type BillId = S.Schema.Type<typeof BillId>;
export const { Bill, BillId } = addBrandedKey(
  "Bill",
  ["id", Id],
  S.struct({
    comment: S.nullable(S.string),
  }),
);

export type CospendProjectDescriptionTo = S.Schema.Type<
  typeof CospendProjectDescriptionS
>;
export type ProjectId = S.Schema.Type<typeof ProjectId>;
export const { Project: CospendProjectDescriptionS, ProjectId } = addBrandedKey(
  "Project",
  ["id", IdStr],
  S.struct({
    active_members: S.array(Member),
    members: S.array(Member),
    categories: S.record(S.templateLiteral(CategoryId), Category),
    paymentmodes: S.record(S.templateLiteral(PaymentModeId), PaymentMode),
  }),
);

export type CospendProjectBillsTo = S.Schema.Type<typeof CospendProjectBillsS>;
export const CospendProjectBillsS = S.struct({
  bills: S.array(Bill),
});
