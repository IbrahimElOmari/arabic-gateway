import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import i18next from "eslint-plugin-i18next";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "i18next": i18next,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Warn on hardcoded literal strings in JSX – encourages i18n usage
      "i18next/no-literal-string": ["warn", {
        markupOnly: true,
        ignoreAttribute: [
          "className", "class", "style", "type", "id", "name", "htmlFor",
          "to", "href", "src", "alt", "placeholder", "data-testid",
          "variant", "size", "side", "align", "dir", "lang",
          "aria-label", "aria-labelledby", "aria-describedby",
          "role", "target", "rel", "method", "enctype", "crossorigin",
          "viewBox", "xmlns", "fill", "stroke", "d", "cx", "cy", "r",
          "offset", "stopColor", "strokeWidth", "strokeLinecap", "strokeLinejoin",
          "x1", "y1", "x2", "y2",
        ],
        ignore: [
          "^[^a-zA-Z]*$",       // non-alpha strings (numbers, symbols, emojis)
          "^[A-Z_]+$",          // CONSTANT_CASE
          "^\\s*$",             // whitespace only
        ],
      }],
    },
  },
  // Disable i18n rule for test files and config files
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/test/**", "**/e2e/**", "**/*.config.*"],
    rules: {
      "i18next/no-literal-string": "off",
    },
  },
);
