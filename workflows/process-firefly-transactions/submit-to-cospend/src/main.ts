import { NodeRuntime } from "@effect/platform-node";
import { Layer, Logger, Effect as T, pipe } from "effect";

import {
  CospendApiServiceLive,
  FireflyApiServiceLive,
} from "./queries/axios-instances.js";
import { program } from "./program.js";
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
  NodeRuntime.runMain,
);
