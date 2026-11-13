import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export const root = process.cwd();

export function read(path) {
    return readFileSync(resolve(root, path), "utf8");
}

export function walk(directory, filter = () => true) {
    return readdirSync(directory).flatMap((name) => {
        const path = join(directory, name);
        return statSync(path).isDirectory() ? walk(path, filter) : filter(path) ? [path] : [];
    });
}

export function rel(path) {
    return relative(root, path).replaceAll("\\", "/");
}

/** Flattens a nested locale object into dot-notation keys. */
export function flatten(object, prefix = "") {
    return Object.entries(object).flatMap(([key, value]) =>
        value && typeof value === "object" && !Array.isArray(value)
            ? flatten(value, `${prefix}${key}.`)
            : [[`${prefix}${key}`, value]],
    );
}
