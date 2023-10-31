import * as T from "effect/Effect";
import {
  MemberUseridTo,
  PaymentModeNameTo,
  ProjectId,
} from "./model/cospend.js";
import { pipe } from "effect/Function";
import { getCospendProjectBills } from "./queries/get-cospend-project-bills.js";
import * as RA from "effect/ReadonlyArray";
import { getCospendProjectDescription } from "./queries/get-cospend-project-description.js";
import { formatErrors } from "@effect/schema/TreeFormatter";
import { ReadonlyRecord } from "effect";
import * as O from "effect/Option";
import { createCospendProjectBill } from "./queries/create-cospend-project-bill.js";
import * as S from "@effect/schema/Schema";
import {
  FireflyTransactionInputId,
  transactionConfigurationInputS,
} from "./model/program-inputs.js";
import { FireflyTransactionJournalTo } from "./model/firefly.js";

const skipping = T.fail({ _tag: "skipping" as const });

function mkError(
  tid: string,
  message: string,
): T.Effect<never, { _tag: "error"; tid: string; message: string }, never> {
  return T.fail({ _tag: "error", tid, message });
}

function mkFoundBill(
  message: string,
): T.Effect<never, { _tag: "foundBill"; message: string }, never> {
  return T.fail({ _tag: "foundBill", message });
}

function getTransactionConfigurationInput(
  arr: Array<string>,
  tag_prefix: string,
  field_separator: string,
) {
  return pipe(
    arr,
    RA.map((tag) => {
      const content = tag.slice(tag_prefix.length);
      const i = content.indexOf(field_separator);
      return i === -1
        ? ([content, true] as const)
        : ([
            content.slice(0, i),
            content.slice(i + field_separator.length, content.length),
          ] as const);
    }),
    (data) => S.parse(transactionConfigurationInputS)(data, { errors: "all" }),
  );
}

function loadCospendProjectIfNeeded(project: ProjectId, tid: string) {
  return pipe(
    getCospendProjectBills(project),
    T.map((_) =>
      RA.filter(
        _.bills,
        ({ comment }) => comment?.startsWith(tid + "\n") ?? false,
      ),
    ),
    T.filterOrElse(RA.isEmptyArray, (foundBills) =>
      T.unified(
        foundBills.length === 1
          ? mkFoundBill(
              "found one matching bill submitted to cospend. No need to process it again",
            )
          : mkError(
              tid,
              "found more than one matching bill submitted to cospend. Refusing to process this bill",
            ),
      ),
    ),
    T.zipRight(getCospendProjectDescription(project), { concurrent: true }),
  );
}

export const processTransaction = (
  t: FireflyTransactionJournalTo,
  {
    id,
    payerUsername,
    accountPaymentMode,
    tag_prefix,
    done_marker,
    field_separator,
  }: {
    id: FireflyTransactionInputId;
    payerUsername: MemberUseridTo;
    accountPaymentMode: PaymentModeNameTo;
    tag_prefix: string;
    done_marker: string;
    field_separator: string;
  },
) =>
  T.gen(function* (_) {
    const done_label_value = tag_prefix + done_marker;
    const tid = `${id}:tj_${t.transaction_journal_id}`;

    const tags = RA.filter(t.tags, (t) => t.startsWith(tag_prefix));

    if (!RA.isNonEmptyArray(tags) || tags.includes(done_label_value)) {
      return yield* _(skipping);
    }

    const {
      project,
      for: payFor,
      category,
      mode: transactionPaymentMode,
    } = yield* _(
      getTransactionConfigurationInput(tags, tag_prefix, field_separator).pipe(
        T.catchTag("ParseError", ({ errors }) =>
          mkError(
            tid,
            "transaction configuration does not match schema:\n" +
              formatErrors(errors),
          ),
        ),
      ),
    );

    const { active_members, members, categories, paymentmodes } = yield* _(
      loadCospendProjectIfNeeded(project, tid),
    );

    yield* _(
      T.logDebug("No matching bills found in cospend, creating a new one"),
    );

    const allUsersMap = ReadonlyRecord.fromIterable(members, (m) => [
      m.userid,
      m.id.toString(),
    ]);

    const activeUsersMap = ReadonlyRecord.fromIterable(active_members, (m) => [
      m.userid,
      m.id.toString(),
    ]);

    const payer = allUsersMap[payerUsername];
    const payed_for =
      payFor && payFor !== "all"
        ? allUsersMap[payFor]
        : Object.values(activeUsersMap).join(",");

    if (payer == null || payed_for == null) {
      return yield* _(
        mkError(
          tid,
          payer == null
            ? '"cospend_payer_username" field does not match any known project member'
            : 'unknown "pay-for" target',
        ),
      );
    }

    const categoryid = pipe(
      O.fromNullable(category),
      O.orElse(() => O.fromNullable(t.category_name)),
      O.flatMap((name) =>
        RA.findFirst(Object.values(categories), (_) => _.name === name),
      ),
      O.map((_) => _.id.toString()),
      O.getOrElse(() => ""),
    );

    const paymentmodeid = pipe(
      O.fromNullable(transactionPaymentMode || accountPaymentMode || undefined),
      O.flatMap((name) =>
        RA.findFirst(Object.values(paymentmodes), (_) => _.name === name),
      ),
      O.map((_) => _.id.toString()),
      O.getOrElse(() => ""),
    );

    const newBillId = yield* _(
      createCospendProjectBill(project, {
        timestamp: new Date(t.date).getTime() / 1000,
        what: t.description,
        comment: tid + "\n\n",
        amount: t.amount,
        payer,
        payed_for,
        categoryid,
        paymentmodeid,
      }),
    );
    return yield* _(
      mkFoundBill(`Successfully saved new bill at id "${newBillId}"`),
    );
  }) satisfies T.Effect<unknown, unknown, never>;
