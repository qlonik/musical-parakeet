import * as S from "@effect/schema/Schema";
import { Brand } from "effect/Brand";
import * as Str from "effect/String";
import type { Simplify } from "effect/Types";

export type AddBrandedId<
  Brand extends string,
  IdKey extends string,
  BrandedIdSchema extends S.Schema<any>,
  StructSchema extends S.Schema<any, any, any>,
> = Simplify<
  { [_ in `${Brand}${Capitalize<IdKey>}`]: BrandedIdSchema } & {
    [_ in `${Brand}`]: S.Schema<
      Simplify<
        S.Schema.To<StructSchema> &
          Simplify<S.ToStruct<{ [_ in IdKey]: BrandedIdSchema }>>
      >,
      Simplify<
        S.Schema.From<StructSchema> &
          Simplify<S.FromStruct<{ [_ in IdKey]: BrandedIdSchema }>>
      >,
      S.Schema.Context<StructSchema>
    >;
  }
>;

export function addBrandedKey<
  B extends string,
  C extends string,
  II,
  IA,
  R,
  I extends C extends keyof I
    ? `Cannot have key '${C}' in schema From`
    : unknown,
  A extends C extends keyof A ? `Cannot have key '${C}' in schema To` : unknown,
>(
  brand: B,
  [idKey, idSchema]: readonly [C, S.Schema<IA, II>],
  struct: S.Schema<A, I, R>,
): AddBrandedId<
  B,
  C,
  S.BrandSchema<IA & Brand<B>, II, never>,
  S.Schema<A, I, R>
> {
  const finalId = idSchema.pipe(S.identifier(brand), S.brand(brand));
  const finalType = S.extend(struct, S.struct({ [idKey]: finalId }));

  return {
    [brand]: finalType,
    [brand + capitalize(idKey)]: finalId,
  } as AddBrandedId<
    B,
    C,
    S.BrandSchema<IA & Brand<B>, II, never>,
    S.Schema<A, I, R>
  >;
}

function capitalize(s: string): string {
  if (Str.isEmpty(s)) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
