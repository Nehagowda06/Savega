"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Check, ChevronDown, Clock, Home, MapPin, Navigation, Plus, Search, User, X } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSearchStore } from "@/store/searchStore";
import { MANDYA_CENTER } from "@/components/ui/LeafletMap";

// Dynamically import map to avoid SSR issues
const LeafletMap = dynamic(() => import("@/components/ui/LeafletMap"), { ssr: false });

const placeholders = [
  'Search "milk"',
  'Search "biryani"',
  'Search "atta"',
  'Search "pizza"',
  'Search "fresh fruits"',
  'Search "detergent"',
];

// Quick autocomplete suggestions derived from product names
const SUGGESTIONS = [
  "tomatoes", "onion", "potato", "milk", "curd", "paneer", "butter",
  "atta", "rice", "dal", "ghee", "chips", "biscuits", "chocolate",
  "tea", "coffee", "juice", "soap", "shampoo", "detergent",
  "banana", "mango", "apple", "broccoli", "carrot",
];

const routesWithSearch = new Set(["/", "/categories"]);

const SAVED_ADDRESSES = [
  { id: "home", label: "Home", detail: "12, MG Road, Mandya", icon: Home, lat: 12.5218, lng: 76.8951 },
  { id: "work", label: "Work", detail: "45, Industrial Area, Mandya", icon: Briefcase, lat: 12.5280, lng: 76.9010 },
];

export default function Navbar() {
  const pathname = usePathname();
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const { query, setQuery, reset, recentSearches, addRecentSearch, clearRecentSearches } = useSearchStore();
  const showSearch = routesWithSearch.has(pathname);
  const [searchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Autocomplete suggestions filtered by current query
  const suggestions = query.trim().length > 0
    ? SUGGESTIONS.filter((s) => s.includes(query.toLowerCase())).slice(0, 5)
    : [];

  const showDropdown = searchFocused && (suggestions.length > 0 || recentSearches.length > 0) && !query.trim().length || (searchFocused && suggestions.length > 0);

  const handleSelectSuggestion = (s: string) => {
    setQuery(s);
    addRecentSearch(s);
    setSearchFocused(false);
    inputRef.current?.blur();
  };

  const handleSearchSubmit = () => {
    if (query.trim()) {
      addRecentSearch(query.trim());
      setSearchFocused(false);
      inputRef.current?.blur();
    }
  };

  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [activeAddressId, setActiveAddressId] = useState("home");
  const [addingNew, setAddingNew] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [pinLat, setPinLat] = useState<number | null>(null);
  const [pinLng, setPinLng] = useState<number | null>(null);

  const activeAddress = SAVED_ADDRESSES.find((a) => a.id === activeAddressId) ?? SAVED_ADDRESSES[0];

  useEffect(() => {
    if (!routesWithSearch.has(pathname)) reset();
  }, [pathname, reset]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleClose = () => { setShowAddressPicker(false); setAddingNew(false); setPinLat(null); setPinLng(null); };

  const mapMarkers = [
    // Always show the active address
    { lat: activeAddress.lat, lng: activeAddress.lng, label: activeAddress.label, color: "purple" as const },
    // Show pin if user tapped the map
    ...(pinLat !== null && pinLng !== null
      ? [{ lat: pinLat, lng: pinLng, label: "New location", color: "green" as const }]
      : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-purple-50 shadow-[0_2px_16px_rgba(95,37,159,0.1)]">
        <div className="px-3.5 md:px-8 py-2.5 md:py-4">
          <div className="flex items-center justify-between mb-2.5 md:mb-4">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <motion.img
                src="/savega logo.svg" alt="Savega"
                className="w-9 h-9 md:w-14 md:h-14 object-contain flex-shrink-0"
                whileTap={{ rotate: -10, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[8px] md:text-[13px] font-black text-brand-primary uppercase tracking-wider">savega</span>
                  <span className="badge-hot text-white text-[7px] md:text-[11px] font-black px-1.5 md:px-2.5 py-0.5 rounded-full">10 mins</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddressPicker(true)}
                  className="flex items-center gap-1 min-w-0 group"
                  aria-label="Change delivery address"
                >
                  <MapPin size={11} className="text-brand-primary flex-shrink-0 md:w-5 md:h-5" strokeWidth={3} />
                  <span className="text-[12px] md:text-[18px] font-black text-brand-text leading-none truncate max-w-[150px] md:max-w-xs">
                    {activeAddress.label} - Mandya
                  </span>
                  <motion.span
                    animate={{ rotate: showAddressPicker ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown size={12} className="text-brand-primary md:w-5 md:h-5" strokeWidth={3} />
                  </motion.span>
                </button>
              </div>
            </div>

            <Link href="/profile">
              <motion.div
                whileTap={{ scale: 0.88 }}
                whileHover={{ scale: 1.05 }}
                className="w-9 h-9 md:w-14 md:h-14 rounded-full savega-gradient flex items-center justify-center text-white cursor-pointer shadow-[0_4px_12px_rgba(95,37,159,0.35)]"
                aria-label="Profile"
              >
                <User size={16} className="md:w-6 md:h-6" strokeWidth={2.5} />
              </motion.div>
            </Link>
          </div>

          {showSearch && (
            <div className="relative">
              <div className="absolute inset-y-0 left-3 md:left-5 flex items-center pointer-events-none z-10">
                <motion.div
                  animate={{ color: query ? "#6941c6" : "#8fa0b8" }}
                  transition={{ duration: 0.2 }}
                >
                  <Search size={15} className="md:w-5 md:h-5" strokeWidth={2.5} />
                </motion.div>
              </div>
              <div className="search-bar relative w-full h-10 md:h-14 rounded-xl md:rounded-2xl flex items-center overflow-hidden">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                  className="w-full h-full pl-9 md:pl-14 pr-16 md:pr-24 bg-transparent text-[12px] md:text-[16px] font-medium focus:outline-none z-10 text-brand-text"
                  aria-label="Search Savega" placeholder="" />
                {!query && (
                  <div className="absolute left-9 md:left-14 inset-y-0 flex items-center pointer-events-none z-0">
                    <AnimatePresence mode="wait">
                      <motion.span key={placeholderIdx}
                        initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-brand-text-muted text-[12px] md:text-[16px] font-medium">
                        {placeholders[placeholderIdx]}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                )}
              </div>
              <div className="absolute right-3 md:right-5 inset-y-0 flex items-center z-10 gap-1">
                <AnimatePresence mode="wait">
                  {query ? (
                    <motion.button key="clear" type="button" onClick={() => reset()}
                      initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                      className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary"
                      aria-label="Clear search">
                      <X size={11} strokeWidth={3} />
                    </motion.button>
                  ) : (
                    <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-[11px] md:text-[15px] font-black text-brand-primary">
                      Search
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Autocomplete / recent searches dropdown */}
              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 500, damping: 32 }}
                    className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[55]"
                  >
                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                      <div>
                        {suggestions.map((s) => (
                          <button key={s} onMouseDown={() => handleSelectSuggestion(s)}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 text-left">
                            <Search size={11} className="text-brand-text-muted flex-shrink-0" strokeWidth={2} />
                            <span className="text-[12px] text-brand-text">
                              {s.slice(0, query.length) === query.toLowerCase()
                                ? <><span className="font-black text-brand-primary">{s.slice(0, query.length)}</span>{s.slice(query.length)}</>
                                : s}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Recent searches — only when no query */}
                    {!query.trim() && recentSearches.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                          <span className="text-[9px] font-black text-brand-text-muted uppercase tracking-wider">Recent</span>
                          <button onMouseDown={clearRecentSearches} className="text-[9px] font-black text-brand-primary">Clear</button>
                        </div>
                        {recentSearches.map((r) => (
                          <button key={r} onMouseDown={() => handleSelectSuggestion(r)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left">
                            <Clock size={11} className="text-brand-text-muted flex-shrink-0" strokeWidth={2} />
                            <span className="text-[12px] text-brand-text">{r}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </header>

      {/* Address picker modal */}
      <AnimatePresence>
        {showAddressPicker && (
          <>
            <motion.div key="addr-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[59]" onClick={handleClose} />
            <motion.div key="addr-modal"
              initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none px-4">
              <div className="w-full max-w-[360px] bg-white rounded-3xl overflow-hidden pointer-events-auto shadow-2xl flex flex-col max-h-[85vh]">

                {/* Map */}
                <div className="relative">
                  <LeafletMap
                    center={[activeAddress.lat, activeAddress.lng]}
                    zoom={14}
                    markers={mapMarkers}
                    className="h-44"
                    selectable
                    onLocationSelect={(lat, lng) => { setPinLat(lat); setPinLng(lng); }}
                  />
                  <div className="absolute top-2 right-2 z-[400]">
                    <button onClick={handleClose}
                      className="w-7 h-7 rounded-full bg-white shadow-soft flex items-center justify-center text-brand-text">
                      <X size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                  {pinLat !== null && (
                    <div className="absolute bottom-2 left-2 right-2 z-[400] bg-white/95 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-soft">
                      <Navigation size={12} className="text-brand-accent flex-shrink-0" strokeWidth={2.5} />
                      <p className="text-[10px] font-bold text-brand-text truncate">
                        {pinLat.toFixed(4)}, {pinLng!.toFixed(4)}
                      </p>
                      <button onClick={() => { setPinLat(null); setPinLng(null); }}
                        className="ml-auto text-[9px] font-black text-brand-primary">Clear</button>
                    </div>
                  )}
                </div>

                <div className="p-4 overflow-y-auto no-scrollbar">
                  <h3 className="text-sm font-black text-brand-text mb-3">Deliver to</h3>

                  {/* Saved addresses */}
                  <div className="space-y-2 mb-3">
                    {SAVED_ADDRESSES.map((addr) => {
                      const Icon = addr.icon;
                      const isActive = activeAddressId === addr.id;
                      return (
                        <button key={addr.id} type="button"
                          onClick={() => { setActiveAddressId(addr.id); handleClose(); }}
                          className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-colors text-left ${isActive ? "bg-brand-primary/10 border-brand-primary" : "bg-gray-50 border-gray-100"}`}>
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? "bg-brand-primary text-white" : "bg-white text-gray-500 border border-gray-100"}`}>
                            <Icon size={16} strokeWidth={2} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-brand-text">{addr.label}</p>
                            <p className="text-[10px] text-brand-text-muted truncate">{addr.detail}</p>
                          </div>
                          {isActive && <Check size={15} strokeWidth={3} className="text-brand-primary flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Add new */}
                  {addingNew ? (
                    <div className="space-y-2">
                      <input autoFocus value={customInput} onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="Enter your address..."
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-xs font-bold text-brand-text focus:outline-none focus:border-brand-primary transition-colors" />
                      <div className="flex gap-2">
                        <button onClick={() => { setAddingNew(false); setCustomInput(""); }}
                          className="flex-1 h-9 rounded-xl border border-gray-200 text-xs font-black text-brand-text-muted">Cancel</button>
                        <button onClick={() => { setAddingNew(false); setCustomInput(""); handleClose(); }}
                          className="flex-1 h-9 rounded-xl bg-brand-primary text-white text-xs font-black">Save</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setAddingNew(true)}
                      className="w-full h-10 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center gap-2 text-xs font-bold text-brand-text-muted hover:border-brand-primary hover:text-brand-primary transition-colors">
                      <Plus size={14} strokeWidth={2.5} />
                      Add new address
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
