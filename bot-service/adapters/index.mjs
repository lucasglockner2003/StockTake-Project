import { mockPortalAdapter } from "./mockPortalAdapter.mjs";

export function resolveSupplierAdapter(_supplier) {
  return mockPortalAdapter;
}

export { mockPortalAdapter };
