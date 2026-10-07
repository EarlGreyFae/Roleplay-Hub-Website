# Dredging (Section 3)

## Dredge time formula
```latex
t = 6\,\text{s} \cdot (1 + 0.35\,d) \cdot 0.88^{w} \cdot (1 - b_{time})
```
Where `d` = depth level (0-3, see Depth table), `w` = winch upgrade level, `b_time` = any time-reduction bonus (e.g. set bonuses).

## Basket size / haul rules
- The first haul of each real-world day is 1.5x bigger (rounded up) and always includes a curio.
- A Spring Tide (a staff-started event, section 14) adds 25%.
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

(Note: "Junk comes..." paragraph after this table — not yet captured verbatim; covers junk selection detail, likely which junk table row is picked once "Junk" kind wins the roll, weighted toward the current map area's "Found in" pool plus "Everywhere" items.)

## Depth
Depth is a dial the player can set, affecting both dredge time (above) and catch odds.

| Depth | Name | Opens at retirement |
|---|---|---|
| 0 | Shallows | Start |
| 1 | Reef Depth | 1 |
| 2 | The Deep | 2 |
| 3 | The Abyss | 3 |

## Map areas
10 areas total, each with its own value multiplier and which Collector's Sets (curios+fish) are found there. "Opens at retirement" = the Retiring (prestige) tier required to unlock that area.

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

(Note: the table was 10 rows in the outline but only 9 areas appear in the pulled table content — the 10th row may be a continuation/total row or was missed; re-check against the doc if exact fidelity matters before finalizing the area-unlock gate.)

Note: Shoal Bay's junk table in junk.csv uses "Everywhere" (available in every area) plus area-specific entries (The Coral Gardens, The Wreck Field, The Black Rocks, The Lighthouse, The Sunken Carnival, The Night Ferry, The River Delta, The Tip) matching these 9 areas (Shoal Bay itself has no area-exclusive junk beyond "Everywhere").

Each set's completion bonus (see collectors-sets.csv "Completion bonus" column) applies once all curios+fish in that set are collected at least once.
