import * as os from "node:os";
import Axios from "axios";
import * as S from "@effect/schema/Schema";
import * as RA from "effect/ReadonlyArray";
import * as E from "effect/Either";
import { fireflyTransactionInputS } from "./model/program-inputs.js";
import { formatErrors } from "@effect/schema/TreeFormatter";
import { stripIndent } from "common-tags";
import { pipe } from "effect/Function";
import * as T from "effect/Effect";
import { GetCospendProjectDescriptionError } from "./queries/get-cospend-project-description.js";
import { GetCospendProjectBillsError } from "./queries/get-cospend-project-bills.js";
import {
  CospendApiServiceLive,
  FireflyApiServiceLive,
} from "./queries/axios-instances.js";
import { CreateCospendProjectBillError } from "./queries/create-cospend-project-bill.js";
import { updateFireflyTransactionTags } from "./queries/update-firefly-transaction-tags.js";
import { processTransaction } from "./process-transaction.js";

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
      T.catchTags(
        processTransaction(t, {
          id,
          payerUsername,
          accountPaymentMode,
          tag_prefix,
          done_marker,
          field_separator,
        }) satisfies T.Effect<unknown, unknown, never>,
        {
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
                tags: t.tags.concat(tag_prefix + done_marker),
              }),
            ),
        },
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
