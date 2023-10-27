import * as os from "node:os";
import Axios from "axios";
import * as S from "@effect/schema/Schema";
import * as RA from "effect/ReadonlyArray";
import { InputEnvVars, InputEnvVarsTo } from "./model/program-inputs.js";
import { formatErrors } from "@effect/schema/TreeFormatter";
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

const program = ({
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
}: InputEnvVarsTo) =>
  pipe(
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
  );

const main = T.gen(function* (_) {
  const inputs = yield* _(
    pipe(
      T.sync(() => process.env),
      T.flatMap((_) => S.parse(InputEnvVars)(_, { errors: "all" })),
      T.catchTag("ParseError", ({ errors }) =>
        T.fail({
          title: "The environment is missing required variables",
          details: formatErrors(errors),
        }),
      ),
    ),
  );

  return yield* _(
    pipe(
      program(inputs),
      T.provide(
        CospendApiServiceLive(
          inputs.nc_base_url,
          inputs.nc_user,
          inputs.nc_password,
        ),
      ),
      T.provide(
        FireflyApiServiceLive(inputs.ff3_base_url, inputs.input.info.pat),
      ),
    ),
  );
});

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
T.runPromise(main).catch(handleError);
