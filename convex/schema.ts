import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    tokenIdentifier: v.string(),
    role: v.optional(v.string()), // e.g., 'architect', 'engineer'
    orgId: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

  organizations: defineTable({
    name: v.string(),
    type: v.string(), // e.g., 'Architecture Firm'
    subscriptionTier: v.string(), // 'free', 'pro'
  }),
});
