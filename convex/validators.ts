import { v } from "convex/values";

export const userRoleValidator = v.union(
  v.literal("resident"),
  v.literal("lgu"),
  v.literal("admin"),
);

export const userStatusValidator = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("suspended"),
  v.literal("rejected"),
);

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

export const hazardLayerKindValidator = v.union(
  v.literal("boundary"),
  v.literal("waterway"),
  v.literal("susceptibility"),
  v.literal("terrain"),
);
