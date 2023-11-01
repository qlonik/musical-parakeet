import * as core from "@actions/core";
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
import { Cause, Layer } from "effect";
import { Runtime } from "@effect/platform-node";
import os from "node:os";

pipe(
  T.sync(() => process.env),
  T.flatMap((_) => S.parse(InputEnvVars)(_, { errors: "all" })),
  T.catchTag("ParseError", ({ errors }) =>
    T.fail(
      "The environment is missing required variables" +
        os.EOL +
        formatErrors(errors),
    ),
  ),
  T.flatMap((conf) => {
    const layer = pipe(
      CospendApiServiceLive(conf.nc_base_url, conf.nc_user, conf.nc_password),
      Layer.merge(
        FireflyApiServiceLive(conf.ff3_base_url, conf.input.info.pat),
      ),
    );

    return T.provide(program(conf), layer);
  }),
  T.tapErrorCause((cause) =>
    T.sync(() => {
      core.error(Cause.pretty(cause));
    }),
  ),
  Runtime.runMain,
);
