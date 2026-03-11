//Apenas os 3 gadges e a barra de progresso aqui

export function SummaryBadge({ label, value, backgroundColor, textColor }) {
  return (
    <div style={{  backgroundColor, color: textColor, padding: "8px 14px", borderRadius: "999px", fontWeight: "bold", fontSize: "14px",}}>
      {label} {value}
    </div>
  );
}

export function ProgressBar({ progress }) {
return (
<div>
      <div style={{width: "400px", height: "12px", backgroundColor: "#ddd", borderRadius: "10px", overflow: "hidden", marginBottom: "6px",}}>
        
        <div style={{width: `${progress}%`, height: "100%", backgroundColor: "#4CAF50",}}/>

      </div> 
      <p>{progress}% completed</p>
</div>
  );
}

