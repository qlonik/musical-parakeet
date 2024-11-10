import { Schema as S } from "effect";

export const Id = S.Number.pipe(
  // TODO(qlonik): `S.int()` adds a refinement which conflicts with
  //  `S.templateLiteral()`. Could add int after passed to templateLiteral?
  // S.int(),
  S.brand("ID"),
);

export const IdStr = S.String.pipe(S.brand("ID"));
