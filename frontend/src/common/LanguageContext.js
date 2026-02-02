import React, { createContext, useContext, useState, useEffect } from "react";

const STORAGE_KEY = "dnsmanager_lang";
const DEFAULT_LANG = "en";

const LanguageContext = createContext({
  language: DEFAULT_LANG,
  setLanguage: () => {},
  t: (key) => key,
});

function getStoredLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "ru") return stored;
  } catch (e) {}
  return DEFAULT_LANG;
}

export function LanguageProvider(props) {
  const [language, setLanguageState] = useState(getStoredLanguage);
  const [translations, setTranslations] = useState({});

  useEffect(() => {
    import("../locales/" + language + ".json")
      .then((mod) => setTranslations(mod.default || mod))
      .catch(() => setTranslations({}));
  }, [language]);

  const setLanguage = (lang) => {
    if (lang !== "en" && lang !== "ru") return;
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {}
  };

  const t = (key, vars) => {
    let value = translations[key];
    if (value === undefined) return key;
    if (vars && typeof value === "string") {
      Object.keys(vars).forEach((k) => {
        value = value.replace(new RegExp("{{" + k + "}}", "g"), String(vars[k]));
      });
    }
    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {props.children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used within LanguageProvider");
  return ctx;
}

export default LanguageContext;
