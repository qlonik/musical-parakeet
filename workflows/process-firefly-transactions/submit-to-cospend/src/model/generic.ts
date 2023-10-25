import * as S from "@effect/schema/Schema";
import { pipe } from "effect/Function";

export const Id = S.number.pipe(
  // TODO(qlonik): `S.int()` adds a refinement which conflicts with
  //  `S.templateLiteral()`. Could add int after passed to templateLiteral?
  // S.int(),
  S.brand("ID"),
);

export const IdStr = S.string.pipe(S.brand("ID"));

export const Email = S.string.pipe(S.brand("email"));

export const DateFromUnixSeconds = pipe(
  S.number,
  S.finite(),
  S.transform(
    S.DateFromSelf,
    (i) => new Date(i * 1000),
    (d) => Math.trunc(d.getTime() / 1000),
  ),
  S.validDate(),
);
