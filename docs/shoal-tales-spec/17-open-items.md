# Open Items (from the design bible, verbatim in substance)

The design is complete and running (in Minecraft), but a few things are still open:

- **All writing is placeholder.** Letters, names, descriptions, townsfolk lines, and the quest book are first drafts. The owner rewrites them in a final writing pass. Treat names/descriptions as working copy, easy to swap.
- **Testing is in progress.** The Minecraft version is being played through by testers now — expect balance and feel changes from their results.
- **Pacing was tuned for Minecraft.** Every sort there is two clicks in a chest menu. Drag-to-bin on the web may be faster, so the ~2-hour first-run pacing target needs validating with real web players.
- **Placeholder prices**, marked as such in the source: exotic woods (5,000 coins), modded radio tracks (2,500), the pet's treat, tides, golden finds, the back room, guild upgrades, decoration bonuses, supply prices, and away earnings.
- **No events exist yet.** The system is built (section 14 / 14-extras.md); the owner designs real events after launch.
- **The original Shoal Tales design document** (not this port) is cited by section number (5.1-5.11) throughout the Minecraft build's code, but isn't included in this document. If the original has rules this document doesn't mention, the original wins for the web version — unless this document records a later decision by the owner. **This means this extracted spec, thorough as it is, may not be 100% complete; the owner is the authority on anything that seems to conflict or be missing.**

## Implementation note (not from the source doc)
Given "all writing is placeholder," the junk/curio/fish/decoration/letter text in this spec's CSVs is good enough to ship an MVP with, but the owner should get a pass to rewrite names/descriptions before or shortly after a real launch — this is explicitly expected per the design bible, not a gap in this extraction.
