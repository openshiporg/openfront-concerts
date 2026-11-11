import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Legacy-code rules are downgraded to warnings so `npm run lint` gates on the rest.
const WARN = new Set([
  "@typescript-eslint/no-explicit-any",
  "@typescript-eslint/ban-ts-comment",
  "@typescript-eslint/no-require-imports",
  "@next/next/no-assign-module-variable",
  "react/no-unescaped-entities",
  "react/no-children-prop",
  "prefer-const",
  "react-hooks/rules-of-hooks",
  "react-hooks/preserve-manual-memoization",
  "react-hooks/purity",
  "react-hooks/static-components",
  "react-hooks/set-state-in-effect",
  "react-hooks/refs",
  "react-hooks/immutability",
  "react-hooks/error-boundaries",
]);

const soften = (cfg) => cfg.rules
  ? { ...cfg, rules: Object.fromEntries(Object.entries(cfg.rules).map(([k, v]) => [k, WARN.has(k) ? "warn" : v])) }
  : cfg;

export default [
  { ignores: [".next/**", ".keystone/**", "node_modules/**", "migrations/**"] },
  ...[...nextVitals, ...nextTs].map(soften),
  { rules: Object.fromEntries([...WARN].filter((k) => !k.includes("/") || k.startsWith("@typescript") || k === "prefer-const" || k.startsWith("@next")).map((k) => [k, "warn"])) },
];
