import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      ".codex-tmp/**",
      ".npm-cache/**",
      "next-env.d.ts",
      "supabase/functions/**",
    ],
  },
  ...compat.config({ extends: ["next/core-web-vitals", "next/typescript"] }),
];

export default config;
