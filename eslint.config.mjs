import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Flags the standard "fetch-on-mount in useEffect" pattern used by
      // every hook in lib/hooks/ (useClientes, useVentas, etc.), which is
      // exactly the pattern documented in arquitect.md. Avoiding it would
      // require adopting a data-fetching library (SWR/React Query), which
      // is out of scope for this project's simple custom-hooks approach.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
