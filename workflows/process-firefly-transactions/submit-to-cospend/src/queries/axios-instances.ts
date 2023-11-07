import Axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { Context, Effect as T, Layer } from "effect";
import { pipe } from "effect/Function";
import { NetworkError } from "./errors.js";
import { ApplicationConfigService } from "../config.js";

interface WrappedAxios {
  request: <Result = unknown, InputData = never>(
    config: AxiosRequestConfig<InputData>,
  ) => T.Effect<
    never,
    NetworkError<Result, InputData>,
    AxiosResponse<Result, InputData>
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
        Axios.isAxiosError(error)
          ? new NetworkError({ error })
          : T.dieSync(() => {
              console.log(
                Axios.isCancel(error)
                  ? "cancellation was thrown"
                  : "something unknown was thrown",
              );
              return error;
            }),
      ),
    ),
});

export interface CospendApiService {
  readonly client: WrappedAxios;
}
export const CospendApiService = Context.Tag<CospendApiService>(
  Symbol.for("submit-to-cospend/services/CospendApiService"),
);

export const CospendApiServiceLive = T.gen(function* ($) {
  const {
    nc_base_url: baseUrl,
    nc_user: username,
    nc_password: password,
  } = yield* $(ApplicationConfigService);

  const client = Axios.create({
    baseURL: `${baseUrl}/index.php/apps/cospend`,
    auth: { username, password },
  });

  return CospendApiService.of({ client: wrapAxiosInstance(client) });
}).pipe(Layer.effect(CospendApiService));

export interface FireflyApiService {
  readonly client: WrappedAxios;
}

export const FireflyApiService = Context.Tag<FireflyApiService>(
  Symbol.for("submit-to-cospend/services/FireflyApiService"),
);

export const FireflyApiServiceLive = T.gen(function* ($) {
  const {
    ff3_base_url: baseUrl,
    input: {
      info: { pat },
    },
  } = yield* $(ApplicationConfigService);

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
