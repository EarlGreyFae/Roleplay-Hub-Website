# The Emporium (Section 10)

The Emporium is the old empty shop in town, bought at the end of the first run. Opening it ends the story (Crow's last letter), and it's needed to retire. Everything in it is kept through retiring.

## Opening it
Needs all four stations installed, 6,000 coins, and the rare materials from the Story requests (07-story.md): 2 Stained Glass Panels, 3 Old-Growth Timber, 3 Brass Fittings, 1 Neon Sign. Until then, the Town shows it as "The Empty Shop" with a note on the door.

The Emporium has these rooms:

## Sell Room
Sell Everything for all goods at once (two clicks). Warns when meals are included, since the Counter can use them.

## Shop Floor (decorations)
- To place one: pick a decoration up, then click a pedestal. A full pedestal swaps; clicking a pedestal with nothing picked up takes its decoration down.
- Pedestals start at 6. Each expansion adds 2, up to 16, costing 5,000 / 10,000 / 20,000 / 40,000 / 80,000 coins (two clicks each).
- With all 16 open, the Back Room can be built for 250,000 coins: 8 more pedestals (24 in all) and +2% value of its own.
- Trade Up swaps 3 spare decorations of one rarity for 1 random decoration of the next rarity (two clicks).
- 20 decorations total (see `decorations.csv`). They come from puzzle boxes, the Prize Counter, and Work Orders.

## The Counter (drink-making minigame)
Customers walk in every 25 seconds while the owner is in the game, up to 3 waiting. Each wants a drink built from three parts, 4 choices each (64 combinations):

| Part | Choices |
|---|---|
| Base | Coffee, Tea, Hot Cocoa, Warm Milk |
| Flavour | Vanilla, Caramel, Mint, Salted Kelp |
| Finish | Whipped Cream, Cinnamon, Marshmallows, Sea Salt |

30% of customers also want a meal from the player's stock.

**Payout**: the right drink pays `40 x the customer's tip x area x (1 + payout bonus)`. A wrong one pays 5. A wanted meal adds `2x the meal's value`.

### Customer types

| Customer type | Chance | Tip | Example names |
|---|---|---|---|
| Local | 45 | x1 | Old Mrs. Penhallow, Tom the Postman, The Vicar |
| Townsfolk (met ones only) | 20 | x1.2 | Walt, Dot, Rosalind, Hank, Priya |
| Traveller | 15 | x1.3 | A Backpacker, A Cyclist, A Lorry Driver |
| Tourist | 15 | x1.5 | A Day-Tripper, A Family of Four |
| Rare visitor | 5 | x5 | Zephyr the Crow, A Mermaid in a Raincoat, The Lighthouse Keeper |

## Puzzle Bench
Puzzle boxes from the tray are lights-out puzzles: pressing a cell toggles it and its four neighbours; goal is to turn every light off. Common/uncommon boxes are 3x3; rare/epic are 4x4. Solving one pays 100 / 250 / 600 / 1,500 coins by rarity (x area x payout) plus a decoration. A Hint button marks one cell of a real (exactly-computed) solution for 3 tickets.

## Arcade
Each game costs 25 coins and pays arcade tickets.

- **Tide Timer**: a float slides along 9 cells. Stopping it in the middle pays 10 tickets, then 5, 3, 1, 1 further out.
- **Crab Grab**: crabs pop up in a 3x3 sand patch for 1.1s each; click before they duck. 20 seconds, 1 ticket per 3 crabs, up to 10.
- **Shell Game**: the pearl starts under one of 3 shells, they swap (each swap flashes), then you pick. A win pays 2 tickets, +2 per win in a row (up to 10); each round swaps more times.

## Prize Counter
Tickets buy random decoration boxes:

| Box | Tickets | Common / Uncommon / Rare / Epic chances |
|---|---|---|
| Common Prize Box | 20 | 70 / 25 / 5 / 0 |
| Uncommon Prize Box | 60 | 30 / 50 / 17 / 3 |
| Rare Prize Box | 150 | 0 / 40 / 45 / 15 |

## Work Orders
Always 3 orders with no deadline. Each asks for one kind of goods: sorted goods 40-80, anything else 10-25, both x(1 + 0.25 per retirement). Filling one pays 2x the goods' value, and 25% of orders also give a decoration. An order can be swapped for a new one for `50 coins x (retirements + 1)`, two clicks.

## Tip jar
Visitors can leave tips of 10, 50, 100, or 500 coins (500 needs a confirm click). Tips are stored even while the owner is offline, collected at the jar.

## Away earnings
While the owner is offline or out of the game, the shop sells on its own: `100 coins an hour x area x (1 + payout bonus)`, up to 8 hours' worth, collected on the next visit to the Emporium.

## Visitors
After the first retirement, the owner can invite others to visit. Visitors can serve at the Counter while the owner is online: the coins go to the owner, the visitor gets tickets. (See also Visits, 13-social.md — anyone can look round anyone's boat unless visitors are switched off; party members and guild-mates are always welcome.)
