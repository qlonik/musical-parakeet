module.exports = async function ({ helpers, options }) {
  const baseURL =
    options.baseURL || "http://firefly-iii.default.svc.cluster.local:8080";
  const { firefly_users = [] } = JSON.parse(options.secrets || "{}") || {};

  const transactions = [];

  for (const { pat, accounts, ...user } of firefly_users) {
    const axios = helpers.axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.api+json",
      },
    });

    for (const [account, cospend_payment_mode] of Object.entries(accounts)) {
      let url = `/api/v1/accounts/${account}/transactions?limit=50`;

      while (url !== undefined) {
        const res = await axios
          .get(url)
          .then((_) => _.data)
          .catch((_) => undefined);

        url = res?.links?.next ?? undefined;
        for (const transaction of res?.data ?? []) {
          transactions.push({
            id: [
              `u_${transaction.attributes.user}`,
              `a_${account}`,
              `t_${transaction.id}`,
            ].join(":"),
            info: {
              pat,
              ...user,
              cospend_payment_mode,
            },
            transaction,
          });
        }
      }
    }
  }

  return transactions;
};
