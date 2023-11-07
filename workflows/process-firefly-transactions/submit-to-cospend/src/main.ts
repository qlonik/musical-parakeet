import * as core from "@actions/core";
import { pipe } from "effect/Function";
import * as T from "effect/Effect";
import {
  CospendApiServiceLive,
  FireflyApiServiceLive,
} from "./queries/axios-instances.js";
import { program } from "./program.js";
import { Cause, Layer } from "effect";
import { Runtime } from "@effect/platform-node";
import { ApplicationConfigFromEnvLive } from "./config.js";

const mainLayer = pipe(
  ApplicationConfigFromEnvLive,
  Layer.provideMerge(CospendApiServiceLive),
  Layer.provideMerge(FireflyApiServiceLive),
  Layer.orDie,
);

pipe(
  program,
  T.provide(mainLayer),
  T.tapErrorCause((cause) =>
    T.sync(() => {
      core.error(Cause.pretty(cause));
    }),
  ),
  Runtime.runMain,
);
