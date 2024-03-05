import {
  Either,
  Config,
  ConfigError,
  pipe,
  Context,
  Layer,
  Effect,
} from "effect";
import * as S from "@effect/schema/Schema";
import { fireflyTransactionInputS } from "./model/program-inputs.js";
import { TreeFormatter } from "@effect/schema";

type GetConfigValue<Conf extends Config.Config<unknown>> =
  Conf extends Config.Config<infer R> ? R : never;

export type ApplicationConfig = GetConfigValue<typeof ApplicationConfig>;

/**
 * sample that works
 *
 * @example
 * ```
 * nc_user=hi
 * nc_password=hi
 * input='{"id":"123","info":{"pat":"","cospend_payer_username":"","cospend_payment_mode":""},"transaction":{"type":"transactions","id":"","attributes":{"user":"","created_at":"2023-10-27T04:34:35.000Z","updated_at":"2023-10-27T04:34:34.000Z","transactions":[]}}}'
 *
 * ```
 */
export const ApplicationConfig = Config.all({
  nc_base_url: Config.string("nc_base_url").pipe(
    Config.withDefault("http://nextcloud.default.svc.cluster.local:8080"),
    Config.withDescription("Base url of the nextcloud server"),
  ),
  nc_user: Config.string("nc_user").pipe(
    Config.withDescription("Nextcloud user that can edit cospend project"),
  ),
  nc_password: Config.string("nc_password").pipe(
    Config.withDescription("Nextcloud user password"),
  ),
  ff3_base_url: Config.string("ff3_base_url").pipe(
    Config.withDefault("http://firefly-iii.default.svc.cluster.local:8080"),
    Config.withDescription("Base url of the firefly-iii server"),
  ),

  input: Config.string("input").pipe(
    Config.mapOrFail((_) =>
      pipe(
        _,
        S.decodeUnknownEither(S.parseJson(fireflyTransactionInputS), {
          errors: "all",
        }),
        Either.mapLeft((error) =>
          ConfigError.InvalidData(["input"], TreeFormatter.formatError(error)),
        ),
      ),
    ),
  ),

  tag_prefix: Config.string("tag_prefix").pipe(Config.withDefault("cospend:")),
  done_marker: Config.string("done_marker").pipe(Config.withDefault("done")),
  field_separator: Config.string("field_separator").pipe(
    Config.withDefault(":"),
  ),
});

export interface ApplicationConfigService extends ApplicationConfig {}
export const ApplicationConfigService =
  Context.GenericTag<ApplicationConfigService>(
    "submit-to-cospend/services/ApplicationConfigService",
  );

export const ApplicationConfigFromEnvLive = pipe(
  ApplicationConfig,
  Effect.map((config) => ApplicationConfigService.of(config)),
  Layer.effect(ApplicationConfigService),
);
