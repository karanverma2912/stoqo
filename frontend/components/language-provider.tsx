"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { LANGUAGE_KEY, translate, type Language } from "@/lib/i18n";

type LanguageContext = {
  language: Language;
  setLanguage: (language: Language) => void;
  tr: (text: string, values?: Record<string, string | number>) => string;
};
const Context = createContext<LanguageContext | null>(null);
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, updateLanguage] = useState<Language>("en");
  useEffect(() => {
    try {
      if (localStorage.getItem(LANGUAGE_KEY) === "hi") updateLanguage("hi");
    } catch {
      /* Private storage can be unavailable. */
    }
    const sync = (event: StorageEvent) => {
      if (event.key === LANGUAGE_KEY)
        updateLanguage(event.newValue === "hi" ? "hi" : "en");
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  const setLanguage = useCallback((next: Language) => {
    updateLanguage(next);
    try {
      localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      /* Keep the in-memory choice working. */
    }
  }, []);
  const value = useMemo(
    () => ({
      language,
      setLanguage,
      tr: (text: string, values?: Record<string, string | number>) =>
        translate(language, text, values),
    }),
    [language, setLanguage],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLanguage() {
  const context = useContext(Context);
  if (!context) throw new Error("LanguageProvider is required");
  return context;
}
export function TranslatedText({ text }: { text: string }) {
  const { tr } = useLanguage();
  return <>{tr(text)}</>;
}
export function LanguageSetting() {
  const { language, setLanguage, tr } = useLanguage();
  return (
    <label>
      {tr("Language")}
      <select
        aria-label={tr("App language")}
        value={language}
        onChange={(event) =>
          setLanguage(event.target.value === "hi" ? "hi" : "en")
        }
      >
        <option value="en">English</option>
        <option value="hi">हिन्दी</option>
      </select>
      <small className="muted">
        {tr("Applies across Stoqo on this browser.")}
      </small>
    </label>
  );
}
