import { describe, expect, it } from "vitest";
import { markItem } from "../src/components/SceneCard";

describe("markItem", () => {
  it("marks the whole item where it appears, any case", () => {
    expect(markItem("Your wall clock honks 'Trochlear!' at you.", "Trochlear")).toEqual(["Your wall clock honks '", { mark: "Trochlear" }, "!' at you."]);
    expect(markItem("Oat milk pours from the lamp; oat milk everywhere.", "oat milk")).toEqual([{ mark: "Oat milk" }, " pours from the lamp; ", { mark: "oat milk" }, " everywhere."]);
  });

  it("falls back to the item's longer words when the whole item isn't there", () => {
    expect(markItem("The kettle pours soy over a giant sauce boat.", "soy sauce")).toEqual(["The kettle pours ", { mark: "soy" }, " over a giant ", { mark: "sauce" }, " boat."]);
  });

  it("never marks letters inside other words (a one-letter item)", () => {
    expect(markItem("The cactus casts a C-shaped shadow.", "C")).toEqual(["The cactus casts a ", { mark: "C" }, "-shaped shadow."]);
    expect(markItem("Nothing here.", "Xe")).toEqual(["Nothing here."]);
  });

  it("is safe with regex characters in the item", () => {
    expect(markItem("Your lamp sings C++ all night.", "C++")).toEqual(["Your lamp sings ", { mark: "C++" }, " all night."]);
  });
});
