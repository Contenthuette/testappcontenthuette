import { v, type Validator } from "convex/values";

export function paginatedResultValidator<
  ItemValidator extends Validator<unknown, "required", string>,
>(itemValidator: ItemValidator) {
  return v.object({
    page: v.array(itemValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
    splitCursor: v.optional(v.union(v.string(), v.null())),
    pageStatus: v.optional(
      v.union(
        v.literal("SplitRecommended"),
        v.literal("SplitRequired"),
        v.null(),
      ),
    ),
  });
}
