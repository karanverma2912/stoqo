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
  hero: string;
  heroInk: string;
  warning: string;
};
const light: Palette = {
  bg: "#F5F5F0",
  card: "#FFFFFF",
  ink: "#19362A",
  muted: "#617065",
  line: "#E6EBE3",
  primary: "#245A40",
  accent: "#D9F79D",
  soft: "#EAF0E7",
  danger: "#AC363C",
  onPrimary: "#FFFFFF",
  hero: "#173F2E",
  heroInk: "#F6FAEF",
  warning: "#A36D24",
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
  hero: "#1A3C2C",
  heroInk: "#F0F7E7",
  warning: "#EEC47D",
};
const extra: Record<string, string> = {
  "Make it feel like you": "अपनी पसंद का रूप दें",
  System: "सिस्टम",
  Light: "हल्का",
  Dark: "गहरा",
  Home: "होम",
  Workspace: "वर्कस्पेस",
  Assistant: "सहायक",
  "Sign in": "साइन इन",
  "Create account": "अकाउंट बनाएँ",
  "Your name": "आपका नाम",
  "Email address": "ईमेल पता",
  Password: "पासवर्ड",
  "A good day\nstarts here.": "एक अच्छे दिन की\nशुरुआत यहाँ से।",
  "Your stock. Your sales. Your people.": "आपका स्टॉक। आपकी बिक्री। आपकी टीम।",
  "Make room for growth.": "तरक्की के लिए तैयार हो जाएँ।",
  "Welcome back.": "फिर से स्वागत है।",
  "Let's get you back in.": "फिर से शुरू करते हैं।",
  "Create one account for all your stores.":
    "अपने सभी स्टोर के लिए एक अकाउंट बनाएँ।",
  "Your store is ready when you are.": "आपका स्टोर आपके लिए तैयार है।",
  "We'll send a reset link to your email.":
    "हम आपके ईमेल पर पासवर्ड रीसेट लिंक भेजेंगे।",
  "Back to sign in": "साइन इन पर वापस जाएँ",
  "Let's go": "शुरू करें",
  "Create my account": "मेरा अकाउंट बनाएँ",
  "Send reset link": "रीसेट लिंक भेजें",
  "One account. Every store.": "एक अकाउंट। हर स्टोर।",
  "Good morning": "सुप्रभात",
  "Good afternoon": "नमस्कार",
  "Good evening": "शुभ संध्या",
  "Let's make today\na good one.": "आज का दिन\nबेहतर बनाते हैं।",
  "Inventory retail value": "स्टॉक का बिक्री मूल्य",
  products: "उत्पाद",
  "stock units": "स्टॉक यूनिट",
  "Scan & sell": "स्कैन और बिक्री",
  "New sale": "नई बिक्री",
  "Add product": "उत्पाद जोड़ें",
  "Low stock": "कम स्टॉक",
  "Out of stock": "स्टॉक खत्म",
  "In stock": "स्टॉक में है",
  "A little attention": "थोड़ा ध्यान दें",
  "View inventory": "इन्वेंटरी देखें",
  "Looking good.": "सब अच्छा है।",
  "Your products are above their low-stock thresholds.":
    "आपके उत्पादों का स्टॉक तय न्यूनतम सीमा से ऊपर है।",
  "See the bigger picture": "पूरा हाल देखें",
  "Sales, your team, and today's totals.":
    "बिक्री, आपकी टीम और आज का कुल हिसाब।",
  "Your inventory": "आपकी इन्वेंटरी",
  "A place for every product.": "हर उत्पाद के लिए एक जगह।",
  "Find a product": "उत्पाद खोजें",
  "All products": "सभी उत्पाद",
  "Your products": "आपके उत्पाद",
  "Search results": "खोज के नतीजे",
  "No matches just yet.": "कोई उत्पाद नहीं मिला।",
  "Try another name, barcode or stock filter.":
    "दूसरा नाम, बारकोड या स्टॉक फ़िल्टर आज़माएँ।",
  "Clear filters": "फ़िल्टर हटाएँ",
  "Good things start small.": "अच्छी शुरुआत छोटे कदम से।",
  "Add your first product and give your stock a home.":
    "अपना पहला उत्पाद जोड़ें और स्टॉक सँभालें।",
  "Add your first product": "पहला उत्पाद जोड़ें",
  "Your workspace": "आपका वर्कस्पेस",
  "Everything your store needs, together.": "आपके स्टोर की हर ज़रूरत, एक जगह।",
  "Switch store": "स्टोर बदलें",
  "Sales & people": "बिक्री और ग्राहक",
  "Store tools": "स्टोर के टूल",
  "Make it yours": "अपनी पसंद बनाएँ",
  "Bills & returns": "बिल और रिटर्न",
  "Every sale, easy to find.": "हर बिक्री आसानी से खोजें।",
  "Keep your shelves ready.": "अपनी शेल्फ़ तैयार रखें।",
  "People, roles and access.": "लोग, भूमिकाएँ और पहुँच।",
  "Language, appearance and security.": "भाषा, रूप और सुरक्षा।",
  "A sale, made simple.": "बिक्री अब आसान।",
  "A few taps. A happy customer.": "कुछ टैप। एक खुश ग्राहक।",
  "Scan items": "आइटम स्कैन करें",
  "Add items": "आइटम जोड़ें",
  "The details": "जानकारी",
  "Customer is optional": "ग्राहक की जानकारी वैकल्पिक है",
  "Total to pay": "भुगतान का कुल",
  "Hold cart for later": "कार्ट बाद के लिए रखें",
  "Good things start here.": "अच्छी शुरुआत यहाँ से।",
  "Scan a barcode or choose a product to start your next bill.":
    "बारकोड स्कैन करें या उत्पाद चुनकर नया बिल बनाएँ।",
  "Scan a product": "उत्पाद स्कैन करें",
  "Browse inventory": "इन्वेंटरी देखें",
  "Saved for later": "बाद के लिए सहेजा",
  Resume: "जारी रखें",
  "Walk-in customer": "दुकान में आए ग्राहक",
  "Getting things ready…": "तैयार कर रहे हैं…",
  "Check your inbox.": "अपना इनबॉक्स देखें।",
  "Make room for\nyour next chapter.": "अपने नए सफ़र की\nशुरुआत करें।",
  "Give your store a name. We'll take care of the workspace.":
    "अपने स्टोर का नाम रखें। वर्कस्पेस हम तैयार कर देंगे।",
  "What kind of business?": "आपका व्यवसाय किस तरह का है?",
  "Retail store": "खुदरा स्टोर",
  Reseller: "रीसेलर",
  "Home business": "घर से व्यवसाय",
  Wholesale: "थोक व्यापार",
  "Create my store": "मेरा स्टोर बनाएँ",
  "I've verified my email": "मैंने ईमेल सत्यापित कर लिया है",
  "ONE QUICK CHECK": "बस एक छोटी जाँच",
  "LET'S SETTLE YOU IN": "चलिए शुरुआत करते हैं",
  "A little help. Right when you need it.": "थोड़ी मदद। ठीक ज़रूरत के समय।",
  "A helping hand,\nwhen you need one.": "जब ज़रूरत हो,\nमदद तैयार है।",
  "What's on your mind?": "आप क्या जानना चाहते हैं?",
  "Ask about stock, sales or your next step.":
    "स्टॉक, बिक्री या अगले कदम के बारे में पूछें।",
  "Send message": "संदेश भेजें",
  "Stoqo is thinking…": "स्टोको सोच रहा है…",
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
  "Reconnect to your store": "अपने स्टोर से फिर जुड़ें",
  "Your saved login is still here. Retry when your connection is ready.":
    "आपका लॉगिन सुरक्षित है। कनेक्शन ठीक होने पर फिर कोशिश करें।",
  "Use another account": "दूसरा अकाउंट इस्तेमाल करें",
  "Show password": "पासवर्ड दिखाएँ",
  "Hide password": "पासवर्ड छिपाएँ",
  "Use at least 12 characters.": "कम से कम 12 अक्षरों का इस्तेमाल करें।",
  "Password must be at least 12 characters.":
    "पासवर्ड कम से कम 12 अक्षरों का होना चाहिए।",
  "Password is too long. Use fewer characters.":
    "पासवर्ड बहुत लंबा है। कम अक्षरों का इस्तेमाल करें।",
  "Enter your name.": "अपना नाम दर्ज करें।",
  "Enter your email.": "अपना ईमेल दर्ज करें।",
  "Enter your password.": "अपना पासवर्ड दर्ज करें।",
  "This email already has an account. Sign in instead.":
    "इस ईमेल से अकाउंट पहले से बना हुआ है। साइन इन करें।",
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
