import { getItemStatus, getStatusColor } from "../utils/stock";
import SectionTableHeader from "./SectionTableHeader";
import VoiceTag from "./VoiceTag";

function StockTakeTable({
  groupedItems,
  quantities,
  search,
  inputRefs,
  handleQuantityChange,
  voiceFilledItems,
}) {
  const filteredSearch = String(search || "").toLowerCase();
  const tableColumns = "1.2fr 0.45fr 0.45fr 0.7fr auto 0.6fr";

  const visibleItems = Object.entries(groupedItems).flatMap(([, areaItems]) =>
    areaItems.filter((item) => item.name.toLowerCase().includes(filteredSearch))
  );

  return (
    <>
      {visibleItems.length === 0 && (
        <div
          style={{
            borderRadius: "12px",
            border: "1px solid #243043",
            backgroundColor: "#0f172a",
            padding: "18px",
            color: "#94a3b8",
            marginBottom: "14px",
          }}
        >
          No items match your current search.
        </div>
      )}

      {Object.entries(groupedItems).map(([area, areaItems]) => {
        const filteredItems = areaItems.filter((item) =>
          item.name.toLowerCase().includes(filteredSearch)
        );

        if (filteredItems.length === 0) return null;

        return (
          <div
            key={area}
            style={{
              marginBottom: "14px",
              borderRadius: "12px",
              border: "1px solid #273447",
              backgroundColor: "#0f172a",
              padding: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "22px", color: "#f8fafc" }}>{area}</h2>
              <span
                style={{
                  fontSize: "12px",
                  color: "#93c5fd",
                  border: "1px solid #334155",
                  borderRadius: "999px",
                  padding: "4px 10px",
                }}
              >
                {filteredItems.length} items
              </span>
            </div>

            <SectionTableHeader
              columns={["Item", "Ideal", "Unit", "Count", "Action", "Status"]}
              gridTemplateColumns={tableColumns}
              gap="7px"
              padding="8px 10px"
              marginBottom="6px"
              color="#94a3b8"
              borderBottom="1px solid #243041"
            />

            {filteredItems.map((item) => {
              const status = getItemStatus(item, quantities[item.id]);
              const statusColor = getStatusColor(item, quantities[item.id]);

              const visibleIndex = visibleItems.findIndex(
                (visibleItem) => visibleItem.id === item.id
              );

              return (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: tableColumns,
                    gap: "7px",
                    alignItems: "center",
                    border: `1px solid ${statusColor}88`,
                    borderLeft: `4px solid ${statusColor}`,
                    borderRadius: "8px",
                    backgroundColor: "#0b1220",
                    padding: "8px 10px",
                    marginBottom: "6px",
                    minHeight: "46px",
                  }}
                >
                  {/* ITEM + VOICE TAG */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      minWidth: 0,
                      width: "100%",
                    }}
                  >
                    <strong
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.name}
                    </strong>

                    {voiceFilledItems[item.id] && <VoiceTag />}
                  </div>

                  {/* IDEAL */}
                  <div>{item.idealStock}</div>

                  {/* UNIT */}
                  <div>{item.unit}</div>

                  {/* COUNT INPUT */}
                  <input
                    ref={(el) => {
                      inputRefs.current[visibleIndex] = el;
                    }}
                    type="number"
                    step="0.1"
                    placeholder={`Enter ${item.unit}`}
                    value={quantities[item.id] ?? ""}
                    onChange={(e) =>
                      handleQuantityChange(item.id, e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        inputRefs.current[visibleIndex + 1]?.focus();
                      }
                    }}
                    style={{
                      padding: "5px 6px",
                      width: "100%",
                      height: "30px",
                      borderRadius: "5px",
                      border: "1px solid #334155",
                      backgroundColor: "#020617",
                      color: "#f8fafc",
                      boxSizing: "border-box",
                      fontSize: "12px",
                    }}
                  />

                  {/* ZERO BUTTON */}
                  <button
                    onClick={() => handleQuantityChange(item.id, 0)}
                    style={{
                      padding: "5px 10px",
                      minHeight: "30px",
                      borderRadius: "6px",
                      border: "1px solid #475569",
                      backgroundColor: "#0b1220",
                      color: "#e2e8f0",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Zero
                  </button>

                  {/* STATUS */}
                  <div
                    style={{
                      color: statusColor,
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    {status}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

export default StockTakeTable;
