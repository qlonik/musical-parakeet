import {
  createTag,
  stripIndentTransformer,
  trimResultTransformer,
} from "common-tags";

export const markdown = createTag(
  stripIndentTransformer(),
  trimResultTransformer()
);
