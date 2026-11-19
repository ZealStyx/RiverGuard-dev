import { queryGeneric as query } from "convex/server";
import { v } from "convex/values";

import { hazardLayerKindValidator } from "./validators";

export const listActive = query({
  args: {
    kind: v.optional(hazardLayerKindValidator),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const queryBuilder = ctx.db
      .query("hazardLayers")
      .withIndex("by_active_kind", (index) => {
        if (args.kind === undefined) {
          return index.eq("active", true);
        }

        // queryGeneric keeps this pre-deployment foundation runnable before
        // a Convex development deployment generates schema-specific helpers.
        return (index as any).eq("active", true).eq("kind", args.kind);
      });

    return await queryBuilder.take(50);
  },
});
