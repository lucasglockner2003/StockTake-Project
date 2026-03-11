// guardar o estado das quantidades
// salvar e carregar do localStorage
// calcular tudo que o app precisa
// devolver funções prontas

import { useEffect, useState } from "react";
import { items } from "../data/items";
import { clearQuantities, loadQuantities, saveQuantities, } from "../utils/storage";
import { getFilledItemsCount, getMissingItemsCount, getProgress, getStatusCounts, getSuggestedOrder, getOrderText, groupItemsByArea, getReviewTableText,} from "../utils/stockHelpers";

export function useStockTake() { // Criar os estados do hook.
  const [quantities, setQuantities] = useState(() => loadQuantities()); // Na primeira vez que o hook rodar, carrega os dados salvos do navegador
  const [lastSaved, setLastSaved] = useState(null); // Esse estado guarda o horário do último salvamento

  useEffect(() => { // useEffect para salvar automaticamente
    saveQuantities(quantities); // Salva o objeto no localStorage
    setLastSaved(new Date());
  }, [quantities]); // roda de novo sempre que quantities mudar

  const filledItems = getFilledItemsCount(quantities);         // Aqui é só pegar os calculos que ja foram feitos em stockhelpers
  const missingItems = getMissingItemsCount(items, quantities);// e passar para uma constante
  const progress = getProgress(items, quantities);
  const reviewTableText = getReviewTableText(items, quantities);

  const { okCount, criticalCount, lowCount, checkCount } = getStatusCounts(items,quantities); //pega apenas o que já foi contado
  // Apenas prepara dados que a interface precisa
  const groupedItems = groupItemsByArea(items); // Agrupa por area
  const suggestedOrder = getSuggestedOrder(items, quantities); // Cria uma lista “enriquecida” dos itens, com:
  const orderText = getOrderText(suggestedOrder); // Transforma a sugestão de pedido em texto.

  function handleQuantityChange(itemId, value) {setQuantities((prev) => ({...prev, [itemId]: value,}));} // Essa função atualiza a quantidade de um item específico.

  function handleReset() { //Essa função reseta o stocktake.
    const confirmed = window.confirm("Are you sure you want to reset the stock take?");
    if (!confirmed) return; // Se não confirmar a função para imediatamente e volta a tela normal
                        // Caso confirme ela continua nas linhas de baixo
    setQuantities({}); // Limpa o estado atual. Tudo some.
    clearQuantities(); // Apaga também do localStorage. Se nao tivesse isso, os valores voltariam ao atualizar a pagina, pq tava salvo
  }

  async function handleCopyOrder() { // Essa função copia o texto do pedido.
    try {
      await navigator.clipboard.writeText(orderText);
      alert("Order copied!");
    } catch { // Então o catch evita quebrar o app, caso tenha algum erro
      alert("Failed to copy order.");
    }
  }

  async function handleCopyTable() {
  try {
    await navigator.clipboard.writeText(reviewTableText);
    alert("Table copied!");
  } catch {
    alert("Failed to copy table.");
  }
}

            // Essa parte é a mais importante do hook. Ela define o que o hook entrega para quem usar ele.
  return {
    items, quantities, lastSaved, filledItems, missingItems, progress, okCount, criticalCount,
    lowCount, checkCount, groupedItems, suggestedOrder, handleQuantityChange, handleReset, handleCopyOrder, handleCopyTable,
  };
}