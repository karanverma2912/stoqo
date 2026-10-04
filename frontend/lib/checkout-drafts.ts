import { z } from "zod";
import type { Product } from "./types";
export type CartLine = { product: Product; quantity: string; price: string };
const lineSchema = z.object({
  product_id: z.number().int().positive(),
  name: z.string().max(400),
  quantity: z.string().max(20),
  price: z.string().max(20),
});
const draftSchema = z.object({
  id: z.string().max(80),
  saved_at: z.string(),
  items: z.array(lineSchema).max(100),
  discount: z.string().max(20),
  customer: z.string().max(120),
  phone: z.string().max(30),
  payment: z.enum(["cash", "upi", "card", "other"]),
});
const stateSchema = z.object({
  version: z.literal(1),
  active: draftSchema.nullable(),
  held: z.array(draftSchema).max(10),
});
export type CheckoutDraft = z.infer<typeof draftSchema>;
export type DraftState = z.infer<typeof stateSchema>;
export function readDrafts(raw: string | null): DraftState {
  return raw
    ? stateSchema.parse(JSON.parse(raw))
    : { version: 1, active: null, held: [] };
}
export function createDraft(
  cart: CartLine[],
  discount: string,
  customer: string,
  phone: string,
  payment: string,
): CheckoutDraft {
  return draftSchema.parse({
    id: crypto.randomUUID(),
    saved_at: new Date().toISOString(),
    items: cart.map(({ product, quantity, price }) => ({
      product_id: product.id,
      name: product.display_name || product.name,
      quantity,
      price,
    })),
    discount,
    customer,
    phone,
    payment,
  });
}
// Never persist purchase costs or stale stock. Always re-fetch products when resuming.
export async function hydrateDraft(
  draft: CheckoutDraft,
  fetchProduct: (id: number) => Promise<Product>,
  canSetPrices: boolean,
): Promise<CartLine[]> {
  return Promise.all(
    draft.items.map(async (line) => {
      const product = await fetchProduct(line.product_id);
      return {
        product,
        quantity: line.quantity,
        price: canSetPrices
          ? line.price
          : Number(product.selling_price).toFixed(2),
      };
    }),
  );
}
