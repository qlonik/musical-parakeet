import Axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { Context, Effect as T, Layer } from "effect";
import { pipe } from "effect/Function";
import { NetworkError } from "./errors.js";

interface WrappedAxios {
  request: <D = never, R = unknown>(
    config: AxiosRequestConfig<D>,
  ) => T.Effect<never, NetworkError, AxiosResponse<R, D>>;
}

const wrapAxiosInstance = (axios: AxiosInstance): WrappedAxios => ({
  request: <D, R>(config: AxiosRequestConfig<D>) =>
    pipe(
      T.tryPromise((signal) =>
        axios.request<R, AxiosResponse<R, D>, D>({ ...config, signal }),
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

/**
 * @param baseUrl Base url of the nextcloud server
 * @param username Nextcloud user that can edit cospend project
 * @param password Nextcloud user password
 */
export const CospendApiServiceLive = (
  baseUrl: string,
  username: string,
  password: string,
) =>
  Layer.sync(CospendApiService, () =>
    pipe(
      Axios.create({
        baseURL: `${baseUrl}/index.php/apps/cospend`,
        auth: { username, password },
      }),
      wrapAxiosInstance,
      (client) => CospendApiService.of({ client }),
    ),
  );

export interface FireflyApiService {
  readonly client: WrappedAxios;
}

export const FireflyApiService = Context.Tag<FireflyApiService>(
  Symbol.for("submit-to-cospend/services/FireflyApiService"),
);

/**
 * @param baseUrl Base url of the firefly-iii server
 * @param pat Personal access token of the user who owns transactions
 */
export const FireflyApiServiceLive = (baseUrl: string, pat: string) =>
  Layer.sync(FireflyApiService, () =>
    pipe(
      Axios.create({
        baseURL: `${baseUrl}/api`,
        headers: {
          Authorization: `Bearer ${pat}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.api+json",
        },
      }),
      wrapAxiosInstance,
      (client) => FireflyApiService.of({ client }),
    ),
  );
