export function scaled(value: string, places: number) {
  if (!new RegExp(`^\\d{1,8}(?:\\.\\d{1,${places}})?$`).test(value))
    throw new Error(`Enter a valid amount with up to ${places} decimals`);
  const [whole, fraction = ""] = value.split(".");
  return (
    BigInt(whole) * 10n ** BigInt(places) + BigInt(fraction.padEnd(places, "0"))
  );
}
export function lineCents(quantity: string, price: string) {
  const amount = scaled(quantity, 3);
  if (amount === 0n) throw new Error("Quantity must be greater than zero");
  return (amount * scaled(price, 2) + 500n) / 1000n;
}
export function centsText(cents: bigint) {
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;
}
export function cartTotal(
  items: { quantity: string; unit_price: string }[],
  discount: string,
) {
  const subtotal = items.reduce(
      (sum, item) => sum + lineCents(item.quantity, item.unit_price),
      0n,
    ),
    deduction = scaled(discount || "0", 2);
  if (deduction > subtotal)
    throw new Error("Discount cannot exceed the bill amount");
  return {
    subtotal: centsText(subtotal),
    total: centsText(subtotal - deduction),
  };
}
