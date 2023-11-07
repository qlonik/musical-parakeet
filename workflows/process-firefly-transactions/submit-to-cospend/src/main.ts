import { pipe } from "effect/Function";
import * as T from "effect/Effect";
import {
  CospendApiServiceLive,
  FireflyApiServiceLive,
} from "./queries/axios-instances.js";
import { program } from "./program.js";
import { Layer } from "effect";
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
  T.tapErrorCause(T.logError),
  Runtime.runMain,
);
