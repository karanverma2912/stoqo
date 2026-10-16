export type StockChangeType = "stock_in" | "stock_out" | "damage";

export function stockChange(
  quantity: string,
  type: StockChangeType,
  currentStock: string,
) {
  const value = quantity.trim();
  if (
    !/^\d+(\.\d{1,3})?$/.test(value) ||
    Number(value) <= 0 ||
    Number(value) >= 1e8
  )
    throw new Error(
      "Enter a quantity above zero, with up to 3 decimal places.",
    );
  if (type !== "stock_in" && Number(value) > Number(currentStock))
    throw new Error("You cannot remove more than the stock available.");
  return type === "stock_in" ? value : `-${value}`;
}
