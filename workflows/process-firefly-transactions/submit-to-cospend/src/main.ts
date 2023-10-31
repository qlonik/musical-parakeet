import * as os from "node:os";
import Axios from "axios";
import * as S from "@effect/schema/Schema";
import { InputEnvVars } from "./model/program-inputs.js";
import { formatErrors } from "@effect/schema/TreeFormatter";
import { pipe } from "effect/Function";
import * as T from "effect/Effect";
import {
  CospendApiServiceLive,
  FireflyApiServiceLive,
} from "./queries/axios-instances.js";
import { program } from "./program.js";
import { Layer } from "effect";

const main = T.gen(function* (_) {
  const conf = yield* _(
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

  const layer = pipe(
    CospendApiServiceLive(conf.nc_base_url, conf.nc_user, conf.nc_password),
    Layer.merge(FireflyApiServiceLive(conf.ff3_base_url, conf.input.info.pat)),
  );

  return yield* _(T.provide(program(conf), layer));
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
