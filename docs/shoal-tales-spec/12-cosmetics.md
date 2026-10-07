# Cosmetics: the Shipwright (Section 12)

The Shipwright is where ship/pet/radio/badge cosmetics are chosen. Categories: hull, deck, pets, chat badges, radio, sails, flags.

## Where looks come from
- **Free**: 11 everyday woods for hull/deck/railing/mast (oak, spruce, birch, jungle, acacia, dark oak, mangrove, cherry, bamboo, crimson, warped), 3 sails (white, weathered, tan), a plain pennant flag, no pet, no badge.
- **Retiring**: each retirement from 1 to 8 unlocks one new sail colour, one flag, one pet, and one chat badge (see table below).
- **Exotic woods**: 10 more woods (teak, cedar, rubberwood, walnut, mahogany, zebrano, rosewood, rainbow gum, purpleheart, ebony) unlock at retirements 1-8, then bought once for 5,000 coins each (covers all four wood parts — marked placeholder price, see Open Items).
- **Premium looks**: a separate shop bought with the server's real-money-adjacent currency (Seal Tokens), never earned by dredging: two Seal Token woods (livingwood, dreamwood, 300 tokens each for all four parts) and token sails/hulls/flags/pets/badges (100-400 tokens). Survive save wipes.

  **IMPORTANT for the web port**: this is a real-money-adjacent premium currency system from the Minecraft server. Whether/how to implement any real-money purchase flow on Roleplay Hub is a product/legal decision for the owner, not something to build by default — flag this explicitly before implementing any Seal Token purchase UI.
- **Awards and events**: the Season Champion flag for each month's top 3 coin earners, and event sets that unlock event looks.

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
A switch at the Shipwright: while on, clicking any look (even locked/premium) previews it on the boat for 30 seconds without buying it.

## Pets
Live on deck, can't be hurt or wander off. Anyone can pet any boat's pet for hearts and a happy sound. The owner's first pat each real-world day gives a treat: +5% value for 10 minutes (only counts for a pet they own and have equipped, never one only being tried on).

## Chat badges
Shown next to the player's name in chat — a small icon, unlocked per the retirement table above.

## The radio (jukebox)
- Starts with 4 tracks, unlocks 2 more per retirement.
- In Minecraft: the 16 vanilla music discs plus 4 modded tracks (Heave Ho, a sea shanty, and three others — spec is imprecise here, "three others" uncounted). The modded ones unlock at retirements 7 and 8, then cost 2,500 coins each (placeholder price).
- **The web version needs its own music** — explicitly flagged in the spec as a Minecraft-specific asset that doesn't carry over (licensed vanilla Minecraft music discs can't be used on the web; needs original or licensed tracks).
