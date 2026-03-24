import { normalizeUserRole, USER_ROLES } from "../constants/access-control";

const DEFAULT_ROLE_THEME = {
  accentColor: "#8ad9d0",
  badgeBorder: "rgba(125, 211, 252, 0.24)",
  badgeBackground: "rgba(14, 116, 144, 0.18)",
  badgeText: "#bae6fd",
};

const ROLE_DETAILS = {
  [USER_ROLES.ADMIN]: {
    label: "Admin",
    summary: "Full platform oversight and operational control.",
    theme: {
      accentColor: "#67e8f9",
      badgeBorder: "rgba(103, 232, 249, 0.32)",
      badgeBackground: "rgba(8, 145, 178, 0.18)",
      badgeText: "#cffafe",
    },
  },
  [USER_ROLES.CHEF]: {
    label: "Chef",
    summary: "Operational execution, stock readiness and order completion.",
    theme: {
      accentColor: "#fbbf24",
      badgeBorder: "rgba(251, 191, 36, 0.28)",
      badgeBackground: "rgba(146, 64, 14, 0.22)",
      badgeText: "#fde68a",
    },
  },
  [USER_ROLES.MANAGER]: {
    label: "Manager",
    summary: "Monitoring, workflow visibility and queue performance.",
    theme: {
      accentColor: "#a5b4fc",
      badgeBorder: "rgba(165, 180, 252, 0.3)",
      badgeBackground: "rgba(67, 56, 202, 0.18)",
      badgeText: "#e0e7ff",
    },
  },
};

function capitalizeSegment(segment) {
  const normalizedSegment = String(segment || "").trim().toLowerCase();

  if (!normalizedSegment) {
    return "";
  }

  return normalizedSegment.charAt(0).toUpperCase() + normalizedSegment.slice(1);
}

function getEmailBasedName(email) {
  const localPart = String(email || "").split("@")[0];

  if (!localPart) {
    return "";
  }

  return localPart
    .split(/[._-]+/)
    .map(capitalizeSegment)
    .filter(Boolean)
    .join(" ");
}

export function formatRoleLabel(role) {
  const normalizedRole = normalizeUserRole(role);
  return ROLE_DETAILS[normalizedRole]?.label || "Staff";
}

export function getRoleWorkspaceSummary(role) {
  const normalizedRole = normalizeUserRole(role);
  return ROLE_DETAILS[normalizedRole]?.summary || "Secure workspace access.";
}

export function getRoleTheme(role) {
  const normalizedRole = normalizeUserRole(role);
  return ROLE_DETAILS[normalizedRole]?.theme || DEFAULT_ROLE_THEME;
}

export function getUserDisplayName(user) {
  const directName = String(user?.name || "").trim();

  if (directName) {
    return directName;
  }

  const emailBasedName = getEmailBasedName(user?.email);
  return emailBasedName || "Team Member";
}

export function getUserInitials(user) {
  const displayName = getUserDisplayName(user);
  const nameParts = displayName.split(/\s+/).filter(Boolean);

  if (nameParts.length === 0) {
    return "TM";
  }

  return nameParts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
