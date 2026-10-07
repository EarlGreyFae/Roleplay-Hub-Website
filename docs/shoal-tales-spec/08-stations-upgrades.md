# Stations and Upgrades (Section 8)

## Upgrades (Work Table)
"Buy What I Can Afford" buys as many levels in a row as coins cover — two clicks: first shows what it would buy, second buys.

| Upgrade | Levels | Appears at basket | Cost of next level (L = levels owned) | Effect per level |
|---|---|---|---|---|
| Bigger Basket | 29 (3 to 32 items) | Start | round(20 + 1.2 x L x L) x unlock scale | +1 item per haul |
| Faster Winch | 12 | 6 | round(15 x 1.6^L) | Dredge time x0.88 |
| Soft Brush | 3 | 10 | round(60 x 3^L) | One fewer scrub per curio (4 down to 1) |
| Lucky Charm | 10 | 16 | round(100 x 1.6^L) | +5% rare finds |

Each upgrade appears once the basket (bought levels only) reaches the listed size.

## Stations
Arrive one at a time, strictly in order, once the Town is open. Each has a hidden requirement: an amount handled since the last station was installed. Until met, the station's empty spot on the Work Table shows a vague hint that sharpens as you approach, never exact numbers:
- under 25%: "It feels a long way off."
- 25-50%: "You're getting somewhere."
- 50-75%: "More than halfway there."
- 75% or more: "Almost there!"

Once the Emporium is open, the winch and the Desk show a progress bar toward the goal, plus anything else still missing (same spirit, more precise once that far in).

Once the requirement is met, the station is bought for coins with two clicks. Installing it resets the count, may move some junk to a different bin (section 4 — see 04-sorting.md's Station sorting rules table), opens a new buyer in Town, and brings a letter from Crow (first run only).

| Station | Cost (x unlock scale) | Hidden requirement | Makes | Value | Buyer |
|---|---|---|---|---|---|
| Oven | 400 | 25 fish dressed | Meals from dressed fish | Dressed fish x1.5 | Walt |
| Carpentry Bench | 1,200 | 60 units of wood | Knick-knacks from stored wood junk | Base x2 | Rosalind |
| Crucible | 2,500 | 80 units of metal | Ingots from stored metal junk | Base x2 | Hank |
| Recycling Machine | 3,000 | 20 units of mixed | Materials from stored mixed junk | Base x2.2 | Priya |

("unlock scale" is presumably a pacing/difficulty multiplier applied across a playthrough or NG+/retirement cycle — not yet pinned down verbatim; treat as a tunable constant, default 1, until clarified.)

## Priya's Commissions (processing add-ins)

| Supply | Price | Station | Effect |
|---|---|---|---|
| Limes | 1 | Cutting Board | x1.3 (dressed fish) |
| Sushi Rice | 3 | Cutting Board | Makes sushi instead, x1.6 |
| Herb Butter | 2 | Oven | x1.4 (meals) |
| Furniture Polish | 2 | Carpentry Bench | x1.5 (knick-knacks) |
| Borax Flux | 2 | Crucible | x1.4 (ingots) |
| Binding Resin | 2 | Recycling Machine | x1.4 (materials) |

## The storage chest
Shows everything held, by section: sorted goods per bin, food, crafts, stored junk waiting at each station, rare materials, supplies, empty bottles, and Stored Curios. Rare materials and supplies only appear once you've had one (no empty placeholder rows).
