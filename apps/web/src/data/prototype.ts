export type ProductRole = "lgu" | "resident" | "admin";

export type AdminCapability =
  | "research.read"
  | "research.runForecast"
  | "research.reviewModels"
  | "governance.manageUsers"
  | "governance.configureSystem"
  | "governance.viewAudit";

export interface NavigationItem {
  href: string;
  label: string;
  shortLabel?: string;
  capability?: AdminCapability;
}

export interface RoleDefinition {
  description: string;
  label: string;
  location: string;
  navigation: NavigationItem[];
}

export const roleCapabilities: Record<ProductRole, readonly AdminCapability[]> =
  {
    lgu: [],
    resident: [],
    admin: [
      "research.read",
      "research.runForecast",
      "research.reviewModels",
      "governance.manageUsers",
      "governance.configureSystem",
      "governance.viewAudit",
    ],
  };

export function can(role: ProductRole, capability: AdminCapability): boolean {
  return roleCapabilities[role].includes(capability);
}

export const roleDefinitions: Record<ProductRole, RoleDefinition> = {
  lgu: {
    label: "LGU operator",
    location: "Marikina",
    description:
      "Review assigned-area outlooks and record controlled assessments.",
    navigation: [
      { label: "Overview", href: "/lgu" },
      {
        label: "Outlook & map",
        shortLabel: "Outlook",
        href: "/lgu/outlook",
      },
      {
        label: "Reviews & alerts",
        shortLabel: "Reviews",
        href: "/lgu/reviews",
      },
      {
        label: "Official sources",
        shortLabel: "Sources",
        href: "/official-sources",
      },
    ],
  },
  resident: {
    label: "Resident",
    location: "Marikina",
    description:
      "Review a simplified experimental outlook and official sources.",
    navigation: [
      { label: "My outlook", shortLabel: "Outlook", href: "/resident" },
      {
        label: "Locations & hazard",
        shortLabel: "Locations",
        href: "/resident/locations",
      },
      {
        label: "Official information",
        shortLabel: "Official",
        href: "/official-sources",
      },
    ],
  },
  admin: {
    label: "Administrator",
    location: "RiverGuard system",
    description:
      "Run research workflows and manage approved users, locations, and system configuration.",
    navigation: [
      { label: "System overview", shortLabel: "Overview", href: "/admin" },
      {
        label: "Research",
        shortLabel: "Research",
        href: "/admin/research",
        capability: "research.read",
      },
      {
        label: "Forecasts",
        shortLabel: "Forecasts",
        href: "/admin/research/runs",
        capability: "research.runForecast",
      },
      {
        label: "Users & access",
        shortLabel: "Users",
        href: "/admin/users",
        capability: "governance.manageUsers",
      },
      {
        label: "Configuration",
        shortLabel: "Configure",
        href: "/admin/locations",
        capability: "governance.configureSystem",
      },
      {
        label: "Audit log",
        shortLabel: "Audit",
        href: "/admin/audit",
        capability: "governance.viewAudit",
      },
    ],
  },
};

export const supportedLocations = [
  {
    name: "Quezon City",
    support: "Supported",
    status: "Moderate",
    updated: "09:40 PHT",
  },
  {
    name: "Marikina",
    support: "Supported",
    status: "Elevated",
    updated: "09:40 PHT",
  },
  {
    name: "Manila",
    support: "Supported",
    status: "Lower",
    updated: "09:40 PHT",
  },
  {
    name: "Pasig",
    support: "Supported",
    status: "Moderate",
    updated: "09:40 PHT",
  },
] as const;

export const forecastRuns = [
  {
    id: "RG-NCR-041",
    created: "Nov 11, 09:40",
    location: "Marikina",
    model: "RG-NCR v0.4",
    status: "Complete",
    warning: "Unverified source",
  },
  {
    id: "RG-NCR-040",
    created: "Nov 10, 09:42",
    location: "Marikina",
    model: "RG-NCR v0.4",
    status: "Complete",
    warning: "None",
  },
  {
    id: "RG-NCR-039",
    created: "Nov 9, 09:38",
    location: "Quezon City",
    model: "RG-NCR v0.3",
    status: "Partial",
    warning: "Missing reading",
  },
  {
    id: "RG-NCR-038",
    created: "Nov 8, 09:45",
    location: "Pasig",
    model: "RG-NCR v0.3",
    status: "Failed",
    warning: "Provider timeout",
  },
] as const;

export const dataSources = [
  {
    id: "daily-rainfall",
    name: "NCR daily rainfall research dataset",
    provider: "RiverGuard research dataset",
    coverage: "Nov 5–11, 2026",
    status: "Unverified",
  },
  {
    id: "city-boundaries",
    name: "NCR city boundaries",
    provider: "Illustrative local asset",
    coverage: "Four supported cities",
    status: "Illustrative",
  },
  {
    id: "weather-forecast",
    name: "Seven-day weather outlook",
    provider: "Provider pending",
    coverage: "Representative city points",
    status: "Configuration pending",
  },
  {
    id: "hazard-context",
    name: "Static hazard context",
    provider: "Source pending verification",
    coverage: "NCR subset",
    status: "Unavailable",
  },
] as const;

export const modelVersions = [
  {
    id: "rg-ncr-04",
    name: "RG-NCR v0.4",
    responsibility: "Experimental city-level outlook",
    validation: "Research validation pending",
    status: "Experimental",
  },
  {
    id: "rg-ncr-03",
    name: "RG-NCR v0.3",
    responsibility: "Baseline comparison",
    validation: "Historical holdout draft",
    status: "Archived",
  },
  {
    id: "static-hazard",
    name: "Static hazard layer",
    responsibility: "Long-term susceptibility context",
    validation: "Source verification pending",
    status: "Unavailable",
  },
] as const;

export const accessRequests = [
  {
    name: "Alyssa Reyes",
    organization: "Quezon City DRRMO",
    role: "LGU operator",
    locations: "Supported NCR cities",
    submitted: "Nov 11, 08:20",
    status: "Verified",
  },
  {
    name: "Marco Santos",
    organization: "Marikina DRRMO",
    role: "LGU operator",
    locations: "Marikina",
    submitted: "Nov 10, 16:05",
    status: "Needs review",
  },
  {
    name: "Dana Cruz",
    organization: "Manila DRRMO",
    role: "LGU operator",
    locations: "Manila",
    submitted: "Nov 10, 11:15",
    status: "Needs review",
  },
] as const;

export const systemUsers = [
  {
    name: "Dr. Ana Lim",
    organization: "RiverGuard research",
    role: "Administrator",
    status: "Active",
    locations: "All",
    mfa: "Enabled",
    lastAccess: "Today, 09:18",
  },
  {
    name: "Paolo Mendoza",
    organization: "University research team",
    role: "Administrator",
    status: "Active",
    locations: "Supported NCR cities",
    mfa: "Enabled",
    lastAccess: "Today, 08:42",
  },
  {
    name: "Liza Torres",
    organization: "Marikina DRRMO",
    role: "LGU operator",
    status: "Active",
    locations: "Marikina",
    mfa: "Enabled",
    lastAccess: "Yesterday, 17:20",
  },
] as const;

export const reviewQueue = [
  {
    run: "RG-NCR-041",
    location: "Marikina",
    valid: "Nov 11–17",
    quality: "Research",
    review: "Needs review",
    reviewer: "Unassigned",
    updated: "09:40",
  },
  {
    run: "RG-NCR-040",
    location: "Marikina",
    valid: "Nov 10–16",
    quality: "Research",
    review: "Reviewed with limitations",
    reviewer: "L. Torres",
    updated: "Yesterday",
  },
  {
    run: "RG-NCR-039",
    location: "Quezon City",
    valid: "Nov 9–15",
    quality: "Partial",
    review: "Escalated",
    reviewer: "M. Dela Cruz",
    updated: "Nov 9",
  },
] as const;

export const auditEvents = [
  {
    time: "Nov 11, 09:32",
    actor: "Dr. Ana Lim",
    action: "Updated model status",
    resource: "RG-NCR v0.4",
    outcome: "Success",
  },
  {
    time: "Nov 11, 08:44",
    actor: "RiverGuard system",
    action: "Created forecast fixture",
    resource: "RG-NCR-041",
    outcome: "Success",
  },
  {
    time: "Nov 10, 16:18",
    actor: "Dr. Ana Lim",
    action: "Reviewed access request",
    resource: "Marco Santos",
    outcome: "Pending information",
  },
] as const;
