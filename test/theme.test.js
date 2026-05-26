import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_THEME, normalizeTheme, THEME_STORAGE_KEY } from "../public/app.js";

test("normalizeTheme falls back to light", () => {
  assert.equal(normalizeTheme("dark"), "dark");
  assert.equal(normalizeTheme("light"), "light");
  assert.equal(normalizeTheme("unknown"), DEFAULT_THEME);
});

test("theme storage key is stable", () => {
  assert.equal(THEME_STORAGE_KEY, "atsundown-theme");
});
