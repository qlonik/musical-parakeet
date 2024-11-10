import { Schema as S } from "effect";

import { Id, IdStr } from "./generic.js";
import { addBrandedKeys } from "../schema-extra.js";
import { markdown } from "../template-tags.js";

export type MemberUseridTo = typeof MemberUserid.Type;
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

export type PaymentModeNameTo = typeof PaymentModeName.Type;
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

export type BillId = typeof BillId.Type;
export const { Bill, BillId } = addBrandedKeys(
  "Bill",
  S.Struct({
    comment: S.NullOr(S.String),
  }),
  ["id", Id],
);

export type CospendProjectDescriptionTo =
  typeof CospendProjectDescriptionS.Type;
export type ProjectId = S.Schema.Type<typeof ProjectId>;
export const { Project: CospendProjectDescriptionS, ProjectId } =
  addBrandedKeys(
    "Project",
    S.Struct({
      active_members: S.Array(Member),
      members: S.Array(Member),
      categories: S.Record({
        key: S.TemplateLiteral(CategoryId),
        value: Category,
      }),
      paymentmodes: S.Record({
        key: S.TemplateLiteral(PaymentModeId),
        value: PaymentMode,
      }),
    }),
    ["id", IdStr],
  );

export type CospendProjectBillsTo = typeof CospendProjectBillsS.Type;
export const CospendProjectBillsS = S.Struct({
  bills: S.Array(Bill),
});
