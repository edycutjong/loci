import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Reads the real token file, so a colour change that breaks WCAG AA fails here.
const css = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");
const token = (name: string) => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --${name} not found`);
  return m[1];
};
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("colour contrast (WCAG 2.2 AA)", () => {
  const grounds = ["night-900", "night-800", "night-700"];
  it("text colours reach 4.5:1 on every night tone", () => {
    for (const text of ["moon-100", "moon-300", "moon-500"]) for (const ground of grounds) expect(ratio(token(text), token(ground)), `${text} on ${ground}`).toBeGreaterThanOrEqual(4.5);
  });
  it("state colours and control outlines reach 3:1 on every night tone", () => {
    for (const mark of ["lit", "miss", "line", "moon-500"]) for (const ground of grounds) expect(ratio(token(mark), token(ground)), `${mark} on ${ground}`).toBeGreaterThanOrEqual(3);
  });
  it("dark numerals and ticks on green, coral and white pins reach 4.5:1", () => {
    for (const pin of ["lit", "miss", "moon-100"]) expect(ratio(token("night-900"), token(pin)), `night-900 on ${pin}`).toBeGreaterThanOrEqual(4.5);
  });
});
