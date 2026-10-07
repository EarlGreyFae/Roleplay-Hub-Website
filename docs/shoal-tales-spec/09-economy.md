# Economy and Bonuses (Section 9)

Coins are the game's only currency, earned by selling, requests, and the Emporium.

## Pacing targets (the owner's)
- About 2 hours from a fresh save to all four stations, a full 32-item basket and the Emporium, with the first retirement right after.
- Each later run about 15 minutes longer than the last.
- Unlocks (stations, basket levels) keep arriving until about 85% of each run, rather than ending in an hour of pure saving.
- After the 8th retirement (every area and depth open), each further retirement adds +3% luck.

These were tuned with a simulated casual player playing the real economy, Emporium included. Simulated run lengths: 118, 133, 151, 164, 180, 203, 210, 220, 238, 265 minutes for runs 1-10.

(Per Open Items: pacing was tuned for Minecraft's two-clicks-in-a-chest-menu sorting; drag-to-bin on web may be faster, so validate the 2-hour first run against real web players before locking these numbers in.)

## Retire goals (coins on hand) and unlock scale, by run

| Run (retirements so far) | Coins on hand to retire | Unlock scale |
|---|---|---|
| 1 (0) | 1,000 | x1 |
| 2 (1) | 14,000 | x2.75 |
| 3 (2) | 27,000 | x5 |
| 4 (3) | 32,500 | x9 |
| 5 (4) | 46,000 | x14 |
| 6 (5) | 45,000 | x20 |
| 7 (6) | 88,000 | x24 |
| 8 (7) | 103,000 | x29 |
| 9 (8) | 165,000 | x38 |
| 10 (9) | 200,000 | x44 |
| Later | x1.1 per run (rounded to 1,000) | x1.06 per run |

"Unlock scale" multiplies station costs and upgrade-formula costs (see 08-stations-upgrades.md) — it scales the whole economy up each retirement/run so stations don't stay trivially cheap on NG+.

## Where value comes from
- The area multiplier (x1 to x5) — see map areas table, 03-dredging.md.
- The streak (up to x2).
- Payout bonuses: +10% per retirement, set and magic-curio bonuses, Emporium decorations, the back room, guild and party bonuses, the pet's treat, and tides.
- Station factors and supply add-ins (08-stations-upgrades.md).

## The Emporium's own earnings formula
Drinks, puzzles, away earnings, and daily rewards all use one formula so they grow with the rest of the game:
```latex
pay = base \cdot area \cdot (1 + b_{payout})
```

## Fixed prices
- The Emporium costs 6,000 coins plus rare materials (see Story requests, 07-story.md).
- A guild costs 1,500 coins.
- The back room costs 250,000 coins.
- Station costs and upgrade formulas: see 08-stations-upgrades.md.

## All bonus types (`b_x` in the formulas throughout this spec)

| Bonus | Effect |
|---|---|
| payout | + value on everything sorted and fish on ice |
| time | - dredge time (all sources capped at 50%) |
| curio | + curio value |
| luck | + chance of curios, crates, bottles and magic curios, and better rarity |
| rarity | better curio rarity rolls |
| basket | + items per haul, above the 32 cap |
| streakCap | + maximum streak bonus (normally +100%) |
| streakStep | + streak bonus per sort (normally +5%) |
| townPrice | + prices when selling in Town |
| fish | + fish value |
| crate | + coins from crates |
| kindness | + coins for setting creatures free |
| forgive | wrong bins pay more than 40% |
| doubleScrub | chance a scrub counts twice |
| extraItem | chance each haul brings one bonus item |
| letters | + chance a bottle holds a letter |
| magic | + chance of magic curios |
| bin (per bin) | + value for one kind of sorted goods |

These bonus-type names are exactly what's referenced throughout collectors-sets.csv's "Completion bonus" column and the magic curios table (06-curios.md) — e.g. "payout +5%" sets `b_payout`, "+15% sorted plastic" sets the Plastic `bin` bonus, etc.
