export type Plan = {
  id: number;
  name: string;
  monthly_price_paise: number;
  currency: string;
  member_limit: number;
  product_limit: number | null;
  trial_days: number;
  available: boolean;
  capacity_error?: string | null;
};
export type PlanRequest = {
  id: number;
  subscription_plan_id: number;
  plan_name: string;
  monthly_price_paise: number;
  currency: string;
  status: "pending" | "approved" | "cancelled";
  created_at: string;
  resolved_at?: string;
  activated_until?: string;
};
export type Subscription = {
  status: string;
  billing_status: string;
  trial_ends_at: string;
  subscription_ends_at: string | null;
  days_remaining: number | null;
  current_plan: Plan;
  plans: Plan[];
  usage: { members: number; pending_invitations: number; products: number };
  writable: boolean;
  can_manage: boolean;
  payment_mode: string;
  checkout_available: boolean;
  pending_request: PlanRequest | null;
  requests: PlanRequest[];
};
