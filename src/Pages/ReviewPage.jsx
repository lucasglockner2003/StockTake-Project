import { PAGE_IDS } from "../constants/app";
import {
  addAutomationJob,
  buildStockTableAutomationJob,
  buildSuggestedOrderAutomationJob,
} from "../utils/automation";
import {
  getItemStatus,
  getStatusColor,
  getNumericValue,
} from "../utils/stock";
import { styles } from "../utils/uiStyles";
import PageActionBar from "../components/PageActionBar";
import SectionTableHeader from "../components/SectionTableHeader";
import StatusBadge from "../components/StatusBadge";
import VoiceTag from "../components/VoiceTag";

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
  function handleSendSuggestedOrderToQueue() {
    const jobData = buildSuggestedOrderAutomationJob(suggestedOrder);

    if (jobData.items.length === 0) {
      alert("There are no suggested order items to send.");
      return;
    }

    const job = addAutomationJob(jobData);
    alert(`Suggested order job created: ${job.jobId}`);
    setCurrentPage(PAGE_IDS.AUTOMATION);
  }

  function handleSendStockTableToQueue() {
    const jobData = buildStockTableAutomationJob(items, quantities);

    if (jobData.items.length === 0) {
      alert("There is no stock table data to send.");
      return;
    }

    const job = addAutomationJob(jobData);
    alert(`Stock table job created: ${job.jobId}`);
    setCurrentPage(PAGE_IDS.AUTOMATION);
  }

  return (
    <div>
      <h1>Stock Take Review</h1>

      <PageActionBar gap="12px">
        <StatusBadge
          label="OK"
          value={okCount}
          backgroundColor="#e8f5e9"
          textColor="#4CAF50"
          padding="12px 18px"
          borderRadius="12px"
        />
        <StatusBadge
          label="Low"
          value={lowCount}
          backgroundColor="#fff3e0"
          textColor="#ff9800"
          padding="12px 18px"
          borderRadius="12px"
        />
        <StatusBadge
          label="Critical"
          value={criticalCount}
          backgroundColor="#ffebee"
          textColor="#ff4d4d"
          padding="12px 18px"
          borderRadius="12px"
        />
        <StatusBadge
          label="Check"
          value={checkCount}
          backgroundColor="#fff8e1"
          textColor="#ff9800"
          padding="12px 18px"
          borderRadius="12px"
        />
      </PageActionBar>

      <PageActionBar marginBottom="15px">
        <button
          onClick={() => setCurrentPage(PAGE_IDS.STOCK)}
          style={{
            padding: "10px 16px",
            backgroundColor: "#ccc",
            color: "#111",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Back to Stock Take
        </button>

        <button
          onClick={() => setCurrentPage(PAGE_IDS.AUTOMATION)}
          style={{
            ...styles.primaryButton,
            backgroundColor: "#ff9800",
          }}
        >
          View Automation Jobs
        </button>

        <button
          onClick={() => setCurrentPage(PAGE_IDS.SUPPLIER_REVIEW)}
          style={{
            ...styles.primaryButton,
            backgroundColor: "#607d8b",
          }}
        >
          Supplier Order Review
        </button>
      </PageActionBar>

      <hr style={{ margin: "15px 0" }} />

      <PageActionBar marginBottom="15px">
        <button
          onClick={handleCopyTable}
          style={{
            ...styles.primaryButton,
            backgroundColor: "#0077ff",
          }}
        >
          Copy Full Table
        </button>

        <button
          onClick={handleSendStockTableToQueue}
          style={{
            ...styles.primaryButton,
            backgroundColor: "#6f42c1",
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
              padding: "8px 10px",
              marginBottom: "4px",
              border: "1px solid #5c5c5c",
              borderRadius: "6px",
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
            <div style={{ color: statusColor, fontWeight: "bold" }}>{status}</div>
            <div>{orderAmount}</div>
          </div>
        );
      })}

      <h2>Suggested Order</h2>

      <PageActionBar marginBottom="15px">
        <button
          onClick={handleCopyOrder}
          style={{
            ...styles.primaryButton,
            backgroundColor: "#4CAF50",
          }}
        >
          Copy Order
        </button>

        <button
          onClick={handleSendSuggestedOrderToQueue}
          style={{
            ...styles.primaryButton,
            backgroundColor: "#9900ff",
          }}
        >
          Send Suggested Order To Queue
        </button>
      </PageActionBar>

      <SectionTableHeader
        columns={["Item", "Current", "Ideal", "Order"]}
        gridTemplateColumns="1.2fr 0.7fr 0.7fr 1fr"
        gap="6px"
        padding="6px 10px"
        marginBottom="6px"
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
            <div>
              {item.orderAmount} {item.unit}
            </div>
          </div>
        ))}
    </div>
  );
}

export default ReviewPage;
