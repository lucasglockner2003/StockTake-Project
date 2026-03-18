import { useEffect, useMemo, useState } from "react";
import { PAGE_IDS } from "../constants/app";
import {
  addAutomationJob,
  buildSupplierOrderAutomationJob,
  buildSupplierOrderPayload,
  buildSupplierOrderText,
} from "../utils/automation";
import {
  groupSuggestedOrderBySupplier,
  UNKNOWN_SUPPLIER_LABEL,
} from "../utils/stock";
import { styles } from "../utils/uiStyles";
import NoticePanel from "../components/NoticePanel";
import PageActionBar from "../components/PageActionBar";
import SectionTableHeader from "../components/SectionTableHeader";

function SupplierOrderReviewPage({ suggestedOrder, setCurrentPage }) {
  const initialEditableItems = useMemo(() => {
    const grouped = groupSuggestedOrderBySupplier(suggestedOrder);

    return Object.entries(grouped).flatMap(([supplier, items]) =>
      items.map((item) => ({
        ...item,
        supplier,
        orderAmount: Number(item.orderAmount) || 0,
      }))
    );
  }, [suggestedOrder]);

  const [editableItems, setEditableItems] = useState(initialEditableItems);

  useEffect(() => {
    setEditableItems(initialEditableItems);
  }, [initialEditableItems]);

  const groupedBySupplier = useMemo(
    () =>
      editableItems.reduce((acc, item) => {
        const supplier = item.supplier || UNKNOWN_SUPPLIER_LABEL;

        if (!acc[supplier]) {
          acc[supplier] = [];
        }

        acc[supplier].push(item);
        return acc;
      }, {}),
    [editableItems]
  );

  const suppliers = useMemo(
    () => Object.keys(groupedBySupplier).sort((a, b) => a.localeCompare(b)),
    [groupedBySupplier]
  );

  const sortedSupplierGroups = useMemo(
    () =>
      suppliers.reduce((acc, supplier) => {
        const supplierItems = groupedBySupplier[supplier] || [];

        acc[supplier] = supplierItems
          .slice()
          .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

        return acc;
      }, {}),
    [groupedBySupplier, suppliers]
  );

  const activeItemsBySupplier = useMemo(
    () =>
      suppliers.reduce((acc, supplier) => {
        acc[supplier] = (sortedSupplierGroups[supplier] || []).filter(
          (item) => Number(item.orderAmount) > 0
        );

        return acc;
      }, {}),
    [sortedSupplierGroups, suppliers]
  );

  const activeSuppliers = useMemo(
    () =>
      suppliers.filter(
        (supplier) => (activeItemsBySupplier[supplier] || []).length > 0
      ),
    [activeItemsBySupplier, suppliers]
  );

  function normalizeOrderAmount(value) {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
      return 0;
    }

    return Math.max(numeric, 0);
  }

  function handleOrderAmountChange(itemId, nextValue) {
    const normalizedValue = normalizeOrderAmount(nextValue);

    setEditableItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, orderAmount: normalizedValue } : item
      )
    );
  }

  function getSupplierSummary(supplier) {
    const items = activeItemsBySupplier[supplier] || [];
    const totalItems = items.length;
    const totalOrderQuantity = items.reduce(
      (sum, item) => sum + Number(item.orderAmount || 0),
      0
    );

    const pricedItems = items.filter((item) => {
      const price = Number(item.price);
      return Number.isFinite(price);
    });

    const totalEstimatedValue = pricedItems.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.orderAmount || 0),
      0
    );

    return {
      totalItems,
      totalOrderQuantity,
      hasEstimatedValue: pricedItems.length > 0,
      totalEstimatedValue,
    };
  }

  async function copyTextToClipboard(text, successMessage, failureMessage) {
    try {
      await navigator.clipboard.writeText(text);
      alert(successMessage);
    } catch {
      alert(failureMessage);
    }
  }

  function handleSendSupplierToQueue(supplier) {
    const supplierItems = activeItemsBySupplier[supplier] || [];
    const jobData = buildSupplierOrderAutomationJob(supplier, supplierItems);

    if (jobData.items.length === 0) {
      alert("There are no items to send for this supplier.");
      return;
    }

    const job = addAutomationJob(jobData);
    alert(`Supplier order job created: ${job.jobId}`);
    setCurrentPage(PAGE_IDS.AUTOMATION);
  }

  async function handleCopySupplierText(supplier) {
    const supplierItems = activeItemsBySupplier[supplier] || [];
    const orderText = buildSupplierOrderText(supplier, supplierItems);

    if (!orderText) {
      alert("There are no items to copy for this supplier.");
      return;
    }

    await copyTextToClipboard(
      orderText,
      "Supplier order text copied!",
      "Failed to copy supplier order text."
    );
  }

  async function handleCopySupplierPayload(supplier) {
    const supplierItems = activeItemsBySupplier[supplier] || [];
    const payload = buildSupplierOrderPayload(supplier, supplierItems);

    if (payload.items.length === 0) {
      alert("There are no supplier items to copy.");
      return;
    }

    await copyTextToClipboard(
      JSON.stringify(payload, null, 2),
      "Supplier automation payload copied!",
      "Failed to copy supplier automation payload."
    );
  }

  function handleSendAllSuppliersToQueue() {
    if (activeSuppliers.length === 0) {
      alert("There are no supplier items to send.");
      return;
    }

    const createdJobs = activeSuppliers.map((supplier) => {
      const supplierItems = activeItemsBySupplier[supplier] || [];
      return addAutomationJob(buildSupplierOrderAutomationJob(supplier, supplierItems));
    });

    alert(`${createdJobs.length} supplier order job(s) created.`);
    setCurrentPage(PAGE_IDS.AUTOMATION);
  }

  async function handleCopyAllOrdersText() {
    const allOrderText = activeSuppliers
      .map((supplier) =>
        buildSupplierOrderText(supplier, activeItemsBySupplier[supplier] || [])
      )
      .filter(Boolean)
      .join("\n\n");

    if (!allOrderText) {
      alert("There are no supplier orders to copy.");
      return;
    }

    await copyTextToClipboard(
      allOrderText,
      "All supplier orders copied!",
      "Failed to copy supplier orders."
    );
  }

  return (
    <div>
      <h1>Supplier Order Review</h1>

      <PageActionBar marginBottom="15px">
        <button onClick={() => setCurrentPage(PAGE_IDS.REVIEW)} style={styles.backButton}>
          Back to Review
        </button>

        <button
          onClick={handleCopyAllOrdersText}
          disabled={activeSuppliers.length === 0}
          style={{
            ...styles.primaryButton,
            backgroundColor: activeSuppliers.length === 0 ? "#888" : "#4CAF50",
            cursor: activeSuppliers.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          Copy ALL Orders Text
        </button>

        <button
          onClick={handleSendAllSuppliersToQueue}
          disabled={activeSuppliers.length === 0}
          style={{
            ...styles.primaryButton,
            backgroundColor: activeSuppliers.length === 0 ? "#888" : "#ff9800",
            cursor: activeSuppliers.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          Send ALL Suppliers To Queue
        </button>
      </PageActionBar>

      {suppliers.length === 0 ? (
        <div style={styles.emptyState}>
          No items with order amount greater than zero.
        </div>
      ) : (
        <div>
          {activeSuppliers.length === 0 && (
            <NoticePanel backgroundColor="#1f1f1f">
              No supplier has order amount greater than zero right now.
            </NoticePanel>
          )}

          {suppliers.map((supplier) => {
            const supplierItems = sortedSupplierGroups[supplier] || [];
            const summary = getSupplierSummary(supplier);
            const hasActiveItems = summary.totalItems > 0;

            return (
              <div key={supplier} style={{ marginBottom: "26px" }}>
                <PageActionBar marginBottom="10px" alignItems="center" gap="10px">
                  <h2 style={{ margin: 0 }}>{supplier}</h2>

                  <span style={{ color: "#aaa", fontSize: "13px" }}>
                    {summary.totalItems} item(s)
                  </span>

                  <span style={{ color: "#aaa", fontSize: "13px" }}>
                    {summary.totalOrderQuantity} total qty
                  </span>

                  {summary.hasEstimatedValue && (
                    <span style={{ color: "#aaa", fontSize: "13px" }}>
                      Est. ${summary.totalEstimatedValue.toFixed(2)}
                    </span>
                  )}
                </PageActionBar>

                <SectionTableHeader
                  columns={["Item", "Current", "Ideal", "Order"]}
                  gridTemplateColumns="1.2fr 0.7fr 0.7fr 1fr"
                  gap="6px"
                  padding="6px 10px"
                  marginBottom="6px"
                />

                {supplierItems.length === 0 ? (
                  <div style={styles.emptyState}>
                    No items mapped for this supplier.
                  </div>
                ) : (
                  supplierItems.map((item) => (
                    <div
                      key={`${supplier}-${item.id}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 0.7fr 0.7fr 1fr",
                        gap: "6px",
                        alignItems: "center",
                        border: "1px solid #ddd",
                        padding: "6px 10px",
                        marginBottom: "4px",
                        borderRadius: "6px",
                      }}
                    >
                      <div>
                        <strong>{item.name}</strong>
                      </div>
                      <div>{item.currentStock}</div>
                      <div>{item.idealStock}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.orderAmount}
                          onChange={(event) =>
                            handleOrderAmountChange(item.id, event.target.value)
                          }
                          style={{
                            width: "100px",
                            padding: "5px 8px",
                            borderRadius: "6px",
                            border: "1px solid #ccc",
                            boxSizing: "border-box",
                          }}
                        />
                        <span>{item.unit}</span>
                      </div>
                    </div>
                  ))
                )}

                {!hasActiveItems && (
                  <div style={{ ...styles.emptyState, marginBottom: "10px" }}>
                    No items with order amount greater than zero for this supplier.
                  </div>
                )}

                <PageActionBar marginBottom="0">
                  <button
                    onClick={() => handleCopySupplierText(supplier)}
                    disabled={!hasActiveItems}
                    style={{
                      ...styles.primaryButton,
                      backgroundColor: !hasActiveItems ? "#888" : "#4CAF50",
                      cursor: !hasActiveItems ? "not-allowed" : "pointer",
                    }}
                  >
                    Copy {supplier} Order Text
                  </button>

                  <button
                    onClick={() => handleCopySupplierPayload(supplier)}
                    disabled={!hasActiveItems}
                    style={{
                      ...styles.primaryButton,
                      backgroundColor: !hasActiveItems ? "#888" : "#6f42c1",
                      cursor: !hasActiveItems ? "not-allowed" : "pointer",
                    }}
                  >
                    Copy {supplier} Payload
                  </button>

                  <button
                    onClick={() => handleSendSupplierToQueue(supplier)}
                    disabled={!hasActiveItems}
                    style={{
                      ...styles.primaryButton,
                      backgroundColor: !hasActiveItems ? "#888" : "#ff9800",
                      cursor: !hasActiveItems ? "not-allowed" : "pointer",
                    }}
                  >
                    Send {supplier} To Queue
                  </button>
                </PageActionBar>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SupplierOrderReviewPage;
