import { styles } from "../utils/uiStyles";
import EditableEntryRow from "./EditableEntryRow";

function EditableEntrySection({
  title,
  entries,
  searchKeyPrefix,
  openSearchKey,
  setOpenSearchKey,
  getFilteredItems,
  onEditQuantity,
  onMatchSearchChange,
  onSelectMatchedItem,
  onDelete,
  emptyText = "No entries yet.",
  showAreaInDropdown = false,
  rowKeyBuilder,
  firstColumnLabel = "Spoken",
  isLocked = false,
}) {
  if (!entries || entries.length === 0) {
    return <div style={styles.emptyState}>{emptyText}</div>;
  }

  return (
    <div style={{ marginBottom: "24px" }}>
      {title ? <h3 style={{ marginBottom: "10px" }}>{title}</h3> : null}

      <div style={styles.sectionHeaderRow}>
        <div>{firstColumnLabel}</div>
        <div>Quantity</div>
        <div>Matched Item</div>
        <div>Status</div>
        <div>Action</div>
      </div>

      {entries.map((entry, index) => {
        const searchKey = `${searchKeyPrefix}-${index}`;
        const filteredItems = getFilteredItems(entry);

        return (
          <EditableEntryRow
            key={
              rowKeyBuilder
                ? rowKeyBuilder(entry, index)
                : `${searchKey}-${entry.rawLine || entry.spokenName || index}`
            }
            entry={entry}
            index={index}
            searchKey={searchKey}
            openSearchKey={openSearchKey}
            setOpenSearchKey={setOpenSearchKey}
            filteredItems={filteredItems}
            onEditQuantity={onEditQuantity}
            onMatchSearchChange={onMatchSearchChange}
            onSelectMatchedItem={onSelectMatchedItem}
            onDelete={onDelete}
            showAreaInDropdown={showAreaInDropdown}
            isLocked={isLocked}
          />
        );
      })}
    </div>
  );
}

export default EditableEntrySection;