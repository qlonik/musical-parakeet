import * as S from "@effect/schema/Schema";
import { Id, IdStr } from "./generic.js";
import { addBrandedKeys } from "../schema-extra.js";
import { markdown } from "../template-tags.js";

export type MemberUseridTo = S.Schema.Type<typeof MemberUserid>;
export const { Member, MemberId, MemberUserid } = addBrandedKeys(
  "Member",
  S.Struct({}),
  ["id", Id],
  [
    "userid",
    S.String.pipe(
      S.brand("userid", {
        // language=markdown
        documentation: markdown`
One of the user ids from cospend (usually nextcloud user id).
        `,
      }),
    ),
  ],
);

export const { Category, CategoryId, CategoryName } = addBrandedKeys(
  "Category",
  S.Struct({}),
  ["id", Id],
  [
    "name",
    S.String.annotations({
      // language=markdown
      documentation: markdown`
Category for the purchase. One of the values specified in the cospend project.
By default, cospend project has \`'Grocery'\`, \`'Restaurant'\`, \`'Shopping'\`,
\`'Rent'\` and \`'Utilities'\` among others.
      `,
    }),
  ],
);

export type PaymentModeNameTo = S.Schema.Type<typeof PaymentModeName>;
export const { PaymentMode, PaymentModeId, PaymentModeName } = addBrandedKeys(
  "PaymentMode",
  S.Struct({}),
  ["id", Id],
  [
    "name",
    S.String.annotations({
      // language=markdown
      documentation: markdown`
Method of payment. One of the values specified in the cospend project. By
default, cospend project has \`'Debit card'\` and \`Credit card\` among others.
      `,
    }),
  ],
);

export type BillId = S.Schema.Type<typeof BillId>;
export const { Bill, BillId } = addBrandedKeys(
  "Bill",
  S.Struct({
    comment: S.NullOr(S.String),
  }),
  ["id", Id],
);

export type CospendProjectDescriptionTo = S.Schema.Type<
  typeof CospendProjectDescriptionS
>;
export type ProjectId = S.Schema.Type<typeof ProjectId>;
export const { Project: CospendProjectDescriptionS, ProjectId } =
  addBrandedKeys(
    "Project",
    S.Struct({
      active_members: S.Array(Member),
      members: S.Array(Member),
      categories: S.Record(S.TemplateLiteral(CategoryId), Category),
      paymentmodes: S.Record(S.TemplateLiteral(PaymentModeId), PaymentMode),
    }),
    ["id", IdStr],
  );

export type CospendProjectBillsTo = S.Schema.Type<typeof CospendProjectBillsS>;
export const CospendProjectBillsS = S.Struct({
  bills: S.Array(Bill),
});
