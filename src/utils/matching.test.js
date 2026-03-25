import test from "node:test";
import assert from "node:assert/strict";

import { findBestMatch, findBestMatchInArea } from "./matching.js";

const catalogItems = [
  {
    id: "stock-item-1",
    name: "Tomatoes",
    aliases: ["tomato"],
    area: "kitchen",
  },
  {
    id: "stock-item-2",
    name: "Red Onion",
    aliases: ["onion"],
    area: "dry-store",
  },
];

test("findBestMatch returns exact matches when the catalog name matches directly", () => {
  const result = findBestMatch("Tomatoes", catalogItems);

  assert.equal(result.matchType, "exact");
  assert.equal(result.matchedItem?.id, "stock-item-1");
});

test("findBestMatch returns fuzzy matches for close aliases", () => {
  const result = findBestMatch("onions", catalogItems);

  assert.equal(result.matchType, "fuzzy");
  assert.equal(result.matchedItem?.id, "stock-item-2");
});

test("findBestMatchInArea respects the selected area filter", () => {
  const result = findBestMatchInArea("onion", "kitchen", catalogItems);

  assert.equal(result.matchType, "none");
  assert.equal(result.matchedItem, null);
});
