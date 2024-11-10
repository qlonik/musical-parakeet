import {
  Effect as T,
  Array as RA,
  Unify,
  Option as O,
  Schema as S,
  ParseResult,
  Record as RR,
  pipe,
} from "effect";

import {
  MemberUseridTo,
  PaymentModeNameTo,
  ProjectId,
} from "./model/cospend.js";
import {
  getCospendProjectBills,
  GetCospendProjectBillsError,
} from "./queries/get-cospend-project-bills.js";
import {
  getCospendProjectDescription,
  GetCospendProjectDescriptionError,
} from "./queries/get-cospend-project-description.js";
import {
  createCospendProjectBill,
  CreateCospendProjectBillError,
} from "./queries/create-cospend-project-bill.js";
import {
  FireflyTransactionInputId,
  transactionConfigurationInputS,
} from "./model/program-inputs.js";
import {
  FireflyTransactionJournalId,
  FireflyTransactionJournalTo,
} from "./model/firefly.js";
import { CospendApiService } from "./queries/axios-instances.js";
import { updateFireflyTransactionTags } from "./queries/update-firefly-transaction-tags.js";
import { ApplicationConfigService } from "./config.js";

const skipping = T.fail({ _tag: "skipping" as const });

function mkError(
  tid: string,
  message: string,
): T.Effect<never, { _tag: "error"; tid: string; message: string }> {
  return T.fail({ _tag: "error", tid, message });
}

function mkFoundBill(
  message: string,
): T.Effect<never, { _tag: "foundBill"; message: string }> {
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
      return i === -1 ?
          ([content, true] as const)
        : ([
            content.slice(0, i),
            content.slice(i + field_separator.length, content.length),
          ] as const);
    }),
    RR.fromEntries,
    S.decodeUnknown(transactionConfigurationInputS, { errors: "all" }),
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
      Unify.unify(
        foundBills.length === 1 ?
          mkFoundBill(
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

const processTransaction = (
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
): T.Effect<
  {
    transaction_journal_id: FireflyTransactionJournalId;
    tags?: ReadonlyArray<string>;
  },
  | GetCospendProjectDescriptionError
  | GetCospendProjectBillsError
  | CreateCospendProjectBillError,
  CospendApiService
> =>
  T.gen(function* () {
    const done_label_value = tag_prefix + done_marker;
    const tid = `${id}:tj_${t.transaction_journal_id}`;

    const tags = RA.filter(t.tags, (t) => t.startsWith(tag_prefix));

    if (!RA.isNonEmptyArray(tags) || tags.includes(done_label_value)) {
      return yield* skipping;
    }

    const {
      project,
      for: payFor,
      category,
      mode: transactionPaymentMode,
    } = yield* getTransactionConfigurationInput(
      tags,
      tag_prefix,
      field_separator,
    ).pipe(
      T.catchTag("ParseError", (error) =>
        mkError(
          tid,
          "transaction configuration does not match schema:\n" +
            ParseResult.TreeFormatter.formatError(error),
        ),
      ),
    );

    const { active_members, members, categories, paymentmodes } =
      yield* loadCospendProjectIfNeeded(project, tid);

    yield* T.logInfo("No matching bills found in cospend");

    const allUsersMap = RR.fromIterableWith(members, (m) => [
      m.userid,
      m.id.toString(),
    ]);

    const payer = allUsersMap[payerUsername];
    const payed_for =
      payFor && payFor !== "all" ?
        allUsersMap[payFor]
      : RA.map(active_members, (m) => m.id.toString()).join(",");

    if (payer == null || payed_for == null) {
      return yield* mkError(
        tid,
        payer == null ?
          '"cospend_payer_username" field does not match any known project member'
        : 'unknown "pay-for" target',
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

    const newBillId = yield* createCospendProjectBill(project, {
      timestamp: new Date(t.date).getTime() / 1000,
      what: t.description,
      comment: tid + "\n\n",
      amount: t.amount,
      payer,
      payed_for,
      categoryid,
      paymentmodeid,
    });
    return yield* mkFoundBill(
      `Successfully created a new bill at id "${newBillId}"`,
    );
  }).pipe(
    T.catchTags({
      skipping: () =>
        T.succeed({ transaction_journal_id: t.transaction_journal_id }),
      error: ({ tid, message }) =>
        pipe(
          T.logWarning(`Cannot process transaction '${tid}':\n` + message),
          T.as({ transaction_journal_id: t.transaction_journal_id }),
        ),
      foundBill: ({ message }) =>
        pipe(
          T.logInfo(message),
          T.as({
            transaction_journal_id: t.transaction_journal_id,
            tags: t.tags.concat(tag_prefix + done_marker),
          }),
        ),
    }),
  );

export const program = T.gen(function* () {
  const {
    input: {
      id,
      info: {
        cospend_payer_username: payerUsername,
        cospend_payment_mode: accountPaymentMode,
      },
      transaction: {
        id: transactionId,
        attributes: { transactions },
      },
    },

    tag_prefix,
    done_marker,
    field_separator,
  } = yield* ApplicationConfigService;

  if (RA.isEmptyReadonlyArray(transactions)) {
    return yield* T.logInfo("no transactions to process");
  }

  const toUpdate = yield* T.forEach(transactions, (t) =>
    processTransaction(t, {
      id,
      payerUsername,
      accountPaymentMode,
      tag_prefix,
      done_marker,
      field_separator,
    }),
  );

  yield* T.logInfo("transactions successfully processed");

  const shouldUpdate = RA.some(toUpdate, (o) =>
    pipe(
      RR.keys(o as Record<string, unknown>),
      RA.difference(["transaction_journal_id"]),
      RA.isNonEmptyArray,
    ),
  );

  if (shouldUpdate) {
    yield* updateFireflyTransactionTags(transactionId, toUpdate);
    yield* T.logInfo("updated matching transactions in firefly");
  }
}).pipe(T.withRequestCaching(true));
