# Curios, the Collection (Section 6)

Besides junk and fish, a haul can contain curios and other special items. Full curio data: `curios.csv` (150 items, 30 sets of 5). Collector's Sets (with completion bonuses): `collectors-sets.csv`.

## Tray items and what clicking them does

| Tray item | What clicking it does |
|---|---|
| Encrusted Curio | Scrub it clean (4 clicks), which reveals what it is and rolls its rarity |
| Strange Curio | One of the 6 magic curios; scrub it the same way, then keep it forever |
| Sealed Crate | Pry it open: 50% coins (5-25 x crate bonus x area), 30% two more junk items, 20% a curio |
| Message in a Bottle | Uncork it: 35% a letter (x letter bonus), read later at the Desk; otherwise becomes an empty glass bottle to sort |
| Sea creature | Set it free for 2-6 coins (x kindness bonus x area); the first of each kind is logged in Creatures Seen |
| Puzzle box | Stowed for the Emporium's Puzzle Bench (section 10) |

## Rarity (curios, after scrubbing)

| Rarity | Value x | Base weight | Weight with shift s |
|---|---|---|---|
| Common | 1 | 60 | 60 x (1 - s) |
| Uncommon | 2 | 28 | 28 |
| Rare | 4 | 10 | 10 x (1 + 2s) |
| Epic | 10 | 2 | 2 x (1 + 3s) |

`s` = a rarity-shift stat (from rarity-boosting bonuses, e.g. Wonderwater set "rarity +10%", the Glowing Pearl magic curio "+25% better curio rarity") that shifts weight away from Common toward Rare/Epic.

A curio is identified by scrubbing (see Tray items above); its name and set are then revealed.

## What to do with a curio
- **Add to Collector's Log**: only when it's new, or a rarer copy of one already logged (the better copy replaces it).
- **Donate**: only when in a guild whose Guild Log still needs it (section 13 / social.md).
- **Sell**: coins straight away, for its full value.
- **Store**: keep it in Stored Curios (kept through retiring) to log, donate, sell, gift, or process later. Wood/metal/mixed curios can be processed at their matching station like stored junk, worth value x the station's factor. Rare and epic ones ask for a confirm click first.
- **Sort**: break it down like junk — pick a bin, then Confirm. Every curio has a bin by what it's mostly made of (the "Sorts into" column in curios.csv). The right bin gives 2 sorted units worth its value x streak; the wrong bin gives 40% and resets the streak. An Inspect button gives a material hint without naming the bin.

## The Collector's Log
Is the log/album of every fish and curio found — completing a set grants that set's bonus (see collectors-sets.csv). There are 28 area sets (150 curios + 84 fish) plus Party Favours and Guild Keepsakes (curio-only, social-only sets).

## Magic curios (6 total — "Strange Curios")

| Magic curio | Bonus |
|---|---|
| Mermaid's Comb | +10% value on everything sorted |
| Tide Clock | 5% faster dredging |
| Sea-Glass Lantern | +1 basket slot (above the 32 cap) |
| Siren's Locket | +25% curio value |
| Glowing Pearl | +25% better curio rarity |
| Whispering Conch | +10% rare finds (luck) |

## Creatures Seen
A separate log of sea creatures released (not kept) — first release of each kind is logged.

## Golden finds
A rare "golden" variant of a fish; worth x3 its normal value (see Fish in the cooler formula, 04-sorting.md).

## Empty bottles & bottle letters
A Message in a Bottle either yields a letter (35% chance, x letter bonus — see Film Noir set "letters +25%") read later at the Desk, or becomes an empty glass bottle to sort. 16 unique letters: `bottle-letters.csv`.
