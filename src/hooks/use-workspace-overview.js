import { useEffect, useState } from "react";
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

function logWorkspaceOverviewLoadFailure(resourceLabel, error) {
  console.warn(
    `[workspace-overview] Failed to load ${resourceLabel}.`,
    error
  );
}

export function useWorkspaceOverview({
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

    ensureAutomationQueueLoaded().catch((error) => {
      logWorkspaceOverviewLoadFailure("automation queue", error);
      return undefined;
    });
    ensureSupplierOrderHistoryLoaded().catch((error) => {
      logWorkspaceOverviewLoadFailure("supplier order history", error);
      return undefined;
    });
    ensureDailyOrderQueueLoaded().catch((error) => {
      logWorkspaceOverviewLoadFailure("daily-order queue", error);
      return undefined;
    });
    ensureInvoiceQueueLoaded().catch((error) => {
      logWorkspaceOverviewLoadFailure("invoice queue", error);
      return undefined;
    });

    return () => {
      isMounted = false;
      unsubscribeAutomation();
      unsubscribeSupplierHistory();
      unsubscribeDailyOrders();
      unsubscribeInvoices();
    };
  }, [enabled]);

  const revisionToken =
    automationRevision +
    dailyOrderRevision +
    invoiceRevision +
    supplierHistoryRevision;
  void revisionToken;

  const snapshot = buildWorkspaceOverviewSnapshot(stockState);
  const dashboard = buildRoleWorkspaceDashboard(role, snapshot);

  return {
    snapshot,
    dashboard,
  };
}
