import * as S from "@effect/schema/Schema";
import { Brand } from "effect/Brand";
import * as Str from "effect/String";
import type { Simplify } from "effect/Types";

export type AddBrandedId<
  Brand extends string,
  IdKey extends string,
  BrandedIdSchema extends S.Schema<any>,
  StructSchema extends S.Schema<any>
> = Simplify<
  { [_ in `${Brand}${Capitalize<IdKey>}`]: BrandedIdSchema } & {
    [_ in `${Brand}`]: S.Schema<
      Simplify<
        S.Schema.From<StructSchema> &
          Simplify<S.FromStruct<{ [_ in IdKey]: BrandedIdSchema }>>
      >,
      Simplify<
        S.Schema.To<StructSchema> &
          Simplify<S.ToStruct<{ [_ in IdKey]: BrandedIdSchema }>>
      >
    >;
  }
>;

export function addBrandedKey<
  B extends string,
  C extends string,
  II,
  IA,
  I extends C extends keyof I
    ? `Cannot have key '${C}' in schema From`
    : unknown,
  A extends C extends keyof A ? `Cannot have key '${C}' in schema To` : unknown
>(
  brand: B,
  [idKey, idSchema]: readonly [C, S.Schema<II, IA>],
  struct: S.Schema<I, A>
): AddBrandedId<B, C, S.BrandSchema<II, IA & Brand<B>>, S.Schema<I, A>> {
  const finalId = idSchema.pipe(S.identifier(brand), S.brand(brand));
  const finalType = S.extend(struct, S.struct({ [idKey]: finalId }));

  return {
    [brand]: finalType,
    [brand + capitalize(idKey)]: finalId,
  } as AddBrandedId<B, C, S.BrandSchema<II, IA & Brand<B>>, S.Schema<I, A>>;
}

function capitalize(s: string): string {
  if (Str.isEmpty(s)) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
