import { useMemo } from "react";
import {
  buildRoleWorkspaceDashboard,
  buildWorkspaceOverviewSnapshot,
} from "../services/workspace-overview-service";

export function useWorkspaceOverview({ currentPage, role, stockState }) {
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
  ]);
}
