"use client";
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
import { ProductForm, StockForm, ImportForm } from "./workspace-forms";
const Scanner = dynamic(() => import("./scanner"), {
  ssr: false,
  loading: () => <p>Opening scanner…</p>,
});
const nav = [
  { label: "Overview", path: "/app", icon: House },
  { label: "Inventory", path: "/app/inventory", icon: Package },
  { label: "Activity", path: "/app/activity", icon: Activity },
  { label: "Reports", path: "/app/reports", icon: ChartNoAxesCombined },
];
export function Workspace() {
  const router = useRouter();
  const client = useQueryClient();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [businessId, setBusinessId] = useState<number>();
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
        <h1>Let’s reconnect.</h1>
        <p>{(user.error || businesses.error)?.message}</p>
        <button
          className="button primary"
          onClick={() => {
            user.refetch();
            businesses.refetch();
          }}
        >
          Try again
        </button>
        <Link href="/login">Back to login</Link>
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
        <div className="workspace-picker">
          <span className="workspace-avatar">{business.name[0]}</span>
          <div>
            <small>YOUR WORKSPACE</small>
            <select
              aria-label="Switch business"
              value={id}
              onChange={(e) => {
                setBusinessId(Number(e.target.value));
                close();
                client.removeQueries({
                  predicate: (q) =>
                    !["me", "businesses"].includes(String(q.queryKey[0])),
                });
              }}
            >
              {businesses.data?.data.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <ChevronDown size={15} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {nav.map((n) => (
            <Link
              key={n.path}
              href={n.path}
              className={pathname === n.path ? "nav-item active" : "nav-item"}
            >
              <n.icon size={19} />
              {n.label}
              {n.path === pathname && <span className="nav-active-dot" />}
            </Link>
          ))}
        </nav>
        <div className="rail-divider" />
        <button className="nav-item" onClick={() => open("scan")}>
          <ScanLine size={19} />
          Scan barcode
        </button>
        <button className="nav-item" onClick={() => open("add")}>
          <Plus size={19} />
          Add product
        </button>
        <div className="rail-bottom">
          <div className="trial-card">
            <span className="sparkle">✳</span>
            <strong>A little room to grow.</strong>
            <p>
              Your trial ends{" "}
              {new Date(business.trial_ends_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
              .
            </p>
            <button onClick={() => open("settings")}>
              Your plan <ArrowUpRight size={15} />
            </button>
          </div>
          <button className="nav-item" onClick={() => open("settings")}>
            <Settings size={18} />
            Settings
          </button>
          <button className="profile" onClick={() => open("settings")}>
            <span className="user-avatar">{user.data?.data.name[0]}</span>
            <div>
              <strong>{user.data?.data.name}</strong>
              <small>{business.role || "Owner"}</small>
            </div>
            <Ellipsis size={18} />
          </button>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>
            <strong>{active}</strong>
          </div>
          <button className="global-search" onClick={() => open("command")}>
            <Search size={17} />
            <span>Search anything...</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className="topbar-actions">
            <button
              aria-label="Toggle theme"
              className="icon-button"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              <Sun size={19} />
            </button>
            <button
              aria-label="Notifications"
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
          {pathname === "/app" ? (
            <Overview
              id={id!}
              business={business}
              user={user.data!.data}
              open={open}
            />
          ) : pathname === "/app/inventory" ? (
            <Inventory id={id!} business={business} open={open} />
          ) : pathname === "/app/activity" ? (
            <ActivityView id={id!} />
          ) : pathname === "/app/reports" ? (
            <Reports id={id!} business={business} />
          ) : (
            <div className="empty">
              <h1>Page not found</h1>
              <Link href="/app">Back to overview</Link>
            </div>
          )}
          <div className="workspace-footer">
            <span>
              <span className="tiny-dot" /> Your stock, in a good place.
            </span>
            <span>Made for the way you work.</span>
          </div>
        </motion.main>
      </div>
      <nav className="mobile-nav">
        <Link
          href="/app"
          aria-current={pathname === "/app" ? "page" : undefined}
        >
          <House />
          <span>Home</span>
        </Link>
        <Link
          href="/app/inventory"
          aria-current={pathname === "/app/inventory" ? "page" : undefined}
        >
          <Package />
          <span>Inventory</span>
        </Link>
        <button className="scan-nav" onClick={() => open("scan")}>
          <ScanLine />
          <span>Scan</span>
        </button>
        <Link
          href="/app/activity"
          aria-current={pathname === "/app/activity" ? "page" : undefined}
        >
          <Activity />
          <span>Activity</span>
        </Link>
        <button onClick={() => open("more")}>
          <Ellipsis />
          <span>More</span>
        </button>
      </nav>
      <Sheet
        open={!!modal}
        onClose={close}
        title={
          (
            {
              add: "A new addition",
              edit: "Edit product",
              in: "Stock in",
              out: "Stock out",
              detail: selected?.name,
              scan: "Scan & go",
              command: "Find your next move",
              import: "Bring your inventory",
              settings: "Your workspace",
              notifications: "Your updates",
              more: "A little more",
            } as Record<string, string | undefined>
          )[modal] || "Stoqo"
        }
      >
        {(modal === "add" || modal === "edit") && (
          <ProductForm
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
                toast("New barcode! Let’s add its product.");
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
                placeholder="Search products, SKU, barcode…"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
              />
            </label>
            <div className="command-links">
              <button onClick={() => open("add")}>
                <Plus />
                Add product
              </button>
              <button onClick={() => open("in")}>
                <ArrowDownLeft />
                Stock in
              </button>
              <button onClick={() => open("out")}>
                <ArrowUpRight />
                Stock out
              </button>
              <button
                onClick={() => {
                  router.push("/app/reports");
                  close();
                }}
              >
                <ChartNoAxesCombined />
                Reports
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
                    {p.name}
                    <small>{p.sku || p.barcode || "No SKU"}</small>
                  </span>
                  <strong>
                    {units(p.current_stock)} {p.unit}
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
                title="You’re all caught up."
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
                      toast.error((e as Error).message);
                    }
                  }}
                >
                  <Bell size={18} />
                  <span>{n.message}</span>
                  {!n.read_at && <span className="tiny-dot" />}
                </button>
              ))
            )}
          </div>
        )}
        {modal === "settings" && (
          <SettingsView
            business={business}
            onSaved={() => businesses.refetch()}
            onLogout={async () => {
              await api("auth/logout", { method: "DELETE" });
              client.clear();
              router.push("/login");
            }}
          />
        )}
        {modal === "more" && (
          <div className="more-menu">
            <button
              onClick={() => {
                router.push("/app/reports");
                close();
              }}
            >
              <ChartNoAxesCombined />
              Reports
            </button>
            <button onClick={() => open("settings")}>
              <Settings />
              Settings & plan
            </button>
            <button onClick={() => open("import")}>
              <Upload />
              Import inventory
            </button>
            <button
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              <Moon />
              Switch theme
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
          <span className="eyebrow">LET’S MAKE TODAY A GOOD ONE</span>
          <h1>
            Hey, {user.name.split(" ")[0]}{" "}
            <span className="greeting-wave">✳</span>
          </h1>
          <p>Here’s what’s happening on your shelves.</p>
        </div>
        <button className="button dark-button" onClick={() => open("add")}>
          <Plus size={18} />
          Add product
        </button>
      </div>
      <div className="stats-grid">
        <article className="stat-card featured">
          <div>
            <span>Inventory value</span>
            <span className="stat-icon">
              <Boxes size={19} />
            </span>
          </div>
          <strong>{money(d.inventory_value, business.currency)}</strong>
          <small>
            At purchase cost <ArrowUpRight size={15} />
          </small>
          <div className="stat-orbit" />
        </article>
        <Stat
          label="Total products"
          value={d.products}
          icon={<Package size={18} />}
          foot={`${units(d.total_units)} units on your shelves`}
        />
        <Stat
          label="Running low"
          value={d.low_stock}
          icon={<TriangleAlert size={18} />}
          foot="A little restock goes a long way"
          tone="amber"
        />
        <Stat
          label="Out of stock"
          value={d.out_of_stock}
          icon={<Boxes size={18} />}
          foot="Ready for a fresh batch"
          tone="red"
        />
      </div>
      <div className="quick-actions">
        <span>QUICK MOVES</span>
        <button onClick={() => open("in")}>
          <span className="action-icon green">
            <ArrowDownLeft size={20} />
          </span>
          <div>
            <strong>Stock in</strong>
            <small>Make room for more</small>
          </div>
          <ArrowUpRight size={17} />
        </button>
        <button onClick={() => open("out")}>
          <span className="action-icon orange">
            <ArrowUpRight size={20} />
          </span>
          <div>
            <strong>Stock out</strong>
            <small>Keep things moving</small>
          </div>
          <ArrowUpRight size={17} />
        </button>
        <button onClick={() => open("scan")}>
          <span className="action-icon violet">
            <ScanLine size={20} />
          </span>
          <div>
            <strong>Scan barcode</strong>
            <small>Point. Scan. Sorted.</small>
          </div>
          <ArrowUpRight size={17} />
        </button>
      </div>
      <div className="dashboard-columns">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>
                Needs a little love{" "}
                <span className="count-badge">
                  {d.low_stock + d.out_of_stock}
                </span>
              </h2>
              <p>Keep your best things in stock.</p>
            </div>
            <Link href="/app/inventory?filter=low" className="text-link">
              View all <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="mini-table-head">
            <span>PRODUCT</span>
            <span>ON HAND</span>
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
                    <strong>{p.name}</strong>
                    <small>{p.category_name || p.unit}</small>
                  </span>
                </button>
                <div>
                  <strong
                    className={
                      p.stock_status === "out" ? "red-text" : "amber-text"
                    }
                  >
                    {units(p.current_stock)} <small>{p.unit}</small>
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
                  <span>Restock</span>
                </button>
              </div>
            ))
          ) : (
            <Empty
              title="Everything looks stocked ✨"
              text="No products are running low."
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Latest moves</h2>
              <p>Every little change, remembered.</p>
            </div>
            <Link
              href="/app/activity"
              className="icon-button"
              aria-label="View all activity"
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
              title="Your story starts here."
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
          <strong>A little momentum.</strong>
          <p>Your stock movements today.</p>
        </div>
        <div className="today-value">
          <span>
            <ArrowDownLeft size={15} /> STOCK IN
          </span>
          <strong>
            +{units(d.stock_in_today)} <small>units</small>
          </strong>
        </div>
        <div className="today-value">
          <span>
            <ArrowUpRight size={15} /> STOCK OUT
          </span>
          <strong>
            −{units(d.stock_out_today)} <small>units</small>
          </strong>
        </div>
        <Link href="/app/reports" className="text-link">
          Take a closer look <ArrowRight size={17} />
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
      if (!r.ok) throw new Error("Could not export inventory");
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "stoqo-inventory.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">EVERYTHING IN ITS PLACE</span>
          <h1>
            Your inventory<span className="accent-period">.</span>
          </h1>
          <p>A home for every product, big or small.</p>
        </div>
        <div className="heading-actions">
          <button className="button subtle" onClick={() => open("import")}>
            <Upload size={17} />
            Import
          </button>
          <button className="button dark-button" onClick={() => open("add")}>
            <Plus size={18} />
            Add product
          </button>
        </div>
      </div>
      <div className="inventory-toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            placeholder="Search name, SKU or barcode"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Category filter"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All categories</option>
          {cats.data?.data.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort products"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
        >
          <option value="name">Name A–Z</option>
          <option value="stock">Lowest stock</option>
          <option value="newest">Newest first</option>
          <option value="price">Highest price</option>
        </select>
        <button
          className="icon-button"
          onClick={download}
          aria-label="Export CSV"
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
            {label}
          </button>
        ))}
        <span>{query.data?.meta.total || 0} products</span>
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : query.data.data.length ? (
        <>
          <div className="product-table">
            <div className="product-table-header">
              <span>PRODUCT</span>
              <span>ON HAND</span>
              <span>SELLING PRICE</span>
              <span>STATUS</span>
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
                    <strong>{p.name}</strong>
                    <small>{p.sku || p.category_name || "No SKU"}</small>
                  </span>
                </button>
                <span className="on-hand">
                  <strong>{units(p.current_stock)}</strong>{" "}
                  <small>{p.unit}</small>
                </span>
                <span className="product-price">
                  {money(p.selling_price, business.currency)}
                </span>
                <span className={`status ${p.stock_status}`}>
                  {p.stock_status === "healthy"
                    ? "Healthy stock"
                    : p.stock_status === "low"
                      ? "Running low"
                      : "Out of stock"}
                </span>
                <button
                  className="icon-button"
                  aria-label={`View ${p.name}`}
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
              ? "No matches this time."
              : "Your shelves are looking empty 👀"
          }
          text={
            search || filter || category
              ? "Try another search or clear your filters."
              : "Add your first product and start tracking inventory."
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
            ? "Healthy stock"
            : product.stock_status === "low"
              ? "Running low"
              : "Out of stock"}
        </span>
      </div>
      <span className="eyebrow">CURRENT STOCK</span>
      <div className="detail-stock">
        {units(product.current_stock)} <small>{product.unit}</small>
      </div>
      <div className="detail-actions">
        <button className="button primary" onClick={() => open("in", product)}>
          <Plus size={18} />
          Stock in
        </button>
        <button className="button subtle" onClick={() => open("out", product)}>
          <ArrowUpRight size={18} />
          Stock out
        </button>
        <button
          className="icon-button"
          aria-label="Edit product"
          onClick={() => open("edit", product)}
        >
          <Settings size={18} />
        </button>
      </div>
      <dl className="detail-grid">
        {[
          ["Selling price", money(product.selling_price, currency)],
          ["Purchase price", money(product.purchase_price, currency)],
          ["SKU", product.sku || "—"],
          ["Barcode", product.barcode || "—"],
          ["Category", product.category_name || "Uncategorized"],
          [
            "Low stock alert",
            `${units(product.low_stock_threshold)} ${product.unit}`,
          ],
        ].map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {product.description && <p>{product.description}</p>}
      <h2>Stock history</h2>
      {history.isPending ? (
        <Loading />
      ) : history.error ? (
        <ErrorState error={history.error} />
      ) : history.data.data.length ? (
        history.data.data.map((m) => <MovementRow key={m.id} movement={m} />)
      ) : (
        <p className="muted">No stock changes yet.</p>
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
          <span className="eyebrow">NOTHING SLIPS THROUGH</span>
          <h1>
            The little details<span className="accent-period">.</span>
          </h1>
          <p>A clear trail of what changed, when, and who.</p>
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
                  {a.user_name} · {a.action.replaceAll("_", " ")}
                </p>
                <small>{new Date(a.created_at).toLocaleString("en-IN")}</small>
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
            title="A fresh page."
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
function Reports({ id, business }: { id: number; business: Business }) {
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
        inventory_value: string;
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
          <span className="eyebrow">A CLEARER PICTURE</span>
          <h1>
            Know your numbers<span className="accent-period">.</span>
          </h1>
          <p>Useful insights. Without the spreadsheet headache.</p>
        </div>
        <select
          aria-label="Report period"
          value={days}
          onChange={(e) => {
            setDays(e.target.value);
            setFrom("");
            setTo("");
          }}
        >
          <option value="1">Today</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
        </select>
      </div>
      <div className="date-filters">
        <label>
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          To
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
              <Stat
                label="Inventory cost value"
                value={money(d.inventory_value, business.currency)}
                foot="Current purchase cost"
              />
              <Stat
                label="Estimated retail value"
                value={money(d.retail_value, business.currency)}
                foot="At current selling prices"
              />
              <Stat
                label="Total products"
                value={d.total_products}
                foot="Active products"
              />
              <Stat
                label="Units on hand"
                value={units(d.total_units)}
                foot="Current inventory"
              />
            </div>
            <div className="dashboard-columns">
              <section className="panel report-panel">
                <h2>Stock movements</h2>
                {[
                  ["Stock in", d.stock_in, "green"],
                  ["Stock out", d.stock_out, "orange"],
                  ["Adjustments (net)", d.adjustments, "violet"],
                ].map(([label, v, c]) => (
                  <div className="report-line" key={label}>
                    <span className={`action-icon ${c}`}>
                      {label === "Stock in" ? <ArrowDown /> : <ArrowUp />}
                    </span>
                    <span>{label}</span>
                    <strong>{units(v)}</strong>
                  </div>
                ))}
              </section>
              <section className="panel report-panel">
                <h2>Most active products</h2>
                <p className="muted">
                  Ranked by total units moved in either direction.
                </p>
                {d.most_active.length ? (
                  d.most_active.map((p, i) => (
                    <div className="rank-row" key={p.name + i}>
                      <span>0{i + 1}</span>
                      <strong>{p.name}</strong>
                      <span>{units(p.quantity)} units</span>
                    </div>
                  ))
                ) : (
                  <Empty
                    title="No movements in this period."
                    text="Try a wider date range."
                  />
                )}
              </section>
            </div>
            <div className="report-alerts">
              <Link href="/app/inventory?filter=low">
                <TriangleAlert />
                {d.low_stock} products running low <ArrowUpRight />
              </Link>
              <Link href="/app/inventory?filter=out">
                <Boxes />
                {d.out_of_stock} products out of stock <ArrowUpRight />
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
  onSaved,
  onLogout,
}: {
  business: Business;
  onSaved: () => void;
  onLogout: () => Promise<void>;
}) {
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(business.name);
  const [busy, setBusy] = useState(false);
  const subscription = useQuery({
    queryKey: ["subscription", business.id],
    queryFn: () =>
      api<{
        status: string;
        plans: {
          id: number;
          name: string;
          monthly_price_paise: number;
          currency: string;
        }[];
      }>("subscriptions", {}, business.id),
  });
  return (
    <div className="settings">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api(
              `businesses/${business.id}`,
              { method: "PATCH", body: JSON.stringify({ business: { name } }) },
              business.id,
            );
            onSaved();
            toast.success("Workspace updated");
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Business name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
          />
        </label>
        <button className="button primary" disabled={busy}>
          Save changes
        </button>
      </form>
      <label>
        Appearance
        <select value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="system">Follow your device</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <h2>Your plan</h2>
      <p className="muted">
        {subscription.data?.data.status || "Loading…"} · Trial ends{" "}
        {new Date(business.trial_ends_at).toLocaleDateString("en-IN")}
      </p>
      {subscription.data?.data.plans.map((p) => (
        <div className="plan-row" key={p.id}>
          <strong>{p.name}</strong>
          <span>{money(p.monthly_price_paise / 100, p.currency)}/month</span>
        </div>
      ))}
      <p className="muted">Self-service payments are coming soon.</p>
      <button
        className="button subtle full"
        onClick={() => onLogout().catch((e) => toast.error(e.message))}
      >
        <LogOut size={18} />
        Log out
      </button>
    </div>
  );
}
function Onboarding({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <main className="auth-page">
      <span className="wordmark">stoqo.</span>
      <div className="auth-card">
        <span className="eyebrow">ONE SMALL STEP</span>
        <h1>
          Make yourself
          <br />
          at home.
        </h1>
        <p className="muted">What should we call your business?</p>
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
            Business name
            <input
              name="name"
              placeholder="e.g. The Everyday Store"
              required
              maxLength={120}
              autoFocus
            />
          </label>
          <label>
            What do you sell?
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
                  {t}
                </option>
              ))}
            </select>
          </label>
          {error && (
            <p className="error-box" role="alert">
              {error}
            </p>
          )}
          <button className="button primary full" disabled={busy}>
            {busy ? "Making room…" : "Create your workspace"}
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </main>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" />
      <span>Getting things ready…</span>
    </div>
  );
}
export function ErrorState({ error }: { error: Error }) {
  return (
    <div className="error-box" role="alert">
      {error.message}
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
  return (
    <div className="empty">
      <span className="empty-icon">
        <Package size={25} />
      </span>
      <h3>{title}</h3>
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
  return (
    <article className={`stat-card ${tone}`}>
      <div>
        <span>{label}</span>
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      <strong>{value}</strong>
      <small>{foot}</small>
    </article>
  );
}
export function ProductAvatar({ product }: { product: Product }) {
  if (product.image_url) return <span className="product-avatar"><Image src={product.image_url} width={80} height={80} alt="" unoptimized style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:9}}/></span>;
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
  const positive = Number(m.quantity) > 0;
  return (
    <div className="movement-row">
      <span className={`movement-icon ${positive ? "green" : "orange"}`}>
        {positive ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
      </span>
      <div>
        <strong>{m.product_name}</strong>
        <small>
          {m.movement_type.replaceAll("_", " ")} · {m.user_name}
        </small>
        {m.note && <small>{m.note}</small>}
      </div>
      <div>
        <strong className={positive ? "green-text" : ""}>
          {positive ? "+" : ""}
          {units(m.quantity)}
        </strong>
        <small>
          {new Date(m.occurred_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })}
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
  if (pages <= 1) return null;
  return (
    <div className="pagination">
      <button
        className="button subtle"
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
      >
        Previous
      </button>
      <span>
        {page} of {pages}
      </span>
      <button
        className="button subtle"
        disabled={page >= pages}
        onClick={() => setPage(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
