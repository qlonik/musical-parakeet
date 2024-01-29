import { pipe } from "effect/Function";
import * as T from "effect/Effect";
import {
  CospendApiServiceLive,
  FireflyApiServiceLive,
} from "./queries/axios-instances.js";
import { program } from "./program.js";
import { Layer, Logger } from "effect";
import { Runtime } from "@effect/platform-node";
import { ApplicationConfigFromEnvLive } from "./config.js";
import { ghaLogger } from "./github-actions-logger.js";

const mainLayer = pipe(
  Layer.mergeAll(CospendApiServiceLive, FireflyApiServiceLive),
  Layer.provideMerge(ApplicationConfigFromEnvLive),
  Layer.orDie,
);

pipe(
  program,
  T.provide(mainLayer),
  T.tapErrorCause(T.logError),
  T.provide(Logger.replace(Logger.defaultLogger, ghaLogger)),
  Runtime.runMain,
);
