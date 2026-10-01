import hindi from "./hi.json";
export type Language = "en" | "hi";
export const LANGUAGE_KEY = "stoqo-language";
const dictionary: Record<string, string> = hindi;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// These are known application messages, not arbitrary user-entered content.
const patterns = Object.keys(dictionary)
  .filter((key) => /\{\w+\}/.test(key))
  .map((key) => {
    const names = [...key.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
    const expression = new RegExp(
      "^" +
        key
          .split(/\{\w+\}/)
          .map(escape)
          .join("(.+?)") +
        "$",
      "s",
    );
    return { key, names, expression };
  });
export function translate(
  language: Language,
  text: string,
  values: Record<string, string | number> = {},
) {
  let translated = text;
  let replacements = values;
  if (language === "hi") {
    translated = dictionary[text] ?? text;
    if (translated === text && !Object.keys(values).length) {
      for (const pattern of patterns) {
        const match = pattern.expression.exec(text);
        if (match) {
          translated = dictionary[pattern.key];
          replacements = Object.fromEntries(
            pattern.names.map((name, index) => [name, match[index + 1]]),
          );
          break;
        }
      }
    }
  }
  return translated.replace(/\{(\w+)\}/g, (match, key: string) =>
    replacements[key] === undefined ? match : String(replacements[key]),
  );
}
