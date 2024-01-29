import * as S from "@effect/schema/Schema";
import { Brand } from "effect/Brand";
import * as Str from "effect/String";
import type { Simplify } from "effect/Types";

export type AddBrandedId<
  Brand extends string,
  IdKey extends string,
  BrandedIdSchema extends S.Schema<never, any>,
  StructSchema extends S.Schema<any, any>,
> = Simplify<
  { [_ in `${Brand}${Capitalize<IdKey>}`]: BrandedIdSchema } & {
    [_ in `${Brand}`]: S.Schema<
      S.Schema.Context<StructSchema>,
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
  R,
  I extends C extends keyof I
    ? `Cannot have key '${C}' in schema From`
    : unknown,
  A extends C extends keyof A ? `Cannot have key '${C}' in schema To` : unknown,
>(
  brand: B,
  [idKey, idSchema]: readonly [C, S.Schema<never, II, IA>],
  struct: S.Schema<R, I, A>,
): AddBrandedId<
  B,
  C,
  S.BrandSchema<never, II, IA & Brand<B>>,
  S.Schema<R, I, A>
> {
  const finalId = idSchema.pipe(S.identifier(brand), S.brand(brand));
  const finalType = S.extend(struct, S.struct({ [idKey]: finalId }));

  return {
    [brand]: finalType,
    [brand + capitalize(idKey)]: finalId,
  } as AddBrandedId<
    B,
    C,
    S.BrandSchema<never, II, IA & Brand<B>>,
    S.Schema<R, I, A>
  >;
}

function capitalize(s: string): string {
  if (Str.isEmpty(s)) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
