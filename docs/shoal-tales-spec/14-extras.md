# Extras: Dailies, Tides, Events, Stats, Settings (Section 14)

## Dailies
Reset each real-world day:
- The first haul is 1.5x bigger with a guaranteed curio (also stated in 03-dredging.md's haul bonuses).
- One townsperson has a small request (see Daily request, 07-story.md).
- The pet's treat is available again (12-cosmetics.md).

## Tides (short staff-started events)

| Tide | Effect |
|---|---|
| Spring Tide | +25% items in every haul |
| Glass Tide | Twice the chance of curios |
| Silver Tide | +25% value on everything sorted and made |

## Events (longer, dated)
- Its own Collector's Log set of curios and fish (each curio roll has a 20% chance of coming from it while it runs); completing it gives a small lasting bonus of about +2% plus looks.
- Event-only bottle letters.
- Event looks at the Shipwright.
- Guild quests that run for the whole event.

An events board and login reminders tell players what's on. Event sets stay in the Log afterwards, and reusing an event's id next year brings it back. (Per Open Items: "No events exist yet. The system is built; the owner designs real events after launch" — this is infrastructure to build, not specific event content to pre-fill.)

## Stats
The Desk's Profile shows all-time and this-run counts: hauls, junk sorted, fish on ice, curios scrubbed, goods made, customers served, minutes at sea, coins earned, best streak, retirements, sets, golden sets, creatures seen, and letters.

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
Let each player switch off: sea sounds, announcements, the "dredge is up" chat line, the new-player sparkles, their own title display, and visitors.

## The quest book
The tutorial — there is deliberately no separate handbook. 2 chapters, 22 quests (a placeholder set the owner will rewrite). Quests can be locked behind earlier ones and claimed for rewards.

- **Task types**: hauls, coins on hand, coins earned this run, basket size, upgrade level, station installed, Emporium opened, retirements, fish species caught, a particular fish, curios logged, a particular set, any number of sets, an area unlocked, a townsperson met, story requests done, goods held, and goods handed in.
- **Reward types**: coins, tickets, supplies, a decoration, a rare material, a look, and a message.

## New-player guide
Gentle sparkles hover over the next thing to use on deck: the winch, then the Cutting Board, the Desk, the bell, and the Work Table — each until used once. On a fresh save, boarding tells the player to look for the dredge basket and check the quest book. Retired players never see the sparkles.

## Ambience
A quiet sea sound every 20-40 seconds (waves, a gull, the hull creaking, a distant bell) and a fixed golden-hour sky.

## Where junk/fish/curios come from, precisely
Junk comes from the 34 base "Everywhere" items (see junk.csv) plus the current area's own junk. Fish come from the area's sets, filtered by depth. Curios come from the area's sets. Each item remembers the value multiplier of the area it was hauled in, so moving before sorting doesn't change its worth.
