import { PAGE_IDS } from "./pages.js";

export const USER_ROLES = {
  ADMIN: "ADMIN",
  CHEF: "CHEF",
  MANAGER: "MANAGER",
};

export const ROLE_PAGE_ACCESS = {
  [PAGE_IDS.OVERVIEW]: [USER_ROLES.ADMIN, USER_ROLES.CHEF, USER_ROLES.MANAGER],
  [PAGE_IDS.STOCK]: [USER_ROLES.ADMIN, USER_ROLES.CHEF],
  [PAGE_IDS.VOICE]: [USER_ROLES.ADMIN, USER_ROLES.CHEF],
  [PAGE_IDS.REVIEW]: [USER_ROLES.ADMIN, USER_ROLES.CHEF],
  [PAGE_IDS.PHOTO]: [USER_ROLES.ADMIN, USER_ROLES.CHEF],
  [PAGE_IDS.INVOICE_INTAKE]: [USER_ROLES.ADMIN],
  [PAGE_IDS.AUTOMATION]: [USER_ROLES.ADMIN, USER_ROLES.MANAGER],
  [PAGE_IDS.DAILY_ORDER_EXECUTION]: [USER_ROLES.ADMIN, USER_ROLES.CHEF],
  [PAGE_IDS.INVOICE_QUEUE]: [USER_ROLES.ADMIN, USER_ROLES.MANAGER],
  [PAGE_IDS.SUPPLIER_REVIEW]: [USER_ROLES.ADMIN, USER_ROLES.MANAGER],
};

export const SIDEBAR_PAGE_ITEMS = [
  {
    id: PAGE_IDS.OVERVIEW,
    label: "Overview",
    description: "Role-based workspace summary and priorities.",
  },
  {
    id: PAGE_IDS.STOCK,
    label: "Stock Take",
    description: "Count items, track gaps and update stock status.",
  },
  {
    id: PAGE_IDS.VOICE,
    label: "Stock Voice",
    description: "Capture stock counts by area using voice input.",
  },
  {
    id: PAGE_IDS.REVIEW,
    label: "Review",
    description: "Review stock table and suggested order output.",
  },
  {
    id: PAGE_IDS.PHOTO,
    label: "Photo Order",
    description: "Parse order details from photo or OCR input.",
  },
  {
    id: PAGE_IDS.INVOICE_INTAKE,
    label: "Invoice Intake",
    description: "Prepare invoice drafts and queue them for execution.",
  },
  {
    id: PAGE_IDS.AUTOMATION,
    label: "Automation Jobs",
    description: "Send queued jobs to the bot and track automatic execution status.",
  },
  {
    id: PAGE_IDS.DAILY_ORDER_EXECUTION,
    label: "Daily Execution",
    description: "Advance supplier orders through operational execution.",
  },
  {
    id: PAGE_IDS.INVOICE_QUEUE,
    label: "Invoice Queue",
    description: "Track invoice queue health and bot processing status.",
  },
  {
    id: PAGE_IDS.SUPPLIER_REVIEW,
    label: "History Orders",
    description: "Audit supplier order history and revisions.",
  },
];

export const DEFAULT_PAGE_BY_ROLE = {
  [USER_ROLES.ADMIN]: PAGE_IDS.OVERVIEW,
  [USER_ROLES.CHEF]: PAGE_IDS.OVERVIEW,
  [USER_ROLES.MANAGER]: PAGE_IDS.OVERVIEW,
};

export function normalizeUserRole(role) {
  const normalizedRole = String(role || "").trim().toUpperCase();

  if (Object.values(USER_ROLES).includes(normalizedRole)) {
    return normalizedRole;
  }

  return "";
}

export function canAccessPage(role, pageId) {
  const normalizedRole = normalizeUserRole(role);
  const allowedRoles = ROLE_PAGE_ACCESS[pageId] || [];

  return normalizedRole ? allowedRoles.includes(normalizedRole) : false;
}

export function getAllowedPagesForRole(role) {
  return SIDEBAR_PAGE_ITEMS.filter((page) => canAccessPage(role, page.id));
}

export function getPageDefinition(pageId) {
  return SIDEBAR_PAGE_ITEMS.find((page) => page.id === pageId) || null;
}

export function getDefaultPageForRole(role) {
  const normalizedRole = normalizeUserRole(role);
  const preferredPage = DEFAULT_PAGE_BY_ROLE[normalizedRole];

  if (preferredPage && canAccessPage(normalizedRole, preferredPage)) {
    return preferredPage;
  }

  const firstAllowedPage = getAllowedPagesForRole(normalizedRole)[0];
  return firstAllowedPage?.id || null;
}

export function getPageLabel(pageId) {
  return getPageDefinition(pageId)?.label || "this page";
}

export function getPageDescription(pageId) {
  return getPageDefinition(pageId)?.description || "";
}
