export type SaleItem = {
  id: number;
  product_id: number;
  name: string;
  sku?: string;
  barcode?: string;
  unit: string;
  quantity: string;
  returned_quantity: string;
  unit_price: string;
  gross_total: string;
  line_total: string;
};
export type SaleReturn = {
  refund_method?: string | null;
  id: number;
  reason: string;
  amount: string;
  created_at: string;
  user_name: string;
  items: { sale_item_id: number; quantity: string; amount: string; disposition: string }[];
};
export type Sale = {
  id: number;
  number: string;
  business_name: string;
  cashier_name: string;
  currency: string;
  customer_name?: string;
  customer_phone?: string;
  payment_method: "cash" | "upi" | "card" | "other";
  status: "completed" | "partially_returned" | "returned";
  subtotal: string;
  discount: string;
  total: string;
  created_at: string;
  items: SaleItem[];
  returns: SaleReturn[];
};
export const billMoney = (
  amount: string | number,
  currency: string,
  language = "en",
) =>
  new Intl.NumberFormat(language === "hi" ? "hi-IN" : "en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
export function lineCents(quantity: string, price: string) {
  if (quantity.length > 12 || price.length > 12) return NaN;
  if (!/^\d+(\.\d{1,3})?$/.test(quantity) || !/^\d+(\.\d{1,2})?$/.test(price))
    return NaN;
  const [q, qd = ""] = quantity.split("."),
    [p, pd = ""] = price.split(".");
  const milli = BigInt(q) * 1000n + BigInt(qd.padEnd(3, "0")),
    cents = BigInt(p) * 100n + BigInt(pd.padEnd(2, "0"));
  return Number((milli * cents + 500n) / 1000n);
}
