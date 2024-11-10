import { Schema as S, String as Str, Types } from "effect";

export function addBrandedKeys<
  const Brand extends string,
  const Struct extends S.Schema.Any,
  const Pairs extends ReadonlyArray<readonly [string, S.Schema.AnyNoContext]>,
>(
  brand: Types.Has<S.Schema.Type<Struct>, GetExtraKeys<Pairs>> extends true ?
    `error: Key '${keyof S.Schema.Type<Struct> &
      GetExtraKeys<Pairs>}' is already in Type`
  : Types.Has<S.Schema.Encoded<Struct>, GetExtraKeys<Pairs>> extends true ?
    `error: Key '${keyof S.Schema.Encoded<Struct> &
      GetExtraKeys<Pairs>}' is already in Encode`
  : Brand,
  struct: Struct,
  ...keyPairs: Pairs
): AddBrandedKeys<Brand, Struct, Pairs> {
  const extendStruct: Record<string, S.Schema.AnyNoContext> = {};
  const brandedKeys: Record<string, S.Schema.Any> = {};

  for (const [key, value] of keyPairs as Pairs) {
    const finalVal = S.brand(brand)(value);
    extendStruct[key] = finalVal;
    brandedKeys[brand + capitalize(key)] = finalVal;
  }

  return {
    [brand]: S.extend(struct, S.Struct(extendStruct)),
    ...brandedKeys,
  } as AddBrandedKeys<Brand, Struct, Pairs>;
}

export type AddBrandedKeys<
  Brand extends string,
  Struct extends S.Schema.Any,
  Pairs extends ReadonlyArray<readonly [string, S.Schema.AnyNoContext]>,
> = MergeResult<Brand, Struct, CollectPairs<Brand, Pairs>>;

type GetExtraKeys<
  Pairs extends ReadonlyArray<readonly [string, S.Schema.AnyNoContext]>,
> = Pairs[number][0];

type MergeResult<
  Brand extends string,
  Struct extends S.Schema.Any,
  Result extends [unknown, S.Struct.Fields],
> = { [_ in Brand]: S.extend<Struct, S.Struct<Result[1]>> } & Result[0];

type CollectPairs<
  Brand extends string,
  Pairs extends ReadonlyArray<readonly [string, S.Schema.AnyNoContext]>,
  Result extends [unknown, S.Struct.Fields] = [{}, {}],
> =
  Pairs extends (
    readonly [
      readonly [
        infer IdKey extends string,
        infer IdSchema extends S.Schema.AnyNoContext,
      ],
      ...infer Rest extends ReadonlyArray<
        readonly [string, S.Schema.AnyNoContext]
      >,
    ]
  ) ?
    CollectPairs<
      Brand,
      Rest,
      [
        Result[0] & {
          [_ in `${Brand}${Capitalize<IdKey>}`]: S.brand<IdSchema, Brand>;
        },
        Result[1] & {
          [_ in IdKey]: S.brand<IdSchema, Brand>;
        },
      ]
    >
  : Result;

function capitalize(s: string): string {
  if (Str.isEmpty(s)) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
