# Section 16: What's Minecraft-only vs. what the web needs

A lot of the Minecraft port's code exists only because the game runs inside Minecraft. The game rules in sections 1-15 carry over as-is; everything below should be rebuilt in web terms, or dropped.

| In Minecraft | Why it's there | On the web |
|---|---|---|
| Every screen is a 9-column chest menu, with renamed vanilla items as icons and tooltips for text | Minecraft can't show custom UI without client mods | Real UI: drag-to-bin sorting (as in the original Shoal Tales design), hover cards, proper buttons |
| Two-click Confirm buttons on big spends | Chest menus have no dialogs | Keep the safety, as normal confirm dialogs |
| Notices over the hotbar ("action bar") and in chat | No toast system | Toasts and an activity log |
| A walkable ship deck where each station is a block you right-click, plus a ferry bell between places | Minecraft is a 3D world | Screens or a clickable boat scene; the ferry becomes navigation between Boat, Town, and Emporium |
| Separate worlds for ships, Emporium shores, the Town, and guild houses; a walk-to Town and guild houses the owner builds by hand | One world per place in Minecraft | Not needed; the Town can stay a menu of shops |
| A separate inventory, adventure mode, unbreakable blocks, being fished out of the sea | Protects the skyblock world from the minigame | Not needed |
| Ship looks built from Minecraft blocks (wood types, wool sails, banner flags) and mobs as pets | That's how Minecraft draws things | Art for each look; keep the unlock rules |
| Titles floating over players' heads | Multiplayer world | A title on the profile or name tag |
| Radio tracks are Minecraft music discs | Built-in music | Its own soundtrack |
| Blocks and sounds from other mods (Farmer's Delight, Thermal, and others), with vanilla fallbacks | The modpack | Its own art and sounds |
| Seal Tokens, the server's own currency, buy premium looks | The skyblock server's shop | Decide: drop it, or build a separate premium currency |
| Each player's save is one JSON blob on their Minecraft player; server data holds guilds, letters, leaderboards, tips | Minecraft's storage | A save in the browser for single-player; a backend for anything shared |
| Staff commands: test shortcuts, wipes, backups, restore, inspect, give, tides, the letter review queue, bug reports | Running a live server | Developer and admin tools |
| A quest book item in the inventory | Minecraft item | A quests panel |
| A fixed golden-hour sky and ambient sea sounds | Atmosphere | Background art and audio |

## Real-world time
The dredge timer, away earnings, dailies (reset at UTC midnight), the pet's treat, tides, and monthly seasons all use the real clock, not game time. A web version should do the same, and guard against clock tampering if anything is shared (i.e. compute these server-side, never trust client clocks for anything that pays out).

## What a single-player web version needs
The core loop and everything a solo player touches works without a server: dredging, sorting, fish, curios, stations, Town, Emporium, retiring, looks, quests, and dailies. **Parties, guilds, player bottle letters, visits, tips, gifts, leaderboards, and seasons need accounts and a backend; they can come later or be left out.** (Roleplay Hub already has accounts and a backend via its existing user/WebSocket system, so this spec's "needs a backend" features are feasible to build directly on top of that — but they're still the natural second wave of work after the solo core loop is solid, per this same distinction the original spec draws.)

## Tides — mechanics note
Tides are short server-wide events (1-240 minutes, default 10) started by staff by hand, never at random. Everyone is told when one starts and ends, and the Dredge menu shows it. On Roleplay Hub this maps to a superadmin-triggered action (consistent with the existing `isSuperAdmin` role already in the app).
