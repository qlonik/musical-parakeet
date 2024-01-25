module.exports = async function ({ helpers, options }) {
  const baseURL =
    options.baseURL || "http://linkding.default.svc.cluster.local:9090";
  const tagName = options.tagName || "recipe";
  const secrets = JSON.parse(options.secrets || "[]") || [];

  const links = [];

  for (const { linkding_api_token, mealie_bearer_token } of secrets) {
    let url = `/api/bookmarks/?q=%23${tagName}&limit=100`;

    while (url !== undefined) {
      const res = await helpers.axios
        .get(url, {
          baseURL,
          headers: { Authorization: `Token ${linkding_api_token}` },
        })
        .then((_) => _.data)
        .catch((_) => undefined);

      url = res?.next ?? undefined;
      for (const link of res?.results ?? []) {
        links.push({
          info: { linkding_api_token, mealie_bearer_token },
          link,
        });
      }
    }
  }

  return links;
};
