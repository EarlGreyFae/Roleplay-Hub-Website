# Shoal Tales: The Dredging Game — Design Bible

This is the complete, standalone design for Shoal Tales, independent of any
particular platform or engine. It supersedes the earlier `docs/shoal-tales-spec/`
extraction, which was written specifically to port the game onto the Roleplay
Hub website. This document is the real game design; the website was one
implementation of it, with its own platform constraints noted separately in
the final appendix, not folded into the rules below.

Six data files accompany this document, in this same folder, copied directly
from the source data with no changes: `junk.csv`, `curios.csv`, `fish.csv`,
`collectors-sets.csv`, `decorations.csv`, `bottle-letters.csv`.

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

Every minute of play is the same short loop: drop the dredge, wait a few
seconds, then sort the catch by hand. Sorted junk and fish become goods,
goods become coins in Town, and coins buy a bigger basket, a faster winch,
and new stations, so each haul is worth more.

Around that short loop sit two longer ones:
1. Curios and first catches fill the Collector's Log for permanent bonuses.
2. Each run ends with opening the Emporium and retiring the boat, which
   restarts the money loop with lasting bonuses, deeper water, and a new area.

---

# 1. Dredging

## Dredge time formula
```
t = 6s * (1 + 0.35*d) * 0.88^w * (1 - b_time)
```
Where `d` = depth level (0-3), `w` = winch upgrade level, `b_time` = any
time-reduction bonus (e.g. set bonuses). All time bonuses are capped at 50%
total reduction.

## Basket size / haul rules
- The first haul of each real-world day is 1.5x bigger (rounded up) and
  always includes a curio.
- A Spring Tide (a staff-started event, see Extras) adds 25% items.
- A haul is never more than 35 items (36 with a bonus item).
- The very first haul of a save always contains a fish.

## What each haul contains — selection weights
1. Puzzle box: 3% per item once the Emporium is open, x(1 + 0.5 per depth).
2. Magic curio: 0.6% per item until all six are found, x luck x(1 + 0.5 per depth).
3. Otherwise, roll by these catch-type weights:

| Kind | Weight | Changed by |
|---|---|---|
| Junk | 60 | -15% per depth (never below 20% of 60) |
| Fish | 22 | - |
| Curio | 7 | x(1 + luck), x(1 + 0.4 per depth); doubled during a Glass Tide |
| Crate | 5 | x(1 + luck), x(1 + 0.4 per depth) |
| Message in a bottle | 4 | x(1 + luck), x(1 + 0.4 per depth) |
| Sea creature | 2 | - |

Junk comes from the 34 base "Everywhere" items (`junk.csv`) plus the current
area's own junk entries. Fish and curios come from the current area's
Collector's Sets, fish filtered further by depth band.

## Depth
A dial the player sets, affecting both dredge time (above) and catch odds.

| Depth | Name | Opens at retirement |
|---|---|---|
| 0 | Shallows | Start |
| 1 | Reef Depth | 1 |
| 2 | The Deep | 2 |
| 3 | The Abyss | 3 |

## Map areas
9 areas, each with its own value multiplier and the Collector's Sets found
there. "Opens at retirement" is the prestige tier required to unlock it.

| Area | Opens at retirement | Value x | Sets found there |
|---|---|---|---|
| Shoal Bay | Start | 1 | Seaside Holiday, Harbour History, Lost Jewellery, Childhood Treasures |
| The Coral Gardens | 1 | 1.5 | Cute Things, Sweet Shop, Wonderwater |
| The Wreck Field | 2 | 2 | 90's Tech, Blocky Bits, Steampunk |
| The Black Rocks | 3 | 2.5 | The Deep Ones, Dark Fantasy, Giants & Monsters |
| The Lighthouse | 4 | 3 | High Fantasy, Tabletop, Hedge Witch |
| The Sunken Carnival | 5 | 3.5 | Carnival, Superheroes, Full Breakfast |
| The Night Ferry | 6 | 4 | Film Noir, Vampire's Keep, Cyberpunk |
| The River Delta | 7 | 4.5 | Amazon River, Cottagecore, Seaside Barbecue |
| The Tip | 8 | 5 | Trash Treasures, Zombie Apocalypse, The New Flesh |

Each item remembers the value multiplier of the area it was hauled in, so
moving before sorting doesn't change its worth. Each set's completion bonus
(`collectors-sets.csv`, "Completion bonus" column) applies once every curio
and fish in that set has been collected at least once.

---

# 2. Sorting

## The bins
Plastic, Metal, Glass, Wood, Electronics, Hazardous, Mixed (7 total, matching
the "Bin" column in `junk.csv`/`curios.csv`). Every junk item has a bin, a
weight (1-5), and a base coin value. Sorting it destroys it into
`1 + weight` units of "Sorted <bin>" goods, sold later in Town.

## Correct-sort value formula
```
value = base * streak * (1 + b_payout) * (1 + b_bin) * rule * area
```
- `streak = 1 + min(1 + b_streakCap, (0.05 + b_streakStep) * streak_count)`
  — +5% per correct sort in a row, capped at +100% (20 in a row); the cap and
  step are raised by some set bonuses (Cyberpunk: streakStep +1%;
  Superheroes: streakCap +25%).
- `b_payout` = sum of all payout bonuses in play (sets, magic curios,
  retirements, decorations, guild, party, pet treat, tides).
- `b_bin` = a bonus for that one bin from some sets (e.g. "+15% sorted
  plastic").
- `rule` = 1.5 when a station has moved the item to a different bin (see
  below), otherwise 1.
- `area` = the value multiplier of the area it was hauled in.

## Wrong sort
Still puts the units in the clicked bin, but pays only
`base * (0.4 + b_forgive) * area`, and the streak resets to 0. Make the
wrong-sort feedback loud and immediate — testers on the original found it
too easy to miss.

Putting a fish in a bin, or junk in the cooler, is refused with a message
and no penalty.

## Fish in the cooler
Fish keep their value: `base * streak * (1 + b_payout) * (1 + b_fish) * area`
(x3 if golden). A fish counts as a correct sort for the streak. The first
catch of each species logs it in the Collector's Log.

## Station sorting rules
Installing some stations changes where certain junk belongs — sorting it the
new way pays the `rule = 1.5` bonus above. Announce what moved when the
station is installed.

| Station | Item | Old bin | New bin |
|---|---|---|---|
| Carpentry Bench | Skateboard | Mixed | Wood |
| Carpentry Bench | Picture Frame | Mixed | Wood |
| Crucible | Broken Umbrella | Mixed | Metal |
| Crucible | Folding Beach Chair | Mixed | Metal |
| Recycling Machine | TV Remote | Electronics | Mixed |
| Recycling Machine | Solar Garden Light | Electronics | Mixed |

## Store instead of sort
Once the Carpentry Bench, Crucible, or Recycling Machine is installed, junk
of its material (wood/metal/mixed respectively) can be stored whole instead
of sorted, then processed at the station into products worth more (see
Stations & Upgrades). Stored junk still counts toward the next station's
unlock requirement.

---

# 3. Fish & the Collector's Log

Each Collector's Log set has exactly 3 fish (84 fish across the 28 area sets
— Party Favours and Guild Keepsakes have no fish). Every fish has a name,
weight 1-5, a base value (4-8 coins), and inspect text. Fish only turn up in
their own set's area. Full data: `fish.csv`. The "Depths" column gives the
dredge-depth range each fish can appear at.

## The Cutting Board / processing chain
Raw fish can be processed for more value once the relevant stations are
installed:

| Step | Where | Value | Add-in (bought from Priya) | Buyer |
|---|---|---|---|---|
| Raw fish | Cooler | its cooler value | - | Walt |
| Dressed fish | Cutting Board, 1 click | x1.6 | Limes: x1.3 more | Walt |
| Meal | Oven, 1 click per dressed fish | x1.5 of the dressed fish | Herb Butter: x1.4 more | Walt |

Add-ins are consumable supplies that multiply a processing step's output
further.

---

# 4. Curios & Collecting

Besides junk and fish, a haul can contain curios and other special items.
Full curio data: `curios.csv` (150 items, 30 sets of 5). Set data (with
completion bonuses): `collectors-sets.csv`.

## Tray items and what clicking them does

| Tray item | What clicking it does |
|---|---|
| Encrusted Curio | Scrub it clean (4 clicks), which reveals what it is and rolls its rarity |
| Strange Curio | One of the 6 magic curios; scrub it the same way, then keep it forever |
| Sealed Crate | Pry it open: 50% coins (5-25 x crate bonus x area), 30% two more junk items, 20% a curio |
| Message in a Bottle | Uncork it: 35% a letter (x letter bonus), read later at the Desk; otherwise becomes an empty glass bottle to sort |
| Sea creature | Set it free for 2-6 coins (x kindness bonus x area); the first of each kind is logged in Creatures Seen |
| Puzzle box | Stowed for the Emporium's Puzzle Bench |

## Curio rarity (after scrubbing)

| Rarity | Value x | Base weight | Weight with rarity-shift s |
|---|---|---|---|
| Common | 1 | 60 | 60 * (1 - s) |
| Uncommon | 2 | 28 | 28 |
| Rare | 4 | 10 | 10 * (1 + 2s) |
| Epic | 10 | 2 | 2 * (1 + 3s) |

`s` is a rarity-shift stat (from bonuses like the Wonderwater set's "rarity
+10%" or the Glowing Pearl magic curio's "+25% better curio rarity") that
shifts weight away from Common toward Rare/Epic.

A curio is identified by scrubbing; its name and set are then revealed.

## What to do with a curio
- **Add to Collector's Log**: only when it's new, or a rarer copy of one
  already logged (the better copy replaces it).
- **Donate**: only when in a guild whose Guild Log still needs it.
- **Sell**: coins straight away, for full value.
- **Store**: keep it in Stored Curios (kept through retiring) to log,
  donate, sell, gift, or process later. Wood/metal/mixed curios can be
  processed at their matching station like stored junk, worth value x the
  station's factor. Rare and epic ones ask for a confirm click first.
- **Sort**: break it down like junk — pick a bin, then confirm. Every curio
  has a bin by what it's mostly made of (`curios.csv`'s "Sorts into"
  column). The right bin gives 2 sorted units worth its value x streak; the
  wrong bin gives 40% and resets the streak. An Inspect button gives a
  material hint without naming the bin.

## The Collector's Log
The log/album of every fish and curio found — completing a set grants that
set's bonus (`collectors-sets.csv`). 28 area sets (150 curios + 84 fish) plus
Party Favours and Guild Keepsakes (curio-only, social-only sets).

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
A separate log of sea creatures released (not kept) — first release of each
kind is logged.

## Golden finds
A rare "golden" variant of a fish, worth x3 its normal value. Golden finds
only start appearing after the 8th retirement (see Retiring).

## Empty bottles & bottle letters
A Message in a Bottle either yields a letter (35% chance, x letter bonus —
e.g. the Film Noir set's "letters +25%") read later at the Desk, or becomes
an empty glass bottle to sort. A kept empty bottle lets the player write
their own letter directly — see Social, Bottle Letters. 16 unique built-in
letters: `bottle-letters.csv`.

---

# 5. Story & the Town

## The opening sequence
1. The first haul always contains a fish.
2. Dressing it at the Cutting Board brings Crow's first letter (a crow
   lands, caws, and drops it on the Desk).
3. Reading it at the Desk opens the Town.
4. Selling fish to Walt and sorted goods to Dot earns the first coins.
5. Coins buy upgrades at the Work Table, and later stations.

Until the Town opens there is no selling, no requests, no Crow's letters.

## Crow's letters — arrive when

| Letter | Arrives when |
|---|---|
| An invitation ashore | The first fish is dressed |
| Something warm | The Oven is installed |
| Good hands | The Carpentry Bench is installed |
| Fire and iron | The Crucible is installed |
| Nothing wasted | The Recycling Machine is installed |
| The Emporium | The Emporium opens (the ending) |

## The townsfolk

| Person | Place | Buys | Appears |
|---|---|---|---|
| Walt | Low Tide Diner | Raw fish, dressed fish, meals | When the Town opens |
| Dot | Dot's Salvage Yard | Sorted goods (all 7 bins) | When the Town opens |
| Rosalind | Rosalind's Antiques | Knick-knacks | With the Carpentry Bench |
| Hank | Hank's Hardware | Ingots | With the Crucible |
| Priya | The Makers' Co-op | Materials (once the Recycling Machine is in) | When the Town opens, selling supplies from day one |

## Selling
By whole stacks, never single items. A stack sells for the value built up
in it x (1 + Town price bonus — e.g. the Full Breakfast set's "townPrice
+5%"). Each shop has a Sell Everything button, two clicks: the first shows
"Confirm: Sell All for N", the second sells. It warns when a current request
needs some of those goods.

## Story requests
Each townsperson has a short chain of requests, in order. They pay coins
early on and rare materials later — rare materials (Old-Growth Timber, Brass
Fittings, Stained Glass Panel, Neon Sign) only come from these requests, and
the Emporium needs them. Requests, standing orders, and rare materials are
kept through retiring.

| Person | Request (in order) | Reward |
|---|---|---|
| Walt | 5 raw fish | 60 coins |
| Walt | 10 dressed fish | 150 coins |
| Walt | 10 meals | Old-Growth Timber |
| Dot | 20 sorted plastic | 80 coins |
| Dot | 30 sorted metal | 200 coins |
| Dot | 40 sorted mixed | Brass Fittings |
| Rosalind | 10 knick-knacks | Stained Glass Panel |
| Rosalind | 20 knick-knacks | Old-Growth Timber |
| Rosalind | 30 knick-knacks | Stained Glass Panel |
| Hank | 10 ingots | Brass Fittings |
| Hank | 20 ingots | Brass Fittings |
| Hank | 30 ingots | Old-Growth Timber |
| Priya | 6 materials | 400 coins |
| Priya | 15 materials | Neon Sign |

Story thank-yous appear in chat. Walt's first request mentions Crow by name.

## Standing orders
Follow on from story requests — repeatable fulfillment goals, scaling reward
per fill:

| Person | Wants | Amount |
|---|---|---|
| Walt | Meals (dressed fish before the Oven) | 10, +5 per order filled |
| Dot | Sorted goods, cycling through the 7 bins | 30, +10 per order |
| Rosalind | Knick-knacks | 15, +5 per order |
| Hank | Ingots | 15, +5 per order |
| Priya | Materials | 15, +5 per order |

## Daily request
Each real-world day, one fresh request per townsperson:

| Person | Daily request |
|---|---|
| Walt | Put 15 fish on ice |
| Dot | Sort 40 units of one bin (picked each day) |
| Rosalind | Make 12 knick-knacks |
| Hank | Make 12 ingots |
| Priya | Make 12 materials |

---

# 6. Stations & Upgrades

## Upgrades (Work Table)
"Buy What I Can Afford" buys as many levels in a row as coins cover — two
clicks: first shows what it would buy, second buys.

| Upgrade | Levels | Appears at basket | Cost of next level (L = levels owned) | Effect per level |
|---|---|---|---|---|
| Bigger Basket | 29 (3 to 32 items) | Start | round(20 + 1.2 * L * L) * unlock scale | +1 item per haul |
| Faster Winch | 12 | 6 | round(15 * 1.6^L) | Dredge time x0.88 |
| Soft Brush | 3 | 10 | round(60 * 3^L) | One fewer scrub per curio (4 down to 1) |
| Lucky Charm | 10 | 16 | round(100 * 1.6^L) | +5% rare finds |

Each upgrade appears once the basket (bought levels only) reaches the listed
size.

## Stations
Arrive one at a time, strictly in order, once the Town is open. Each has a
hidden requirement: an amount handled since the last station was installed.
Until met, show a vague hint that sharpens as the player approaches, never
exact numbers:
- under 25%: "It feels a long way off."
- 25-50%: "You're getting somewhere."
- 50-75%: "More than halfway there."
- 75% or more: "Almost there!"

Once the Emporium is open, show an exact progress bar instead.

Once the requirement is met, the station is bought for coins with two
clicks. Installing it resets the count, may move some junk to a different
bin (see Sorting's Station sorting rules table), opens a new buyer in Town,
and brings a letter from Crow (first run only).

| Station | Cost (x unlock scale) | Hidden requirement | Makes | Value | Buyer |
|---|---|---|---|---|---|
| Oven | 400 | 25 fish dressed | Meals from dressed fish | Dressed fish x1.5 | Walt |
| Carpentry Bench | 1,200 | 60 units of wood | Knick-knacks from stored wood junk | Base x2 | Rosalind |
| Crucible | 2,500 | 80 units of metal | Ingots from stored metal junk | Base x2 | Hank |
| Recycling Machine | 3,000 | 20 units of mixed | Materials from stored mixed junk | Base x2.2 | Priya |

## Priya's Commissions (processing add-ins)

| Supply | Price | Station | Effect |
|---|---|---|---|
| Limes | 1 | Cutting Board | x1.3 (dressed fish) |
| Herb Butter | 2 | Oven | x1.4 (meals) |
| Furniture Polish | 2 | Carpentry Bench | x1.5 (knick-knacks) |
| Borax Flux | 2 | Crucible | x1.4 (ingots) |
| Binding Resin | 2 | Recycling Machine | x1.4 (materials) |

## The storage chest
Shows everything held, by section: sorted goods per bin, food, crafts,
stored junk waiting at each station, rare materials, supplies, empty
bottles, and Stored Curios. Rare materials and supplies only appear once the
player has had one (no empty placeholder rows).

---

# 7. Economy & Bonuses

Coins are the game's only currency, earned by selling, requests, and the
Emporium.

## Pacing targets
- About 2 hours from a fresh save to all four stations, a full 32-item
  basket, and the Emporium, with the first retirement right after.
- Each later run about 15 minutes longer than the last.
- Unlocks (stations, basket levels) keep arriving until about 85% of each
  run, rather than ending in an hour of pure saving.
- After the 8th retirement (every area and depth open), each further
  retirement adds +3% luck.

These were tuned against a simulated casual player, with these simulated
run lengths for runs 1-10: 118, 133, 151, 164, 180, 203, 210, 220, 238, 265
minutes. Validate against real players before locking these numbers in for
a new build — the pacing was tuned for whatever the actual sorting
interaction costs in clicks/time, which will differ by platform.

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

"Unlock scale" multiplies station costs and upgrade-formula costs — it
scales the whole economy up each retirement so stations don't stay trivially
cheap on NG+.

## Where value comes from
- The area multiplier (x1 to x5).
- The streak (up to x2).
- Payout bonuses: +10% per retirement, set and magic-curio bonuses,
  Emporium decorations, the back room, guild and party bonuses, the pet's
  treat, and tides.
- Station factors and supply add-ins.

## The Emporium's own earnings formula
Drinks, puzzles, away earnings, and daily rewards all use one formula so
they grow with the rest of the game:
```
pay = base * area * (1 + b_payout)
```

## Fixed prices
- The Emporium costs 6,000 coins plus rare materials (see Story requests).
- A guild costs 1,500 coins.
- The back room costs 250,000 coins.
- Station costs and upgrade formulas: see Stations & Upgrades.

## All bonus types (`b_x` in the formulas throughout this document)

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

These bonus-type names are exactly what's referenced throughout
`collectors-sets.csv`'s "Completion bonus" column and the magic curios
table — e.g. "payout +5%" sets `b_payout`, "+15% sorted plastic" sets the
Plastic `bin` bonus.

---

# 8. The Emporium

The old empty shop in town, bought at the end of the first run. Opening it
ends the main story (Crow's last letter), and it's needed to retire.
Everything in it is kept through retiring.

## Opening it
Needs all four stations installed, 6,000 coins, and the rare materials from
the Story requests: 2 Stained Glass Panels, 3 Old-Growth Timber, 3 Brass
Fittings, 1 Neon Sign. Until then, the Town shows it as "The Empty Shop"
with a note on the door.

## Sell Room
Sell Everything for all goods at once (two clicks). Warns when meals are
included, since the Counter can use them.

## Shop Floor (decorations)
- To place one: pick a decoration up, then click a pedestal. A full
  pedestal swaps; clicking a pedestal with nothing picked up takes its
  decoration down.
- Pedestals start at 6. Each expansion adds 2, up to 16, costing
  5,000/10,000/20,000/40,000/80,000 coins (two clicks each).
- With all 16 open, the Back Room can be built for 250,000 coins: 8 more
  pedestals (24 in all) and +2% value of its own.
- Trade Up swaps 3 spare decorations of one rarity for 1 random decoration
  of the next rarity (two clicks).
- 20 decorations total (`decorations.csv`). They come from puzzle boxes,
  the Prize Counter, and Work Orders.

## The Counter (drink-making minigame)
Customers walk in every 25 seconds while the owner is in the game, up to 3
waiting. Each wants a drink built from three parts, 4 choices each (64
combinations):

| Part | Choices |
|---|---|
| Base | Coffee, Tea, Hot Cocoa, Warm Milk |
| Flavour | Vanilla, Caramel, Mint, Salted Kelp |
| Finish | Whipped Cream, Cinnamon, Marshmallows, Sea Salt |

30% of customers also want a meal from the player's stock.

**Payout**: the right drink pays `40 * the customer's tip * area * (1 +
payout bonus)`. A wrong one pays 5. A wanted meal adds `2 * the meal's
value`.

### Customer types

| Customer type | Chance | Tip | Example names |
|---|---|---|---|
| Local | 45 | x1 | Old Mrs. Penhallow, Tom the Postman, The Vicar |
| Townsfolk (met ones only) | 20 | x1.2 | Walt, Dot, Rosalind, Hank, Priya |
| Traveller | 15 | x1.3 | A Backpacker, A Cyclist, A Lorry Driver |
| Tourist | 15 | x1.5 | A Day-Tripper, A Family of Four |
| Rare visitor | 5 | x5 | Zephyr the Crow, A Mermaid in a Raincoat, The Lighthouse Keeper |

## Puzzle Bench
Puzzle boxes from the tray are lights-out puzzles: pressing a cell toggles
it and its four neighbours; the goal is to turn every light off.
Common/uncommon boxes are 3x3; rare/epic are 4x4. Solving one pays
100/250/600/1,500 coins by rarity (x area x payout) plus a decoration. A
Hint button marks one cell of a real, exactly-computed solution for 3
tickets.

## Arcade
Each game costs 25 coins and pays arcade tickets.
- **Tide Timer**: a float slides along 9 cells. Stopping it in the middle
  pays 10 tickets, then 5, 3, 1, 1 further out.
- **Crab Grab**: crabs pop up in a 3x3 sand patch for 1.1s each; click
  before they duck. 20 seconds, 1 ticket per 3 crabs, up to 10.
- **Shell Game**: the pearl starts under one of 3 shells, they swap (each
  swap flashes), then you pick. A win pays 2 tickets, +2 per win in a row
  (up to 10); each round swaps more times.

## Prize Counter
Tickets buy random decoration boxes:

| Box | Tickets | Common / Uncommon / Rare / Epic chances |
|---|---|---|
| Common Prize Box | 20 | 70 / 25 / 5 / 0 |
| Uncommon Prize Box | 60 | 30 / 50 / 17 / 3 |
| Rare Prize Box | 150 | 0 / 40 / 45 / 15 |

## Work Orders
Always 3 orders with no deadline. Each asks for one kind of goods: sorted
goods 40-80, anything else 10-25, both x(1 + 0.25 per retirement). Filling
one pays 2x the goods' value, and 25% of orders also give a decoration. An
order can be swapped for a new one for `50 coins x (retirements + 1)`, two
clicks.

## Tip jar
Visitors can leave tips of 10, 50, 100, or 500 coins (500 needs a confirm
click). Tips are stored even while the owner is offline, collected at the
jar.

## Away earnings
While the owner is offline or out of the game, the shop sells on its own:
`100 coins an hour x area x (1 + payout bonus)`, up to 8 hours' worth,
collected on the next visit to the Emporium.

## Visitors
After the first retirement, the owner can invite others to visit. Visitors
can serve at the Counter while the owner is online: the coins go to the
owner, the visitor gets tickets. See Social, Visits, for who may look
around a boat unannounced.

---

# 9. Retiring (the prestige reset)

Retiring is announced to everyone in the game. The first retirement ends
the story for good: from then on there are no new story letters — the game
becomes a sandbox.

## Retiring needs all four of these
- The Emporium open.
- All four stations installed.
- The basket upgraded to 32.
- The run's coin goal on hand (see Retire goals table, Economy).

## What resets vs. what's kept for good

| Reset (this run only) | Kept for good |
|---|---|
| Coins, lifetime coins this run | Collector's Log, magic curios, Creatures Seen, Golden Log |
| All goods, cooler, stored junk, supplies | Stored Curios, rare materials, requests and standing orders done |
| Upgrades and stations | The Emporium and everything in it (decorations, tickets, puzzle boxes) |
| Tray, streak, best streak this run | Letters, bottle letters, ship looks, supply switches, settings |
| Hidden station counters, this run's stats | All-time stats, best streak ever, leaderboard totals |

## Each retirement grants
- +10% value on everything (payout bonus).
- 3% faster dredging (all time bonuses capped at 50% total).
- A new title (see Titles below).
- The next map area (up to the 8th retirement).
- The next depth (up to the 3rd retirement).
- New looks at the Shipwright.
- New radio tracks.

## Titles
In order, from the start to the 11th retirement and beyond: Deckhand,
Tidewalker, Reef Runner, Trench Diver, Abyss Gazer, Keeper of the Light,
Carnival Salvager, Night Ferryman, Delta Wanderer, Monarch of the Tip, Old
Salt, Legend of the Shoals.

## Endgame (after the 8th retirement — every area and depth open)
- Golden finds turn up.
- Each further retirement adds +3% luck.
- Goals keep growing 10% per run, and the unlock scale 6% per run.
- Monthly leaderboard seasons give something to compete for.

---

# 10. Cosmetics: the Shipwright

Where ship/pet/radio/badge cosmetics are chosen. Categories: hull, deck,
pets, chat badges, radio, sails, flags.

## Where looks come from
- **Free**: 11 everyday woods for hull/deck/railing/mast (oak, spruce,
  birch, jungle, acacia, dark oak, mangrove, cherry, bamboo, crimson,
  warped), 3 sails (white, weathered, tan), a plain pennant flag, no pet, no
  badge.
- **Retiring**: each retirement from 1 to 8 unlocks one new sail colour, one
  flag, one pet, and one chat badge (see table below).
- **Exotic woods**: 10 more woods (teak, cedar, rubberwood, walnut,
  mahogany, zebrano, rosewood, rainbow gum, purpleheart, ebony) unlock at
  retirements 1-8, then are bought once for 5,000 coins each (covers all
  four wood parts — placeholder price).
- **Premium looks**: a separate shop, originally priced in a real-money-
  adjacent premium currency ("Seal Tokens") never earned by play: two
  premium woods (livingwood, dreamwood, 300 tokens each for all four parts)
  and premium sails/hulls/flags/pets/badges (100-400 tokens). Survive save
  wipes. **Whether to use a premium currency, straight coin pricing, or
  real-money purchases is a product decision for whoever builds this next
  — it is explicitly not fixed by this design.**
- **Awards and events**: the Season Champion flag for each month's top 3
  coin earners, and event sets that unlock event looks.

## Retirement unlocks, by retirement number

| Retirement | Sail | Flag | Pet | Chat badge |
|---|---|---|---|---|
| 1 | Sea Blue | Jolly Roger | Ship's Cat (Soot) | Anchor |
| 2 | Crimson | Crow's Colours | Harbour Fox (Rusty) | Sea Spark |
| 3 | Midnight | Harbour Stripes | Deck Rabbit (Biscuit) | Coral Bloom |
| 4 | Sunshine | Coral Bloom | Ginger Cat (Marmalade) | Trident |
| 5 | Royal | Chartmaker | Baby Sea Turtle (Shelly) | Night Moon |
| 6 | Sunset | Lighthouse Beam | Captain Parrot (Captain) | Harbour Sun |
| 7 | Lagoon | Sunset Gradient | Snow Fox (Frost) | Sea Crown |
| 8 | Rose | The Deep | Siamese Cat (Pearl) | Legend Star |

## Try It On
A switch at the Shipwright: while on, clicking any look (even locked/
premium) previews it on the boat for 30 seconds without buying it.

## Pets
Live on deck, can't be hurt or wander off. Anyone can pet any boat's pet for
hearts and a happy sound. The owner's first pat each real-world day gives a
treat: +5% value for 10 minutes (only counts for a pet they own and have
equipped, never one only being tried on).

## Chat badges
Shown next to the player's name in chat — a small icon, unlocked per the
retirement table above.

## The radio (jukebox)
Starts with 4 tracks, unlocks 2 more per retirement. Needs its own
original or licensed music — whatever the source game used, it doesn't
carry over to a new build.

---

# 11. Social Features

## Parties
- Party chat.
- +5% value for each other member dredging at the same time (active in the
  last 3 minutes), up to +15%.
- 15% of curio rolls come from the party-only Party Favours set.
- Visit each other's boats.
- Help sort: a party member can sort the host's tray. Coins, streak, and
  Log stay the host's; the helper earns 1 arcade ticket per 5 good sorts.
  Curios, crates, bottles, and creatures are left for the host.

## Guilds
Costs 1,500 coins to found.
- **Identity**: a name, a 2-4 letter tag shown in chat (with a colour), and
  a banner (colour + pattern) shown on every member's boat.
- **Guild chat.**
- **Guild Log**: members donate curios and fish to a shared Log. Every
  guild set completed gives every member +2% value for good.
- **Free visits**: members visit each other's Emporiums without an invite.
- **Daily quests**: 3 a day, shared guild-wide, worked on together. Each
  member claims each finished quest once for coins (`300 x area x payout`)
  and 3 tickets. Goals scale by members active in the last 7 days:
  `x(1 + 0.5 per extra active member)`.
- **Guild Bank**: any member deposits 100, 1,000, or 5,000 coins. The owner
  and officers buy upgrades from it; every deposit and purchase is logged.

### Daily guild quests (base goals, before the active-member multiplier)

| Daily guild quest | Base goal |
|---|---|
| All Hands: haul up the dredge | 40 |
| Sorting Day: sort units of junk | 400 |
| Full Coolers: put fish on ice | 60 |
| Scrub Club: clean curios | 12 |
| Knife Work: dress fish | 40 |
| Supper Rush: bake meals | 20 |
| Makers' Day: make knick-knacks, ingots, or materials | 60 |
| Good Trade: earn coins selling | 20,000 |

### Guild upgrades (bought from the Guild Bank)

| Guild upgrade | Levels | Cost of next level (L = levels owned) | Effect per level |
|---|---|---|---|
| Guild Fund | 5 | 5,000 * 2^L | +1% value for every member |
| Busy Noticeboard | 2 | 10,000 * (L + 1) | +1 daily quest |
| Better Rewards | 4 | 4,000 * (L + 1) | +25% daily quest coins |

## Visits
Anyone can look round anyone's boat unless that player switched visitors
off. Party members and guild-mates are always welcome. After the first
retirement, Emporium owners can invite visitors, who can serve at the
Counter (owner online) and tip.

## Gifts
A stored curio can be given to another online player.

## Bottle letters (player-written)
1. A kept empty bottle lets the player write a letter (up to 900
   characters) directly — no separate "writing kit" item or trade step.
   Signing it corks it; it's thrown signed or anonymously.
2. Staff read every letter before it can wash up; at most 3 can wait for
   review at once, globally.
3. Other players find approved letters in bottles, never their own. A found
   letter can be hearted once; hearted letters wash up more often.
4. A letter can be reported with a reason, pulling it from the sea and
   sending it back to staff.
5. Players can write a reply to a found letter. Only the original writer
   finds the reply, delivered on their next haul.

A letter-moderation queue (an admin view for staff to approve/reject
pending letters) is required infrastructure before enabling player-written
letters at all.

## Leaderboards
Times Retired, Sets Completed, Best Streak, Lifetime Coins, plus monthly
seasons: This Month's Coins and This Month's Sets. When a month ends, its
top 3 coin earners get the Season Champion flag. Offline players stay on
the boards.

## Announcements
Retirements, completed Log sets, a completed whole Log, and golden sets are
announced to everyone in the game (each player can switch these off).

---

# 12. Extras

## Dailies
Reset each real-world day:
- The first haul is 1.5x bigger with a guaranteed curio.
- One townsperson has a small request.
- The pet's treat is available again.

## Tides (short staff-started events)

| Tide | Effect |
|---|---|
| Spring Tide | +25% items in every haul |
| Glass Tide | Twice the chance of curios |
| Silver Tide | +25% value on everything sorted and made |

## Events (longer, dated)
- Its own Collector's Log set of curios and fish (each curio roll has a 20%
  chance of coming from it while it runs); completing it gives a small
  lasting bonus of about +2% plus looks.
- Event-only bottle letters.
- Event looks at the Shipwright.
- Guild quests that run for the whole event.

An events board and login reminders tell players what's on. Event sets stay
in the Log afterwards, and reusing an event's id next year brings it back.
This is infrastructure to build — specific event content is designed after
launch, not pre-filled here.

## Stats
A player profile screen shows all-time and this-run counts: hauls, junk
sorted, fish on ice, curios scrubbed, goods made, customers served, minutes
at sea, coins earned, best streak, retirements, sets, golden sets, creatures
seen, and letters.

## Feat titles
Earned once, shown instead of the retirement title if chosen.

| Feat title | Earned by |
|---|---|
| Streak Master | A streak of 100 |
| Deep Dredger | 1,000 hauls |
| Barista | 100 perfect drinks served |
| Letter Writer | 10 of your letters out at sea |
| Naturalist | Every sea creature seen |
| Completionist | The whole Collector's Log |
| Golden Touch | A golden set completed |

## Settings
Let each player switch off: sea sounds, announcements, the "dredge is up"
chat line, the new-player sparkles, their own title display, and visitors.

## The quest book
The tutorial — deliberately no separate handbook. 2 chapters, 22 quests (a
placeholder set meant to be rewritten before launch). Quests can be locked
behind earlier ones and claimed for rewards.
- **Task types**: hauls, coins on hand, coins earned this run, basket size,
  upgrade level, station installed, Emporium opened, retirements, fish
  species caught, a particular fish, curios logged, a particular set, any
  number of sets, an area unlocked, a townsperson met, story requests done,
  goods held, and goods handed in.
- **Reward types**: coins, tickets, supplies, a decoration, a rare
  material, a look, and a message.

## New-player guide
Gentle sparkles hover over the next thing to use on deck: the winch, then
the Cutting Board, the Desk, the bell, and the Work Table — each until used
once. On a fresh save, boarding tells the player to look for the dredge
basket and check the quest book. Retired players never see the sparkles.

## Ambience
A quiet sea sound every 20-40 seconds (waves, a gull, the hull creaking, a
distant bell) and a fixed golden-hour sky.

---

# 13. Visual & Interaction Design

The game is played by standing on your own boat deck: a winch and dredge
basket, a cutting/sorting surface (the tray), a cooler, the Work Table, the
stations as they're installed, and the Desk, each a real object you walk up
to and use directly. The ferry/bell is the only way to leave the boat, for
Town, the Emporium, and anywhere social.

A few hard-won points, worth keeping in mind for any visual implementation:

- **Sorting is a direct, physical action, not a form.** The design's own
  pacing note says it plainly: in the original (where every interaction was
  a two-click menu), sorting was the slow part. Picking an item up and
  dropping it on the right bin in one motion is the intended feel — not
  select-item-then-select-destination-from-a-list.
- **Every location and object should be something the player recognizes by
  sight** — the winch, the cutting board, the desk, the bell, the work
  table are named as physical things you learn to find on deck, not menu
  items with descriptions underneath them. If a screen needs a paragraph to
  explain what it is, that's a sign it should be a recognizable object
  instead.
- **Don't invent new named locations or groupings beyond what's listed
  here.** This document already names everything the game needs: the boat
  deck, the Town, the Emporium, and wherever party/guild/leaderboard/letter
  screens live. A "lobby," "board," or "hall" that doesn't appear by that
  name anywhere in this document is scope creep, not design.
- **Two-click confirms stay** for anything that destroys progress or spends
  a large amount (retiring, the back room, big tips, wiping/trading away
  items) — show what the action will do, require a second tap to commit.

---

# Appendix: Notes From the Roleplay Hub Web Port

This document is the real game design. The web port built on
roleplay-hub-website made a number of platform-specific calls that are
**not** part of the design above — recorded here only so whoever builds the
next version doesn't need to rediscover the same lessons.

- **Writing kits were cut.** The original design had a kept bottle traded
  for a writing kit before writing a letter. The owner corrected this
  during the web build: a kept bottle writes a letter directly. This
  document already reflects the corrected rule (Social, Bottle letters).
- **Seal Tokens were replaced with coin pricing**, specifically for the web
  build, because a real-money-adjacent currency needed a product/legal
  decision the owner wasn't ready to make for a website. This document
  keeps Seal Tokens as the original design (Cosmetics) and explicitly
  leaves the pricing model open for whoever builds next.
- **Two features were cut from the web build by the owner's choice, not
  because they were wrong designs**: the Shipwright (cosmetics) screen, and
  visiting other players' boats. Both remain part of this document (Social,
  Cosmetics) as legitimate parts of the game. They were cut from the
  website specifically because that implementation's UI for them was bad,
  not because the features themselves were rejected.
- **The single biggest, repeated mistake in the web build** was inventing
  named UI groupings that don't exist in the design — a "Dock Board"
  screen that bundled Party/Leaderboards/Letters together, and "Common
  Room"/"Quest Board"/"Bank Vault" room names inside the Guild Hall. None of
  that is in this document, on purpose. Section 13 above ("Visual &
  Interaction Design") exists specifically so this doesn't happen again.
- **Radio tracks and ambient sound/sky were never actually built** on the
  web — the UI existed but no real audio or art ever played. Whoever builds
  this needs real audio/art assets from scratch; nothing usable carries
  over.
