import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const browserApps = ["apps/hub-web/src/**/*.{ts,tsx}", "apps/marketing-site/src/**/*.{ts,tsx}", "apps/docs/src/**/*.{ts,tsx}"];

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/.turbo/**",
      "**/node_modules/**",
      "apps/hub-web/playwright-report/**",
      "apps/hub-web/test-results/**",
      // Local agent/editor tooling, not product source (see .gitignore).
      ".remember/**",
      ".specstory/**",
      ".impeccable/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]
    }
  },
  {
    files: browserApps,
    languageOptions: {
      globals: globals.browser
    },
    plugins: {
      "react-hooks": reactHooks
    },
    rules: {
      ...reactHooks.configs.recommended.rules
    }
  },
  {
    files: ["packages/**/src/**/*.ts", "apps/*/e2e/**/*.{ts,mjs}", "*.{ts,mjs}"],
    languageOptions: {
      globals: globals.node
    }
  },
  {
    files: ["**/*.test.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
);
