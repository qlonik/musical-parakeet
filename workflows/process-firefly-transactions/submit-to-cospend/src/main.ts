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
import { not } from "effect/Predicate";

const skipping = T.fail({ _tag: "skipping" as const });
function mkError(
  tid: string,
  message: string,
): T.Effect<never, { _tag: "error"; tid: string; message: string }, never> {
  return T.fail({ _tag: "error", tid, message });
}

function mkFoundBill(
  message: string,
): T.Effect<never, { _tag: "found-bill"; message: string }, never> {
  return T.fail({ _tag: "found-bill", message });
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
      pipe(
        T.Do,
        T.let("tid", () => `${id}:tj_${t.transaction_journal_id}`),
        T.bind("transactionConfig", ({ tid }) =>
          pipe(
            T.succeed(t.tags),
            T.filterOrElse(not(RA.contains(done_label_value)), () => skipping),
            T.map(
              RA.filter(
                (t) => t.startsWith(tag_prefix) && t !== done_label_value,
              ),
            ),
            T.filterOrElse(RA.isNonEmptyArray, () => skipping),
            T.map(
              RA.map((t) => {
                const content = t.slice(tag_prefix.length);
                const i = content.indexOf(field_separator);
                return i === -1
                  ? ([content, true] as const)
                  : ([
                      content.slice(0, i),
                      content.slice(i + 1, content.length),
                    ] as const);
              }),
            ),
            T.map(Object.fromEntries<unknown>),
            T.flatMap((_) =>
              S.parse(transactionConfigurationInputS)(_, { errors: "all" }),
            ),
            T.catchTag("ParseError", ({ errors }) =>
              mkError(
                tid,
                "transaction configuration does not match schema:\n" +
                  formatErrors(errors),
              ),
            ),
          ),
        ),
        T.bind("p", ({ transactionConfig: { project }, tid }) =>
          pipe(
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
            T.zipRight(getCospendProjectDescription(project), {
              concurrent: true,
            }),
          ),
        ),
        T.zipLeft(
          T.logDebug("No matching bills found in cospend, creating a new one"),
        ),
        T.let("activeUsersMap", ({ p }) =>
          pipe(
            p.active_members,
            RA.map((m) => [m.userid, m.id.toString()] as const),
            ReadonlyRecord.fromEntries,
          ),
        ),
        T.let("allUsersMap", ({ p }) =>
          pipe(
            p.members,
            RA.map((m) => [m.userid, m.id.toString()] as const),
            ReadonlyRecord.fromEntries,
          ),
        ),
        T.let("payer", ({ allUsersMap }) => allUsersMap[payerUsername]),
        T.let(
          "payed_for",
          ({
            transactionConfig: { for: payFor },
            activeUsersMap,
            allUsersMap,
          }) =>
            payFor && payFor !== "all"
              ? allUsersMap[payFor]
              : Object.values(activeUsersMap).join(","),
        ),
        T.tap(({ payer, payed_for, tid }) =>
          payer != null && payed_for != null
            ? T.unit
            : mkError(
                tid,
                payer == null
                  ? '"cospend_payer_username" field does not match any known project member'
                  : 'unknown "pay-for" target',
              ),
        ),
        T.let("categoryid", ({ transactionConfig: { category }, p }) =>
          pipe(
            O.fromNullable(category),
            O.orElse(() => O.fromNullable(t.category_name)),
            O.flatMap((name) =>
              RA.findFirst(Object.values(p.categories), (_) => _.name === name),
            ),
            O.map((_) => _.id.toString()),
            O.getOrElse(() => ""),
          ),
        ),
        T.let(
          "paymentmodeid",
          ({ transactionConfig: { mode: transactionPaymentMode }, p }) =>
            pipe(
              O.fromNullable(
                transactionPaymentMode || accountPaymentMode || undefined,
              ),
              O.flatMap((name) =>
                RA.findFirst(
                  Object.values(p.paymentmodes),
                  (_) => _.name === name,
                ),
              ),
              O.map((_) => _.id.toString()),
              O.getOrElse(() => ""),
            ),
        ),
        T.let(
          "OBJECT_TO_SEND",
          ({ tid, payer, payed_for, categoryid, paymentmodeid }) => ({
            timestamp: new Date(t.date).getTime() / 1000,
            what: t.description,
            comment: tid + "\n\n",
            amount: t.amount,
            payer,
            payed_for,
            categoryid,
            paymentmodeid,
          }),
        ),
        T.flatMap(({ transactionConfig: { project }, OBJECT_TO_SEND }) =>
          createCospendProjectBill(project, OBJECT_TO_SEND),
        ),
        T.flatMap((newBillId) =>
          mkFoundBill(`Successfully saved new bill at id "${newBillId}"`),
        ),

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
          "found-bill": ({ message }) =>
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
