"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronRight, Clock, RotateCcw, Star, Store, Utensils, X, Zap } from "lucide-react";
import Link from "next/link";
import PageWrapper from "@/components/layout/PageWrapper";
import ProductCard from "@/components/ui/ProductCard";
import CategoryCard from "@/components/ui/CategoryCard";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { allProducts, foodCategories, groceryAisles, restaurants, type Subcategory } from "@/data/mockData";
import { useSearchStore, type SortOption, type FilterOption } from "@/store/searchStore";
import { useOrderStore } from "@/store/orderStore";
import { useCartStore } from "@/store/cartStore";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
} as const;

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
} as const;

type Mode = "grocery" | "food";
type GroceryProduct = (typeof allProducts.vegetables)[number];

// All grocery products flat — includes every subcategory key (deduped by id)
const allGroceryProducts = (() => {
  const seen = new Set<string>();
  const result: GroceryProduct[] = [];
  const keys: (keyof typeof allProducts)[] = [
    "vegetables", "fruits", "herbs", "cutAndPeeled",
    "milk", "curd", "paneer", "butterAndCheese",
    "atta", "rice", "dal", "oilAndGhee",
    "chips", "namkeen", "biscuits", "chocolates",
    "teaAndCoffee", "juices", "softDrinks", "energyDrinks",
    "detergents", "cleaners", "tissues", "repellents",
    "bath", "hair", "skin", "oralCare",
    "diapers", "babyFood", "petFood", "petTreats",
  ];
  for (const key of keys) {
    for (const p of allProducts[key] as GroceryProduct[]) {
      if (!seen.has(p.id)) { seen.add(p.id); result.push(p); }
    }
  }
  return result;
})();

const SORT_LABELS: Record<SortOption, string> = {
  relevance: "Relevance",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  discount: "Biggest Discount",
};

const FILTER_LABELS: Record<FilterOption, string> = {
  all: "All",
  fresh: "Fresh",
  "on-sale": "On Sale",
  "best-seller": "Best Seller",
};

function applySearchFiltersSort(
  products: GroceryProduct[],
  query: string,
  filter: FilterOption,
  sort: SortOption
): GroceryProduct[] {
  let result = [...products];

  // Search
  if (query.trim()) {
    const q = query.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.brand ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        (p.weight ?? "").toLowerCase().includes(q)
    );
  }

  // Filter
  if (filter === "fresh") result = result.filter((p) => p.tag === "Fresh");
  if (filter === "on-sale") result = result.filter((p) => !!p.originalPrice);
  if (filter === "best-seller") result = result.filter((p) => p.tag === "Best Seller");

  // Sort
  if (sort === "price-asc") result.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") result.sort((a, b) => b.price - a.price);
  if (sort === "discount") {
    result.sort((a, b) => {
      const da = a.originalPrice ? a.originalPrice - a.price : 0;
      const db = b.originalPrice ? b.originalPrice - b.price : 0;
      return db - da;
    });
  }

  return result;
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("grocery");
  const [activeAisle, setActiveAisle] = useState(groceryAisles[0].name);
  const { query, sort, filter, setSort, setFilter, reset } = useSearchStore();

  const activeSubcategories = useMemo(
    () => groceryAisles.find((aisle) => aisle.name === activeAisle)?.subcategories || [],
    [activeAisle]
  );

  // Only enter search results view when there's an actual query.
  // Sort/filter alone shouldn't hijack the home view — they apply on top of results.
  const isSearching = query.trim().length > 0;

  const searchResults = useMemo(
    () => applySearchFiltersSort(allGroceryProducts, query, filter, sort),
    [query, filter, sort]
  );

  // Reset sort+filter when query is cleared so stale filters don't linger
  useEffect(() => {
    if (!query.trim()) {
      setSort("relevance");
      setFilter("all");
    }
  }, [query, setSort, setFilter]);

  const handleRefresh = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 80);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="px-3 py-3 space-y-3 bg-white min-h-screen">
        <div className="h-8 rounded-xl shimmer" />
        <div className="h-28 rounded-2xl shimmer" />
        <div className="flex gap-2 overflow-hidden">
          {[1,2,3,4].map((i) => <div key={i} className="w-16 h-16 rounded-2xl shimmer flex-shrink-0" />)}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {[1,2,3,4].map((i) => <div key={i} className="h-40 rounded-2xl shimmer" />)}
        </div>
      </div>
    );
  }

  return (
    <PageWrapper>
      <PullToRefresh onRefresh={handleRefresh}>
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="pb-4">
          {/* Mode toggle */}
          <motion.section variants={sectionVariants} className="px-3 pt-2.5">
            <div className="relative flex bg-gray-100 rounded-xl p-1 gap-1">
              {/* Sliding pill — uses left % so it's always perfectly half */}
              <motion.div
                className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm"
                animate={{ left: mode === "grocery" ? "4px" : "50%", width: "calc(50% - 6px)" }}
                transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.8 }}
              />
              <button
                onClick={() => { setMode("grocery"); reset(); }}
                className={`relative z-10 flex-1 h-7 rounded-lg text-[11px] flex items-center justify-center gap-1.5 transition-colors duration-150 ${
                  mode === "grocery" ? "font-medium text-brand-navy" : "font-normal text-gray-400"
                }`}
              >
                <Store size={12} strokeWidth={1.6} /> Groceries
              </button>
              <button
                onClick={() => { setMode("food"); reset(); }}
                className={`relative z-10 flex-1 h-7 rounded-lg text-[11px] flex items-center justify-center gap-1.5 transition-colors duration-150 ${
                  mode === "food" ? "font-medium text-brand-navy" : "font-normal text-gray-400"
                }`}
              >
                <Utensils size={12} strokeWidth={1.6} /> Food
              </button>
            </div>
          </motion.section>

          {/* Search results view (grocery mode only) */}
          {mode === "grocery" && isSearching ? (
            <SearchResultsView
              results={searchResults}
              query={query}
              sort={sort}
              filter={filter}
              setSort={setSort}
              setFilter={setFilter}
            />
          ) : mode === "grocery" ? (
            <GroceryHome
              activeAisle={activeAisle}
              setActiveAisle={setActiveAisle}
              activeSubcategories={activeSubcategories}
            />
          ) : (
            <FoodHome />
          )}
        </motion.div>
      </PullToRefresh>

      {/* Sort & Filter — no sheet needed, inline chips in SearchResultsView */}
    </PageWrapper>
  );
}

// ── Search results ──────────────────────────────────────────────────────────
function SearchResultsView({
  results, query, sort, filter, setSort, setFilter,
}: {
  results: GroceryProduct[];
  query: string;
  sort: SortOption;
  filter: FilterOption;
  setSort: (s: SortOption) => void;
  setFilter: (f: FilterOption) => void;
}) {
  const { reset } = useSearchStore();
  const [sortOpen, setSortOpen] = useState(false);
  const pillRef = useRef<HTMLButtonElement>(null);
  const [pillRect, setPillRect] = useState<{ top: number; left: number } | null>(null);
  const hasActiveSort = sort !== "relevance";
  const hasActiveFilter = filter !== "all";

  const openSort = () => {
    if (pillRef.current) {
      const r = pillRef.current.getBoundingClientRect();
      setPillRect({ top: r.bottom + 6, left: r.left });
    }
    setSortOpen(true);
  };

  return (
    <motion.section variants={sectionVariants} className="pt-2">
      {/* ── Filter / sort bar ── */}
      <div className="flex items-center gap-2 px-3 pb-1 overflow-x-auto no-scrollbar">

        {/* Clear pill */}
        <AnimatePresence>
          {(hasActiveSort || hasActiveFilter) && (
            <motion.button
              key="reset"
              initial={{ opacity: 0, scale: 0.8, width: 0, paddingLeft: 0, paddingRight: 0 }}
              animate={{ opacity: 1, scale: 1, width: "auto", paddingLeft: 10, paddingRight: 10 }}
              exit={{ opacity: 0, scale: 0.8, width: 0, paddingLeft: 0, paddingRight: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              onClick={() => { setSort("relevance"); setFilter("all"); setSortOpen(false); }}
              className="flex-shrink-0 flex items-center gap-1 h-7 rounded-full bg-red-50 border border-red-200 text-red-500 text-[10px] font-semibold overflow-hidden"
            >
              <X size={9} strokeWidth={3} /> Clear
            </motion.button>
          )}
        </AnimatePresence>

        {/* Sort pill */}
        <button
          ref={pillRef}
          onClick={openSort}
          className={`flex-shrink-0 flex items-center gap-1.5 h-7 px-3 rounded-full text-[10px] font-medium border transition-all ${
            hasActiveSort
              ? "bg-brand-primary text-white border-brand-primary shadow-sm"
              : "bg-white text-brand-text-muted border-gray-200"
          }`}
        >
          {hasActiveSort && <Check size={9} strokeWidth={3} />}
          {hasActiveSort ? SORT_LABELS[sort] : "Sort"}
          <motion.span animate={{ rotate: sortOpen ? 180 : 0 }} transition={{ duration: 0.18 }}>
            <ChevronDown size={9} strokeWidth={2.5} />
          </motion.span>
        </button>

        {/* Divider */}
        <div className="flex-shrink-0 w-px h-4 bg-gray-200" />

        {/* Filter chips */}
        {(Object.keys(FILTER_LABELS) as FilterOption[]).filter(f => f !== "all").map((f) => {
          const active = filter === f;
          return (
            <motion.button
              key={f}
              onClick={() => { setFilter(active ? "all" : f); setSortOpen(false); }}
              whileTap={{ scale: 0.94 }}
              className={`flex-shrink-0 flex items-center gap-1 h-7 px-3 rounded-full text-[10px] font-medium border transition-all ${
                active
                  ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                  : "bg-white text-brand-text-muted border-gray-200"
              }`}
            >
              {active && <Check size={9} strokeWidth={3} />}
              {FILTER_LABELS[f]}
            </motion.button>
          );
        })}
      </div>

      {/* Sort dropdown — fixed so it escapes all overflow containers */}
      <AnimatePresence>
        {sortOpen && pillRect && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
              className="fixed z-50 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
              style={{ top: pillRect.top, left: pillRect.left, minWidth: 180 }}
            >
              {(Object.keys(SORT_LABELS) as SortOption[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setSort(s); setSortOpen(false); }}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-[11px] transition-colors text-left ${
                    sort === s
                      ? "bg-brand-primary/10 text-brand-primary font-semibold"
                      : "text-brand-text hover:bg-gray-50 font-normal"
                  }`}
                >
                  {SORT_LABELS[s]}
                  {sort === s && <Check size={11} strokeWidth={2.5} className="text-brand-primary flex-shrink-0" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Result count ── */}
      <div className="px-3 pt-1 pb-2.5">
        <p className="text-[10px] text-brand-text-muted">
          <span className="font-semibold text-brand-text">{results.length}</span> result{results.length !== 1 ? "s" : ""}
          {query ? <> for <span className="font-semibold text-brand-text">&ldquo;{query}&rdquo;</span></> : ""}
        </p>
      </div>

      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm font-semibold text-brand-text mb-1">No results found</p>
          <p className="text-[11px] text-brand-text-muted mb-4">Try a different search or adjust filters</p>
          <button onClick={() => reset()}
            className="px-4 py-2 rounded-full bg-brand-primary/10 text-brand-primary text-[11px] font-semibold">
            Clear search
          </button>
        </div>
      ) : (
        <div className="px-3 grid grid-cols-2 gap-2.5">
          {results.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              image={product.imageColor}
              price={product.price}
              originalPrice={product.originalPrice}
              weight={product.weight}
              tag={product.tag}
              brand={product.brand}
              category={product.category}
              description={product.description}
              details={product.details}
              nutrition={product.nutrition}
            />
          ))}
        </div>
      )}
    </motion.section>
  );
}

// ── Grocery home ────────────────────────────────────────────────────────────
function GroceryHome({
  activeAisle, setActiveAisle, activeSubcategories,
}: {
  activeAisle: string;
  setActiveAisle: (name: string) => void;
  activeSubcategories: Subcategory[];
}) {
  const orders = useOrderStore((s) => s.orders);
  const cartItems = useCartStore((s) => s.items);

  // "Buy Again" — products from past orders, deduped
  const buyAgainProducts = useMemo(() => {
    const seen = new Set<string>();
    const result: GroceryProduct[] = [];
    for (const order of orders) {
      for (const item of order.items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          const p = allGroceryProducts.find((gp) => gp.id === item.id);
          if (p) result.push(p);
        }
      }
    }
    return result.slice(0, 10);
  }, [orders]);

  // "Recently Viewed" — products currently in cart (proxy for viewed, since we have no view tracking yet)
  const recentlyViewed = useMemo(() => {
    return cartItems
      .map((ci) => allGroceryProducts.find((p) => p.id === ci.id))
      .filter(Boolean)
      .slice(0, 8) as GroceryProduct[];
  }, [cartItems]);
  return (
    <>
      <motion.section variants={sectionVariants} className="px-3 pt-3">
        {/* Grocery banner */}
        <div className="w-full rounded-2xl overflow-hidden relative flex"
          style={{ background: "linear-gradient(120deg, #0a5c42 0%, #0e8a60 50%, #10a870 100%)", minHeight: "130px" }}>

          {/* Diagonal stripe pattern */}
          <div className="absolute inset-0 opacity-[0.08]"
            style={{ backgroundImage: "repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 14px)" }} />

          {/* Soft glow behind illustration */}
          <div className="absolute right-0 top-0 bottom-0 w-48 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(255,255,255,0.15) 0%, transparent 65%)" }} />

          {/* Left: text content */}
          <div className="relative z-10 flex-1 px-4 py-4 flex flex-col justify-between">
            <div>
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
                className="inline-flex items-center gap-1 mb-2"
              >
                <span className="bg-yellow-400 text-yellow-900 text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider leading-none">⚡ 10 min delivery</span>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
                className="text-[19px] font-black text-white leading-[1.18] tracking-tight"
              >
                Fresh groceries,<br />at your door
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.24 }}
                className="text-[9.5px] text-white/70 mt-1 font-semibold"
              >
                Fruits · Dairy · Snacks · Essentials
              </motion.p>
            </div>
            <motion.button
              type="button"
              onClick={() => document.getElementById("grocery-aisles")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
              whileTap={{ scale: 0.94 }}
              className="mt-3 self-start inline-flex items-center gap-1 bg-white text-[#0a5c42] text-[9px] font-black px-3 py-1.5 rounded-full shadow-md cursor-pointer"
            >
              Shop now <ChevronRight size={10} strokeWidth={3} />
            </motion.button>
          </div>

          {/* Right: inline SVG grocery illustration — full-height scene */}
          <motion.div
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12, type: "spring", stiffness: 200, damping: 22 }}
            className="relative w-[160px] flex-shrink-0 self-stretch flex items-center justify-center select-none overflow-hidden"
          >
            <svg width="160" height="130" viewBox="0 0 160 130" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* ── Shadow under everything ── */}
              <ellipse cx="80" cy="122" rx="58" ry="6" fill="black" fillOpacity="0.12"/>

              {/* ── Bag body ── */}
              <rect x="28" y="48" width="88" height="70" rx="14" fill="white" fillOpacity="0.18"/>
              <rect x="28" y="48" width="88" height="70" rx="14" stroke="white" strokeOpacity="0.45" strokeWidth="2"/>
              {/* Bag shine */}
              <ellipse cx="46" cy="62" rx="8" ry="4" fill="white" fillOpacity="0.18" transform="rotate(-25 46 62)"/>

              {/* ── Bag handles ── */}
              <path d="M48 48 C48 30 58 22 72 22 C86 22 96 30 96 48" stroke="white" strokeOpacity="0.65" strokeWidth="4" strokeLinecap="round" fill="none"/>

              {/* ── Broccoli (left, sticking out tall) ── */}
              <rect x="50" y="36" width="6" height="18" rx="3" fill="#15803d"/>
              <circle cx="50" cy="30" r="13" fill="#4ade80" fillOpacity="0.95"/>
              <circle cx="42" cy="35" r="9" fill="#22c55e" fillOpacity="0.95"/>
              <circle cx="59" cy="34" r="11" fill="#16a34a" fillOpacity="0.95"/>
              <circle cx="50" cy="24" r="8" fill="#4ade80" fillOpacity="0.9"/>
              {/* Broccoli highlight */}
              <circle cx="46" cy="22" r="3" fill="white" fillOpacity="0.25"/>

              {/* ── Carrot (right, sticking out, tilted) ── */}
              <g transform="rotate(18 96 30)">
                <ellipse cx="96" cy="36" rx="6" ry="16" fill="#fb923c" fillOpacity="0.97"/>
                <ellipse cx="96" cy="36" rx="6" ry="16" fill="url(#carrotGrad)" fillOpacity="0.4"/>
                <path d="M91 32 Q96 30 101 32" stroke="#ea580c" strokeWidth="1" strokeOpacity="0.5" fill="none"/>
                <path d="M91 37 Q96 35 101 37" stroke="#ea580c" strokeWidth="1" strokeOpacity="0.5" fill="none"/>
                <path d="M93 20 C90 12 86 10 88 18" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <path d="M96 18 C96 10 100 8 99 16" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <path d="M99 20 C102 12 106 12 104 20" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              </g>

              {/* ── Apple (inside bag, left) ── */}
              <circle cx="54" cy="84" r="18" fill="#f87171" fillOpacity="0.95"/>
              <circle cx="54" cy="84" r="18" fill="url(#appleGrad)" fillOpacity="0.5"/>
              <path d="M54 66 C54 61 58 59 58 63" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <path d="M54 66 C50 60 44 61 46 66" fill="#22c55e" fillOpacity="0.9"/>
              <ellipse cx="47" cy="76" rx="4" ry="6" fill="white" fillOpacity="0.22" transform="rotate(-20 47 76)"/>

              {/* ── Milk carton (inside bag, right) ── */}
              <rect x="78" y="68" width="28" height="38" rx="4" fill="white" fillOpacity="0.88"/>
              <polygon points="78,68 92,58 106,68" fill="white" fillOpacity="0.75"/>
              <line x1="92" y1="58" x2="92" y2="68" stroke="#d1fae5" strokeWidth="1.5"/>
              <rect x="82" y="74" width="20" height="4" rx="2" fill="#0e8a60" fillOpacity="0.55"/>
              <rect x="82" y="81" width="14" height="2.5" rx="1.25" fill="#0e8a60" fillOpacity="0.35"/>
              <rect x="82" y="86" width="16" height="2.5" rx="1.25" fill="#0e8a60" fillOpacity="0.35"/>
              <rect x="100" y="70" width="4" height="20" rx="2" fill="white" fillOpacity="0.2"/>

              {/* ── Banana peeking top-right of bag ── */}
              <path d="M100 52 C108 44 118 46 116 56 C114 64 106 62 102 58" stroke="#fde047" strokeWidth="6" strokeLinecap="round" fill="none"/>
              <path d="M100 52 C108 44 118 46 116 56 C114 64 106 62 102 58" stroke="#facc15" strokeWidth="4" strokeLinecap="round" fill="none"/>

              <defs>
                <radialGradient id="appleGrad" cx="35%" cy="30%">
                  <stop offset="0%" stopColor="white" stopOpacity="0.5"/>
                  <stop offset="100%" stopColor="white" stopOpacity="0"/>
                </radialGradient>
                <radialGradient id="carrotGrad" cx="30%" cy="25%">
                  <stop offset="0%" stopColor="white" stopOpacity="0.5"/>
                  <stop offset="100%" stopColor="white" stopOpacity="0"/>
                </radialGradient>
              </defs>
            </svg>

            {/* ── Floating sparkle (star) ── */}
            <motion.svg
              width="18" height="18" viewBox="0 0 18 18" fill="none"
              className="absolute"
              style={{ top: 10, right: 22 }}
              animate={{ y: [0, -6, 0], rotate: [0, 15, 0], opacity: [0.75, 1, 0.75] }}
              transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
            >
              <path d="M9 1 L10.5 6.5 L16 6.5 L11.5 9.8 L13 15.5 L9 12 L5 15.5 L6.5 9.8 L2 6.5 L7.5 6.5 Z" fill="white" fillOpacity="0.85"/>
            </motion.svg>

            {/* ── Floating dot 1 (top-right, large) ── */}
            <motion.div
              className="absolute rounded-full bg-white"
              style={{ width: 6, height: 6, top: 14, right: 8, opacity: 0.55 }}
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut", delay: 0.4 }}
            />

            {/* ── Floating dot 2 (mid-right) ── */}
            <motion.div
              className="absolute rounded-full bg-white"
              style={{ width: 4, height: 4, top: 34, right: 4, opacity: 0.4 }}
              animate={{ y: [0, -7, 0] }}
              transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut", delay: 0.9 }}
            />

            {/* ── Floating dot 3 (mid-right lower) ── */}
            <motion.div
              className="absolute rounded-full bg-white"
              style={{ width: 3, height: 3, top: 52, right: 6, opacity: 0.3 }}
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut", delay: 1.5 }}
            />

            {/* ── Floating dot 4 (left side) ── */}
            <motion.div
              className="absolute rounded-full bg-white"
              style={{ width: 4, height: 4, top: 58, left: 6, opacity: 0.3 }}
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3.0, ease: "easeInOut", delay: 0.7 }}
            />

            {/* ── Floating dot 5 (left side lower) ── */}
            <motion.div
              className="absolute rounded-full bg-white"
              style={{ width: 3, height: 3, top: 78, left: 4, opacity: 0.25 }}
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4.2, ease: "easeInOut", delay: 2.0 }}
            />
          </motion.div>
        </div>
      </motion.section>

      <motion.section variants={sectionVariants} className="mt-4" id="grocery-aisles">
        <div className="px-3 flex items-center justify-between mb-2.5">
          <h2 className="text-[14px] font-black text-brand-text">Shop by Aisle</h2>
          <Link href="/categories" className="text-[10px] font-black text-brand-primary bg-gray-100 px-2.5 py-1 rounded-full flex items-center gap-0.5">
            See all <ChevronRight size={11} strokeWidth={3} />
          </Link>
        </div>
        <div className="flex overflow-x-auto gap-2 px-3 py-2 no-scrollbar">
          {groceryAisles.map((aisle) => (
            <CategoryCard
              key={aisle.name}
              name={aisle.name}
              image={aisle.image}
              color={aisle.color}
              isActive={activeAisle === aisle.name}
              onClick={() => setActiveAisle(aisle.name)}
            />
          ))}
        </div>
        <div className="px-3 mt-3 grid grid-cols-2 gap-2">
          {activeSubcategories.map((subcategory) => (
            <Link
              href={`/categories/${encodeURIComponent(subcategory.name)}`}
              key={subcategory.name}
              className="min-h-10 rounded-xl border border-gray-200 bg-white px-2.5 py-2 flex items-center justify-between gap-2 active:scale-95 transition-transform shadow-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={subcategory.image} alt={subcategory.name} width={20} height={20} className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
                <span className="text-[10px] font-black text-brand-navy truncate">{subcategory.name}</span>
              </div>
              <ChevronRight size={11} className="text-gray-400 flex-shrink-0" strokeWidth={2.5} />
            </Link>
          ))}
        </div>
      </motion.section>

      <ProductRow title="Fresh Picks" subtitle="Morning essentials" products={[...allProducts.vegetables, ...allProducts.fruits]} />
      {buyAgainProducts.length > 0 && (
        <BuyAgainRow products={buyAgainProducts} />
      )}
      <ProductRow title="Savega Staples" subtitle="Popular pantry deals" products={allProducts.staples} />
      <ProductGrid title="Super Savings" products={[...allProducts.dairy, ...allProducts.snacks]} />
      <WatermarkFooter />
    </>
  );
}

// ── Food home ───────────────────────────────────────────────────────────────
function FoodHome() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  return (
    <>
      <motion.section variants={sectionVariants} className="px-3 pt-3">
        {/* Food banner */}
        <div className="w-full rounded-2xl overflow-hidden relative flex"
          style={{ background: "linear-gradient(120deg, #6b1209 0%, #b02a1c 50%, #d94030 100%)", minHeight: "130px" }}>

          {/* Diagonal stripe pattern */}
          <div className="absolute inset-0 opacity-[0.08]"
            style={{ backgroundImage: "repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 14px)" }} />

          {/* Warm glow behind illustration */}
          <div className="absolute right-0 top-0 bottom-0 w-48 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(255,180,80,0.18) 0%, transparent 65%)" }} />

          {/* Left: text content */}
          <div className="relative z-10 flex-1 px-4 py-4 flex flex-col justify-between">
            <div>
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
                className="inline-flex items-center gap-1 mb-2"
              >
                <span className="bg-orange-400 text-orange-900 text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider leading-none">🔥 Hot &amp; fresh</span>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
                className="text-[19px] font-black text-white leading-[1.18] tracking-tight"
              >
                Order from<br />local favorites
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.24 }}
                className="text-[9.5px] text-white/70 mt-1 font-semibold"
              >
                Restaurants · Quick bites · Desserts
              </motion.p>
            </div>
            <motion.button
              type="button"
              onClick={() => document.getElementById("food-restaurants")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
              whileTap={{ scale: 0.94 }}
              className="mt-3 self-start inline-flex items-center gap-1 bg-white text-[#b02a1c] text-[9px] font-black px-3 py-1.5 rounded-full shadow-md cursor-pointer"
            >
              Order now <ChevronRight size={10} strokeWidth={3} />
            </motion.button>
          </div>

          {/* Right: inline SVG food illustration — full-height scene */}
          <motion.div
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12, type: "spring", stiffness: 200, damping: 22 }}
            className="relative w-[160px] flex-shrink-0 self-stretch flex items-center justify-center select-none overflow-hidden"
          >
            <svg width="160" height="130" viewBox="0 0 160 130" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                {/* Handi body gradient — warm amber */}
                <linearGradient id="handiBody" x1="55" y1="52" x2="115" y2="115" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#fbbf24"/>
                  <stop offset="100%" stopColor="#d97706"/>
                </linearGradient>
                {/* Handi lid gradient */}
                <linearGradient id="handiLid" x1="55" y1="44" x2="115" y2="60" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#fde68a"/>
                  <stop offset="100%" stopColor="#f59e0b"/>
                </linearGradient>
                {/* Rice surface gradient */}
                <linearGradient id="riceSurface" x1="60" y1="50" x2="110" y2="58" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#fffbeb"/>
                  <stop offset="100%" stopColor="#fef3c7"/>
                </linearGradient>
                {/* Samosa gradient */}
                <linearGradient id="samosaBody" x1="18" y1="18" x2="62" y2="72" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#fcd34d"/>
                  <stop offset="100%" stopColor="#b45309"/>
                </linearGradient>
                {/* Samosa shadow face */}
                <linearGradient id="samosaShadow" x1="18" y1="40" x2="62" y2="72" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#92400e" stopOpacity="0"/>
                  <stop offset="100%" stopColor="#92400e" stopOpacity="0.35"/>
                </linearGradient>
              </defs>

              {/* ── Ground shadow ── */}
              <ellipse cx="83" cy="123" rx="52" ry="5" fill="black" fillOpacity="0.15"/>

              {/* ══════════════════════════════════
                  BIRYANI HANDI (centre-right hero)
                  ══════════════════════════════════ */}

              {/* Handi base / body — rounded pot shape */}
              <path d="M56 115 Q54 80 58 68 Q62 58 85 54 Q108 50 112 58 Q118 68 118 80 Q118 100 116 115 Z"
                fill="url(#handiBody)"/>
              {/* Body right-side shadow */}
              <path d="M112 58 Q118 68 118 80 Q118 100 116 115 L100 115 Q106 95 104 75 Q102 62 96 56 Z"
                fill="#b45309" fillOpacity="0.25"/>
              {/* Body left highlight */}
              <path d="M58 68 Q60 60 70 56 Q66 70 64 90 Q62 105 62 115 L56 115 Z"
                fill="white" fillOpacity="0.12"/>

              {/* Handi neck ring */}
              <rect x="57" y="62" width="58" height="8" rx="4" fill="#d97706"/>
              <rect x="57" y="62" width="58" height="4" rx="2" fill="#fbbf24" fillOpacity="0.6"/>

              {/* Handi handles */}
              <path d="M57 70 C46 70 42 78 46 82 C50 86 57 82 57 78" fill="#d97706" stroke="#b45309" strokeWidth="1"/>
              <path d="M115 70 C126 70 130 78 126 82 C122 86 115 82 115 78" fill="#d97706" stroke="#b45309" strokeWidth="1"/>

              {/* Rice / biryani surface inside handi */}
              <ellipse cx="86" cy="62" rx="28" ry="9" fill="url(#riceSurface)"/>
              {/* Saffron streaks on rice */}
              <path d="M64 60 Q72 56 80 60 Q88 64 96 59 Q104 54 108 60"
                stroke="#f97316" strokeWidth="2" strokeLinecap="round" fill="none" strokeOpacity="0.7"/>
              {/* Rice grain clusters */}
              <ellipse cx="72" cy="59" rx="3.5" ry="1.2" fill="white" fillOpacity="0.9" transform="rotate(-20 72 59)"/>
              <ellipse cx="80" cy="56" rx="3.5" ry="1.2" fill="white" fillOpacity="0.9" transform="rotate(5 80 56)"/>
              <ellipse cx="89" cy="57" rx="3.5" ry="1.2" fill="white" fillOpacity="0.9" transform="rotate(15 89 57)"/>
              <ellipse cx="98" cy="59" rx="3" ry="1.1" fill="white" fillOpacity="0.85" transform="rotate(-10 98 59)"/>
              <ellipse cx="76" cy="63" rx="3" ry="1.1" fill="white" fillOpacity="0.8" transform="rotate(10 76 63)"/>
              <ellipse cx="93" cy="63" rx="3" ry="1.1" fill="white" fillOpacity="0.8" transform="rotate(-15 93 63)"/>
              {/* Spice / whole spice dots */}
              <circle cx="84" cy="61" r="2" fill="#92400e" fillOpacity="0.7"/>
              <circle cx="94" cy="57" r="1.5" fill="#92400e" fillOpacity="0.6"/>
              {/* Mint garnish */}
              <path d="M100 52 C97 46 92 47 93 52" fill="#4ade80" fillOpacity="0.95"/>
              <path d="M103 50 C103 44 108 45 107 50" fill="#22c55e" fillOpacity="0.9"/>
              <line x1="100" y1="52" x2="100" y2="58" stroke="#15803d" strokeWidth="1.2" strokeLinecap="round"/>

              {/* Lid */}
              <ellipse cx="86" cy="52" rx="30" ry="9" fill="url(#handiLid)"/>
              <ellipse cx="86" cy="52" rx="30" ry="9" stroke="#d97706" strokeWidth="1.5" fill="none"/>
              {/* Lid highlight */}
              <ellipse cx="74" cy="49" rx="10" ry="3" fill="white" fillOpacity="0.22" transform="rotate(-10 74 49)"/>
              {/* Lid knob */}
              <ellipse cx="86" cy="44" rx="6" ry="3.5" fill="#f59e0b"/>
              <ellipse cx="86" cy="44" rx="6" ry="3.5" stroke="#d97706" strokeWidth="1" fill="none"/>
              <ellipse cx="84" cy="43" rx="2" ry="1.2" fill="white" fillOpacity="0.3"/>

              {/* Steam wisps above lid */}
              <path d="M76 43 Q73 36 76 29 Q79 22 76 15"
                stroke="white" strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <path d="M86 41 Q89 34 86 27 Q83 20 86 13"
                stroke="white" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <path d="M96 43 Q99 36 96 29 Q93 22 96 16"
                stroke="white" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" fill="none"/>

              {/* ══════════════════════════════════
                  SAMOSA (front-left, tilted)
                  ══════════════════════════════════ */}
              <g transform="rotate(-12 40 80)">
                {/* Samosa body */}
                <path d="M40 28 L14 76 L66 76 Z" fill="url(#samosaBody)"/>
                {/* Shadow layer */}
                <path d="M40 28 L14 76 L66 76 Z" fill="url(#samosaShadow)"/>
                {/* Left edge crimp — dashed seam */}
                <path d="M40 28 L14 76"
                  stroke="#92400e" strokeWidth="1.5" strokeLinecap="round"
                  strokeDasharray="3 4" strokeOpacity="0.55" fill="none"/>
                {/* Right edge crimp */}
                <path d="M40 28 L66 76"
                  stroke="#92400e" strokeWidth="1.5" strokeLinecap="round"
                  strokeDasharray="3 4" strokeOpacity="0.55" fill="none"/>
                {/* Bottom edge */}
                <path d="M14 76 L66 76"
                  stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" fill="none"/>
                {/* Surface highlight — top-left face */}
                <path d="M40 28 L14 76 L40 76 Z" fill="white" fillOpacity="0.07"/>
                {/* Specular highlight */}
                <ellipse cx="32" cy="48" rx="7" ry="4" fill="white" fillOpacity="0.18" transform="rotate(-35 32 48)"/>
              </g>

              {/* Chutney pool under samosa */}
              <ellipse cx="36" cy="88" rx="14" ry="4" fill="#15803d" fillOpacity="0.55"/>
              <ellipse cx="36" cy="88" rx="10" ry="2.5" fill="#16a34a" fillOpacity="0.7"/>
            </svg>

            {/* ── Floating sparkle (star) ── */}
            <motion.svg
              width="18" height="18" viewBox="0 0 18 18" fill="none"
              className="absolute"
              style={{ top: 8, right: 6 }}
              animate={{ y: [0, -7, 0], rotate: [0, 18, 0], opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 3.0, ease: "easeInOut" }}
            >
              <path d="M9 1 L10.5 6.5 L16 6.5 L11.5 9.8 L13 15.5 L9 12 L5 15.5 L6.5 9.8 L2 6.5 L7.5 6.5 Z" fill="white" fillOpacity="0.8"/>
            </motion.svg>

            {/* ── Floating dot 1 (top-right large) ── */}
            <motion.div
              className="absolute rounded-full bg-white"
              style={{ width: 6, height: 6, top: 12, right: 2, opacity: 0.55 }}
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3.4, ease: "easeInOut", delay: 0.5 }}
            />

            {/* ── Floating dot 2 ── */}
            <motion.div
              className="absolute rounded-full bg-white"
              style={{ width: 4, height: 4, top: 30, right: 8, opacity: 0.4 }}
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut", delay: 1.1 }}
            />

            {/* ── Floating dot 3 ── */}
            <motion.div
              className="absolute rounded-full bg-white"
              style={{ width: 3, height: 3, top: 50, right: 4, opacity: 0.3 }}
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4.0, ease: "easeInOut", delay: 1.8 }}
            />

            {/* ── Floating dot 4 (left side) ── */}
            <motion.div
              className="absolute rounded-full bg-white"
              style={{ width: 4, height: 4, top: 46, left: 6, opacity: 0.3 }}
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut", delay: 0.8 }}
            />

            {/* ── Floating dot 5 (left side lower) ── */}
            <motion.div
              className="absolute rounded-full bg-white"
              style={{ width: 3, height: 3, top: 68, left: 4, opacity: 0.25 }}
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 4.4, ease: "easeInOut", delay: 2.2 }}
            />
          </motion.div>
        </div>
      </motion.section>

      <motion.section variants={sectionVariants} className="mt-4">
        <div className="px-3.5 mb-2.5">
          <h2 className="text-[13px] font-extrabold text-brand-text">What are you craving?</h2>
        </div>
        <div className="flex overflow-x-auto gap-2 px-3 pb-1 no-scrollbar">
          {foodCategories.map((category) => (
            <button key={category.name} onClick={() => setActiveCategory(category.name === activeCategory ? null : category.name)}
              className={`w-[86px] flex-shrink-0 text-left transition-transform active:scale-95 ${activeCategory === category.name ? "scale-95" : ""}`}>
              <div className={`h-[70px] rounded-xl bg-gradient-to-br ${category.image} border shadow-soft ${activeCategory === category.name ? "border-brand-primary border-2" : "border-gray-100"}`} />
              <p className={`text-[10px] font-black text-center mt-1.5 leading-tight ${activeCategory === category.name ? "text-brand-primary" : ""}`}>{category.name}</p>
            </button>
          ))}
        </div>
        {activeCategory && (
          <p className="px-3 mt-2 text-[10px] font-bold text-brand-primary">Showing: {activeCategory}</p>
        )}
      </motion.section>

      <motion.section variants={sectionVariants} className="mt-6 px-3.5" id="food-restaurants">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h2 className="text-[13px] font-extrabold text-brand-text">Most Ordered Restaurants</h2>
            <p className="text-[8px] text-brand-text-muted font-bold uppercase">Popular near you</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[8px] font-black text-emerald-700 uppercase">
            <Clock size={10} /> Fast
          </div>
        </div>
        <div className="space-y-3">
          {restaurants
            .filter((r) => !activeCategory || r.cuisine.toLowerCase().includes(activeCategory.toLowerCase()) || r.popular.some((p) => p.toLowerCase().includes(activeCategory.toLowerCase())))
            .concat(activeCategory ? restaurants.filter((r) => !r.cuisine.toLowerCase().includes(activeCategory.toLowerCase()) && !r.popular.some((p) => p.toLowerCase().includes(activeCategory.toLowerCase()))) : [])
            .filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i)
            .map((restaurant) => <RestaurantCard key={restaurant.id} restaurant={restaurant} />)}
        </div>
      </motion.section>
      <WatermarkFooter />
    </>
  );
}

// ── Shared helpers ──────────────────────────────────────────────────────────
function WatermarkFooter() {
  return (
    <motion.footer variants={sectionVariants} className="px-3 pt-4 pb-2 flex justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/savega delivery.svg" alt="Savega Delivery" className="h-10 object-contain opacity-30" />
    </motion.footer>
  );
}

function BuyAgainRow({ products }: { products: GroceryProduct[] }) {
  const { addItem } = useCartStore();
  return (
    <motion.section variants={sectionVariants} className="mt-5">
      <div className="px-3 flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-brand-primary/10 flex items-center justify-center">
            <RotateCcw size={12} className="text-brand-primary" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-[14px] font-black text-brand-text">Buy Again</h2>
            <p className="text-[9px] text-brand-text-muted font-bold uppercase tracking-wide">From your past orders</p>
          </div>
        </div>
      </div>
      <div className="flex overflow-x-auto gap-2.5 md:gap-4 px-3 pb-3 no-scrollbar">
        {products.map((product, i) => (
          <motion.div
            key={product.id}
            className="w-[130px] md:w-[200px] flex-shrink-0"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.2), type: "spring", stiffness: 300, damping: 24 }}
          >
            <ProductCard
              id={product.id} name={product.name} image={product.imageColor}
              price={product.price} originalPrice={product.originalPrice}
              weight={product.weight} tag={product.tag}
              brand={product.brand} category={product.category}
              description={product.description} details={product.details} nutrition={product.nutrition}
            />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

function ProductRow({ title, subtitle, products }: { title: string; subtitle: string; products: GroceryProduct[] }) {  return (
    <motion.section variants={sectionVariants} className="mt-5">
      <div className="px-3 flex items-center justify-between mb-2.5">
        <div>
          <h2 className="text-[14px] font-black text-brand-text">{title}</h2>
          <p className="text-[9px] text-brand-text-muted font-bold uppercase tracking-wide">{subtitle}</p>
        </div>
        <Link href="/categories" className="text-[10px] font-black text-brand-primary bg-gray-100 px-2.5 py-1 rounded-full flex items-center gap-0.5">
          View all <ChevronRight size={11} strokeWidth={3} />
        </Link>
      </div>
      <div className="flex overflow-x-auto gap-2.5 md:gap-4 px-3 pb-3 no-scrollbar">
        {products.map((product, i) => (
          <motion.div
            key={product.id}
            className="w-[130px] md:w-[200px] flex-shrink-0"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.15), type: "spring", stiffness: 300, damping: 24 }}
          >
            <ProductCard
              id={product.id} name={product.name} image={product.imageColor}
              price={product.price} originalPrice={product.originalPrice}
              weight={product.weight} tag={product.tag}
              brand={product.brand} category={product.category}
              description={product.description} details={product.details} nutrition={product.nutrition}
            />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

function ProductGrid({ title, products }: { title: string; products: GroceryProduct[] }) {
  return (
    <motion.section variants={sectionVariants} className="mt-3 px-3">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-[14px] font-black text-brand-text">{title}</h2>
        <div className="badge-hot text-white px-2.5 py-1 rounded-full text-[9px] font-black flex items-center gap-1">
          <Zap size={10} fill="white" strokeWidth={0} /> Limited time
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4 super-savings-grid">
        {products.slice(0, 4).map((product) => (
          <ProductCard
            key={product.id} id={product.id} name={product.name} image={product.imageColor}
            price={product.price} originalPrice={product.originalPrice}
            weight={product.weight} tag={product.tag}
            brand={product.brand} category={product.category}
            description={product.description} details={product.details} nutrition={product.nutrition}
          />
        ))}
      </div>
    </motion.section>
  );
}

function RestaurantCard({ restaurant }: { restaurant: (typeof restaurants)[number] }) {
  const [ordering, setOrdering] = useState(false);
  const [ordered, setOrdered] = useState(false);

  const handleOrder = () => {
    setOrdering(true);
    setTimeout(() => { setOrdering(false); setOrdered(true); setTimeout(() => setOrdered(false), 2000); }, 800);
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-2.5 shadow-soft flex gap-2.5">
      <div className={`w-[82px] h-[82px] rounded-xl bg-gradient-to-br ${restaurant.image} flex-shrink-0 relative overflow-hidden`}>
        <div className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[8px] font-black text-brand-text flex items-center gap-1">
          <Star size={10} className="text-amber-500 fill-amber-500" />
          {restaurant.rating}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-[13px] font-black text-brand-text truncate">{restaurant.name}</h3>
            <p className="text-[10px] text-brand-text-muted font-semibold mt-0.5 truncate">{restaurant.cuisine}</p>
          </div>
          <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full whitespace-nowrap">
            {restaurant.eta}
          </span>
        </div>
        <p className="text-[10px] font-bold text-brand-primary mt-1">{restaurant.offer}</p>
        <div className="flex items-center justify-between mt-1.5 gap-2">
          <p className="text-[9px] text-brand-text-muted line-clamp-1 flex-1">{restaurant.popular.join(", ")}</p>
          <button onClick={handleOrder} disabled={ordering || ordered}
            className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-black transition-colors ${ordered ? "bg-brand-accent text-white" : "bg-brand-primary text-white"}`}>
            {ordered ? "✓ Added" : ordering ? "..." : "Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
