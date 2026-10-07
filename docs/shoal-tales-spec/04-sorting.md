# Sorting (Section 4)

## The bins
Plastic, Metal, Glass, Wood, Electronics, Hazardous, Mixed. (7 bins total, matching the "Bin" column in junk.csv/curios.csv.)

Every junk item has a bin, a weight from 1 to 5, and a base value in coins. Sorting destroys it into `1 + weight` units of "Sorted <bin>" goods, which are sold later to Dot in Town.

## Correct-sort value formula
```latex
value = base \cdot streak \cdot (1 + b_{payout}) \cdot (1 + b_{bin}) \cdot rule \cdot area
```
- `streak = 1 + min(1 + b_streakCap, (0.05 + b_streakStep) x streak_count)` — +5% per correct sort in a row, capped at +100% (20 in a row), cap/step raised by some set bonuses (see Cyberpunk set: streakStep +1%; Superheroes set: streakCap +25%).
- `b_payout` = sum of payout bonuses (sets, magic curios, retirements, decorations, guild, party, pet treat, tides).
- `b_bin` = a bonus for that one bin from some sets (e.g. "+15% sorted plastic" etc. in collectors-sets.csv).
- `rule` = 1.5 when a station has moved the item to a different bin (see Station sorting rules below), otherwise 1.
- `area` = the value multiplier of the area it was hauled in (see 03-dredging.md map areas table).

## Wrong sort
Still puts the units in the bin clicked, but pays only `base x (0.4 + b_forgive) x area`, and the streak resets to 0. The bin clicked shows the result right on it, and the Streak button turns red showing "X goes in Y" until the next correct sort. (Spec note: "A tester found wrong sorts too easy to miss, so make this feedback loud on the web.")

Putting a fish in a bin, or junk in the cooler, is refused with a message and no penalty.

## Fish in the cooler
Fish keep their value: `base x streak x (1 + b_payout) x (1 + b_fish) x area` (x3 if golden). A fish counts as a correct sort for the streak. The first catch of each fish species logs it in the Collector's Log.

## Station sorting rules
Installing some stations changes where certain junk belongs — sorting it the new way pays x1.5 (the `rule` multiplier above). The game announces what moved when the station is installed.

| Station | Item | Old bin | New bin |
|---|---|---|---|
| Carpentry Bench | Skateboard | Mixed | Wood |
| Carpentry Bench | Picture Frame | Mixed | Wood |
| Crucible | Broken Umbrella | Mixed | Metal |
| Crucible | Folding Beach Chair | Mixed | Metal |
| Recycling Machine | TV Remote | Electronics | Mixed |
| Recycling Machine | Solar Garden Light | Electronics | Mixed |

## Store instead of sort
Once the Carpentry Bench, Crucible, or Recycling Machine is installed, junk of its material (wood, metal, mixed respectively) can be stored whole instead of sorted, then processed at the station into products worth more (see section 8 / stations-upgrades.md). Stored junk still counts towards the next station's unlock requirement.
