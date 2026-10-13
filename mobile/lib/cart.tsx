import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { z } from "zod";
import { useAuth } from "./auth";
import type { Product } from "./types";
const line = z.object({
  product_id: z.number().int().positive(),
  name: z.string().max(400),
  unit: z.string().max(100),
  current_stock: z.string().max(24),
  quantity: z.string().max(20),
  unit_price: z.string().max(20),
});
const draft = z.object({
  items: z.array(line).max(100),
  discount: z.string().max(20),
  customer_name: z.string().max(120),
  customer_phone: z.string().max(30),
  payment_method: z.enum(["cash", "upi", "card", "other"]),
});
const pending = z.object({
  idempotency_key: z.string().max(100),
  payload: draft,
});
const schema = z.object({
  version: z.literal(1),
  active: draft,
  pending: pending.nullable(),
  held: z.array(draft).max(10),
});
export type CartLine = z.infer<typeof line>;
export type CartDraft = z.infer<typeof draft>;
type State = z.infer<typeof schema>;
const emptyDraft = (): CartDraft => ({
  items: [],
  discount: "0",
  customer_name: "",
  customer_phone: "",
  payment_method: "cash",
});
const emptyState = (): State => ({
  version: 1,
  active: emptyDraft(),
  pending: null,
  held: [],
});
type Cart = {
  state: State;
  ready: boolean;
  add: (p: Product) => void;
  update: (value: Partial<CartDraft>) => void;
  setLine: (id: number, key: "quantity" | "unit_price", value: string) => void;
  remove: (id: number) => void;
  hold: () => void;
  resume: (index: number) => void;
  prepare: () => Promise<State["pending"]>;
  clear: () => Promise<void>;
  isCurrent: () => boolean;
  unlock: () => Promise<void>;
};
const Context = createContext<Cart | null>(null);
export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, business } = useAuth();
  return (
    <CartWorkspace
      key={`${user?.id ?? 0}.${business?.id ?? 0}.${business?.role ?? ""}`}
    >
      {children}
    </CartWorkspace>
  );
}
function CartWorkspace({ children }: { children: React.ReactNode }) {
  const { user, business } = useAuth(),
    [state, setState] = useState<State>(emptyState),
    [loaded, setLoaded] = useState<string | null>(null);
  const key = user && business ? `stoqo.cart.${user.id}.${business.id}` : null;
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );
  const latest = useRef(state);
  latest.current = state;
  useEffect(() => {
    let live = true;
    setLoaded(null);
    if (!key) {
      setState(emptyState());
      return;
    }
    void AsyncStorage.getItem(key).then((raw) => {
      if (!live) return;
      try {
        setState(raw ? schema.parse(JSON.parse(raw)) : emptyState());
      } catch {
        setState(emptyState());
      }
      setLoaded(key);
    });
    return () => {
      live = false;
    };
  }, [key]);
  useEffect(() => {
    if (key && loaded === key)
      void AsyncStorage.setItem(key, JSON.stringify(state));
  }, [key, loaded, state]);
  function edit(transform: (current: State) => State) {
    if (!key || loaded !== key)
      throw new Error("Wait for your saved cart to load.");
    if (latest.current.pending)
      throw new Error("Retry the pending checkout before changing this cart.");
    const next = transform(latest.current);
    latest.current = next;
    setState(next);
  }
  async function persist(next: State) {
    latest.current = next;
    setState(next);
    if (key) await AsyncStorage.setItem(key, JSON.stringify(next));
  }
  const value: Cart = {
    state,
    isCurrent: () => mounted.current,
    ready: !!key && loaded === key,
    add(p) {
      if (latest.current.pending)
        throw new Error("Resolve the pending checkout first.");
      edit((current) => {
        const existing = current.active.items.find(
          (i) => i.product_id === p.id,
        );
        const items = existing
          ? current.active.items.map((i) =>
              i.product_id === p.id
                ? { ...i, quantity: String(Number(i.quantity) + 1) }
                : i,
            )
          : [
              ...current.active.items,
              {
                product_id: p.id,
                name: p.display_name || p.name,
                unit: p.unit,
                current_stock: p.current_stock,
                quantity: "1",
                unit_price: p.selling_price,
              },
            ];
        if (items.length > 100)
          throw new Error("A bill can contain up to 100 products.");
        return { ...current, active: { ...current.active, items } };
      });
    },
    update(fields) {
      edit((current) => ({
        ...current,
        active: { ...current.active, ...fields },
      }));
    },
    setLine(id, k, v) {
      edit((current) => ({
        ...current,
        active: {
          ...current.active,
          items: current.active.items.map((i) =>
            i.product_id === id ? { ...i, [k]: v } : i,
          ),
        },
      }));
    },
    remove(id) {
      edit((current) => ({
        ...current,
        active: {
          ...current.active,
          items: current.active.items.filter((i) => i.product_id !== id),
        },
      }));
    },
    hold() {
      if (latest.current.held.length >= 10)
        throw new Error("You can hold up to 10 carts.");
      edit((current) => ({
        ...current,
        active: emptyDraft(),
        held: [...current.held, current.active],
      }));
    },
    resume(index) {
      edit((current) => {
        const selected = current.held[index];
        if (!selected) return current;
        const held = current.held.filter((_, i) => i !== index);
        if (current.active.items.length) held.push(current.active);
        return { ...current, active: selected, held };
      });
    },
    async prepare() {
      if (!key || loaded !== key)
        throw new Error("Wait for your saved cart to load.");
      const current = latest.current;
      if (current.pending) return current.pending;
      const next = {
        ...current,
        pending: {
          idempotency_key: Crypto.randomUUID(),
          payload: current.active,
        },
      };
      await persist(next);
      return next.pending;
    },
    async clear() {
      await persist({ ...latest.current, active: emptyDraft(), pending: null });
    },
    async unlock() {
      await persist({ ...latest.current, pending: null });
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCart() {
  const value = useContext(Context);
  if (!value) throw new Error("Cart provider missing");
  return value;
}
