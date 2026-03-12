import { useRef, useState } from "react";
import TopSummary from "./Components/TopSummary";
import StockTakeTable from "./Components/StockTakeTable";
import ReviewPage from "./Components/ReviewPage";
import { useStockTake } from "./hooks/useStockTake";

function App() {
  const [currentPage, setCurrentPage] = useState("stock");
  const [search, setSearch] = useState("");
  const inputRefs = useRef([]);

  const {
    items,
    quantities,
    lastSaved,
    filledItems,
    missingItems,
    progress,
    okCount,
    criticalCount,
    lowCount,
    checkCount,
    groupedItems,
    suggestedOrder,
    handleQuantityChange,
    handleReset,
    handleCopyOrder,
    handleCopyTable,
  } = useStockTake();

  return (
    <div style={{padding: "20px", fontFamily: "Arial, sans-serif", width: "100%", maxWidth: "1000px", margin: "0 auto",}}>
      {currentPage === "stock" && (
        <>
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
          />
          <StockTakeTable
            groupedItems={groupedItems}
            quantities={quantities}
            search={search}
            inputRefs={inputRefs}
            handleQuantityChange={handleQuantityChange}
          />
        </>
      )}

      {currentPage === "review" && (
        <ReviewPage
          items={items}
          quantities={quantities}
          okCount={okCount}
          lowCount={lowCount}
          criticalCount={criticalCount}
          checkCount={checkCount}
          suggestedOrder={suggestedOrder}
          handleCopyOrder={handleCopyOrder}
          handleCopyTable={handleCopyTable}
          setCurrentPage={setCurrentPage}
        />
      )}
    </div>
  );
} export default App;