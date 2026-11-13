/**
 * Runs Vitest from a cwd with an uppercase Windows drive letter.
 * VS Code terminals often start in "c:\…", which makes Vitest load two copies of
 * its runner and fail with "Vitest failed to find the current suite".
 */
import { spawn } from "node:child_process";
import { join } from "node:path";

const cwd = process.cwd().replace(/^[a-z]:/, (drive) => drive.toUpperCase());
const vitestBin = join(cwd, "node_modules", "vitest", "vitest.mjs");

const child = spawn(process.execPath, [vitestBin, ...process.argv.slice(2)], { cwd, stdio: "inherit" });
child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
