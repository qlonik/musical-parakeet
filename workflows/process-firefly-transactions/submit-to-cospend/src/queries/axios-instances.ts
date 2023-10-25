import Axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { Context, Layer } from "effect";

export interface CospendApiService {
  readonly axios: {
    request<D, R>(config: AxiosRequestConfig<D>): Promise<AxiosResponse<R>>;
  };
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
    CospendApiService.of({
      axios: Axios.create({
        baseURL: `${baseUrl}/index.php/apps/cospend`,
        auth: { username, password },
      }),
    }),
  );

export interface FireflyApiService {
  readonly axios: {
    request<D, R>(config: AxiosRequestConfig<D>): Promise<AxiosResponse<R>>;
  };
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
    FireflyApiService.of({
      axios: Axios.create({
        baseURL: `${baseUrl}/api`,
        headers: {
          Authorization: `Bearer ${pat}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.api+json",
        },
      }),
    }),
  );
