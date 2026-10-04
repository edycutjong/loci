// Example lists, so anyone can try Loci in seconds. Each line is one item; " / " adds an accepted answer.
export type ExampleList = { id: string; name: string; note: string; text: string };

export const EXAMPLE_LISTS: ExampleList[] = [
  {
    id: "cranial-nerves",
    name: "12 cranial nerves",
    note: "In order, for anatomy",
    text: [
      "Olfactory",
      "Optic",
      "Oculomotor",
      "Trochlear",
      "Trigeminal",
      "Abducens",
      "Facial",
      "Vestibulocochlear / auditory",
      "Glossopharyngeal",
      "Vagus",
      "Accessory",
      "Hypoglossal",
    ].join("\n"),
  },
  {
    id: "elements",
    name: "First 12 elements",
    note: "Hydrogen to magnesium",
    text: ["Hydrogen", "Helium", "Lithium", "Beryllium", "Boron", "Carbon", "Nitrogen", "Oxygen", "Fluorine", "Neon", "Sodium / Na", "Magnesium"].join("\n"),
  },
  {
    id: "groceries",
    name: "Grocery run",
    note: "10 things, no list in hand",
    text: ["Oat milk", "Basil", "Lemons", "Rice", "Eggs", "Coffee beans", "Dish soap", "Tomatoes", "Garlic", "Bread"].join("\n"),
  },
];
