# Social Features (Section 13)

The original Minecraft version leans on existing server social structures; the web port needs its own party/guild/visit system built in.

## Parties
- Party chat.
- +5% value for each other member dredging at the same time (active in the last 3 minutes), up to +15%.
- 15% of curio rolls come from the party-only Party Favours set (see collectors-sets.csv).
- Visit each other's boats.
- Help sort: a party member can sort the host's tray. Coins, streak, and Log stay the host's; the helper earns 1 arcade ticket per 5 good sorts. Curios, crates, bottles, and creatures are left for the host.

## Guilds
Costs 1,500 coins to found (see Fixed prices, 09-economy.md).

- **Identity**: a name, a 2-4 letter tag shown in chat (with a colour), and a banner (colour + pattern) shown on every member's boat.
- **Guild chat.**
- **Guild Log**: members donate curios and fish to a shared Log. Every guild set completed gives every member +2% value for good.
- **Free visits**: members visit each other's Emporiums without an invite.
- **Daily quests**: 3 a day, shared guild-wide, worked on together. Each member claims each finished quest once for coins (`300 x area x payout`) and 3 tickets. Goals scale by members active in the last 7 days: `x(1 + 0.5 per extra active member)`.
- **Guild Bank**: any member deposits 100, 1,000, or 5,000 coins. The owner and officers buy upgrades from it; every deposit and purchase is logged.

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
| Guild Fund | 5 | 5,000 x 2^L | +1% value for every member |
| Busy Noticeboard | 2 | 10,000 x (L + 1) | +1 daily quest |
| Better Rewards | 4 | 4,000 x (L + 1) | +25% daily quest coins |

## Visits
Anyone can look round anyone's boat unless that player switched visitors off. Party members and guild-mates are always welcome. After the first retirement, Emporium owners can invite visitors, who can serve at the Counter (owner online) and tip.

## Gifts
A stored curio can be given to another online player.

## Bottle letters (player-written)
1. A kept empty bottle lets the player write a letter (up to 900 characters) directly - no separate writing kit. Signing it corks it; it's thrown signed or anonymously.
2. Staff read every letter before it can wash up; at most 3 can wait for review at once.
3. Other players find approved letters in bottles, never their own. A found letter can be hearted once; hearted letters wash up more often.
4. A letter can be reported with a reason, pulling it from the sea and sending it back to staff.
5. Players can write a reply to a found letter. Only the original writer finds the reply, delivered on their next haul.

The server has a small staff web app for reviewing letters — the web port will need an equivalent moderation queue/admin view before enabling player-written letters.

## Leaderboards
Times Retired, Sets Completed, Best Streak, Lifetime Coins, plus monthly seasons: This Month's Coins and This Month's Sets. When a month ends, its top 3 coin earners get the Season Champion flag (12-cosmetics.md). Offline players stay on the boards.

## Announcements
Retirements, completed Log sets, a completed whole Log, and golden sets are announced to everyone in the game (each player can switch these off).
