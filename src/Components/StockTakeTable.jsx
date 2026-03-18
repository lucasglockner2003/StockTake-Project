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

  const visibleItems = Object.entries(groupedItems).flatMap(([, areaItems]) =>
    areaItems.filter((item) => item.name.toLowerCase().includes(filteredSearch))
  );

  return (
    <>
      {Object.entries(groupedItems).map(([area, areaItems]) => {
        const filteredItems = areaItems.filter((item) =>
          item.name.toLowerCase().includes(filteredSearch)
        );

        if (filteredItems.length === 0) return null;

        return (
          <div key={area} style={{ marginBottom: "30px" }}>
            <h2 style={{ marginBottom: "10px", fontSize: "24px" }}>{area}</h2>

            <SectionTableHeader
              columns={["Item", "Ideal", "Unit", "Count", "Action", "Status"]}
              gridTemplateColumns="1.1fr 0.4fr 0.4fr 0.7fr auto 0.6fr"
              gap="7px"
              padding="6px 10px"
              marginBottom="6px"
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
                    gridTemplateColumns:
                      "1.1fr 0.4fr 0.4fr 0.7fr auto 0.6fr",
                    gap: "7px",
                    alignItems: "center",
                    border: `2px solid ${statusColor}`,
                    borderRadius: "6px",
                    padding: "6px 10px",
                    marginBottom: "6px",
                    minHeight: "40px",
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
                      height: "28px",
                      borderRadius: "5px",
                      border: "1px solid #ccc",
                      boxSizing: "border-box",
                      fontSize: "11px",
                    }}
                  />

                  {/* ZERO BUTTON */}
                  <button
                    onClick={() => handleQuantityChange(item.id, 0)}
                    style={{
                      padding: "4px 10px",
                      minHeight: "28px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                      cursor: "pointer",
                    }}
                  >
                    Zero
                  </button>

                  {/* STATUS */}
                  <div
                    style={{
                      color: statusColor,
                      fontSize: "13px",
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