import { PAGE_IDS } from "../constants/pages";
import { normalizeUserRole, USER_ROLES } from "../constants/access-control";
import { getAutomationJobCounts, getAutomationQueue } from "../utils/automation";
import { getDailyOrderQueue, getDailyOrderQueueCounts } from "../utils/dailyOrders";
import { getInvoiceQueue, getInvoiceQueueCounts } from "../utils/invoiceQueue";
import { groupSuggestedOrderBySupplier } from "../utils/stock";
import { loadVoiceData } from "../utils/storage";
import { getSupplierOrderHistory } from "../utils/supplierHistory";

function sumOrderAmount(items = []) {
  return items.reduce((sum, item) => sum + Number(item.orderAmount || 0), 0);
}

function getVoiceDraftEntryCount(voiceEntriesByArea = {}) {
  return Object.values(voiceEntriesByArea).reduce((sum, entries) => {
    return sum + (Array.isArray(entries) ? entries.length : 0);
  }, 0);
}

function buildMetric(label, value, detail, tone = "default") {
  return {
    label,
    value,
    detail,
    tone,
  };
}

function getActiveWorkloadCount(snapshot) {
  return (
    snapshot.automation.activeCount +
    snapshot.invoices.counts.queued +
    snapshot.dailyOrders.actionableCount
  );
}

function buildQuickActions(role) {
  const normalizedRole = normalizeUserRole(role);

  if (normalizedRole === USER_ROLES.ADMIN) {
    return [
      {
        pageId: PAGE_IDS.STOCK,
        label: "Open stock take",
        description: "Review shelf coverage and clear stock risks.",
      },
      {
        pageId: PAGE_IDS.INVOICE_INTAKE,
        label: "Process invoices",
        description: "Prepare and queue invoice intake runs.",
      },
      {
        pageId: PAGE_IDS.AUTOMATION,
        label: "Watch automation",
        description: "Monitor jobs, retries and failures.",
      },
      {
        pageId: PAGE_IDS.SUPPLIER_REVIEW,
        label: "Audit supplier history",
        description: "Review supplier revisions and execution history.",
      },
    ];
  }

  if (normalizedRole === USER_ROLES.CHEF) {
    return [
      {
        pageId: PAGE_IDS.STOCK,
        label: "Continue stock take",
        description: "Advance count completion and resolve gaps.",
      },
      {
        pageId: PAGE_IDS.VOICE,
        label: "Capture by voice",
        description: "Resume voice-based counting by area.",
      },
      {
        pageId: PAGE_IDS.REVIEW,
        label: "Review suggested order",
        description: "Confirm shortages and prepare next orders.",
      },
      {
        pageId: PAGE_IDS.DAILY_ORDER_EXECUTION,
        label: "Run daily execution",
        description: "Push ready orders through the operational flow.",
      },
    ];
  }

  return [
    {
      pageId: PAGE_IDS.AUTOMATION,
      label: "Monitor automation",
      description: "Track queue performance and active workload.",
    },
    {
      pageId: PAGE_IDS.INVOICE_QUEUE,
      label: "Review invoice queue",
      description: "Watch queued invoices and failed executions.",
    },
    {
      pageId: PAGE_IDS.SUPPLIER_REVIEW,
      label: "Inspect supplier history",
      description: "Audit revisions, timing and supplier volume.",
    },
  ];
}

export function buildWorkspaceOverviewSnapshot(stockState = {}) {
  const items = Array.isArray(stockState.items) ? stockState.items : [];
  const suggestedOrder = Array.isArray(stockState.suggestedOrder)
    ? stockState.suggestedOrder
    : [];
  const pendingSuggestedItems = suggestedOrder.filter((item) => item.orderAmount > 0);
  const groupedSupplierOrders = groupSuggestedOrderBySupplier(suggestedOrder);
  const automationQueue = getAutomationQueue();
  const automationCounts = getAutomationJobCounts(automationQueue);
  const supplierHistory = getSupplierOrderHistory();
  const dailyOrderQueue = getDailyOrderQueue();
  const dailyOrderCounts = getDailyOrderQueueCounts(dailyOrderQueue);
  const invoiceQueue = getInvoiceQueue();
  const invoiceCounts = getInvoiceQueueCounts(invoiceQueue);
  const voiceData = loadVoiceData() || {};
  const voiceDraftEntryCount = getVoiceDraftEntryCount(voiceData.voiceEntriesByArea);
  const usedAreasOrder = Array.isArray(voiceData.usedAreasOrder)
    ? voiceData.usedAreasOrder
    : [];

  return {
    stock: {
      totalItems: items.length,
      filledItems: Number(stockState.filledItems || 0),
      missingItems: Number(stockState.missingItems || 0),
      progress: Number(stockState.progress || 0),
      okCount: Number(stockState.okCount || 0),
      criticalCount: Number(stockState.criticalCount || 0),
      lowCount: Number(stockState.lowCount || 0),
      checkCount: Number(stockState.checkCount || 0),
      pendingSuggestedItemsCount: pendingSuggestedItems.length,
      pendingSuggestedQuantity: sumOrderAmount(pendingSuggestedItems),
      supplierCount: Object.keys(groupedSupplierOrders).length,
      voiceFilledItemsCount: Object.keys(stockState.voiceFilledItems || {}).length,
    },
    automation: {
      counts: automationCounts,
      activeCount: automationCounts.pending + automationCounts.running,
      supplierHistoryTotal: supplierHistory.length,
      latestSupplier: supplierHistory[0]?.supplier || "",
      latestRevisionNumber: Number(supplierHistory[0]?.revisionNumber || 0),
    },
    dailyOrders: {
      counts: dailyOrderCounts,
      actionableCount: dailyOrderCounts.ready + dailyOrderCounts.failed,
      reviewCount: dailyOrderCounts.readyForChefReview,
      nextSupplier: dailyOrderQueue[0]?.supplier || "",
    },
    invoices: {
      counts: invoiceCounts,
      latestInvoiceId: invoiceQueue[0]?.id || "",
    },
    voice: {
      areaCount: usedAreasOrder.length,
      draftEntryCount: voiceDraftEntryCount,
      transcriptLineCount: Array.isArray(voiceData.transcriptLines)
        ? voiceData.transcriptLines.length
        : 0,
    },
  };
}

export function buildRoleWorkspaceDashboard(role, snapshot) {
  const normalizedRole = normalizeUserRole(role);
  const quickActions = buildQuickActions(normalizedRole);

  if (normalizedRole === USER_ROLES.ADMIN) {
    return {
      title: "System overview",
      description:
        "Track operational risk, queue health and execution readiness across the workspace.",
      notice:
        "Admin workspace highlights the areas that can impact operations first: stock risk, queued automation and invoice intake.",
      heroBadges: [
        buildMetric("Stock coverage", `${snapshot.stock.progress}%`, "", "info"),
        buildMetric(
          "Open workload",
          getActiveWorkloadCount(snapshot),
          "",
          "warning"
        ),
        buildMetric(
          "Supplier revisions",
          snapshot.automation.supplierHistoryTotal,
          "",
          "default"
        ),
      ],
      metrics: [
        buildMetric(
          "Items counted",
          `${snapshot.stock.filledItems}/${snapshot.stock.totalItems}`,
          `${snapshot.stock.missingItems} still pending`,
          "info"
        ),
        buildMetric(
          "Critical stock",
          snapshot.stock.criticalCount,
          `${snapshot.stock.lowCount} low and ${snapshot.stock.checkCount} check`,
          snapshot.stock.criticalCount > 0 ? "danger" : "success"
        ),
        buildMetric(
          "Automation active",
          snapshot.automation.activeCount,
          `${snapshot.automation.counts.failed} failed and ${snapshot.automation.counts.done} completed`,
          snapshot.automation.counts.failed > 0 ? "warning" : "success"
        ),
        buildMetric(
          "Invoices queued",
          snapshot.invoices.counts.queued,
          `${snapshot.invoices.counts.failed} failed invoices require review`,
          snapshot.invoices.counts.failed > 0 ? "warning" : "info"
        ),
        buildMetric(
          "Daily orders",
          snapshot.dailyOrders.counts.total,
          `${snapshot.dailyOrders.reviewCount} waiting chef review`,
          snapshot.dailyOrders.reviewCount > 0 ? "warning" : "default"
        ),
        buildMetric(
          "Suppliers in motion",
          snapshot.stock.supplierCount,
          snapshot.automation.latestSupplier
            ? `Latest supplier revision: ${snapshot.automation.latestSupplier}`
            : "No supplier revision history yet",
          "default"
        ),
      ],
      focusTitle: "Immediate focus",
      focusItems: [
        buildMetric(
          "Critical stock items",
          snapshot.stock.criticalCount,
          "Resolve stock risks before order execution shifts.",
          snapshot.stock.criticalCount > 0 ? "danger" : "success"
        ),
        buildMetric(
          "Failed automation jobs",
          snapshot.automation.counts.failed,
          "Review queue failures and reset only after root cause is clear.",
          snapshot.automation.counts.failed > 0 ? "warning" : "success"
        ),
        buildMetric(
          "Invoices waiting in queue",
          snapshot.invoices.counts.queued,
          "Queued invoices are ready for bot handling.",
          snapshot.invoices.counts.queued > 0 ? "info" : "default"
        ),
        buildMetric(
          "Orders waiting chef review",
          snapshot.dailyOrders.reviewCount,
          "Track orders blocked between fill and final approval.",
          snapshot.dailyOrders.reviewCount > 0 ? "warning" : "default"
        ),
      ],
      pulseTitle: "System pulse",
      pulseItems: [
        buildMetric(
          "Suggested order volume",
          snapshot.stock.pendingSuggestedQuantity,
          `${snapshot.stock.pendingSuggestedItemsCount} items across ${snapshot.stock.supplierCount} suppliers`,
          "default"
        ),
        buildMetric(
          "Automation throughput",
          snapshot.automation.counts.done,
          `${snapshot.automation.counts.pending} pending and ${snapshot.automation.counts.running} running`,
          "info"
        ),
        buildMetric(
          "Invoice completion",
          snapshot.invoices.counts.executed,
          `${snapshot.invoices.counts.total} invoices tracked`,
          "success"
        ),
        buildMetric(
          "Daily execution backlog",
          snapshot.dailyOrders.actionableCount,
          `${snapshot.dailyOrders.counts.ready} ready and ${snapshot.dailyOrders.counts.failed} failed`,
          snapshot.dailyOrders.actionableCount > 0 ? "warning" : "success"
        ),
      ],
      quickActions,
    };
  }

  if (normalizedRole === USER_ROLES.CHEF) {
    return {
      title: "Operational execution",
      description:
        "Keep stock counts moving, prepare orders quickly and clear execution blockers during the shift.",
      notice:
        "Chef workspace prioritizes what needs action now: stock risk, orders ready to run and any work waiting for manual review.",
      heroBadges: [
        buildMetric("Stock coverage", `${snapshot.stock.progress}%`, "", "info"),
        buildMetric(
          "Ready to act",
          snapshot.dailyOrders.actionableCount,
          "",
          "warning"
        ),
        buildMetric("Voice draft", snapshot.voice.draftEntryCount, "", "default"),
      ],
      metrics: [
        buildMetric(
          "Critical items",
          snapshot.stock.criticalCount,
          `${snapshot.stock.lowCount} more items running low`,
          snapshot.stock.criticalCount > 0 ? "danger" : "success"
        ),
        buildMetric(
          "Pending count lines",
          snapshot.stock.missingItems,
          `${snapshot.stock.filledItems}/${snapshot.stock.totalItems} lines counted`,
          snapshot.stock.missingItems > 0 ? "warning" : "success"
        ),
        buildMetric(
          "Orders ready now",
          snapshot.dailyOrders.counts.ready,
          `${snapshot.dailyOrders.counts.failed} failed orders can be retried`,
          snapshot.dailyOrders.counts.ready > 0 ? "warning" : "default"
        ),
        buildMetric(
          "Chef reviews waiting",
          snapshot.dailyOrders.reviewCount,
          snapshot.dailyOrders.nextSupplier
            ? `Next supplier in flow: ${snapshot.dailyOrders.nextSupplier}`
            : "No order waiting review right now",
          snapshot.dailyOrders.reviewCount > 0 ? "warning" : "success"
        ),
        buildMetric(
          "Voice coverage",
          snapshot.stock.voiceFilledItemsCount,
          `${snapshot.voice.areaCount} areas and ${snapshot.voice.transcriptLineCount} transcript lines`,
          "info"
        ),
        buildMetric(
          "Suppliers to order",
          snapshot.stock.supplierCount,
          `${snapshot.stock.pendingSuggestedItemsCount} shortage lines identified`,
          "default"
        ),
      ],
      focusTitle: "Shift priorities",
      focusItems: [
        buildMetric(
          "Critical stock to resolve",
          snapshot.stock.criticalCount,
          "Review shelves that can block prep or service continuity.",
          snapshot.stock.criticalCount > 0 ? "danger" : "success"
        ),
        buildMetric(
          "Orders ready for execution",
          snapshot.dailyOrders.counts.ready,
          "Launch ready supplier orders from the execution queue.",
          snapshot.dailyOrders.counts.ready > 0 ? "warning" : "default"
        ),
        buildMetric(
          "Orders waiting chef review",
          snapshot.dailyOrders.reviewCount,
          "Approve or rework orders paused after bot fill.",
          snapshot.dailyOrders.reviewCount > 0 ? "warning" : "success"
        ),
        buildMetric(
          "Voice draft entries",
          snapshot.voice.draftEntryCount,
          `${snapshot.voice.areaCount} areas captured and ready to apply`,
          snapshot.voice.draftEntryCount > 0 ? "info" : "default"
        ),
      ],
      pulseTitle: "Operational pulse",
      pulseItems: [
        buildMetric(
          "Suggested order quantity",
          snapshot.stock.pendingSuggestedQuantity,
          `${snapshot.stock.pendingSuggestedItemsCount} items flagged for reorder`,
          "default"
        ),
        buildMetric(
          "Photo and review follow-up",
          snapshot.stock.supplierCount,
          "Suppliers currently represented in the suggested order.",
          "info"
        ),
        buildMetric(
          "Count quality check",
          snapshot.stock.checkCount,
          "Large variances marked for manual confirmation.",
          snapshot.stock.checkCount > 0 ? "warning" : "success"
        ),
        buildMetric(
          "Completed executions",
          snapshot.dailyOrders.counts.executed,
          `${snapshot.dailyOrders.counts.total} daily orders tracked overall`,
          "success"
        ),
      ],
      quickActions,
    };
  }

  return {
    title: "Monitoring and metrics",
    description:
      "Watch queue health, supplier flow and execution throughput with a safer monitoring-focused workspace.",
    notice:
      "Manager workspace is intentionally limited to visibility and monitoring views, with emphasis on workload, failures and supplier history.",
    heroBadges: [
      buildMetric("Automation active", snapshot.automation.activeCount, "", "info"),
      buildMetric("Invoices queued", snapshot.invoices.counts.queued, "", "warning"),
      buildMetric(
        "Supplier history",
        snapshot.automation.supplierHistoryTotal,
        "",
        "default"
      ),
    ],
    metrics: [
      buildMetric(
        "Automation backlog",
        snapshot.automation.counts.pending,
        `${snapshot.automation.counts.running} running and ${snapshot.automation.counts.done} done`,
        snapshot.automation.counts.pending > 0 ? "warning" : "success"
      ),
      buildMetric(
        "Automation failures",
        snapshot.automation.counts.failed,
        "Failed jobs should be reviewed before the next run window.",
        snapshot.automation.counts.failed > 0 ? "danger" : "success"
      ),
      buildMetric(
        "Invoices in queue",
        snapshot.invoices.counts.queued,
        `${snapshot.invoices.counts.failed} failed invoices tracked`,
        snapshot.invoices.counts.failed > 0 ? "warning" : "info"
      ),
      buildMetric(
        "Supplier revisions",
        snapshot.automation.supplierHistoryTotal,
        snapshot.automation.latestSupplier
          ? `Latest supplier: ${snapshot.automation.latestSupplier}`
          : "No supplier history recorded yet",
        "default"
      ),
      buildMetric(
        "Stock visibility",
        `${snapshot.stock.progress}%`,
        `${snapshot.stock.filledItems}/${snapshot.stock.totalItems} items counted`,
        "info"
      ),
      buildMetric(
        "Execution throughput",
        snapshot.dailyOrders.counts.executed,
        `${snapshot.dailyOrders.reviewCount} orders paused for chef review`,
        snapshot.dailyOrders.reviewCount > 0 ? "warning" : "success"
      ),
    ],
    focusTitle: "Monitoring focus",
    focusItems: [
      buildMetric(
        "Failed automation jobs",
        snapshot.automation.counts.failed,
        "Investigate failures before they create queue drift.",
        snapshot.automation.counts.failed > 0 ? "danger" : "success"
      ),
      buildMetric(
        "Queued invoices",
        snapshot.invoices.counts.queued,
        "Queued invoices indicate pending bot workload.",
        snapshot.invoices.counts.queued > 0 ? "warning" : "default"
      ),
      buildMetric(
        "Orders waiting review",
        snapshot.dailyOrders.reviewCount,
        "Visibility into orders blocked at the review checkpoint.",
        snapshot.dailyOrders.reviewCount > 0 ? "warning" : "default"
      ),
      buildMetric(
        "Supplier revision count",
        snapshot.automation.latestRevisionNumber || 0,
        snapshot.automation.latestSupplier
          ? `Latest update belongs to ${snapshot.automation.latestSupplier}`
          : "No supplier revision recorded yet",
        "info"
      ),
    ],
    pulseTitle: "Business pulse",
    pulseItems: [
      buildMetric(
        "Open workload",
        getActiveWorkloadCount(snapshot),
        "Combined view of active automation, invoices and daily execution backlog.",
        "default"
      ),
      buildMetric(
        "Critical stock exposure",
        snapshot.stock.criticalCount,
        `${snapshot.stock.lowCount} low items still under threshold`,
        snapshot.stock.criticalCount > 0 ? "warning" : "success"
      ),
      buildMetric(
        "Supplier coverage",
        snapshot.stock.supplierCount,
        `${snapshot.stock.pendingSuggestedItemsCount} order lines under review`,
        "info"
      ),
      buildMetric(
        "Invoice completion",
        snapshot.invoices.counts.executed,
        `${snapshot.invoices.counts.total} invoice records tracked`,
        "success"
      ),
    ],
    quickActions,
  };
}
