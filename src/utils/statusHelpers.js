// fica definido como 'preenchido' se a quantidade for diferente de VAZIO ou Indefinido
export function isFilled(quantity) {
  return quantity !== undefined && quantity !== "";
}

// Pega o valor e transforma em número, se não tiver valor, considere zero
export function getNumericValue(quantity) {
  return Number(quantity || 0);
}

//quando a quantidade é considerada diferente de preenchido, o status do item se mantém pendente
export function getItemStatus(item, quantity) {
  if (!isFilled(quantity)) return "Pending";

  //garantir que vira um valor válido antes de fazer os calculos
  const value = getNumericValue(quantity);
    if (value >= item.idealStock * 5) return "Check"; //aqui são os calculos para o status correto do item
    if (item.critical && value <= item.idealStock * 0.25) return "Critical";
    if (item.critical && value <= item.idealStock * 0.5) return "Low";

    return "Done"; //caso nenhum dos a cima seja verdade, ele está tudo certo
}
 
//função para definir a cor 
const statusColors = {
  Pending: "#999",
  Critical: "#ff4d4d",
  Low: "#ff9800",
  Check: "#ff9800",
  Done: "#4CAF50"
};

export function getStatusColor(item, quantity) {
  const status = getItemStatus(item, quantity);
  
  return statusColors[status];
}