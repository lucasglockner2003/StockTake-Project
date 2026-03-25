import { useEffect, useMemo, useState } from "react";
import {
  buildRoleWorkspaceDashboard,
  buildWorkspaceOverviewSnapshot,
} from "../services/workspace-overview-service";
import {
  ensureDailyOrderQueueLoaded,
  subscribeDailyOrderQueue,
} from "../utils/dailyOrders";
import {
  ensureAutomationQueueLoaded,
  subscribeAutomationQueue,
} from "../utils/automation";
import {
  ensureInvoiceQueueLoaded,
  subscribeInvoiceQueue,
} from "../utils/invoiceQueue";
import {
  ensureSupplierOrderHistoryLoaded,
  subscribeSupplierOrderHistory,
} from "../utils/supplierHistory";

export function useWorkspaceOverview({
  currentPage,
  role,
  stockState,
  enabled = true,
}) {
  const [dailyOrderRevision, setDailyOrderRevision] = useState(0);
  const [invoiceRevision, setInvoiceRevision] = useState(0);
  const [automationRevision, setAutomationRevision] = useState(0);
  const [supplierHistoryRevision, setSupplierHistoryRevision] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let isMounted = true;
    const unsubscribeAutomation = subscribeAutomationQueue(() => {
      if (!isMounted) {
        return;
      }

      setAutomationRevision((value) => value + 1);
    });
    const unsubscribeSupplierHistory = subscribeSupplierOrderHistory(() => {
      if (!isMounted) {
        return;
      }

      setSupplierHistoryRevision((value) => value + 1);
    });
    const unsubscribeDailyOrders = subscribeDailyOrderQueue(() => {
      if (!isMounted) {
        return;
      }

      setDailyOrderRevision((value) => value + 1);
    });
    const unsubscribeInvoices = subscribeInvoiceQueue(() => {
      if (!isMounted) {
        return;
      }

      setInvoiceRevision((value) => value + 1);
    });

    ensureAutomationQueueLoaded().catch(() => undefined);
    ensureSupplierOrderHistoryLoaded().catch(() => undefined);
    ensureDailyOrderQueueLoaded().catch(() => undefined);
    ensureInvoiceQueueLoaded().catch(() => undefined);

    return () => {
      isMounted = false;
      unsubscribeAutomation();
      unsubscribeSupplierHistory();
      unsubscribeDailyOrders();
      unsubscribeInvoices();
    };
  }, [enabled]);

  return useMemo(() => {
    const snapshot = buildWorkspaceOverviewSnapshot(stockState);
    const dashboard = buildRoleWorkspaceDashboard(role, snapshot);

    return {
      snapshot,
      dashboard,
    };
  }, [
    currentPage,
    role,
    stockState.checkCount,
    stockState.criticalCount,
    stockState.filledItems,
    stockState.items,
    stockState.lowCount,
    stockState.missingItems,
    stockState.okCount,
    stockState.progress,
    stockState.quantities,
    stockState.suggestedOrder,
    stockState.voiceFilledItems,
    automationRevision,
    dailyOrderRevision,
    invoiceRevision,
    supplierHistoryRevision,
  ]);
}
