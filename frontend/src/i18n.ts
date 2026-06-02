import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

void i18n
    .use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: "en",
        supportedLngs: ["en", "de", "fr", "it", "ru"],
        debug: false,
        ns:
            [
                "auth",
                "common",
                "errors",
                "hosts",
                "keys",
                "identities",
                "snippets",
                "forwards",
                "sftp",
                "settings",
                "terminal",
                "update",
                "tabgroups",
                "palette",
                "sessionRestore",
                "commandHistory",
            ],
        defaultNS: "common",
        interpolation: {
            escapeValue: false,
        },
        backend: {
            loadPath: "/locales/{{lng}}/{{ns}}.json",
        },
    });

export default i18n;