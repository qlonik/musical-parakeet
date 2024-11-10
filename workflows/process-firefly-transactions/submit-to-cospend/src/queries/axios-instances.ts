import Axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { Cause, Context, Effect as T, Layer, pipe } from "effect";

import { NetworkError } from "./errors.js";
import { ApplicationConfigService } from "../config.js";

interface WrappedAxios {
  request: <Result = unknown, InputData = never>(
    config: AxiosRequestConfig<InputData>,
  ) => T.Effect<
    AxiosResponse<Result, InputData>,
    NetworkError<Result, InputData>
  >;
}

const wrapAxiosInstance = (axios: AxiosInstance): WrappedAxios => ({
  request: <Result, InputData>(config: AxiosRequestConfig<InputData>) =>
    pipe(
      T.tryPromise((signal) =>
        axios.request<Result, AxiosResponse<Result, InputData>, InputData>({
          ...config,
          signal,
        }),
      ),
      T.catchAll((error) =>
        Axios.isAxiosError(error) ?
          new NetworkError({ error })
        : pipe(
            Axios.isCancel(error) ?
              "cancellation was thrown"
            : "something unknown was thrown",
            (_) => T.logError(_, Cause.fail(error)),
            T.zipRight(T.die(error)),
          ),
      ),
    ),
});

export class CospendApiService extends Context.Tag(
  "submit-to-cospend/services/CospendApiService",
)<CospendApiService, { client: WrappedAxios }>() {}

export const CospendApiServiceLive = T.gen(function* () {
  const {
    nc_base_url: baseUrl,
    nc_user: username,
    nc_password: password,
  } = yield* ApplicationConfigService;

  const client = Axios.create({
    baseURL: `${baseUrl}/index.php/apps/cospend`,
    auth: { username, password },
  });

  return CospendApiService.of({ client: wrapAxiosInstance(client) });
}).pipe(Layer.effect(CospendApiService));

export class FireflyApiService extends Context.Tag(
  "submit-to-cospend/services/FireflyApiService",
)<FireflyApiService, { readonly client: WrappedAxios }>() {}

export const FireflyApiServiceLive = T.gen(function* () {
  const {
    ff3_base_url: baseUrl,
    input: {
      info: { pat },
    },
  } = yield* ApplicationConfigService;

  const client = Axios.create({
    baseURL: `${baseUrl}/api`,
    headers: {
      Authorization: `Bearer ${pat}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.api+json",
    },
  });

  return FireflyApiService.of({ client: wrapAxiosInstance(client) });
}).pipe(Layer.effect(FireflyApiService));
