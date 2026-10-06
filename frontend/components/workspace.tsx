"use client";

import { useLanguage, TranslatedText } from "@/components/language-provider";

import { LanguageSetting } from "./language-provider";
import { AccountSecurity } from "./account-security";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  Boxes,
  Layers3,
  ShoppingBag,
  House,
  Package,
  Activity,
  ChartNoAxesCombined,
  ScanLine,
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  ArrowRight,
  Bell,
  Settings,
  Sun,
  Moon,
  LogOut,
  ArrowUp,
  ArrowDown,
  Command,
  Download,
  Upload,
  SlidersHorizontal,
  LoaderCircle,
  Check,
  Ellipsis,
  TriangleAlert,
} from "lucide-react";
import { api, ApiError, money, units } from "@/lib/api";
import type { Business, Dashboard, Product, Movement, User } from "@/lib/types";
import { Sheet } from "./ui/sheet";
import { DailySummary } from "./daily-summary";
import { ProductForm, StockForm, ImportForm } from "./workspace-forms";
import { Team } from "./team";
import { SubscriptionNotice } from "./subscription";
const SubscriptionPage = dynamic(() =>
  import("./subscription").then((m) => m.SubscriptionPage),
);
const Scanner = dynamic(() => import("./scanner"), {
  ssr: false,
  loading: () => (
    <p>
      <TranslatedText text="Opening scanner…" />
    </p>
  ),
});
const ProductSetup = dynamic(() =>
  import("./product-setup").then((m) => m.ProductSetup),
);
const Restocking = dynamic(() =>
  import("./restocking").then((m) => m.Restocking),
);
const Checkout = dynamic(() => import("./checkout").then((m) => m.Checkout));
const nav = [
  { label: "Overview", path: "/app", icon: House },
  { label: "Inventory", path: "/app/inventory", icon: Package },
  { label: "Checkout", path: "/app/checkout", icon: ShoppingBag },
  { label: "Activity", path: "/app/activity", icon: Activity },
  { label: "Reports", path: "/app/reports", icon: ChartNoAxesCombined },
];
export function Workspace() {
  const { tr, language } = useLanguage();
  const router = useRouter();
  const client = useQueryClient();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [businessId, setBusinessId] = useState<number>();
  useEffect(() => {
    try {
      const saved = localStorage.getItem("stoqo_business");
      if (saved) setBusinessId(Number(saved));
    } catch {}
  }, []);
  const [modal, setModal] = useState("");
  const [selected, setSelected] = useState<Product>();
  const [barcode, setBarcode] = useState("");
  const [command, setCommand] = useState("");
  const [debouncedCommand, setDebouncedCommand] = useState("");
  const user = useQuery({
    queryKey: ["me"],
    queryFn: () => api<User>("auth/me"),
    retry: false,
  });
  const businesses = useQuery({
    queryKey: ["businesses"],
    queryFn: () => api<Business[]>("businesses"),
    enabled: !!user.data,
  });
  const business =
    businesses.data?.data.find((b) => b.id === businessId) ||
    businesses.data?.data[0];
  const id = business?.id;
  useEffect(() => {
    if (user.error instanceof ApiError && user.error.status === 401)
      router.replace("/login");
  }, [user.error, router]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setModal((v) => (v === "command" ? "" : "command"));
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCommand(command), 250);
    return () => clearTimeout(t);
  }, [command]);
  const search = useQuery({
    queryKey: ["command", id, debouncedCommand],
    queryFn: () =>
      api<Product[]>(
        `products?q=${encodeURIComponent(debouncedCommand)}&per_page=8`,
        {},
        id,
      ),
    enabled: modal === "command" && !!id,
  });
  const notifications = useQuery({
    queryKey: ["notifications", id],
    queryFn: () =>
      api<{ id: number; message: string; read_at?: string }[]>(
        "notifications",
        {},
        id,
      ),
    enabled: !!id,
  });
  const refresh = () => {
    client.invalidateQueries({
      predicate: (q) => !["me", "businesses"].includes(String(q.queryKey[0])),
    });
  };
  const open = (name: string, p?: Product) => {
    setSelected(p);
    setBarcode("");
    setModal(name);
  };
  const close = () => setModal("");
  if (user.isPending || (businesses.isPending && user.data)) return <Loading />;
  if (user.error || businesses.error)
    return (
      <div className="center-page">
        <h1>{tr("Let’s reconnect.")}</h1>
        <p>
          {tr(
            (user.error || businesses.error)?.message ||
              "Something went wrong. Please try again.",
          )}
        </p>
        <button
          className="button primary"
          onClick={() => {
            user.refetch();
            businesses.refetch();
          }}
        >
          {tr("Try again")}
        </button>
        <Link href="/login">{tr("Back to login")}</Link>
      </div>
    );
  if (!business) return <Onboarding onDone={() => businesses.refetch()} />;
  const active =
    nav.find((n) => n.path === pathname)?.label || "Your workspace";
  return (
    <div className="app-shell">
      <aside className="rail">
        <Link href="/app" className="wordmark">
          <span className="brand-mark">
            <Boxes size={25} />
          </span>
          stoqo.
        </Link>
        <button
          type="button"
          className="workspace-picker"
          aria-label={tr("Switch business")}
          aria-haspopup="dialog"
          onClick={() => open("businesses")}
        >
          <span className="workspace-avatar">{business.name[0]}</span>
          <span className="workspace-name">
            <small>{tr("YOUR WORKSPACE")}</small>
            <strong>{business.name}</strong>
          </span>
          <ChevronDown size={15} />
        </button>
        <span className="nav-label">{tr("WORKSPACE")}</span>
        <nav>
          {nav.map((n) => (
            <Link
              key={n.path}
              href={n.path}
              className={pathname === n.path ? "nav-item active" : "nav-item"}
            >
              <n.icon size={19} />
              {tr(n.label)}
              {n.path === pathname && <span className="nav-active-dot" />}
            </Link>
          ))}
        </nav>
        <div className="rail-divider" />
        <button className="nav-item" onClick={() => open("scan")}>
          <ScanLine size={19} />
          {tr("Scan barcode")}
        </button>
        <button className="nav-item" onClick={() => open("add")}>
          <Plus size={19} />
          {tr("Add product")}
        </button>
        <div className="rail-bottom">
          <div className="trial-card">
            <span className="sparkle">✳</span>
            <strong>{tr("A little room to grow.")}</strong>
            <p>{tr("Check your plan, limits and access.")}</p>
            <button
              onClick={() => {
                router.push("/app/subscription");
                close();
              }}
            >
              {tr("Plans & usage")}
              <ArrowUpRight size={15} />
            </button>
          </div>
          <button className="nav-item" onClick={() => open("settings")}>
            <Settings size={18} />
            {tr("Settings")}
          </button>
          <button className="profile" onClick={() => open("settings")}>
            <span className="user-avatar">{user.data?.data.name[0]}</span>
            <div>
              <strong>{user.data?.data.name}</strong>
              <small>{tr(business.role || "Owner")}</small>
            </div>
            <Ellipsis size={18} />
          </button>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumb">
            {tr("Workspace")}
            <span>/</span>
            <strong>{tr(active)}</strong>
          </div>
          <button className="global-search" onClick={() => open("command")}>
            <Search size={17} />
            <span>{tr("Search anything...")}</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className="topbar-actions">
            <button
              aria-label={tr("Toggle theme")}
              className="icon-button"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              <Sun size={19} />
            </button>
            <button
              aria-label={tr("Notifications")}
              className="icon-button notification-button"
              onClick={() => open("notifications")}
            >
              <Bell size={19} />
              {notifications.data?.data.some((n) => !n.read_at) && <i />}
            </button>
            <span className="user-avatar small">{user.data?.data.name[0]}</span>
          </div>
        </header>
        <motion.main
          className="main-content"
          key={pathname + id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {pathname !== "/app/subscription" && (
            <SubscriptionNotice business={business} />
          )}
          {pathname === "/app" ? (
            <Overview
              id={id!}
              business={business}
              user={user.data!.data}
              open={open}
            />
          ) : pathname === "/app/inventory" ? (
            <Inventory id={id!} business={business} open={open} />
          ) : pathname === "/app/subscription" ? (
            <SubscriptionPage key={id} business={business} />
          ) : pathname === "/app/restocking" ? (
            <Restocking business={business} />
          ) : pathname === "/app/product-setup" ? (
            <ProductSetup
              key={id}
              business={business}
              userId={user.data!.data.id}
            />
          ) : pathname === "/app/checkout" ? (
            <Checkout
              key={id}
              business={business}
              userId={user.data!.data.id}
            />
          ) : pathname === "/app/activity" ? (
            <ActivityView id={id!} />
          ) : pathname === "/app/reports" ? (
            <Reports userId={user.data.data.id} id={id!} business={business} />
          ) : (
            <div className="empty">
              <h1>{tr("Page not found")}</h1>
              <Link href="/app">{tr("Back to overview")}</Link>
            </div>
          )}
          <div className="workspace-footer">
            <span>
              <span className="tiny-dot" /> {tr("Your stock, in a good place.")}
            </span>
            <span>{tr("Made for the way you work.")}</span>
          </div>
        </motion.main>
      </div>
      <nav className="mobile-nav">
        <Link
          href="/app"
          aria-current={pathname === "/app" ? "page" : undefined}
        >
          <House />
          <span>{tr("Home")}</span>
        </Link>
        <Link
          href="/app/inventory"
          aria-current={pathname === "/app/inventory" ? "page" : undefined}
        >
          <Package />
          <span>{tr("Inventory")}</span>
        </Link>
        <button className="scan-nav" onClick={() => open("scan")}>
          <ScanLine />
          <span>{tr("Scan")}</span>
        </button>
        <Link
          href="/app/checkout"
          aria-current={pathname === "/app/checkout" ? "page" : undefined}
        >
          <ShoppingBag />
          <span>{tr("Checkout")}</span>
        </Link>
        <button onClick={() => open("more")}>
          <Ellipsis />
          <span>{tr("More")}</span>
        </button>
      </nav>
      <Sheet
        open={!!modal}
        onClose={close}
        title={
          (
            {
              add: tr("A new addition"),
              edit: tr("Edit product"),
              in: tr("Stock in"),
              out: tr("Stock out"),
              detail: selected?.display_name || selected?.name,
              scan: tr("Scan & go"),
              command: tr("Find your next move"),
              import: tr("Bring your inventory"),
              settings: tr("Your workspace"),
              notifications: tr("Your updates"),
              businesses: tr("Switch business"),
              more: tr("A little more"),
            } as Record<string, string | undefined>
          )[modal] || "Stoqo"
        }
      >
        {(modal === "add" || modal === "edit") && (
          <ProductForm
            canViewCosts={["owner", "admin"].includes(business.role || "")}
            businessId={id!}
            product={modal === "edit" ? selected : undefined}
            barcode={barcode}
            onDone={() => {
              close();
              refresh();
            }}
          />
        )}
        {(modal === "in" || modal === "out") && (
          <StockForm
            canViewCosts={["owner", "admin"].includes(business.role || "")}
            businessId={id!}
            product={selected}
            direction={modal}
            onDone={() => {
              close();
              refresh();
            }}
          />
        )}
        {modal === "detail" && selected && (
          <ProductDetail
            product={selected}
            id={id!}
            currency={business.currency}
            open={open}
          />
        )}
        {modal === "scan" && (
          <Scanner
            onResult={async (code) => {
              const result = await api<Product[]>(
                `products?barcode=${encodeURIComponent(code)}`,
                {},
                id,
              );
              if (result.data[0]) {
                setSelected(result.data[0]);
                setModal("detail");
              } else {
                setBarcode(code);
                setSelected(undefined);
                setModal("add");
                toast(tr("New barcode! Let’s add its product."));
              }
            }}
          />
        )}
        {modal === "command" && (
          <div className="command-content">
            <label className="search-field">
              <Search size={19} />
              <input
                autoFocus
                placeholder={tr("Search products, SKU, barcode…")}
                value={command}
                onChange={(e) => setCommand(e.target.value)}
              />
            </label>
            <div className="command-links">
              <button
                onClick={() => {
                  router.push("/app/checkout");
                  close();
                }}
              >
                <ShoppingBag />
                {tr("Checkout")}
              </button>
              <button onClick={() => open("add")}>
                <Plus />
                {tr("Add product")}
              </button>
              <button onClick={() => open("in")}>
                <ArrowDownLeft />
                {tr("Stock in")}
              </button>
              <button onClick={() => open("out")}>
                <ArrowUpRight />
                {tr("Stock out")}
              </button>
              <button
                onClick={() => {
                  router.push("/app/reports");
                  close();
                }}
              >
                <ChartNoAxesCombined />
                {tr("Reports")}
              </button>
            </div>
            {search.isPending ? (
              <Loading />
            ) : search.error ? (
              <ErrorState error={search.error} />
            ) : (
              search.data?.data.map((p) => (
                <button
                  className="command-result"
                  key={p.id}
                  onClick={() => open("detail", p)}
                >
                  <ProductAvatar product={p} />
                  <span>
                    {p.display_name || p.name}
                    <small>{p.sku || p.barcode || "No SKU"}</small>
                  </span>
                  <strong>
                    {units(p.current_stock)} {tr(p.unit)}
                  </strong>
                </button>
              ))
            )}
          </div>
        )}
        {modal === "import" && <ImportForm businessId={id!} onDone={refresh} />}
        {modal === "notifications" && (
          <div className="notification-list">
            {!notifications.data?.data.length ? (
              <Empty
                title={tr("You’re all caught up.")}
                text="Stock alerts and import updates will appear here."
              />
            ) : (
              notifications.data.data.map((n) => (
                <button
                  className={n.read_at ? "read" : ""}
                  key={n.id}
                  onClick={async () => {
                    try {
                      await api(
                        `notifications/${n.id}`,
                        { method: "PATCH" },
                        id,
                      );
                      refresh();
                    } catch (e) {
                      toast.error(tr((e as Error).message));
                    }
                  }}
                >
                  <Bell size={18} />
                  <span>{tr(n.message)}</span>
                  {!n.read_at && <span className="tiny-dot" />}
                </button>
              ))
            )}
          </div>
        )}
        {modal === "businesses" && (
          <div className="more-menu">
            {businesses.data?.data.map((b) => (
              <button
                key={b.id}
                aria-pressed={b.id === id}
                onClick={() => {
                  setBusinessId(b.id);
                  try {
                    localStorage.setItem("stoqo_business", String(b.id));
                  } catch {}
                  close();
                  setSelected(undefined);
                  setBarcode("");
                  setCommand("");
                  void client.cancelQueries({
                    predicate: (q) =>
                      !["me", "businesses"].includes(String(q.queryKey[0])),
                  });
                  client.removeQueries({
                    predicate: (q) =>
                      !["me", "businesses"].includes(String(q.queryKey[0])),
                  });
                }}
              >
                <span>{b.name}</span>
                {b.id === id && <span>{tr("Selected")}</span>}
              </button>
            ))}
          </div>
        )}
        {modal === "settings" && (
          <SettingsView
            business={business}
            onSaved={() => businesses.refetch()}
            onNavigate={close}
            onLogout={async () => {
              await api("auth/logout", { method: "DELETE" });
              client.clear();
              router.push("/login");
            }}
          />
        )}
        {modal === "more" && (
          <div className="more-menu">
            <button onClick={() => open("businesses")}>
              <ChevronDown />
              {tr("Switch business")}
            </button>
            {["owner", "admin", "manager"].includes(business.role || "") && (
              <button
                onClick={() => {
                  router.push("/app/restocking");
                  close();
                }}
              >
                {tr("Suppliers & restocking")}
              </button>
            )}
            <button
              onClick={() => {
                router.push("/app/reports");
                close();
              }}
            >
              <ChartNoAxesCombined />
              {tr("Reports")}
            </button>
            <button onClick={() => open("settings")}>
              <Settings />
              {tr("Settings & plan")}
            </button>
            {["owner", "admin"].includes(business.role || "") && (
              <button onClick={() => open("import")}>
                <Upload />
                {tr("Import inventory")}
              </button>
            )}
            <button
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              <Moon />
              {tr("Switch theme")}
            </button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
function Overview({
  id,
  business,
  user,
  open,
}: {
  id: number;
  business: Business;
  user: User;
  open: (m: string, p?: Product) => void;
}) {
  const { tr, language } = useLanguage();
  const query = useQuery({
    queryKey: ["dashboard", id],
    queryFn: () => api<Dashboard>("dashboard", {}, id),
  });
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorState error={query.error} />;
  const d = query.data.data;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{tr("LET’S MAKE TODAY A GOOD ONE")}</span>
          <h1>
            {tr("Hey,")} {user.name.split(" ")[0]}{" "}
            <span className="greeting-wave">✳</span>
          </h1>
          <p>{tr("Here’s what’s happening on your shelves.")}</p>
        </div>
        <button className="button dark-button" onClick={() => open("add")}>
          <Plus size={18} />
          {tr("Add product")}
        </button>
      </div>
      <div className="stats-grid">
        <article className="stat-card featured">
          <div>
            <span>
              {tr(
                d.inventory_value !== undefined
                  ? "Inventory value"
                  : "Estimated retail value",
              )}
            </span>
            <span className="stat-icon">
              <Boxes size={19} />
            </span>
          </div>
          <strong>
            {money(d.inventory_value ?? d.retail_value, business.currency)}
          </strong>
          <small>
            {tr(
              d.inventory_value !== undefined
                ? "At purchase cost"
                : "At current selling prices",
            )}
            <ArrowUpRight size={15} />
          </small>
          <div className="stat-orbit" />
        </article>
        <Stat
          label={tr("Total products")}
          value={d.products}
          icon={<Package size={18} />}
          foot={tr("{count} units on your shelves", {
            count: units(d.total_units),
          })}
        />
        <Stat
          label={tr("Running low")}
          value={d.low_stock}
          icon={<TriangleAlert size={18} />}
          foot="A little restock goes a long way"
          tone="amber"
        />
        <Stat
          label={tr("Out of stock")}
          value={d.out_of_stock}
          icon={<Boxes size={18} />}
          foot="Ready for a fresh batch"
          tone="red"
        />
      </div>
      <div className="quick-actions">
        <span>{tr("QUICK MOVES")}</span>
        <button onClick={() => open("in")}>
          <span className="action-icon green">
            <ArrowDownLeft size={20} />
          </span>
          <div>
            <strong>{tr("Stock in")}</strong>
            <small>{tr("Make room for more")}</small>
          </div>
          <ArrowUpRight size={17} />
        </button>
        <button onClick={() => open("out")}>
          <span className="action-icon orange">
            <ArrowUpRight size={20} />
          </span>
          <div>
            <strong>{tr("Stock out")}</strong>
            <small>{tr("Keep things moving")}</small>
          </div>
          <ArrowUpRight size={17} />
        </button>
        <button onClick={() => open("scan")}>
          <span className="action-icon violet">
            <ScanLine size={20} />
          </span>
          <div>
            <strong>{tr("Scan barcode")}</strong>
            <small>{tr("Point. Scan. Sorted.")}</small>
          </div>
          <ArrowUpRight size={17} />
        </button>
      </div>
      <div className="dashboard-columns">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>
                {tr("Needs a little love")}{" "}
                <span className="count-badge">
                  {d.low_stock + d.out_of_stock}
                </span>
              </h2>
              <p>{tr("Keep your best things in stock.")}</p>
            </div>
            <Link href="/app/inventory?filter=low" className="text-link">
              {tr("View all")}
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="mini-table-head">
            <span>{tr("PRODUCT")}</span>
            <span>{tr("ON HAND")}</span>
            <span />
          </div>
          {d.low_products.length ? (
            d.low_products.map((p) => (
              <div className="low-product" key={p.id}>
                <button
                  className="product-name"
                  onClick={() => open("detail", p)}
                >
                  <ProductAvatar product={p} />
                  <span>
                    <strong>{p.display_name || p.name}</strong>
                    <small>{p.category_name || p.unit}</small>
                  </span>
                </button>
                <div>
                  <strong
                    className={
                      p.stock_status === "out" ? "red-text" : "amber-text"
                    }
                  >
                    {units(p.current_stock)} <small>{tr(p.unit)}</small>
                  </strong>
                  <div className="stock-meter">
                    <i
                      style={{
                        width: `${Math.min(100, (Number(p.current_stock) / Math.max(1, Number(p.low_stock_threshold))) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <button className="restock" onClick={() => open("in", p)}>
                  <Plus size={15} />
                  <span>{tr("Restock")}</span>
                </button>
              </div>
            ))
          ) : (
            <Empty
              title={tr("Everything looks stocked ✨")}
              text="No products are running low."
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{tr("Latest moves")}</h2>
              <p>{tr("Every little change, remembered.")}</p>
            </div>
            <Link
              href="/app/activity"
              className="icon-button"
              aria-label={tr("View all activity")}
            >
              <ArrowUpRight size={19} />
            </Link>
          </div>
          {d.recent_movements.length ? (
            <div className="movement-list">
              {d.recent_movements.map((m) => (
                <MovementRow key={m.id} movement={m} />
              ))}
            </div>
          ) : (
            <Empty
              title={tr("Your story starts here.")}
              text="Add your first product to get things moving."
            />
          )}
        </section>
      </div>
      <section className="today-strip">
        <span className="action-icon green">
          <Activity size={22} />
        </span>
        <div>
          <strong>{tr("A little momentum.")}</strong>
          <p>{tr("Your stock movements today.")}</p>
        </div>
        <div className="today-value">
          <span>
            <ArrowDownLeft size={15} /> {tr("STOCK IN")}
          </span>
          <strong>
            +{units(d.stock_in_today)} <small>{tr("units")}</small>
          </strong>
        </div>
        <div className="today-value">
          <span>
            <ArrowUpRight size={15} /> {tr("STOCK OUT")}
          </span>
          <strong>
            −{units(d.stock_out_today)} <small>{tr("units")}</small>
          </strong>
        </div>
        <Link href="/app/reports" className="text-link">
          {tr("Take a closer look")}
          <ArrowRight size={17} />
        </Link>
      </section>
    </>
  );
}
function Inventory({
  id,
  business,
  open,
}: {
  id: number;
  business: Business;
  open: (m: string, p?: Product) => void;
}) {
  const { tr, language } = useLanguage();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("filter");
    if (value) setFilter(value);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);
  const cats = useQuery({
    queryKey: ["categories", id],
    queryFn: () => api<{ id: number; name: string }[]>("categories", {}, id),
  });
  const query = useQuery({
    queryKey: ["products", id, debounced, filter, category, sort, page],
    queryFn: () =>
      api<Product[]>(
        `products?${new URLSearchParams({ q: debounced, filter, category_id: category, sort, page: String(page) })}`,
        {},
        id,
      ),
  });
  async function download() {
    try {
      const r = await fetch("/api/backend/products/export", {
        headers: { "X-Business-Id": String(id) },
      });
      if (!r.ok) throw new Error(tr("Could not export inventory"));
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "stoqo-inventory.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(tr((e as Error).message));
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{tr("EVERYTHING IN ITS PLACE")}</span>
          <h1>
            {tr("Your inventory")}
            <span className="accent-period">.</span>
          </h1>
          <p>{tr("A home for every product, big or small.")}</p>
        </div>
        <div className="heading-actions">
          {["owner", "admin", "manager"].includes(business.role || "") && (
            <Link className="button subtle" href="/app/restocking">
              {tr("Suppliers & restocking")}
            </Link>
          )}
          <Link className="button subtle" href="/app/product-setup">
            <Layers3 size={17} />
            {tr("Sizes & labels")}
          </Link>
          {["owner", "admin"].includes(business.role || "") && (
            <button className="button subtle" onClick={() => open("import")}>
              <Upload size={17} />
              {tr("Import")}
            </button>
          )}
          <button className="button dark-button" onClick={() => open("add")}>
            <Plus size={18} />
            {tr("Add product")}
          </button>
        </div>
      </div>
      <div className="inventory-toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            placeholder={tr("Search name, SKU or barcode")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label={tr("Category filter")}
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{tr("All categories")}</option>
          {cats.data?.data.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label={tr("Sort products")}
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
        >
          <option value="name">{tr("Name A–Z")}</option>
          <option value="stock">{tr("Lowest stock")}</option>
          <option value="newest">{tr("Newest first")}</option>
          <option value="price">{tr("Highest price")}</option>
        </select>
        <button
          className="icon-button"
          onClick={download}
          aria-label={tr("Export CSV")}
        >
          <Download size={20} />
        </button>
      </div>
      <div className="filter-tabs">
        {[
          ["", "All products"],
          ["low", "Running low"],
          ["out", "Out of stock"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={filter === value ? "selected" : ""}
            onClick={() => {
              setFilter(value);
              setPage(1);
            }}
          >
            {tr(label)}
          </button>
        ))}
        <span>
          {query.data?.meta.total || 0} {tr("products")}
        </span>
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : query.data.data.length ? (
        <>
          <div className="product-table">
            <div className="product-table-header">
              <span>{tr("PRODUCT")}</span>
              <span>{tr("ON HAND")}</span>
              <span>{tr("SELLING PRICE")}</span>
              <span>{tr("STATUS")}</span>
              <span />
            </div>
            {query.data.data.map((p) => (
              <div className="product-table-row" key={p.id}>
                <button
                  className="product-name"
                  onClick={() => open("detail", p)}
                >
                  <ProductAvatar product={p} />
                  <span>
                    <strong>{p.display_name || p.name}</strong>
                    <small>{p.sku || p.category_name || "No SKU"}</small>
                  </span>
                </button>
                <span className="on-hand">
                  <strong>{units(p.current_stock)}</strong>{" "}
                  <small>{tr(p.unit)}</small>
                </span>
                <span className="product-price">
                  {money(p.selling_price, business.currency)}
                </span>
                <span className={`status ${p.stock_status}`}>
                  {p.stock_status === "healthy"
                    ? tr("Healthy stock")
                    : p.stock_status === "low"
                      ? tr("Running low")
                      : tr("Out of stock")}
                </span>
                <button
                  className="icon-button"
                  aria-label={tr("View {name}", {
                    name: p.display_name || p.name,
                  })}
                  onClick={() => open("detail", p)}
                >
                  <ArrowUpRight size={19} />
                </button>
              </div>
            ))}
          </div>
          <Pagination
            page={page}
            pages={query.data.meta.pages}
            setPage={setPage}
          />
        </>
      ) : (
        <Empty
          title={
            search || filter || category
              ? tr("No matches this time.")
              : tr("Your shelves are looking empty 👀")
          }
          text={
            search || filter || category
              ? tr("Try another search or clear your filters.")
              : tr("Add your first product and start tracking inventory.")
          }
          action={() => open("add")}
          actionLabel="Add product"
        />
      )}
    </>
  );
}
function ProductDetail({
  product,
  id,
  currency,
  open,
}: {
  product: Product;
  id: number;
  currency: string;
  open: (m: string, p?: Product) => void;
}) {
  const { tr, language } = useLanguage();
  const [page, setPage] = useState(1);
  const history = useQuery({
    queryKey: ["history", id, product.id, page],
    queryFn: () =>
      api<Movement[]>(
        `stock_movements?product_id=${product.id}&page=${page}`,
        {},
        id,
      ),
  });
  return (
    <div className="product-detail">
      <div className="detail-hero">
        <ProductAvatar product={product} />
        <span className={`status ${product.stock_status}`}>
          {product.stock_status === "healthy"
            ? tr("Healthy stock")
            : product.stock_status === "low"
              ? tr("Running low")
              : tr("Out of stock")}
        </span>
      </div>
      <span className="eyebrow">{tr("CURRENT STOCK")}</span>
      <div className="detail-stock">
        {units(product.current_stock)} <small>{tr(product.unit)}</small>
      </div>
      <div className="detail-actions">
        <button className="button primary" onClick={() => open("in", product)}>
          <Plus size={18} />
          {tr("Stock in")}
        </button>
        <button className="button subtle" onClick={() => open("out", product)}>
          <ArrowUpRight size={18} />
          {tr("Sold / stock out")}
        </button>
        <button
          className="icon-button"
          aria-label={tr("Edit product")}
          onClick={() => open("edit", product)}
        >
          <Settings size={18} />
        </button>
      </div>
      <dl className="detail-grid">
        {[
          ["Selling price", money(product.selling_price, currency)],
          ...(product.purchase_price !== undefined
            ? [["Purchase price", money(product.purchase_price, currency)]]
            : []),
          ["SKU", product.sku || "—"],
          ["Size", product.size || "—"],
          ["Colour", product.color || "—"],
          ["Barcode", product.barcode || "—"],
          ["Category", product.category_name || "Uncategorized"],
          [
            "Low stock alert",
            `${units(product.low_stock_threshold)} ${tr(product.unit)}`,
          ],
        ].map(([k, v]) => (
          <div key={k}>
            <dt>{tr(k)}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {product.description && <p>{product.description}</p>}
      <h2>{tr("Stock history")}</h2>
      {history.isPending ? (
        <Loading />
      ) : history.error ? (
        <ErrorState error={history.error} />
      ) : history.data.data.length ? (
        history.data.data.map((m) => <MovementRow key={m.id} movement={m} />)
      ) : (
        <p className="muted">{tr("No stock changes yet.")}</p>
      )}
      <Pagination
        page={page}
        pages={history.data?.meta.pages || 0}
        setPage={setPage}
      />
    </div>
  );
}
function ActivityView({ id }: { id: number }) {
  const { tr, language } = useLanguage();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["activities", id, page],
    queryFn: () =>
      api<
        {
          id: number;
          action: string;
          subject_name: string;
          user_name: string;
          created_at: string;
          details: { quantity?: string };
        }[]
      >(`activities?page=${page}`, {}, id),
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{tr("NOTHING SLIPS THROUGH")}</span>
          <h1>
            {tr("The little details")}
            <span className="accent-period">.</span>
          </h1>
          <p>{tr("A clear trail of what changed, when, and who.")}</p>
        </div>
      </div>
      <section className="panel activity-panel">
        {query.isPending ? (
          <Loading />
        ) : query.error ? (
          <ErrorState error={query.error} />
        ) : query.data.data.length ? (
          query.data.data.map((a) => (
            <div className="activity-row" key={a.id}>
              <span className="action-icon green">
                <Activity size={19} />
              </span>
              <div>
                <strong>{a.subject_name}</strong>
                <p>
                  {a.user_name} ·{" "}
                  {tr(a.action) === a.action
                    ? a.action.replaceAll("_", " ")
                    : tr(a.action)}
                </p>
                <small>
                  {new Date(a.created_at).toLocaleString(
                    language === "hi" ? "hi-IN" : "en-IN",
                  )}
                </small>
              </div>
              {a.details.quantity && (
                <strong
                  className={Number(a.details.quantity) > 0 ? "green-text" : ""}
                >
                  {Number(a.details.quantity) > 0 ? "+" : ""}
                  {units(a.details.quantity)}
                </strong>
              )}
            </div>
          ))
        ) : (
          <Empty
            title={tr("A fresh page.")}
            text="Your team’s product and stock updates will appear here."
          />
        )}
        <Pagination
          page={page}
          pages={query.data?.meta.pages || 0}
          setPage={setPage}
        />
      </section>
    </>
  );
}
function Reports({
  id,
  business,
  userId,
}: {
  id: number;
  business: Business;
  userId: number;
}) {
  const { tr, language } = useLanguage();
  const [days, setDays] = useState("7");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - Number(days) + 1);
  const date = (d: Date) =>
    d.toLocaleDateString("en-CA", { timeZone: business.timezone });
  const query = useQuery({
    queryKey: ["reports", id, days, from, to],
    queryFn: () =>
      api<{
        total_products: number;
        total_units: string;
        inventory_value?: string;
        retail_value: string;
        stock_in: string;
        stock_out: string;
        adjustments: string;
        low_stock: number;
        out_of_stock: number;
        most_active: { name: string; quantity: string }[];
      }>(
        `reports?${new URLSearchParams({ from: from || date(start), to: to || date(end) })}`,
        {},
        id,
      ),
  });
  const d = query.data?.data;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{tr("A CLEARER PICTURE")}</span>
          <h1>
            {tr("Know your numbers")}
            <span className="accent-period">.</span>
          </h1>
          <p>{tr("Useful insights. Without the spreadsheet headache.")}</p>
        </div>
        <select
          aria-label={tr("Report period")}
          value={days}
          onChange={(e) => {
            setDays(e.target.value);
            setFrom("");
            setTo("");
          }}
        >
          <option value="1">{tr("Today")}</option>
          <option value="7">{tr("Last 7 days")}</option>
          <option value="30">{tr("Last 30 days")}</option>
        </select>
      </div>
      {["owner", "admin"].includes(business.role || "") && (
        <DailySummary business={business} userId={userId} />
      )}
      <div className="date-filters">
        <label>
          {tr("From")}
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          {tr("To")}
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : (
        d && (
          <>
            <div className="stats-grid">
              {d.inventory_value !== undefined && (
                <Stat
                  label={tr("Inventory cost value")}
                  value={money(
                    d.inventory_value ?? d.retail_value,
                    business.currency,
                  )}
                  foot="Current purchase cost"
                />
              )}
              <Stat
                label={tr("Estimated retail value")}
                value={money(d.retail_value, business.currency)}
                foot="At current selling prices"
              />
              <Stat
                label={tr("Total products")}
                value={d.total_products}
                foot="Active products"
              />
              <Stat
                label={tr("Units on hand")}
                value={units(d.total_units)}
                foot="Current inventory"
              />
            </div>
            <div className="dashboard-columns">
              <section className="panel report-panel">
                <h2>{tr("Stock movements")}</h2>
                {[
                  ["Stock in", d.stock_in, "green"],
                  ["Stock out", d.stock_out, "orange"],
                  ["Adjustments (net)", d.adjustments, "violet"],
                ].map(([label, v, c]) => (
                  <div className="report-line" key={tr(label)}>
                    <span className={`action-icon ${c}`}>
                      {label === "Stock in" ? <ArrowDown /> : <ArrowUp />}
                    </span>
                    <span>{tr(label)}</span>
                    <strong>{units(v)}</strong>
                  </div>
                ))}
              </section>
              <section className="panel report-panel">
                <h2>{tr("Most active products")}</h2>
                <p className="muted">
                  {tr("Ranked by total units moved in either direction.")}
                </p>
                {d.most_active.length ? (
                  d.most_active.map((p, i) => (
                    <div className="rank-row" key={p.name + i}>
                      <span>0{i + 1}</span>
                      <strong>{p.name}</strong>
                      <span>
                        {units(p.quantity)} {tr("units")}
                      </span>
                    </div>
                  ))
                ) : (
                  <Empty
                    title={tr("No movements in this period.")}
                    text="Try a wider date range."
                  />
                )}
              </section>
            </div>
            <div className="report-alerts">
              <Link href="/app/inventory?filter=low">
                <TriangleAlert />
                {d.low_stock} {tr("products running low")}
                <ArrowUpRight />
              </Link>
              <Link href="/app/inventory?filter=out">
                <Boxes />
                {d.out_of_stock} {tr("products out of stock")}
                <ArrowUpRight />
              </Link>
            </div>
          </>
        )
      )}
    </>
  );
}
function SettingsView({
  business,
  onNavigate,
  onSaved,
  onLogout,
}: {
  business: Business;
  onSaved: () => void;
  onNavigate: () => void;
  onLogout: () => Promise<void>;
}) {
  const { tr, language } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(business.name);
  const [busy, setBusy] = useState(false);

  return (
    <div className="settings">
      {["owner", "admin"].includes(business.role || "") ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api(
                `businesses/${business.id}`,
                {
                  method: "PATCH",
                  body: JSON.stringify({ business: { name } }),
                },
                business.id,
              );
              onSaved();
              toast.success(tr("Workspace updated"));
            } catch (e) {
              toast.error(tr((e as Error).message));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            {tr("Business name")}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
            />
          </label>
          <button className="button primary" disabled={busy}>
            {tr("Save changes")}
          </button>
        </form>
      ) : (
        <p className="muted">
          {tr("Workspace:")} {business.name}{" "}
          {tr(". Ask an owner or admin to edit business details.")}
        </p>
      )}
      <label>
        {tr("Appearance")}
        <select value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="system">{tr("Follow your device")}</option>
          <option value="light">{tr("Light")}</option>
          <option value="dark">{tr("Dark")}</option>
        </select>
      </label>
      <LanguageSetting />
      {["owner", "admin"].includes(business.role || "") && (
        <Team businessId={business.id} />
      )}
      <AccountSecurity />
      <Link
        className="button subtle full"
        href="/app/subscription"
        onClick={onNavigate}
      >
        {tr("Plans & usage")}
      </Link>
      <button
        className="button subtle full"
        onClick={() => onLogout().catch((e) => toast.error(e.message))}
      >
        <LogOut size={18} />
        {tr("Log out")}
      </button>
    </div>
  );
}
function Onboarding({ onDone }: { onDone: () => void }) {
  const { tr, language } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <main className="auth-page">
      <span className="wordmark">stoqo.</span>
      <div className="auth-card">
        <span className="eyebrow">{tr("ONE SMALL STEP")}</span>
        <h1>
          {tr("Make yourself")}
          <br />
          {tr("at home.")}
        </h1>
        <p className="muted">{tr("What should we call your business?")}</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setBusy(true);
            try {
              await api("businesses", {
                method: "POST",
                body: JSON.stringify({
                  business: {
                    name: fd.get("name"),
                    business_type: fd.get("type"),
                  },
                }),
              });
              onDone();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            {tr("Business name")}
            <input
              name="name"
              placeholder={tr("e.g. The Everyday Store")}
              required
              maxLength={120}
              autoFocus
            />
          </label>
          <label>
            {tr("What do you sell?")}
            <select name="type">
              {[
                "Retail",
                "Clothing",
                "Grocery",
                "Cosmetics",
                "Electronics",
                "Online Seller",
                "Other",
              ].map((t) => (
                <option key={t} value={t.toLowerCase().replaceAll(" ", "_")}>
                  {tr(t)}
                </option>
              ))}
            </select>
          </label>
          {error && (
            <p className="error-box" role="alert">
              {tr(error)}
            </p>
          )}
          <button className="button primary full" disabled={busy}>
            {busy ? tr("Making room…") : tr("Create your workspace")}
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </main>
  );
}
export function Loading() {
  const { tr, language } = useLanguage();
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" />
      <span>{tr("Getting things ready…")}</span>
    </div>
  );
}
export function ErrorState({ error }: { error: Error }) {
  const { tr, language } = useLanguage();
  return (
    <div className="error-box" role="alert">
      {tr(error.message)}
    </div>
  );
}
function Empty({
  title,
  text,
  action,
  actionLabel,
}: {
  title: string;
  text: string;
  action?: () => void;
  actionLabel?: string;
}) {
  const { tr, language } = useLanguage();
  return (
    <div className="empty">
      <span className="empty-icon">
        <Package size={25} />
      </span>
      <h3>{tr(title)}</h3>
      <p>{text}</p>
      {action && (
        <button className="button primary" onClick={action}>
          <Plus size={17} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
function Stat({
  label,
  value,
  foot,
  icon,
  tone = "",
}: {
  label: string;
  value: string | number;
  foot: string;
  icon?: React.ReactNode;
  tone?: string;
}) {
  const { tr, language } = useLanguage();
  return (
    <article className={`stat-card ${tone}`}>
      <div>
        <span>{tr(label)}</span>
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      <strong>{value}</strong>
      <small>{tr(foot)}</small>
    </article>
  );
}
export function ProductAvatar({ product }: { product: Product }) {
  if (product.image_url)
    return (
      <span className="product-avatar">
        <Image
          src={product.image_url}
          width={80}
          height={80}
          alt=""
          unoptimized
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: 9,
          }}
        />
      </span>
    );
  return (
    <span className={`product-avatar color-${product.id % 4}`}>
      {product.name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()}
    </span>
  );
}
function MovementRow({ movement: m }: { movement: Movement }) {
  const { tr, language } = useLanguage();
  const positive = Number(m.quantity) > 0;
  return (
    <div className="movement-row">
      <span className={`movement-icon ${positive ? "green" : "orange"}`}>
        {positive ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
      </span>
      <div>
        <strong>{m.product_name}</strong>
        <small>
          {tr(m.movement_type) === m.movement_type
            ? m.movement_type.replaceAll("_", " ")
            : tr(m.movement_type)}{" "}
          · {m.user_name}
        </small>
        {m.note && <small>{m.note}</small>}
      </div>
      <div>
        <strong className={positive ? "green-text" : ""}>
          {positive ? "+" : ""}
          {units(m.quantity)}
        </strong>
        <small>
          {new Date(m.occurred_at).toLocaleDateString(
            language === "hi" ? "hi-IN" : "en-IN",
            {
              day: "numeric",
              month: "short",
            },
          )}
        </small>
      </div>
    </div>
  );
}
function Pagination({
  page,
  pages,
  setPage,
}: {
  page: number;
  pages: number;
  setPage: (n: number) => void;
}) {
  const { tr, language } = useLanguage();
  if (pages <= 1) return null;
  return (
    <div className="pagination">
      <button
        className="button subtle"
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
      >
        {tr("Previous")}
      </button>
      <span>
        {page} {tr("of")} {pages}
      </span>
      <button
        className="button subtle"
        disabled={page >= pages}
        onClick={() => setPage(page + 1)}
      >
        {tr("Next")}
      </button>
    </div>
  );
}
