import * as os from "node:os";
import Axios from "axios";
import * as S from "@effect/schema/Schema";
import * as RA from "effect/ReadonlyArray";
import { ReadonlyRecord } from "effect";
import * as E from "effect/Either";
import * as O from "effect/Option";
import {
  fireflyTransactionInputS,
  transactionConfigurationInputS,
} from "./model/program-inputs.js";
import { formatErrors } from "@effect/schema/TreeFormatter";
import { stripIndent } from "common-tags";
import { pipe } from "effect/Function";
import * as T from "effect/Effect";
import {
  getCospendProjectDescription,
  GetCospendProjectDescriptionError,
} from "./queries/get-cospend-project-description.js";
import {
  getCospendProjectBills,
  GetCospendProjectBillsError,
} from "./queries/get-cospend-project-bills.js";
import {
  CospendApiServiceLive,
  FireflyApiServiceLive,
} from "./queries/axios-instances.js";
import {
  createCospendProjectBill,
  CreateCospendProjectBillError,
} from "./queries/create-cospend-project-bill.js";
import { updateFireflyTransactionTags } from "./queries/update-firefly-transaction-tags.js";
import { ProjectId } from "./model/cospend.js";

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

async function main() {
  const {
    nc_base_url = "http://nextcloud.default.svc.cluster.local:8080",
    nc_user = null,
    nc_password = null,
    ff3_base_url = "http://firefly-iii.default.svc.cluster.local:8080",

    input: _input = "{}",
    tag_prefix = "cospend:",
    done_marker = "done",
    field_separator = ":",
  } = process.env;

  if (!nc_user || !nc_password) {
    handleError(`"nc_user" and "nc_password" are required parameters`);
    return;
  }

  let jsonParseResult: unknown;
  try {
    jsonParseResult = JSON.parse(_input);
  } catch (e) {
    handleError(`Input object is not a valid JSON object.`);
    return;
  }

  const res = S.parseEither(fireflyTransactionInputS)(jsonParseResult, {
    errors: "all",
  });
  if (E.isLeft(res)) {
    handleError(stripIndent`
      Input object does not match the schema.
      ${formatErrors(res.left.errors)}
    `);
    return;
  }

  const done_label_value = tag_prefix + done_marker;
  const {
    id,
    info: {
      pat,
      cospend_payer_username: payerUsername,
      cospend_payment_mode: accountPaymentMode,
    },
    transaction: {
      id: transactionId,
      attributes: { transactions },
    },
  } = res.right;

  return pipe(
    transactions,
    T.forEach((t) =>
      T.gen(function* (_) {
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
          getTransactionConfigurationInput(
            tags,
            tag_prefix,
            field_separator,
          ).pipe(
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

        const activeUsersMap = ReadonlyRecord.fromIterable(
          active_members,
          (m) => [m.userid, m.id.toString()],
        );

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
          O.fromNullable(
            transactionPaymentMode || accountPaymentMode || undefined,
          ),
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
      }).pipe(
        // handle all exits from the main loop
        T.map((x) => x satisfies never),
        T.catchTags({
          skipping: () =>
            T.succeed({ transaction_journal_id: t.transaction_journal_id }),
          error: ({ tid, message }) =>
            pipe(
              T.logDebug(`Cannot process transaction '${tid}':\n` + message),
              T.as({ transaction_journal_id: t.transaction_journal_id }),
            ),
          foundBill: ({ message }) =>
            pipe(
              T.logDebug(message),
              T.as({
                transaction_journal_id: t.transaction_journal_id,
                tags: t.tags.concat(done_label_value),
              }),
            ),
        }),
      ),
    ),
    (x) =>
      x satisfies T.Effect<
        unknown,
        | GetCospendProjectDescriptionError
        | GetCospendProjectBillsError
        | CreateCospendProjectBillError,
        Record<string, unknown>[]
      >,
    T.flatMap((toUpdate) =>
      pipe(
        toUpdate,
        RA.some((o: Record<string, unknown>) =>
          pipe(
            Object.keys(o),
            RA.difference(["transaction_journal_id"]),
            RA.isNonEmptyArray,
          ),
        ),
        T.if({
          onTrue: updateFireflyTransactionTags(transactionId, toUpdate),
          onFalse: T.unit,
        }),
      ),
    ),
    T.asUnit,
    T.withRequestCaching(true),
    T.provide(CospendApiServiceLive(nc_base_url, nc_user, nc_password)),
    T.provide(FireflyApiServiceLive(ff3_base_url, pat)),
    T.runPromise,
  );
}

function handleError(err: unknown): void {
  const msg = err instanceof Error ? err.toString() : err;

  if (Axios.isAxiosError(err)) {
    console.log(err.toJSON());
  }

  // github action way of setting an error. see:
  // https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-error-message
  const cmd = `::error::${msg}${os.EOL}`;

  process.exitCode = 1;
  process.stdout.write(cmd);
}

process.on("unhandledRejection", handleError);
main().catch(handleError);

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
