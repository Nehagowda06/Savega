"use client";

import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import PageWrapper from "@/components/layout/PageWrapper";

const languages = ["English", "ಕನ್ನಡ", "हिन्दी"];

export default function SettingsPage() {
  const [lang, setLang] = useState("English");
  const [darkMode, setDarkMode] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  // Load saved dark mode preference on mount
  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved === "true") {
      setDarkMode(true);
      const appContainer = document.querySelector(".app-container") as HTMLElement;
      if (appContainer) {
        appContainer.style.background = "#111";
        appContainer.style.color = "#f0f0f0";
        appContainer.setAttribute("data-dark", "true");
      }
      document.documentElement.setAttribute("data-dark", "true");
    }
  }, []);

  // Apply dark mode to the html element whenever it changes
  const handleDarkModeToggle = () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    localStorage.setItem("darkMode", String(newValue));

    const appContainer = document.querySelector(".app-container") as HTMLElement;
    if (appContainer) {
      if (newValue) {
        appContainer.style.background = "#111";
        appContainer.style.color = "#f0f0f0";
        appContainer.setAttribute("data-dark", "true");
      } else {
        appContainer.style.background = "";
        appContainer.style.color = "";
        appContainer.removeAttribute("data-dark");
      }
    }

    // Also toggle on html for CSS class selectors
    if (newValue) {
      document.documentElement.setAttribute("data-dark", "true");
    } else {
      document.documentElement.removeAttribute("data-dark");
    }
  };

  const handleClearCache = () => {
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  };

  return (
    <PageWrapper>
      <div className="p-3 pb-28">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/profile">
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-brand-text">
              <ArrowLeft size={18} strokeWidth={2.5} />
            </div>
          </Link>
          <h1 className="text-base font-black text-brand-text">Settings</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden mb-3">
          <div className="flex items-center justify-between p-3 border-b border-gray-50">
            <div>
              <p className="text-xs font-black text-brand-text">Dark Mode</p>
              <p className="text-[10px] text-brand-text-muted mt-0.5">Switch to dark theme</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={darkMode}
              onClick={handleDarkModeToggle}
              style={{ width: 44, height: 24, borderRadius: 12, flexShrink: 0, position: "relative", border: "none", cursor: "pointer", transition: "background 0.2s", background: darkMode ? "#6941c6" : "#d1d5db" }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: darkMode ? 23 : 3,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "white",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                  transition: "left 0.2s",
                  display: "block",
                }}
              />
            </button>
          </div>

          <div className="p-3">
            <p className="text-xs font-black text-brand-text mb-2">Language</p>
            <div className="flex gap-2 flex-wrap">
              {languages.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors ${
                    lang === l
                      ? "bg-brand-primary text-white border-brand-primary"
                      : "bg-gray-50 text-brand-text border-gray-100"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden">
          <div className="p-3 border-b border-gray-50">
            <p className="text-xs font-black text-brand-text">App Version</p>
            <p className="text-[10px] text-brand-text-muted mt-0.5">1.0.42 (Build 142)</p>
          </div>
          <div className="p-3">
            <p className="text-xs font-black text-brand-text mb-1.5">Clear Cache</p>
            <button
              onClick={handleClearCache}
              className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl transition-colors ${
                cacheCleared ? "bg-brand-accent text-white" : "bg-red-50 text-red-500"
              }`}
            >
              {cacheCleared && <Check size={12} strokeWidth={3} />}
              {cacheCleared ? "Cache Cleared!" : "Clear App Cache"}
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
