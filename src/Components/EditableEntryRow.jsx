import { getEntryStatusColor } from "../utils/entryStatusHelpers";
import { styles } from "../utils/uiStyles";

function EditableEntryRow({
  entry,
  index,
  searchKey,
  openSearchKey,
  setOpenSearchKey,
  filteredItems,
  onEditQuantity,
  onMatchSearchChange,
  onSelectMatchedItem,
  onDelete,
  showAreaInDropdown = false,
  isLocked = false,
}) {
  return (
    <div style={styles.entryRow}>
      <div>{entry.spokenName}</div>

      <input
        type="number"
        step="0.1"
        value={entry.quantity === "" ? "" : entry.quantity}
        onChange={(e) => onEditQuantity(index, e.target.value)}
        style={styles.input}
        disabled={isLocked}
      />

      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={entry.matchSearch || ""}
          onFocus={() => {
            if (!isLocked) setOpenSearchKey(searchKey);
          }}
          onChange={(e) => {
            if (isLocked) return;
            onMatchSearchChange(index, e.target.value);
            setOpenSearchKey(searchKey);
          }}
          placeholder="Search item..."
          style={styles.input}
          disabled={isLocked}
        />

        {!isLocked && openSearchKey === searchKey && (
          <div style={styles.dropdown}>
            {filteredItems.length === 0 ? (
              <div style={styles.dropdownEmpty}>No items found</div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  onMouseDown={() => {
                    onSelectMatchedItem(index, item);
                    setOpenSearchKey(null);
                  }}
                  style={styles.dropdownItem}
                >
                  {showAreaInDropdown ? `${item.name} — ${item.area}` : item.name}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div
        style={{
          color: getEntryStatusColor(entry.status),
          fontWeight: "bold",
        }}
      >
        {entry.status}
      </div>

      <button
        onClick={() => onDelete(index)}
        style={styles.deleteButton}
        disabled={isLocked}
      >
        Delete
      </button>
    </div>
  );
}

export default EditableEntryRow;