import {
  getItemStatus,
  getStatusColor,
  getNumericValue,
} from "../utils/stock";
import { addAutomationJob } from "../utils/automation";
import { styles } from "../utils/uiStyles";

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
    const orderItems = suggestedOrder
      .filter((item) => item.orderAmount > 0)
      .map((item, index) => ({
        sequence: index + 1,
        itemId: item.id,
        itemName: item.name,
        quantity: item.orderAmount,
        source: "review-suggested-order",
        currentStock: item.currentStock,
        idealStock: item.idealStock,
        unit: item.unit,
        rawLine: `${item.name}\t${item.orderAmount}`,
      }));

    if (orderItems.length === 0) {
      alert("There are no suggested order items to send.");
      return;
    }

    const job = addAutomationJob({
      sessionId: Date.now(),
      source: "review-suggested-order",
      totalItems: orderItems.length,
      items: orderItems,
    });

    alert(`Suggested order job created: ${job.jobId}`);
    setCurrentPage("automation");
  }

  function handleSendStockTableToQueue() {
    const stockItems = items.map((item, index) => {
      const currentStock = getNumericValue(quantities[item.id]);
      const status = getItemStatus(item, quantities[item.id]);
      const orderAmount = Math.max(item.idealStock - currentStock, 0);

      return {
        sequence: index + 1,
        itemId: item.id,
        itemName: item.name,
        quantity: currentStock,
        source: "review-stock-table",
        currentStock,
        idealStock: item.idealStock,
        orderAmount,
        status,
        area: item.area,
        unit: item.unit,
        rawLine: [
          item.name,
          item.area,
          item.unit,
          item.idealStock,
          currentStock,
          status,
          orderAmount,
        ].join("\t"),
      };
    });

    if (stockItems.length === 0) {
      alert("There is no stock table data to send.");
      return;
    }

    const job = addAutomationJob({
      sessionId: Date.now(),
      source: "review-stock-table",
      totalItems: stockItems.length,
      items: stockItems,
    });

    alert(`Stock table job created: ${job.jobId}`);
    setCurrentPage("automation");
  }

  return (
    <div>
      <h1>Stock Take Review</h1>

      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <div style={badgeStyle("#e8f5e9", "#4CAF50")}>OK {okCount}</div>
        <div style={badgeStyle("#fff3e0", "#ff9800")}>Low {lowCount}</div>
        <div style={badgeStyle("#ffebee", "#ff4d4d")}>Critical {criticalCount}</div>
        <div style={badgeStyle("#fff8e1", "#ff9800")}>Check {checkCount}</div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "15px",
        }}
      >
        <button
          onClick={() => setCurrentPage("stock")}
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
          onClick={() => setCurrentPage("automation")}
          style={{
            ...styles.primaryButton,
            backgroundColor: "#ff9800",
          }}
        >
          View Automation Jobs
        </button>
        
      </div>

      <hr style={{ margin: "15px 0" }} />

     <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "15px",
        }}
      >
      
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
    </div>
     
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 0.5fr 0.6fr 0.7fr 0.8fr 0.8fr",
          gap: "8px",
          alignItems: "center",
          padding: "8px 10px",
          marginBottom: "8px",
          fontSize: "12px",
          fontWeight: "bold",
          color: "#aaa",
          borderBottom: "1px solid #444",
        }}
      >
        <div>Item</div>
        <div>Area</div>
        <div>Unit</div>
        <div>Ideal</div>
        <div>Count</div>
        <div>Status</div>
        <div>Order</div>
      </div>

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
              {voiceFilledItems[item.id] && (
                <span
                  title="Filled by voice"
                  style={{
                    fontSize: "11px",
                    backgroundColor: "#1e88e5",
                    color: "white",
                    borderRadius: "999px",
                    padding: "2px 6px",
                    fontWeight: "bold",
                  }}
                >
                  🎤 Voice
                </span>
              )}
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


      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "15px",
        }}
      >
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
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 0.7fr 0.7fr 1fr",
          gap: "6px",
          alignItems: "center",
          padding: "6px 10px",
          marginBottom: "6px",
          fontSize: "12px",
          fontWeight: "bold",
          color: "#aaa",
          borderBottom: "1px solid #444",
        }}
      >
        <div>Item</div>
        <div>Current</div>
        <div>Ideal</div>
        <div>Order</div>
      </div>

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

function badgeStyle(backgroundColor, color) {
  return {
    backgroundColor,
    color,
    padding: "12px 18px",
    borderRadius: "12px",
    fontWeight: "bold",
  };
}

export default ReviewPage;