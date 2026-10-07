# Shoal Tales: The Dredging Game — Extracted Design Spec

This is the full design of the dredging game as it is built and running today (as a Minecraft server minigame called "the Dredging Dimension" on The Fourth Seal Skyblock), extracted from the owner's "Shoal Tales: The Dredging Game Design Bible" document, in order to rebuild it as a browser-based feature inside Roleplay Hub.

Where the numbers come from (per the source doc): prices, timings, and rates come from the live game's code (build 125, server script `dredging.js`). Many are marked placeholder in the code; the pacing ones were tuned with a simulated casual player (see 09-economy.md).

## Glossary

| Term | Meaning |
|---|---|
| Haul | One drop of the dredge: a batch of items lands in the tray |
| Tray | Where the current catch waits to be sorted; must be emptied before the next haul |
| Bin | One of 7 recycling bins junk is sorted into |
| Run | One playthrough from a fresh boat to retiring it |
| Retire | The prestige reset: start a new run with lasting bonuses |
| Curio | A collectible found while dredging, logged in the Collector's Log |

## The core loop, at a glance
Every minute of play is the same short loop: drop the dredge, wait a few seconds, then sort the catch by hand. Sorted junk and fish become goods, goods become coins in Town, and coins buy a bigger basket, a faster winch, and new stations, so each haul is worth more.

Around that short loop sit two longer ones:
1. Curios and first catches fill the Collector's Log for permanent bonuses.
2. Each run ends with opening the Emporium and retiring the boat, which restarts the money loop with lasting bonuses, deeper water, and a new area.

## File map of this spec

| File | Covers |
|---|---|
| `03-dredging.md` | Dredge timer formula, haul rules, catch-type weights, depth, map areas |
| `04-sorting.md` | Bins, correct/wrong sort value formulas, station sort-moves, store-instead-of-sort |
| `05-fish.md` | Fish data, depth bands, the Cutting Board processing chain |
| `06-curios.md` | Curio tray items, rarity, what to do with a curio, magic curios, Creatures Seen, golden finds, bottle letters |
| `07-story.md` | Opening sequence, Crow's letters, townsfolk, selling, story requests, standing orders, daily requests |
| `08-stations-upgrades.md` | Work Table upgrades, the 4 stations, Priya's Commissions (processing add-ins), the storage chest |
| `09-economy.md` | Pacing targets, retire goals/unlock scale table, where value comes from, fixed prices, all bonus types |
| `10-emporium.md` | Sell Room, Shop Floor, the Counter (drink minigame), Puzzle Bench, Arcade, Prize Counter, Work Orders, tip jar, away earnings, visitors |
| `11-retiring.md` | Retiring requirements, what resets vs. is kept, retirement rewards, titles, endgame |
| `12-cosmetics.md` | The Shipwright: hull/deck/sail/flag/pet/badge looks, Try It On, pets, radio |
| `13-social.md` | Parties, guilds, visits, gifts, player bottle letters, leaderboards, announcements |
| `14-extras.md` | Dailies, tides, events, stats, feat titles, settings, quest book, new-player guide, ambience |
| `16-minecraft-to-web.md` | What's Minecraft-specific vs. needs rebuilding for web, real-world time handling |
| `17-open-items.md` | What the owner flagged as still unresolved/placeholder |
| `junk.csv` | 67 junk items (name, found-in, bin, weight, base coins, description) |
| `curios.csv` | 150 curios across 30 sets (name, set, base coins, sorts-into, description) |
| `fish.csv` | 84 fish across 28 sets (name, set, weight, base coins, depths, description) |
| `collectors-sets.csv` | 30 Collector's Log sets (area, completion bonus, member curios/fish) |
| `decorations.csv` | 20 Emporium decorations (name, rarity, value bonus) |
| `bottle-letters.csv` | 16 built-in placeholder bottle letters |

See `../roleplay-hub-manual.md` (sent to the user separately) for how this slots into the existing Roleplay Hub app — single-file architecture, existing role/permission system, theming, etc.
