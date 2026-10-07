# Fish, the Collector's Log (Section 5)

Each Collector's Log set has exactly 3 fish (84 fish across the 28 area sets — Party Favours and Guild Keepsakes sets have no fish). Every fish has a name, weight 1-5, a base value (4-8 coins), and an Inspect text. Fish only turn up in the area of their own set. Full data: `fish.csv`.

Depth bands: each fish's "Depths" column (fish.csv) gives the range of dredge depths it can appear at (e.g. "Shallows to The Deep" = depths 0-2).

## The Cutting Board / processing chain
Raw fish can be processed for more value once Walt's relevant station is installed:

| Step | Where | Value | Add-in (Priya's supplies) | Buyer |
|---|---|---|---|---|
| Raw fish | Cooler | its cooler value | - | Walt |
| Dressed fish | Cutting Board, 1 click | x1.6 | Limes: x1.3 more | Walt |
| Meal | Oven, 1 click per dressed fish | x1.5 of the dressed fish | Herb Butter: x1.4 more | Walt |

Add-ins are consumable supplies bought from Priya (see Priya's Commissions, 08-stations-upgrades.md) that multiply the processing step's output further.

(Simplified from the original design bible: Sushi/Sushi Rice was dropped so
each station keeps exactly one upgrade material - Limes is the Cutting
Board's.)
