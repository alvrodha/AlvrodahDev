import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

// Run through `npm test` (scripts/vitest.js) — see the note there about Windows paths.
export default defineConfig((env) =>
    mergeConfig(viteConfig(env), {
        test: {
            environment: "jsdom",
            include: ["tests/**/*.test.js"],
            testTimeout: 15000,
        },
    }),
);
