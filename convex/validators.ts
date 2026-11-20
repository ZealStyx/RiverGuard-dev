import { v } from "convex/values";

export const userRoleValidator = v.union(
  v.literal("resident"),
  v.literal("lgu"),
  v.literal("researcher"),
  v.literal("admin"),
);

export const userStatusValidator = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("suspended"),
  v.literal("rejected"),
);

export const researcherTypeValidator = v.union(
  v.literal("student"),
  v.literal("faculty"),
  v.literal("government"),
  v.literal("private"),
  v.literal("independent"),
  v.literal("other"),
);

export const userRoleProfileValidator = v.object({
  city: v.optional(v.string()),
  organization: v.optional(v.string()),
  position: v.optional(v.string()),
  researcherType: v.optional(researcherTypeValidator),
  requestedArea: v.optional(v.string()),
  purpose: v.optional(v.string()),
});

export const dataQualityValidator = v.union(
  v.literal("verified"),
  v.literal("provisional"),
  v.literal("unverified"),
  v.literal("missing"),
);

export const modelStatusValidator = v.union(
  v.literal("development"),
  v.literal("validated"),
  v.literal("retired"),
);

export const modelTypeValidator = v.union(
  v.literal("hydrological"),
  v.literal("flood_risk"),
);

export const riskLevelValidator = v.union(
  v.literal("lower"),
  v.literal("moderate"),
  v.literal("elevated"),
  v.literal("unavailable"),
);

export const alertStatusValidator = v.union(
  v.literal("open"),
  v.literal("acknowledged"),
  v.literal("resolved"),
);

export const lguReviewStatusValidator = v.union(
  v.literal("reviewed"),
  v.literal("escalated"),
  v.literal("returned"),
);

export const hazardLayerKindValidator = v.union(
  v.literal("boundary"),
  v.literal("waterway"),
  v.literal("susceptibility"),
  v.literal("terrain"),
);

export const elevatedRole = v.union(v.literal("researcher"), v.literal("lgu"));
export const signupRole = v.union(v.literal("resident"), elevatedRole);
export const cityCode = v.union(
  v.literal("marikina"),
  v.literal("pasig"),
  v.literal("quezon-city"),
  v.literal("manila"),
);
