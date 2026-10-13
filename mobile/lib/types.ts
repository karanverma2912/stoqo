export type User = {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string;
  email_verification_required?: boolean;
};
export type Business = {
  id: number;
  name: string;
  role: "owner" | "admin" | "manager" | "staff";
  currency: string;
  timezone: string;
  ai_enabled: boolean;
  trial_ends_at: string;
  subscription_status: string;
};
export type Product = {
  id: number;
  name: string;
  display_name: string;
  barcode?: string;
  sku?: string;
  size?: string;
  color?: string;
  selling_price: string;
  purchase_price?: string;
  current_stock: string;
  low_stock_threshold: string;
  unit: string;
  stock_status: "healthy" | "low" | "out";
  category_id?: number;
  supplier_id?: number;
  supplier_name?: string;
  product_group_id?: number;
  image_path?: string;
};
export type Meta = {
  page: number;
  pages: number;
  total: number;
  unread?: number;
  customer_summary?: {
    bills: number;
    sales: string;
    returns: string;
    net: string;
  };
};
export type Envelope<T> = { data: T; meta: Meta };
export type SaleItem = {
  id: number;
  product_id: number;
  name: string;
  barcode?: string;
  quantity: string;
  returned_quantity: string;
  unit_price: string;
  line_total: string;
  unit: string;
};
export type Sale = {
  id: number;
  number: string;
  business_name: string;
  cashier_name: string;
  currency: string;
  customer_name?: string;
  customer_phone?: string;
  payment_method: string;
  status: string;
  subtotal: string;
  discount: string;
  total: string;
  created_at: string;
  items: SaleItem[];
  returns: {
    id: number;
    reason: string;
    amount: string;
    user_name: string;
    refund_method?: string;
    created_at: string;
  }[];
};
export type StoreNotification = {
  id: number;
  kind: string;
  message: string;
  read_at?: string;
  created_at: string;
};
export type Supplier = {
  id: number;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  notes?: string;
  product_count?: number;
  low_stock_count?: number;
};
export type Proposal = {
  id: number;
  kind: "stock_change" | "invite_employee" | "create_sale";
  payload: Record<string, unknown>;
  expires_at: string;
};
