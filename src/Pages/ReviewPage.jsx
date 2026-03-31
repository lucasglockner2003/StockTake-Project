import { useState } from "react";

import { PAGE_IDS } from "../constants/app";
import {
  addAutomationJob,
  buildStockTableAutomationJob,
} from "../utils/automation";
import { addDailyConfirmedOrdersFromSuggestedOrder } from "../utils/dailyOrders";
import {
  getItemStatus,
  getStatusColor,
  getNumericValue,
} from "../utils/stock";
import { styles } from "../utils/uiStyles";
import PageActionBar from "../components/PageActionBar";
import SectionTableHeader from "../components/SectionTableHeader";
import VoiceTag from "../components/VoiceTag";

function InlineReviewPill({ label, value, borderColor, backgroundColor, textColor }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        borderRadius: "999px",
        border: `1px solid ${borderColor}`,
        backgroundColor,
        color: textColor,
        padding: "5px 11px",
        fontSize: "12px",
        fontWeight: 600,
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ReviewPage({
  items,
  quantities,
  okCount,
  lowCount,
  criticalCount,
  checkCount,
  suggestedOrder,
  handleCopyOrder,
  setCurrentPage,
  handleCopyTable,
  voiceFilledItems,
}) {
  const [isSendingSuggestedOrder, setIsSendingSuggestedOrder] = useState(false);

  async function handleSendSuggestedOrderToQueue() {
    const validSuggestedItems = (suggestedOrder || []).filter(
      (item) => Number(item.orderAmount || 0) > 0
    );

    if (validSuggestedItems.length === 0) {
      alert("There are no suggested order items to send.");
      return;
    }

    try {
      setIsSendingSuggestedOrder(true);
      const result = await addDailyConfirmedOrdersFromSuggestedOrder(suggestedOrder);

      alert(`Daily order(s) created: ${result.createdOrders.length}`);
      setCurrentPage(PAGE_IDS.DAILY_ORDER_EXECUTION);
    } catch (error) {
      alert(error?.message || "Failed to create daily orders.");
    } finally {
      setIsSendingSuggestedOrder(false);
    }
  }

  async function handleSendStockTableToQueue() {
    const jobData = buildStockTableAutomationJob(items, quantities);

    if (jobData.items.length === 0) {
      alert("There is no stock table data to send.");
      return;
    }

    try {
      const job = await addAutomationJob(jobData);
      alert(`Stock table job created: ${job.jobId}`);
      setCurrentPage(PAGE_IDS.AUTOMATION);
    } catch (error) {
      alert(error?.message || "Failed to create automation job.");
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "14px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "30px", fontWeight: 600, color: "#f8fafc" }}>
          Stock Take Review
        </h1>

        <InlineReviewPill
          label="OK"
          value={okCount}
          borderColor="#14532d"
          backgroundColor="#0f2c1d"
          textColor="#86efac"
        />
        <InlineReviewPill
          label="Low"
          value={lowCount}
          borderColor="#92400e"
          backgroundColor="#2f1b0b"
          textColor="#fdba74"
        />
        <InlineReviewPill
          label="Critical"
          value={criticalCount}
          borderColor="#7f1d1d"
          backgroundColor="#2b1212"
          textColor="#fca5a5"
        />
        <InlineReviewPill
          label="Check"
          value={checkCount}
          borderColor="#92400e"
          backgroundColor="#2f1b0b"
          textColor="#fdba74"
        />
      </div>

      <div style={{ ...styles.darkPanel, marginBottom: "18px" }}>
        <PageActionBar marginBottom="15px">
          <button
            onClick={handleCopyTable}
            style={{
              ...styles.primaryButton,
              backgroundColor: "#2563eb",
            }}
          >
            Copy Full Table
          </button>

          <button
            onClick={handleSendStockTableToQueue}
            style={{
              ...styles.primaryButton,
              backgroundColor: "#7c3aed",
            }}
          >
            Send Stock Table To Queue
          </button>
        </PageActionBar>

        <SectionTableHeader
          columns={["Item", "Area", "Unit", "Ideal", "Count", "Status", "Order"]}
          gridTemplateColumns="1.4fr 1fr 0.5fr 0.6fr 0.7fr 0.8fr 0.8fr"
        />

        {items.map((item) => {
          const currentStock = getNumericValue(quantities[item.id]);
          const orderAmount = Math.max(item.idealStock - currentStock, 0);
          const status = getItemStatus(item, quantities[item.id]);
          const statusColor = getStatusColor(item, quantities[item.id]);

          return (
            <div
              key={item.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr 0.5fr 0.6fr 0.7fr 0.8fr 0.8fr",
                gap: "8px",
                alignItems: "center",
                padding: "10px 12px",
                marginBottom: "6px",
                border: "1px solid #1f2937",
                borderRadius: "10px",
                backgroundColor: "rgba(15, 23, 42, 0.86)",
                fontSize: "14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <strong>{item.name}</strong>
                {voiceFilledItems[item.id] && <VoiceTag />}
              </div>
              <div>{item.area}</div>
              <div>{item.unit}</div>
              <div>{item.idealStock}</div>
              <div>{currentStock}</div>
              <div style={{ color: statusColor, fontWeight: 600 }}>{status}</div>
              <div>{orderAmount}</div>
            </div>
          );
        })}
      </div>

      <div style={styles.darkPanel}>
        <h2 style={{ marginTop: 0, marginBottom: "14px", fontWeight: 600 }}>Suggested Order</h2>

        <PageActionBar marginBottom="15px">
          <button
            onClick={handleCopyOrder}
            style={{
              ...styles.primaryButton,
              backgroundColor: "#16a34a",
            }}
          >
            Copy Order
          </button>

          <button
            onClick={handleSendSuggestedOrderToQueue}
            disabled={isSendingSuggestedOrder}
            style={{
              ...styles.primaryButton,
              backgroundColor: isSendingSuggestedOrder ? "#64748b" : "#8b5cf6",
            }}
          >
            {isSendingSuggestedOrder ? "Sending..." : "Send Suggested Order"}
          </button>
        </PageActionBar>

        <SectionTableHeader
          columns={["Item", "Current", "Ideal", "Order"]}
          gridTemplateColumns="1.2fr 0.7fr 0.7fr 1fr"
          gap="6px"
          padding="8px 12px"
          marginBottom="8px"
        />

        {suggestedOrder
          .filter((item) => item.orderAmount > 0)
          .map((item) => (
            <div
              key={item.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 0.7fr 0.7fr 1fr",
                gap: "6px",
                alignItems: "center",
                border: "1px solid #1f2937",
                padding: "10px 12px",
                marginBottom: "6px",
                borderRadius: "10px",
                backgroundColor: "rgba(15, 23, 42, 0.86)",
              }}
            >
              <div>
                <strong>{item.name}</strong>
              </div>
              <div>{item.currentStock}</div>
              <div>{item.idealStock}</div>
              <div>
                {item.orderAmount} {item.unit}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default ReviewPage;
