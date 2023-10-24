import * as os from "node:os";
import { inspect } from "node:util";
import Axios, { AxiosInstance } from "axios";
import * as S from "@effect/schema/Schema";
import * as RA from "effect/ReadonlyArray";
import * as E from "effect/Either";
import * as O from "effect/Option";
import {
  CospendProjectBillsFrom,
  CospendProjectBillsS,
  CospendProjectBillsTo,
  CospendProjectDescriptionFrom,
  CospendProjectDescriptionS,
  CospendProjectDescriptionTo,
  fireflyTransactionInputS,
  ProjectId,
  transactionConfigurationInputS,
} from "./schema.js";
import { formatErrors } from "@effect/schema/TreeFormatter";
import { stripIndent } from "common-tags";
import { pipe } from "effect/Function";

const API_BASE = "/index.php/apps/cospend";
const FF3_API_BASE = "/api";

async function main() {
  const {
    nc_base_url = "http://nextcloud.default.svc.cluster.local:8080",
    nc_user = null,
    nc_password = null,
    ff3_base_url = "http://firefly-iii.default.svc.cluster.local:8080",

    input: _input = "{}",
    tag_prefix = "cospend:",
    done_marker = "done",
    field_separator = ":",
  } = process.env;

  if (!nc_user || !nc_password) {
    handleError(`"nc_user" and "nc_password" are required parameters`);
    return;
  }

  let jsonParseResult: unknown;
  try {
    jsonParseResult = JSON.parse(_input);
  } catch (e) {
    handleError(`Input object is not a valid JSON object.`);
    return;
  }

  const res = S.parseEither(fireflyTransactionInputS)(jsonParseResult, {
    errors: "all",
  });
  if (E.isLeft(res)) {
    handleError(stripIndent`
      Input object does not match the schema.
      ${formatErrors(res.left.errors)}
    `);
    return;
  }

  const axios = Axios.create({
    baseURL: `${nc_base_url}${API_BASE}`,
    auth: { username: nc_user, password: nc_password },
  });
  const done_label_value = tag_prefix + done_marker;
  const {
    id,
    info: {
      pat,
      cospend_payer_username: payerUsername,
      cospend_payment_mode: accountPaymentMode,
    },
    transaction,
  } = res.right;

  const toUpdate: Record<string, unknown>[] = [];

  for (const t of transaction.attributes.transactions) {
    if (t.tags.includes(done_label_value)) {
      toUpdate.push({ transaction_journal_id: t.transaction_journal_id });
      continue;
    }

    const tags = t.tags
      .filter((t) => t.startsWith(tag_prefix) && t !== done_label_value)
      .map((t) => {
        const content = t.slice(tag_prefix.length);
        const i = content.indexOf(field_separator);
        return i === -1
          ? ([content, true] as const)
          : ([
              content.slice(0, i),
              content.slice(i + 1, content.length),
            ] as const);
      });

    if (tags.length === 0) {
      toUpdate.push({ transaction_journal_id: t.transaction_journal_id });
      continue;
    }

    const res = S.parseEither(transactionConfigurationInputS)(
      Object.fromEntries(tags),
      { errors: "all" }
    );
    if (E.isLeft(res)) {
      console.log(
        `Cannot process transaction '{"id": "${id}", "transaction_journal_id": "${t.transaction_journal_id}"}', since transaction configuration does not match schema.`
      );
      console.log(formatErrors(res.left.errors));
      toUpdate.push({ transaction_journal_id: t.transaction_journal_id });
      continue;
    }
    const {
      project: project,
      for: payFor,
      category,
      mode: transactionPaymentMode,
    } = res.right;
    const paymentMethod =
      transactionPaymentMode || accountPaymentMode || undefined;

    console.log(
      `parsed transaction config: ${inspect(res.right, { depth: null })}`
    );

    const [p, { bills }] = await manageCache(axios, project);
    const tid = `${id}:tj_${t.transaction_journal_id}`;

    const foundBills = bills.filter(({ comment }) =>
      comment?.startsWith(tid + "\n")
    );
    if (foundBills.length > 1) {
      console.log(
        "found more than one matching bill submitted to cospend. Refusing to process this bill"
      );
      toUpdate.push({ transaction_journal_id: t.transaction_journal_id });
      continue;
    }

    if (foundBills.length === 1) {
      console.log(
        "found one matching bill submitted to cospend. No need to process it again"
      );
      toUpdate.push({
        transaction_journal_id: t.transaction_journal_id,
        tags: t.tags.concat(done_label_value),
      });
      continue;
    }

    if (foundBills.length === 0) {
      console.log("No matching bill is found, about to create a new one");
    }

    const activeUsersMap = Object.fromEntries(
      p.active_members.map((m) => [m.userid, m.id.toString()] as const)
    );
    const allUsersMap = Object.fromEntries(
      p.members.map((m) => [m.userid, m.id.toString()] as const)
    );

    const payer = allUsersMap[payerUsername];
    const payed_for =
      !payFor || payFor === "all"
        ? Object.values(activeUsersMap).join(",")
        : allUsersMap[payFor];

    if (payer == null) {
      console.log(
        `Cannot process transaction '{"id": "${id}", "transaction_journal_id": "${t.transaction_journal_id}"}', "nc_payer_username" field does not match any known project member.`
      );
      toUpdate.push({ transaction_journal_id: t.transaction_journal_id });
      continue;
    }
    if (payed_for == null) {
      console.log(
        `Cannot process transaction '{"id": "${id}", "transaction_journal_id": "${t.transaction_journal_id}"}', unknown "pay-for" target.`
      );
      toUpdate.push({ transaction_journal_id: t.transaction_journal_id });
      continue;
    }

    const categoryid = pipe(
      O.fromNullable(category),
      O.orElse(() => O.fromNullable(t.category_name)),
      O.flatMap((name) =>
        RA.findFirst(Object.values(p.categories), (_) => _.name === name)
      ),
      O.map((_) => _.id.toString()),
      O.getOrElse(() => "")
    );

    const paymentmodeid = pipe(
      O.fromNullable(paymentMethod),
      O.flatMap((name) =>
        RA.findFirst(Object.values(p.paymentmodes), (_) => _.name === name)
      ),
      O.map((_) => _.id.toString()),
      O.getOrElse(() => "")
    );

    const OBJECT_TO_SEND = {
      timestamp: new Date(t.date).getTime() / 1000,
      what: t.description,
      comment: tid + "\n\n",
      amount: t.amount,
      payer,
      payed_for,
      categoryid,
      paymentmodeid,
    };

    const { data: newBillId } =
      await axios.post</* number id of a newly added bill */ string>(
        `/api-priv/projects/${project}/bills`,
        OBJECT_TO_SEND
      );

    console.log(`Successfully saved new bill at id "${newBillId}"`);

    toUpdate.push({
      transaction_journal_id: t.transaction_journal_id,
      tags: t.tags.concat(done_label_value),
    });
  }

  const shouldUpdate = pipe(
    toUpdate,
    RA.some((o: Record<string, unknown>) =>
      pipe(
        Object.keys(o),
        RA.difference(["transaction_journal_id"]),
        RA.isNonEmptyArray
      )
    )
  );

  if (shouldUpdate) {
    await Axios.put(
      `${FF3_API_BASE}/v1/transactions/${transaction.id}`,
      {
        apply_rules: true,
        fire_webhooks: true,
        transactions: toUpdate,
      },
      {
        baseURL: ff3_base_url,
        headers: {
          Authorization: `Bearer ${pat}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.api+json",
        },
      }
    );
  }
}

function handleError(err: unknown): void {
  const msg = err instanceof Error ? err.toString() : err;

  if (Axios.isAxiosError(err)) {
    console.log(err.toJSON());
  }

  // github action way of setting an error. see:
  // https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-error-message
  const cmd = `::error::${msg}${os.EOL}`;

  process.exitCode = 1;
  process.stdout.write(cmd);
}

const manageCache = (() => {
  const _projectCacheInProgress: Record<
    CospendProjectDescriptionTo["id"],
    Promise<readonly [CospendProjectDescriptionTo, CospendProjectBillsTo]>
  > = {};
  const projectCache: Record<
    CospendProjectDescriptionTo["id"],
    readonly [CospendProjectDescriptionTo, CospendProjectBillsTo]
  > = {};

  return function manageCache(
    axios: AxiosInstance,
    project: ProjectId
  ): Promise<readonly [CospendProjectDescriptionTo, CospendProjectBillsTo]> {
    let p;
    if ((p = projectCache[project])) return Promise.resolve(p);
    if ((p = _projectCacheInProgress[project])) return p;
    p = undefined;

    return (_projectCacheInProgress[project] = Promise.all([
      axios.get<CospendProjectDescriptionFrom>(`/api-priv/projects/${project}`),
      axios.get<CospendProjectBillsFrom>(`/api-priv/projects/${project}/bills`),
    ])
      .then(([pr, bills]) =>
        S.decodeSync(S.tuple(CospendProjectDescriptionS, CospendProjectBillsS))(
          [pr.data, bills.data],
          { errors: "all" }
        )
      )
      .then((data) => {
        delete _projectCacheInProgress[project];
        return (projectCache[project] = data);
      })
      .catch((error) => {
        delete _projectCacheInProgress[project];
        throw error;
      }));
  };
})();

process.on("unhandledRejection", handleError);
main().catch(handleError);
