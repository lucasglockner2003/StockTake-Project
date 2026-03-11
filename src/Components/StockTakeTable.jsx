import {getItemStatus, getStatusColor,} from "../utils/statusHelpers";

function StockTakeTable({groupedItems, quantities, search, inputRefs, handleQuantityChange,}) 
{
  return (
    <>
      {Object.entries(groupedItems).map(([area, areaItems]) => //pegue o objeto groupedItems, transforme esse objeto em uma lista, percorra cada área com .map()
      {
        return (
                <div key={area} style={{ marginBottom: "30px" }}>

                    <h2 style={{ marginBottom: "10px", fontSize: "24px" }}> {area} </h2> 

                    <div style={{display: "grid", gridTemplateColumns: "1.1fr 0.4fr 0.4fr 0.7fr auto 0.6fr", gap: "7px",
                        alignItems: "center", padding: "6px 10px", marginBottom: "6px", fontSize: "12px", fontWeight: "bold",
                        color: "#aaa",borderBottom: "1px solid #444",}}>
                        <div>Item</div>
                        <div>Ideal</div>
                        <div>Unit</div>
                        <div>Count</div>
                        <div>Action</div>
                        <div>Status</div>
                    </div>

                    {areaItems.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())).map((item) => 
                    {
                        const status = getItemStatus(item, quantities[item.id]); //define o status do item
                        const statusColor = getStatusColor(item, quantities[item.id]);

                        return (
                        <div key={item.id}
                            style={{display: "grid", gridTemplateColumns:"1.2fr 0.4fr 0.4fr 0.7fr auto 0.6fr", gap: "6px",
                            alignItems: "center", border: `2px solid ${statusColor}`, borderRadius: "6px", padding: "4px 6px",
                            marginBottom: "4px",}}>

                          <div> <strong>{item.name}</strong> </div>
                                 <div>{item.idealStock}</div>
                                   <div>{item.unit}</div>

                            <input ref={(el) => (inputRefs.current[item.id] = el)}
                            type="number"
                            step="0.1"
                            placeholder={`Enter ${item.unit}`}
                            value={quantities[item.id] || ""}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            style={{padding: "5px 6px", width: "100%", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box", fontSize: "11px",}}/>

                            <button
                            onClick={() => handleQuantityChange(item.id, 0)}
                            style={{padding: "4px 10px", borderRadius: "6px", border: "1px solid #ccc", cursor: "pointer",}}>
                            Zero
                            </button>
                            {/* Mostra o texto do status daquele item com a cor certa.*/}
                            <div style={{color: statusColor, fontSize: "13px",fontWeight: "bold",}}> {status} </div> 
                        </div>
                        );
                    })}
                </div>
                );})}</>);
} export default StockTakeTable;