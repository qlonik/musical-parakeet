import * as S from "@effect/schema/Schema";
import { Id, IdStr } from "./generic.js";
import { addBrandedKeys } from "../schema-extra.js";
import { markdown } from "../template-tags.js";

export type MemberUseridTo = S.Schema.Type<typeof MemberUserid>;
export const { Member, MemberId, MemberUserid } = addBrandedKeys(
  "Member",
  S.struct({}),
  ["id", Id],
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
);

export const { Category, CategoryId, CategoryName } = addBrandedKeys(
  "Category",
  S.struct({}),
  ["id", Id],
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
);

export type PaymentModeNameTo = S.Schema.Type<typeof PaymentModeName>;
export const { PaymentMode, PaymentModeId, PaymentModeName } = addBrandedKeys(
  "PaymentMode",
  S.struct({}),
  ["id", Id],
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
);

export type BillId = S.Schema.Type<typeof BillId>;
export const { Bill, BillId } = addBrandedKeys(
  "Bill",
  S.struct({
    comment: S.nullable(S.string),
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
    S.struct({
      active_members: S.array(Member),
      members: S.array(Member),
      categories: S.record(S.templateLiteral(CategoryId), Category),
      paymentmodes: S.record(S.templateLiteral(PaymentModeId), PaymentMode),
    }),
    ["id", IdStr],
  );

export type CospendProjectBillsTo = S.Schema.Type<typeof CospendProjectBillsS>;
export const CospendProjectBillsS = S.struct({
  bills: S.array(Bill),
});
