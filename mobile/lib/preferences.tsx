import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { translate as sharedTranslate } from "../../frontend/lib/i18n";
export type Language = "en" | "hi";
export type Palette = {
  bg: string;
  card: string;
  ink: string;
  muted: string;
  line: string;
  primary: string;
  accent: string;
  soft: string;
  danger: string;
  onPrimary: string;
};
const light: Palette = {
  bg: "#F4F6F1",
  card: "#FFFFFF",
  ink: "#172B21",
  muted: "#617467",
  line: "#DFE6DB",
  primary: "#174B32",
  accent: "#D5F887",
  soft: "#EAF0E4",
  danger: "#AC363C",
  onPrimary: "#FFFFFF",
};
const dark: Palette = {
  bg: "#0A1610",
  card: "#14271C",
  ink: "#EDF5E8",
  muted: "#A0B59F",
  line: "#2A4030",
  primary: "#C9F580",
  accent: "#C9F580",
  soft: "#1C3525",
  danger: "#FA9B9B",
  onPrimary: "#12210D",
};
const extra: Record<string, string> = {
  "Your stock. In a good place.": "आपका स्टॉक, सही जगह पर।",
  "Ask Stoqo": "स्टोको से पूछें",
  "Open a store": "स्टोर खोलें",
  "Create your store": "अपना स्टोर बनाएँ",
  "Today at a glance": "आज का हाल",
  "Daily overview": "दैनिक विवरण",
  "All set": "सब तैयार है",
  "Background alerts": "बैकग्राउंड सूचनाएँ",
  "Enable notifications": "सूचनाएँ चालू करें",
  "Voice input": "आवाज़ से लिखें",
  "Read aloud": "आवाज़ में सुनें",
  "Stop listening": "सुनना बंद करें",
  "Confirm task": "कार्य की पुष्टि करें",
  "Store AI assistant": "स्टोर एआई सहायक",
  "Inventory access": "इन्वेंटरी की जानकारी",
  "Live updates": "ताज़ा अपडेट",
  "Waiting for connection": "कनेक्शन की प्रतीक्षा",
  "Email verification": "ईमेल सत्यापन",
  "Resend verification": "सत्यापन फिर भेजें",
  "Check verification": "सत्यापन जाँचें",
  "Stock in": "स्टॉक जोड़ें",
  "Stock out": "स्टॉक निकालें",
  "Delete my account": "मेरा अकाउंट हटाएँ",
  Notifications: "सूचनाएँ",
  "Save supplier": "सप्लायर सहेजें",
  "Add supplier": "सप्लायर जोड़ें",
  "Buy price": "खरीद मूल्य",
  "Sell price": "बिक्री मूल्य",
  "Hold cart": "कार्ट रोकें",
  "Held carts": "रुके हुए कार्ट",
  "Something needs attention": "कुछ ध्यान देने की ज़रूरत है",
  Continue: "जारी रखें",
};
type Preferences = {
  language: Language;
  theme: "system" | "light" | "dark";
  setLanguage: (v: Language) => void;
  setTheme: (v: "system" | "light" | "dark") => void;
  colors: Palette;
  tr: (value: string) => string;
};
const Context = createContext<Preferences | null>(null);
export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const scheme = useColorScheme();
  const [language, setLanguageState] = useState<Language>("en"),
    [theme, setThemeState] = useState<"system" | "light" | "dark">("system");
  useEffect(() => {
    void SecureStore.getItemAsync("stoqo.preferences").then((raw) => {
      if (raw) {
        try {
          const v = JSON.parse(raw);
          if (["en", "hi"].includes(v.language)) setLanguageState(v.language);
          if (["system", "light", "dark"].includes(v.theme))
            setThemeState(v.theme);
        } catch {}
      }
    });
  }, []);
  const save = (lang: Language, mode: "system" | "light" | "dark") => {
    void SecureStore.setItemAsync(
      "stoqo.preferences",
      JSON.stringify({ language: lang, theme: mode }),
    );
  };
  const colors =
    (theme === "system" ? scheme : theme) === "dark" ? dark : light;
  const tr = (text: string) =>
    language === "hi" ? (extra[text] ?? sharedTranslate(language, text)) : text;
  return (
    <Context.Provider
      value={{
        language,
        theme,
        colors,
        tr,
        setLanguage(v) {
          setLanguageState(v);
          save(v, theme);
        },
        setTheme(v) {
          setThemeState(v);
          save(language, v);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePreferences() {
  const value = useContext(Context);
  if (!value) throw new Error("Preferences provider missing");
  return value;
}
