import Axios, { type AxiosRequestConfig } from "axios";
import { merge } from "lodash";
import { getToken } from "../utils/token";

export const instance = Axios.create({
  baseURL: "https://studio-hopae.doslash.io",
});

export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig
): Promise<T> => {
  const source = Axios.CancelToken.source();
  const promise = instance({
    ...config,
    ...options,
    cancelToken: source.token,
  }).then(({ data }) => data) as any;

  promise.cancel = () => {
    source.cancel("Query was cancelled");
  };

  return promise;
};

instance.interceptors.request.use(async (config) => {
  const token = getToken();
  merge(config.headers, { Authorization: `Bearer ${token}` });
  return config;
});

instance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);
