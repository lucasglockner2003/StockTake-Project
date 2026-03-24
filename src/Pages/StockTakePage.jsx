import TopSummary from "../components/TopSummary";
import StockTakeTable from "../components/StockTakeTable";

function StockTakePage({
  filledItems,
  items,
  criticalCount,
  lowCount,
  checkCount,
  progress,
  lastSaved,
  missingItems,
  search,
  setSearch,
  handleReset,
  setCurrentPage,
  groupedItems,
  quantities,
  inputRefs,
  handleQuantityChange,
  voiceFilledItems,
  isLoading,
  isSaving,
  errorMessage,
}) {
  return (
    <div>
      <TopSummary
        filledItems={filledItems}
        totalItems={items.length}
        criticalCount={criticalCount}
        lowCount={lowCount}
        checkCount={checkCount}
        progress={progress}
        lastSaved={lastSaved}
        missingItems={missingItems}
        search={search}
        setSearch={setSearch}
        handleReset={handleReset}
        setCurrentPage={setCurrentPage}
        isLoading={isLoading}
        isSaving={isSaving}
        errorMessage={errorMessage}
      />

      <StockTakeTable
        groupedItems={groupedItems}
        quantities={quantities}
        search={search}
        inputRefs={inputRefs}
        handleQuantityChange={handleQuantityChange}
        voiceFilledItems={voiceFilledItems}
      />
    </div>
  );
}

export default StockTakePage;
