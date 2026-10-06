import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist", "coverage", "reference"]),

  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },

  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/core/**"],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: { globals: globals.browser },
  },

  // src/core stays framework-free and DOM-free (CLAUDE.md, Architecture).
  // tsconfig.core.json catches DOM globals; this catches imports.
  {
    files: ["src/core/**/*.ts", "tests/core/**/*.ts"],
    rules: {
      // Numeric loops index typed arrays in range by construction, but noUncheckedIndexedAccess
      // still types every read as possibly undefined.
      "@typescript-eslint/no-non-null-assertion": "off",
      "no-restricted-imports": [
        "error",
        {
          paths: ["react", "react-dom", "zustand", "comlink", "three"].map((name) => ({
            name,
            message: "src/core must stay framework-free so it runs in workers, tests and Node.",
          })),
          patterns: [
            {
              group: ["**/ui/**", "**/state/**", "**/render/**", "**/workers/**"],
              message: "src/core must not depend on the app layers.",
            },
          ],
        },
      ],
    },
  },

  {
    files: ["**/*.js"],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },

  prettier,
]);
