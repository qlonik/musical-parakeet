import * as os from "node:os";
import { inspect } from "node:util";
import Axios from "axios";
import * as S from "@effect/schema/Schema";
import * as RA from "effect/ReadonlyArray";
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
import { getCospendProjectDescription } from "./queries/get-cospend-project-description.js";
import { getCospendProjectBills } from "./queries/get-cospend-project-bills.js";
import {
  CospendApiServiceLive,
  FireflyApiServiceLive,
} from "./queries/axios-instances.js";
import { createCospendProjectBill } from "./queries/create-cospend-project-bill.js";
import { updateFireflyTransactionTags } from "./queries/update-firefly-transaction-tags.js";

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
    transaction,
  } = res.right;

  return pipe(
    transaction.attributes.transactions,
    T.forEach((t) =>
      T.gen(function* (_) {
        if (t.tags.includes(done_label_value)) {
          return { transaction_journal_id: t.transaction_journal_id };
        }

        const tags = t.tags
          .filter((t) => t.startsWith(tag_prefix) && t !== done_label_value)
          .map((t) => {
            const content = t.slice(tag_prefix.length);
            const i = content.indexOf(field_separator);
            return i === -1
              ? ([content, true] as const)
              : ([
                  content.slice(0, i),
                  content.slice(i + 1, content.length),
                ] as const);
          });

        if (tags.length === 0) {
          return { transaction_journal_id: t.transaction_journal_id };
        }

        const res = S.parseEither(transactionConfigurationInputS)(
          Object.fromEntries(tags),
          { errors: "all" },
        );
        if (E.isLeft(res)) {
          yield* _(
            T.sync(() => {
              console.log(
                `Cannot process transaction '{"id": "${id}", "transaction_journal_id": "${t.transaction_journal_id}"}', since transaction configuration does not match schema.`,
              );
              console.log(formatErrors(res.left.errors));
            }),
          );
          return { transaction_journal_id: t.transaction_journal_id };
        }
        const {
          project: project,
          for: payFor,
          category,
          mode: transactionPaymentMode,
        } = res.right;
        const paymentMethod =
          transactionPaymentMode || accountPaymentMode || undefined;

        yield* _(
          T.sync(() => {
            console.log(
              `parsed transaction config: ${inspect(res.right, {
                depth: null,
              })}`,
            );
          }),
        );

        const [p, { bills }] = yield* _(
          T.zip(
            getCospendProjectDescription(project),
            getCospendProjectBills(project),
            { concurrent: true },
          ),
        );

        const tid = `${id}:tj_${t.transaction_journal_id}`;

        const foundBills = bills.filter(
          ({ comment }) => comment?.startsWith(tid + "\n"),
        );
        if (foundBills.length > 1) {
          yield* _(
            T.sync(() => {
              console.log(
                "found more than one matching bill submitted to cospend. Refusing to process this bill",
              );
            }),
          );
          return { transaction_journal_id: t.transaction_journal_id };
        }

        if (foundBills.length === 1) {
          yield* _(
            T.sync(() => {
              console.log(
                "found one matching bill submitted to cospend. No need to process it again",
              );
            }),
          );
          return {
            transaction_journal_id: t.transaction_journal_id,
            tags: t.tags.concat(done_label_value),
          };
        }

        if (foundBills.length === 0) {
          yield* _(
            T.sync(() => {
              console.log(
                "No matching bill is found, about to create a new one",
              );
            }),
          );
        }

        const activeUsersMap = Object.fromEntries(
          p.active_members.map((m) => [m.userid, m.id.toString()] as const),
        );
        const allUsersMap = Object.fromEntries(
          p.members.map((m) => [m.userid, m.id.toString()] as const),
        );

        const payer = allUsersMap[payerUsername];
        const payed_for =
          !payFor || payFor === "all"
            ? Object.values(activeUsersMap).join(",")
            : allUsersMap[payFor];

        if (payer == null) {
          yield* _(
            T.sync(() => {
              console.log(
                `Cannot process transaction '{"id": "${id}", "transaction_journal_id": "${t.transaction_journal_id}"}', "nc_payer_username" field does not match any known project member.`,
              );
            }),
          );
          return { transaction_journal_id: t.transaction_journal_id };
        }
        if (payed_for == null) {
          yield* _(
            T.sync(() => {
              console.log(
                `Cannot process transaction '{"id": "${id}", "transaction_journal_id": "${t.transaction_journal_id}"}', unknown "pay-for" target.`,
              );
            }),
          );
          return { transaction_journal_id: t.transaction_journal_id };
        }

        const categoryid = pipe(
          O.fromNullable(category),
          O.orElse(() => O.fromNullable(t.category_name)),
          O.flatMap((name) =>
            RA.findFirst(Object.values(p.categories), (_) => _.name === name),
          ),
          O.map((_) => _.id.toString()),
          O.getOrElse(() => ""),
        );

        const paymentmodeid = pipe(
          O.fromNullable(paymentMethod),
          O.flatMap((name) =>
            RA.findFirst(Object.values(p.paymentmodes), (_) => _.name === name),
          ),
          O.map((_) => _.id.toString()),
          O.getOrElse(() => ""),
        );

        const OBJECT_TO_SEND = {
          timestamp: new Date(t.date).getTime() / 1000,
          what: t.description,
          comment: tid + "\n\n",
          amount: t.amount,
          payer,
          payed_for,
          categoryid,
          paymentmodeid,
        };

        const newBillId = yield* _(
          createCospendProjectBill(project, OBJECT_TO_SEND),
        );

        yield* _(
          T.sync(() => {
            console.log(`Successfully saved new bill at id "${newBillId}"`);
          }),
        );

        return {
          transaction_journal_id: t.transaction_journal_id,
          tags: t.tags.concat(done_label_value),
        };
      }),
    ),
    (x) => x satisfies T.Effect<unknown, unknown, Record<string, unknown>[]>,
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
          onTrue: updateFireflyTransactionTags(transaction.id, toUpdate),
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
