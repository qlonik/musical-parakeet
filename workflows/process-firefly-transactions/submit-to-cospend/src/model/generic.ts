import * as S from "@effect/schema/Schema";

export const Id = S.number.pipe(
  // TODO(qlonik): `S.int()` adds a refinement which conflicts with
  //  `S.templateLiteral()`. Could add int after passed to templateLiteral?
  // S.int(),
  S.brand("ID"),
);

export const IdStr = S.string.pipe(S.brand("ID"));
