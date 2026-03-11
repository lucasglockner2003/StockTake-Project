import { getItemStatus, getNumericValue, isFilled } from "./statusHelpers";

export function getFilledItemsCount(quantities) { //Conta quantos itens têm valor preenchido
  return Object.keys(quantities).filter((key) => isFilled(quantities[key])).length; // Quantos itens já têm alguma quantidade preenchida?
}                                                                                   // .length conta quantos sobraram

export function getMissingItemsCount(items, quantities) { // Conta quantos itens ainda faltam preencher
  return items.length - getFilledItemsCount(quantities);
}

export function getProgress(items, quantities) { //Calcula a porcentagem de progresso do stocktake.
  const filled = getFilledItemsCount(quantities);
  return Math.round((filled / items.length) * 100);
}

export function getStatusCounts(items, quantities) { //Percorre todos os itens e conta quantos estão em cada status.
  return items.reduce((acc, item) => {
      const status = getItemStatus(item, quantities[item.id]);

      if (status === "Done") acc.okCount += 1;
      if (status === "Critical") acc.criticalCount += 1;
      if (status === "Low") acc.lowCount += 1;
      if (status === "Check") acc.checkCount += 1;

      return acc;
    },
    {
      okCount: 0,
      criticalCount: 0,
      lowCount: 0,
      checkCount: 0,
    } // são tipo os contadores, precisa iniciar em 0 um contador
  );
}

export function groupItemsByArea(items) {  // Organiza os itens por area
  return items.reduce((acc, item) => {
    if (!acc[item.area]) // Se essa área ainda não existe dentro do acumulador,
        acc[item.area] = []; // cria um array vazio para ela.
        acc[item.area].push(item); // Empurra o item para dentro da área correspondente.
    return acc; //retorna o contador para pro próximo item 1 -> 2 - > 3 
  }, {});
}

export function getSuggestedOrder(items, quantities) { // sugerir a ordem
  return items.map((item) => { //percorre item por item e cria uma nova versão dele
    const currentStock = getNumericValue(quantities[item.id]); // Stock atual do item == Transforma o valor digitado em um número calculavel
    const isItemFilled = isFilled(quantities[item.id]); // Verifica se aquele campo foi preenchido ou não, pois um item com 0 preenchido é diferente de um item vazio.
    const orderAmount = Math.max(item.idealStock - currentStock, 0); // Quanto precisa pedir.
                                                                     // Math.max é usado caso já tenha stock suficiente, ele apenas usa o 0, ou seja, nesse caso não é necessário pedir nada
    return {
      ...item,
      currentStock,
      isFilled: isItemFilled,
      orderAmount,
    }; // Aqui ele cria um novo objeto com todas as informações que já existiam no item, porém agora incluindo novas informaçoes
  });  // Adiciona a informação de current stock, se o item ta preenchido e quanto precisa pedir para ter o stock ideal do item
}

export function getOrderText(suggestedOrder) { // Essa função monta o texto que vai para a área de transferência quando você clica em Copy Order.
  return suggestedOrder
    .filter((item) => item.orderAmount > 0) // Apenas filtra os itens que precisam ser pedidos, que o pedido é maior que 0
    .map((item) => `${item.name} - ${item.orderAmount} ${item.unit}`) // Transforma em 1 linha para copiar o pedido
    .join("\n"); // Junta todas as linhas com quebra de linha.
}

export function getReviewTableText(items, quantities) {
  const header = "Item | Area | Unit | Ideal | Count | Status | Order";

  const rows = items.map((item) => {
    const currentStock = getNumericValue(quantities[item.id]);
    const status = getItemStatus(item, quantities[item.id]);
    const orderAmount = Math.max(item.idealStock - currentStock, 0);

    return [
      item.name,
      item.area,
      item.unit,
      item.idealStock,
      currentStock,
      status,
      orderAmount,
    ].join(" | ");
  });

  return [header, ...rows].join("\n");
}