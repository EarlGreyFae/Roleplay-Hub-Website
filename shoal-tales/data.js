// AUTO-GENERATED from docs/shoal-tales-spec/*.csv and the design bible markdown.
// Regenerate with: node <scratchpad>/gen-shoal-data.js (see docs/shoal-tales-spec/ARCHITECTURE.md)
// Do not hand-edit the generated arrays below (junk/curios/fish/sets/decorations/bottleLetters) -
// edit the source CSVs instead and regenerate. The hand-authored constants (mapAreas, depths, bins,
// magicCurios, stations, upgrades, etc.) are small fixed-rule tables transcribed directly from the
// design spec and are fine to edit here.
//
// Loaded as a plain <script> in the browser (assigns window.ShoalTalesData) and required() directly
// in server.js (assigns module.exports) - same UMD pattern as shoal-tales/engine.js.

(function (root) {
  'use strict';
  var ShoalTalesData = {
  "junk": [
    {
      "id": "flip-flop",
      "name": "Flip-Flop",
      "foundIn": "Everywhere",
      "bin": "Plastic",
      "weight": 1,
      "baseCoins": 2,
      "description": "One lonely foam sandal. Light, bendy, never breaks down."
    },
    {
      "id": "shopping-bag",
      "name": "Shopping Bag",
      "foundIn": "Everywhere",
      "bin": "Plastic",
      "weight": 1,
      "baseCoins": 1,
      "description": "A thin, crinkly bag, still bobbing with trapped air."
    },
    {
      "id": "rubber-duck",
      "name": "Rubber Duck",
      "foundIn": "Everywhere",
      "bin": "Plastic",
      "weight": 1,
      "baseCoins": 3,
      "description": "Squeaks when you squeeze it. Hollow, moulded, cheerful."
    },
    {
      "id": "milk-crate",
      "name": "Milk Crate",
      "foundIn": "Everywhere",
      "bin": "Plastic",
      "weight": 3,
      "baseCoins": 5,
      "description": "A sturdy moulded crate. The dairy logo is barely legible."
    },
    {
      "id": "soda-can",
      "name": "Soda Can",
      "foundIn": "Everywhere",
      "bin": "Metal",
      "weight": 1,
      "baseCoins": 2,
      "description": "Crushed flat. It clinks against the tray."
    },
    {
      "id": "rusty-bike-chain",
      "name": "Rusty Bike Chain",
      "foundIn": "Everywhere",
      "bin": "Metal",
      "weight": 2,
      "baseCoins": 4,
      "description": "Links fused together with orange rust."
    },
    {
      "id": "tin-bucket",
      "name": "Tin Bucket",
      "foundIn": "Everywhere",
      "bin": "Metal",
      "weight": 2,
      "baseCoins": 4,
      "description": "Dented, with a wire handle. Someone's bait bucket once."
    },
    {
      "id": "hubcap",
      "name": "Hubcap",
      "foundIn": "Everywhere",
      "bin": "Metal",
      "weight": 3,
      "baseCoins": 6,
      "description": "A chrome wheel cover, surprisingly heavy for its size."
    },
    {
      "id": "shopping-cart",
      "name": "Shopping Cart",
      "foundIn": "Everywhere",
      "bin": "Metal",
      "weight": 5,
      "baseCoins": 10,
      "description": "How did this even get out here? A whole wire frame of it."
    },
    {
      "id": "glass-bottle",
      "name": "Glass Bottle",
      "foundIn": "Everywhere",
      "bin": "Glass",
      "weight": 1,
      "baseCoins": 2,
      "description": "Empty, clear, and cold. No message inside, sadly."
    },
    {
      "id": "jam-jar",
      "name": "Jam Jar",
      "foundIn": "Everywhere",
      "bin": "Glass",
      "weight": 1,
      "baseCoins": 2,
      "description": "The label washed off long ago. You can see right through it."
    },
    {
      "id": "sea-glass",
      "name": "Sea Glass",
      "foundIn": "Everywhere",
      "bin": "Glass",
      "weight": 1,
      "baseCoins": 3,
      "description": "A frosted shard, tumbled smooth by the tide."
    },
    {
      "id": "fishbowl",
      "name": "Fishbowl",
      "foundIn": "Everywhere",
      "bin": "Glass",
      "weight": 3,
      "baseCoins": 5,
      "description": "A round, see-through bowl. Its fish is long gone."
    },
    {
      "id": "driftwood",
      "name": "Driftwood",
      "foundIn": "Everywhere",
      "bin": "Wood",
      "weight": 1,
      "baseCoins": 1,
      "description": "A bleached, twisty branch. Grain still shows through."
    },
    {
      "id": "broken-oar",
      "name": "Broken Oar",
      "foundIn": "Everywhere",
      "bin": "Wood",
      "weight": 2,
      "baseCoins": 3,
      "description": "Half an oar, snapped at the shaft. Varnish peeling."
    },
    {
      "id": "crate-plank",
      "name": "Crate Plank",
      "foundIn": "Everywhere",
      "bin": "Wood",
      "weight": 2,
      "baseCoins": 2,
      "description": "A stencilled board from a shipping crate."
    },
    {
      "id": "lobster-trap-frame",
      "name": "Lobster Trap Frame",
      "foundIn": "Everywhere",
      "bin": "Wood",
      "weight": 3,
      "baseCoins": 4,
      "description": "Slatted and waterlogged. Nothing left of the netting."
    },
    {
      "id": "deck-chair",
      "name": "Deck Chair",
      "foundIn": "Everywhere",
      "bin": "Wood",
      "weight": 4,
      "baseCoins": 6,
      "description": "Heavy slats, pegged together. All one material, all soaked."
    },
    {
      "id": "tv-remote",
      "name": "TV Remote",
      "foundIn": "Everywhere",
      "bin": "Electronics",
      "weight": 1,
      "baseCoins": 4,
      "description": "Buttons, a little circuit board, a battery hatch."
    },
    {
      "id": "digital-watch",
      "name": "Digital Watch",
      "foundIn": "Everywhere",
      "bin": "Electronics",
      "weight": 1,
      "baseCoins": 6,
      "description": "The screen is blank, but there's a circuit in there."
    },
    {
      "id": "solar-garden-light",
      "name": "Solar Garden Light",
      "foundIn": "Everywhere",
      "bin": "Electronics",
      "weight": 2,
      "baseCoins": 5,
      "description": "A little solar panel on a stake, wires trailing out."
    },
    {
      "id": "pocket-radio",
      "name": "Pocket Radio",
      "foundIn": "Everywhere",
      "bin": "Electronics",
      "weight": 3,
      "baseCoins": 7,
      "description": "An antenna, a speaker grille, and water sloshing in the circuitry."
    },
    {
      "id": "boombox",
      "name": "Boombox",
      "foundIn": "Everywhere",
      "bin": "Electronics",
      "weight": 4,
      "baseCoins": 9,
      "description": "Twin speakers and a tape deck. Someone's summer, drowned."
    },
    {
      "id": "dead-batteries",
      "name": "Dead Batteries",
      "foundIn": "Everywhere",
      "bin": "Hazardous",
      "weight": 1,
      "baseCoins": 3,
      "description": "A handful of corroded cells, leaking something crusty. Handle with care."
    },
    {
      "id": "spent-flare",
      "name": "Spent Flare",
      "foundIn": "Everywhere",
      "bin": "Hazardous",
      "weight": 1,
      "baseCoins": 3,
      "description": "A burnt-out signal flare. It still smells of chemicals."
    },
    {
      "id": "motor-oil-jug",
      "name": "Motor Oil Jug",
      "foundIn": "Everywhere",
      "bin": "Hazardous",
      "weight": 2,
      "baseCoins": 3,
      "description": "Black sludge coats the inside. Don't let it touch anything."
    },
    {
      "id": "paint-tin",
      "name": "Paint Tin",
      "foundIn": "Everywhere",
      "bin": "Hazardous",
      "weight": 3,
      "baseCoins": 4,
      "description": "Half-full of old marine paint. Toxic stuff."
    },
    {
      "id": "car-battery",
      "name": "Car Battery",
      "foundIn": "Everywhere",
      "bin": "Hazardous",
      "weight": 5,
      "baseCoins": 10,
      "description": "Heavy, with acid inside. Definitely not going in a normal bin."
    },
    {
      "id": "old-sneaker",
      "name": "Old Sneaker",
      "foundIn": "Everywhere",
      "bin": "Mixed",
      "weight": 1,
      "baseCoins": 2,
      "description": "Rubber sole, fabric upper, metal eyelets. A bit of everything."
    },
    {
      "id": "broken-umbrella",
      "name": "Broken Umbrella",
      "foundIn": "Everywhere",
      "bin": "Mixed",
      "weight": 2,
      "baseCoins": 3,
      "description": "Metal ribs, nylon canopy, plastic handle, all tangled together."
    },
    {
      "id": "tangled-net",
      "name": "Tangled Net",
      "foundIn": "Everywhere",
      "bin": "Mixed",
      "weight": 2,
      "baseCoins": 3,
      "description": "Nylon mesh knotted with rope, floats and lead weights."
    },
    {
      "id": "folding-beach-chair",
      "name": "Folding Beach Chair",
      "foundIn": "Everywhere",
      "bin": "Mixed",
      "weight": 3,
      "baseCoins": 5,
      "description": "An aluminium frame with striped fabric stretched across it."
    },
    {
      "id": "skateboard",
      "name": "Skateboard",
      "foundIn": "Everywhere",
      "bin": "Mixed",
      "weight": 3,
      "baseCoins": 6,
      "description": "A wooden deck on metal trucks, with plastic wheels. Mostly wood, if you could take it apart."
    },
    {
      "id": "picture-frame",
      "name": "Picture Frame",
      "foundIn": "Everywhere",
      "bin": "Mixed",
      "weight": 2,
      "baseCoins": 4,
      "description": "Gilt-painted wood with brass corners. The glass is long gone."
    },
    {
      "id": "snorkel-the-coral-gardens",
      "name": "Snorkel",
      "foundIn": "The Coral Gardens",
      "bin": "Plastic",
      "weight": 1,
      "baseCoins": 3,
      "description": "A bendy tube with a mouthpiece. Light, bright and never rots."
    },
    {
      "id": "swim-ring-the-coral-gardens",
      "name": "Swim Ring",
      "foundIn": "The Coral Gardens",
      "bin": "Plastic",
      "weight": 2,
      "baseCoins": 3,
      "description": "A deflated ring of shiny stuff. It squeaks when you fold it."
    },
    {
      "id": "dive-weight-the-coral-gardens",
      "name": "Dive Weight",
      "foundIn": "The Coral Gardens",
      "bin": "Metal",
      "weight": 2,
      "baseCoins": 4,
      "description": "A small lump on a belt clip. Far heavier than it looks."
    },
    {
      "id": "sunglasses-the-coral-gardens",
      "name": "Sunglasses",
      "foundIn": "The Coral Gardens",
      "bin": "Mixed",
      "weight": 1,
      "baseCoins": 3,
      "description": "Moulded frames, tinted lenses, little metal hinges."
    },
    {
      "id": "circuit-board-the-wreck-field",
      "name": "Circuit Board",
      "foundIn": "The Wreck Field",
      "bin": "Electronics",
      "weight": 1,
      "baseCoins": 6,
      "description": "Green and gold, with chips soldered on in rows."
    },
    {
      "id": "old-monitor-the-wreck-field",
      "name": "Old Monitor",
      "foundIn": "The Wreck Field",
      "bin": "Electronics",
      "weight": 4,
      "baseCoins": 9,
      "description": "A boxy screen with a coil of cable. Still faintly warm, somehow."
    },
    {
      "id": "keyboard-the-wreck-field",
      "name": "Keyboard",
      "foundIn": "The Wreck Field",
      "bin": "Electronics",
      "weight": 2,
      "baseCoins": 5,
      "description": "Missing the Q. There's a board of contacts under the keys."
    },
    {
      "id": "porthole-the-wreck-field",
      "name": "Porthole",
      "foundIn": "The Wreck Field",
      "bin": "Mixed",
      "weight": 3,
      "baseCoins": 6,
      "description": "A round window: brass ring, thick pane, rubber seal."
    },
    {
      "id": "anchor-chain-the-black-rocks",
      "name": "Anchor Chain",
      "foundIn": "The Black Rocks",
      "bin": "Metal",
      "weight": 4,
      "baseCoins": 8,
      "description": "A heap of huge links, crusted orange. It clanks on the tray."
    },
    {
      "id": "handful-of-rivets-the-black-rocks",
      "name": "Handful of Rivets",
      "foundIn": "The Black Rocks",
      "bin": "Metal",
      "weight": 1,
      "baseCoins": 2,
      "description": "Fat little studs, all cold and rusty."
    },
    {
      "id": "lamp-oil-flask-the-black-rocks",
      "name": "Lamp Oil Flask",
      "foundIn": "The Black Rocks",
      "bin": "Hazardous",
      "weight": 2,
      "baseCoins": 4,
      "description": "Black and slick inside. Smells like it would catch."
    },
    {
      "id": "diving-helmet-the-black-rocks",
      "name": "Diving Helmet",
      "foundIn": "The Black Rocks",
      "bin": "Mixed",
      "weight": 5,
      "baseCoins": 11,
      "description": "A copper dome with a glass faceplate and leather straps."
    },
    {
      "id": "lamp-lens-the-lighthouse",
      "name": "Lamp Lens",
      "foundIn": "The Lighthouse",
      "bin": "Glass",
      "weight": 3,
      "baseCoins": 7,
      "description": "A ridged, heavy lens. The light comes straight through it."
    },
    {
      "id": "signal-lamp-the-lighthouse",
      "name": "Signal Lamp",
      "foundIn": "The Lighthouse",
      "bin": "Electronics",
      "weight": 3,
      "baseCoins": 7,
      "description": "A shuttered lamp with a switch and a tangle of wire."
    },
    {
      "id": "keepers-kettle-the-lighthouse",
      "name": "Keeper's Kettle",
      "foundIn": "The Lighthouse",
      "bin": "Metal",
      "weight": 2,
      "baseCoins": 4,
      "description": "Dented and blackened. It rings when you tap it."
    },
    {
      "id": "soggy-logbook-the-lighthouse",
      "name": "Soggy Logbook",
      "foundIn": "The Lighthouse",
      "bin": "Mixed",
      "weight": 1,
      "baseCoins": 3,
      "description": "Paper pages, a cloth spine and a brass clasp."
    },
    {
      "id": "plastic-prize-ring-the-sunken-carnival",
      "name": "Plastic Prize Ring",
      "foundIn": "The Sunken Carnival",
      "bin": "Plastic",
      "weight": 1,
      "baseCoins": 2,
      "description": "Gold-coloured, but it bends. From a lucky dip."
    },
    {
      "id": "candyfloss-stick-the-sunken-carnival",
      "name": "Candyfloss Stick",
      "foundIn": "The Sunken Carnival",
      "bin": "Wood",
      "weight": 1,
      "baseCoins": 1,
      "description": "A long, thin stick, still faintly sticky. The grain shows."
    },
    {
      "id": "ride-bulb-the-sunken-carnival",
      "name": "Ride Bulb",
      "foundIn": "The Sunken Carnival",
      "bin": "Glass",
      "weight": 1,
      "baseCoins": 3,
      "description": "A coloured bulb from a ride. You can see the filament through it."
    },
    {
      "id": "dodgem-battery-the-sunken-carnival",
      "name": "Dodgem Battery",
      "foundIn": "The Sunken Carnival",
      "bin": "Hazardous",
      "weight": 4,
      "baseCoins": 9,
      "description": "A great heavy block of a battery, leaking at one corner."
    },
    {
      "id": "life-ring-the-night-ferry",
      "name": "Life Ring",
      "foundIn": "The Night Ferry",
      "bin": "Plastic",
      "weight": 2,
      "baseCoins": 4,
      "description": "Orange and white, moulded, light enough to throw."
    },
    {
      "id": "ticket-machine-the-night-ferry",
      "name": "Ticket Machine",
      "foundIn": "The Night Ferry",
      "bin": "Electronics",
      "weight": 3,
      "baseCoins": 8,
      "description": "A little printer and a keypad, both dead."
    },
    {
      "id": "deck-lantern-the-night-ferry",
      "name": "Deck Lantern",
      "foundIn": "The Night Ferry",
      "bin": "Mixed",
      "weight": 2,
      "baseCoins": 4,
      "description": "Glass sides in a metal cage, with a wick inside."
    },
    {
      "id": "bench-slat-the-night-ferry",
      "name": "Bench Slat",
      "foundIn": "The Night Ferry",
      "bin": "Wood",
      "weight": 2,
      "baseCoins": 3,
      "description": "A long varnished board. Someone carved their initials in it."
    },
    {
      "id": "fishing-float-the-river-delta",
      "name": "Fishing Float",
      "foundIn": "The River Delta",
      "bin": "Plastic",
      "weight": 1,
      "baseCoins": 2,
      "description": "A little red-and-white bobber. Hollow and moulded."
    },
    {
      "id": "wicker-creel-the-river-delta",
      "name": "Wicker Creel",
      "foundIn": "The River Delta",
      "bin": "Wood",
      "weight": 2,
      "baseCoins": 4,
      "description": "A woven fishing basket. Willow, all of it."
    },
    {
      "id": "canoe-paddle-the-river-delta",
      "name": "Canoe Paddle",
      "foundIn": "The River Delta",
      "bin": "Wood",
      "weight": 3,
      "baseCoins": 5,
      "description": "A long carved blade, smoothed by a lot of rivers."
    },
    {
      "id": "weedkiller-can-the-river-delta",
      "name": "Weedkiller Can",
      "foundIn": "The River Delta",
      "bin": "Hazardous",
      "weight": 2,
      "baseCoins": 4,
      "description": "A skull and crossbones on the label. Keep it well away."
    },
    {
      "id": "car-tyre-the-tip",
      "name": "Car Tyre",
      "foundIn": "The Tip",
      "bin": "Mixed",
      "weight": 4,
      "baseCoins": 7,
      "description": "Rubber all round, with steel wire in the walls."
    },
    {
      "id": "fridge-door-the-tip",
      "name": "Fridge Door",
      "foundIn": "The Tip",
      "bin": "Mixed",
      "weight": 5,
      "baseCoins": 9,
      "description": "Metal skin, plastic lining, foam in between."
    },
    {
      "id": "aerosol-can-the-tip",
      "name": "Aerosol Can",
      "foundIn": "The Tip",
      "bin": "Hazardous",
      "weight": 1,
      "baseCoins": 3,
      "description": "Still hisses a little. Pressurised - don't crush it."
    },
    {
      "id": "broken-toaster-the-tip",
      "name": "Broken Toaster",
      "foundIn": "The Tip",
      "bin": "Electronics",
      "weight": 2,
      "baseCoins": 5,
      "description": "Heating wires, a lever and a cracked plug."
    },
    {
      "id": "dented-saucepan-the-tip",
      "name": "Dented Saucepan",
      "foundIn": "The Tip",
      "bin": "Metal",
      "weight": 2,
      "baseCoins": 3,
      "description": "A battered pan with a riveted handle. It clangs."
    }
  ],
  "curios": [
    {
      "id": "faded-postcard",
      "name": "Faded Postcard",
      "set": "Seaside Holiday",
      "area": "Shoal Bay",
      "baseCoins": 12,
      "bin": "Mixed",
      "description": "\"Greetings from Shoal Bay!\" The ink has run into watercolour."
    },
    {
      "id": "souvenir-snow-globe",
      "name": "Souvenir Snow Globe",
      "set": "Seaside Holiday",
      "area": "Shoal Bay",
      "baseCoins": 15,
      "bin": "Glass",
      "description": "A tiny lighthouse under glass. Shake it and the snow is sand."
    },
    {
      "id": "tin-toy-boat",
      "name": "Tin Toy Boat",
      "set": "Seaside Holiday",
      "area": "Shoal Bay",
      "baseCoins": 14,
      "bin": "Metal",
      "description": "Wind-up, with a little key. It still wants to float."
    },
    {
      "id": "seashell-ashtray",
      "name": "Seashell Ashtray",
      "set": "Seaside Holiday",
      "area": "Shoal Bay",
      "baseCoins": 12,
      "bin": "Mixed",
      "description": "A scallop shell with \"A Present From The Seaside\" painted on."
    },
    {
      "id": "childs-tin-spade",
      "name": "Child's Tin Spade",
      "set": "Seaside Holiday",
      "area": "Shoal Bay",
      "baseCoins": 13,
      "bin": "Metal",
      "description": "Red paint, flaking. Built a hundred sandcastles once."
    },
    {
      "id": "brass-compass",
      "name": "Brass Compass",
      "set": "Harbour History",
      "area": "Shoal Bay",
      "baseCoins": 20,
      "bin": "Metal",
      "description": "The needle still swings, though never quite to north."
    },
    {
      "id": "pocket-watch",
      "name": "Pocket Watch",
      "set": "Harbour History",
      "area": "Shoal Bay",
      "baseCoins": 22,
      "bin": "Metal",
      "description": "Stopped at 4:17. An inscription inside is worn away."
    },
    {
      "id": "captains-spyglass",
      "name": "Captain's Spyglass",
      "set": "Harbour History",
      "area": "Shoal Bay",
      "baseCoins": 24,
      "bin": "Metal",
      "description": "Leather-wrapped brass. The lens is cracked but clear."
    },
    {
      "id": "harbour-tavern-jug",
      "name": "Harbour Tavern Jug",
      "set": "Harbour History",
      "area": "Shoal Bay",
      "baseCoins": 18,
      "bin": "Mixed",
      "description": "Stoneware, stamped with the mark of a pub that closed long ago."
    },
    {
      "id": "naval-uniform-button",
      "name": "Naval Uniform Button",
      "set": "Harbour History",
      "area": "Shoal Bay",
      "baseCoins": 16,
      "bin": "Metal",
      "description": "An anchor and rope, pressed into tarnished brass."
    },
    {
      "id": "silver-ring",
      "name": "Silver Ring",
      "set": "Lost Jewellery",
      "area": "Shoal Bay",
      "baseCoins": 25,
      "bin": "Metal",
      "description": "A plain band. Someone looked for this for a long time."
    },
    {
      "id": "pearl-earring",
      "name": "Pearl Earring",
      "set": "Lost Jewellery",
      "area": "Shoal Bay",
      "baseCoins": 28,
      "bin": "Mixed",
      "description": "A single drop pearl on a bent hook. Its twin is still out there."
    },
    {
      "id": "charm-bracelet",
      "name": "Charm Bracelet",
      "set": "Lost Jewellery",
      "area": "Shoal Bay",
      "baseCoins": 26,
      "bin": "Metal",
      "description": "A horseshoe, a tiny shell, a star. One link is missing."
    },
    {
      "id": "cameo-brooch",
      "name": "Cameo Brooch",
      "set": "Lost Jewellery",
      "area": "Shoal Bay",
      "baseCoins": 30,
      "bin": "Mixed",
      "description": "A carved profile of a woman looking out to sea."
    },
    {
      "id": "emerald-pendant",
      "name": "Emerald Pendant",
      "set": "Lost Jewellery",
      "area": "Shoal Bay",
      "baseCoins": 32,
      "bin": "Glass",
      "description": "Green glass or real emerald? Hard to say. Lovely either way."
    },
    {
      "id": "glass-marble",
      "name": "Glass Marble",
      "set": "Childhood Treasures",
      "area": "Shoal Bay",
      "baseCoins": 10,
      "bin": "Glass",
      "description": "A green cat's-eye, the kind that won playground wars."
    },
    {
      "id": "tin-soldier",
      "name": "Tin Soldier",
      "set": "Childhood Treasures",
      "area": "Shoal Bay",
      "baseCoins": 14,
      "bin": "Metal",
      "description": "Standing to attention, even after all this time underwater."
    },
    {
      "id": "die-cast-toy-car",
      "name": "Die-Cast Toy Car",
      "set": "Childhood Treasures",
      "area": "Shoal Bay",
      "baseCoins": 15,
      "bin": "Metal",
      "description": "A little red roadster. The wheels still spin."
    },
    {
      "id": "wooden-yo-yo",
      "name": "Wooden Yo-Yo",
      "set": "Childhood Treasures",
      "area": "Shoal Bay",
      "baseCoins": 11,
      "bin": "Wood",
      "description": "The string is long gone, but it still fits your hand."
    },
    {
      "id": "paper-kite",
      "name": "Paper Kite",
      "set": "Childhood Treasures",
      "area": "Shoal Bay",
      "baseCoins": 12,
      "bin": "Mixed",
      "description": "Somehow still in one piece. A tail of faded ribbons."
    },
    {
      "id": "little-plush-whale",
      "name": "Little Plush Whale",
      "set": "Cute Things",
      "area": "The Coral Gardens",
      "baseCoins": 20,
      "bin": "Mixed",
      "description": "Soft, soggy and smiling. Someone will miss this very much."
    },
    {
      "id": "kitten-keyring",
      "name": "Kitten Keyring",
      "set": "Cute Things",
      "area": "The Coral Gardens",
      "baseCoins": 18,
      "bin": "Plastic",
      "description": "A tiny cat with a bell collar. The bell still jingles."
    },
    {
      "id": "bunny-slipper",
      "name": "Bunny Slipper",
      "set": "Cute Things",
      "area": "The Coral Gardens",
      "baseCoins": 17,
      "bin": "Mixed",
      "description": "One fluffy slipper with floppy ears. Left foot. Of course."
    },
    {
      "id": "sticker-album",
      "name": "Sticker Album",
      "set": "Cute Things",
      "area": "The Coral Gardens",
      "baseCoins": 24,
      "bin": "Mixed",
      "description": "Scratch-and-sniff stickers. Most still smell of strawberries."
    },
    {
      "id": "teacup-pig-figurine",
      "name": "Teacup Pig Figurine",
      "set": "Cute Things",
      "area": "The Coral Gardens",
      "baseCoins": 21,
      "bin": "Mixed",
      "description": "A porcelain piglet sitting in a teacup. Unbearably lovely."
    },
    {
      "id": "everlasting-gobstopper",
      "name": "Everlasting Gobstopper",
      "set": "Sweet Shop",
      "area": "The Coral Gardens",
      "baseCoins": 19,
      "bin": "Mixed",
      "description": "Still hard as a pebble, still layered in colours. Everlasting indeed."
    },
    {
      "id": "travel-sweets-tin",
      "name": "Travel Sweets Tin",
      "set": "Sweet Shop",
      "area": "The Coral Gardens",
      "baseCoins": 18,
      "bin": "Metal",
      "description": "Dusted with icing sugar and sea salt. One last sweet rattles inside."
    },
    {
      "id": "giant-swirl-lollipop",
      "name": "Giant Swirl Lollipop",
      "set": "Sweet Shop",
      "area": "The Coral Gardens",
      "baseCoins": 16,
      "bin": "Mixed",
      "description": "Bigger than your hand, sealed in cellophane, unbothered by the sea."
    },
    {
      "id": "wedding-cake-topper",
      "name": "Wedding Cake Topper",
      "set": "Sweet Shop",
      "area": "The Coral Gardens",
      "baseCoins": 26,
      "bin": "Mixed",
      "description": "Two little sugar figures holding hands. One has lost her head."
    },
    {
      "id": "gingerbread-mould",
      "name": "Gingerbread Mould",
      "set": "Sweet Shop",
      "area": "The Coral Gardens",
      "baseCoins": 21,
      "bin": "Wood",
      "description": "A carved wooden mould shaped like a little man. Faintly spicy."
    },
    {
      "id": "white-rabbits-watch",
      "name": "White Rabbit's Watch",
      "set": "Wonderwater",
      "area": "The Coral Gardens",
      "baseCoins": 23,
      "bin": "Metal",
      "description": "Running late. It has always been running late."
    },
    {
      "id": "drink-me-bottle",
      "name": "DRINK ME Bottle",
      "set": "Wonderwater",
      "area": "The Coral Gardens",
      "baseCoins": 20,
      "bin": "Glass",
      "description": "The label's instruction is very clear. Maybe don't."
    },
    {
      "id": "hatters-teacup",
      "name": "Hatter's Teacup",
      "set": "Wonderwater",
      "area": "The Coral Gardens",
      "baseCoins": 18,
      "bin": "Mixed",
      "description": "Six o'clock forever. The tea is sea water now."
    },
    {
      "id": "painted-playing-card",
      "name": "Painted Playing Card",
      "set": "Wonderwater",
      "area": "The Coral Gardens",
      "baseCoins": 17,
      "bin": "Mixed",
      "description": "The Two of Hearts, painted red over white. Hastily."
    },
    {
      "id": "floating-grin",
      "name": "Floating Grin",
      "set": "Wonderwater",
      "area": "The Coral Gardens",
      "baseCoins": 24,
      "bin": "Mixed",
      "description": "Just a smile, carved in pearl. The rest of it left earlier."
    },
    {
      "id": "pager",
      "name": "Pager",
      "set": "90's Tech",
      "area": "The Wreck Field",
      "baseCoins": 19,
      "bin": "Electronics",
      "description": "One last message on the screen: 07734. Upside down, it says hello."
    },
    {
      "id": "pocket-pet",
      "name": "Pocket Pet",
      "set": "90's Tech",
      "area": "The Wreck Field",
      "baseCoins": 20,
      "bin": "Electronics",
      "description": "An egg-shaped keyring pet. It passed away in 1998. It's okay now."
    },
    {
      "id": "mixtape-cassette",
      "name": "Mixtape Cassette",
      "set": "90's Tech",
      "area": "The Wreck Field",
      "baseCoins": 18,
      "bin": "Plastic",
      "description": "Side A: songs for the beach. Side B: songs for after."
    },
    {
      "id": "game-cartridge",
      "name": "Game Cartridge",
      "set": "90's Tech",
      "area": "The Wreck Field",
      "baseCoins": 21,
      "bin": "Electronics",
      "description": "Blow on the contacts. Blow on them again. Still won't load."
    },
    {
      "id": "flip-phone",
      "name": "Flip Phone",
      "set": "90's Tech",
      "area": "The Wreck Field",
      "baseCoins": 22,
      "bin": "Electronics",
      "description": "Snaps shut with the most satisfying click ever made."
    },
    {
      "id": "pixel-sword",
      "name": "Pixel Sword",
      "set": "Blocky Bits",
      "area": "The Wreck Field",
      "baseCoins": 23,
      "bin": "Plastic",
      "description": "A foam sword, square in every way. Suspiciously familiar."
    },
    {
      "id": "tiny-green-figure",
      "name": "Tiny Green Figure",
      "set": "Blocky Bits",
      "area": "The Wreck Field",
      "baseCoins": 22,
      "bin": "Plastic",
      "description": "A little green blocky figurine. It looks... tense."
    },
    {
      "id": "perfect-grass-cube",
      "name": "Perfect Grass Cube",
      "set": "Blocky Bits",
      "area": "The Wreck Field",
      "baseCoins": 17,
      "bin": "Mixed",
      "description": "Exactly one metre on each side, if you squint. Very tidy dirt."
    },
    {
      "id": "pickaxe-keyring",
      "name": "Pickaxe Keyring",
      "set": "Blocky Bits",
      "area": "The Wreck Field",
      "baseCoins": 20,
      "bin": "Plastic",
      "description": "Pale blue pickaxe, tiny chain. The shine is paint."
    },
    {
      "id": "tiny-workbench-model",
      "name": "Tiny Workbench Model",
      "set": "Blocky Bits",
      "area": "The Wreck Field",
      "baseCoins": 18,
      "bin": "Wood",
      "description": "A tabletop workbench with a grid painted on top. Satisfying."
    },
    {
      "id": "brass-goggles",
      "name": "Brass Goggles",
      "set": "Steampunk",
      "area": "The Wreck Field",
      "baseCoins": 20,
      "bin": "Metal",
      "description": "Tinted lenses, brass rims, a strap that has seen things."
    },
    {
      "id": "clockwork-bird",
      "name": "Clockwork Bird",
      "set": "Steampunk",
      "area": "The Wreck Field",
      "baseCoins": 23,
      "bin": "Metal",
      "description": "Wind it and it sings three notes, then sulks."
    },
    {
      "id": "pressure-gauge",
      "name": "Pressure Gauge",
      "set": "Steampunk",
      "area": "The Wreck Field",
      "baseCoins": 19,
      "bin": "Metal",
      "description": "The needle's pinned past the red line. Everything's fine."
    },
    {
      "id": "gear-cufflinks",
      "name": "Gear Cufflinks",
      "set": "Steampunk",
      "area": "The Wreck Field",
      "baseCoins": 18,
      "bin": "Metal",
      "description": "Tiny cogs that actually turn against each other."
    },
    {
      "id": "airship-ticket",
      "name": "Airship Ticket",
      "set": "Steampunk",
      "area": "The Wreck Field",
      "baseCoins": 20,
      "bin": "Mixed",
      "description": "First class, to a city that isn't on any map."
    },
    {
      "id": "squamous-idol",
      "name": "Squamous Idol",
      "set": "The Deep Ones",
      "area": "The Black Rocks",
      "baseCoins": 22,
      "bin": "Mixed",
      "description": "A crouched figure with too many... no. Don't count them."
    },
    {
      "id": "tentacle-ring",
      "name": "Tentacle Ring",
      "set": "The Deep Ones",
      "area": "The Black Rocks",
      "baseCoins": 19,
      "bin": "Metal",
      "description": "A gold ring shaped like a curling tentacle. It's warm."
    },
    {
      "id": "coin-from-nowhere",
      "name": "Coin From Nowhere",
      "set": "The Deep Ones",
      "area": "The Black Rocks",
      "baseCoins": 20,
      "bin": "Metal",
      "description": "Minted in a city that sank before cities existed."
    },
    {
      "id": "glistening-scale",
      "name": "Glistening Scale",
      "set": "The Deep Ones",
      "area": "The Black Rocks",
      "baseCoins": 18,
      "bin": "Mixed",
      "description": "Too large for any fish. Smells like the bottom of everything."
    },
    {
      "id": "mad-sailors-journal",
      "name": "Mad Sailor's Journal",
      "set": "The Deep Ones",
      "area": "The Black Rocks",
      "baseCoins": 21,
      "bin": "Mixed",
      "description": "The last pages are one word, over and over."
    },
    {
      "id": "cursed-iron-crown",
      "name": "Cursed Iron Crown",
      "set": "Dark Fantasy",
      "area": "The Black Rocks",
      "baseCoins": 21,
      "bin": "Metal",
      "description": "Heavy, cold, and it whispers promises. Politely decline."
    },
    {
      "id": "bone-dagger",
      "name": "Bone Dagger",
      "set": "Dark Fantasy",
      "area": "The Black Rocks",
      "baseCoins": 19,
      "bin": "Mixed",
      "description": "Carved from something big. You don't want to know what."
    },
    {
      "id": "soul-lantern",
      "name": "Soul Lantern",
      "set": "Dark Fantasy",
      "area": "The Black Rocks",
      "baseCoins": 20,
      "bin": "Metal",
      "description": "Burns blue with no fuel. Occasionally sighs."
    },
    {
      "id": "forbidden-tome",
      "name": "Forbidden Tome",
      "set": "Dark Fantasy",
      "area": "The Black Rocks",
      "baseCoins": 22,
      "bin": "Mixed",
      "description": "Bound in black leather. The pages stay blank until dark."
    },
    {
      "id": "obsidian-ring",
      "name": "Obsidian Ring",
      "set": "Dark Fantasy",
      "area": "The Black Rocks",
      "baseCoins": 18,
      "bin": "Glass",
      "description": "Glassy black, perfectly round, humming very quietly."
    },
    {
      "id": "giants-button",
      "name": "Giant's Button",
      "set": "Giants & Monsters",
      "area": "The Black Rocks",
      "baseCoins": 20,
      "bin": "Plastic",
      "description": "A coat button the size of a dinner plate."
    },
    {
      "id": "troll-tooth",
      "name": "Troll Tooth",
      "set": "Giants & Monsters",
      "area": "The Black Rocks",
      "baseCoins": 18,
      "bin": "Mixed",
      "description": "A molar as big as your fist. It's had a lot of dentistry."
    },
    {
      "id": "kraken-sucker",
      "name": "Kraken Sucker",
      "set": "Giants & Monsters",
      "area": "The Black Rocks",
      "baseCoins": 21,
      "bin": "Mixed",
      "description": "A ring of rubbery flesh the size of a tyre. Still a bit grippy."
    },
    {
      "id": "cyclops-monocle",
      "name": "Cyclops' Monocle",
      "set": "Giants & Monsters",
      "area": "The Black Rocks",
      "baseCoins": 22,
      "bin": "Glass",
      "description": "A lens as wide as a cartwheel, on a chain like an anchor's."
    },
    {
      "id": "giants-thimble",
      "name": "Giant's Thimble",
      "set": "Giants & Monsters",
      "area": "The Black Rocks",
      "baseCoins": 19,
      "bin": "Metal",
      "description": "Big enough to bathe in. Someone probably has."
    },
    {
      "id": "leaf-brooch",
      "name": "Leaf Brooch",
      "set": "High Fantasy",
      "area": "The Lighthouse",
      "baseCoins": 20,
      "bin": "Metal",
      "description": "Silver leaf veins that rustle in a breeze that isn't there."
    },
    {
      "id": "dragon-scale",
      "name": "Dragon Scale",
      "set": "High Fantasy",
      "area": "The Lighthouse",
      "baseCoins": 23,
      "bin": "Mixed",
      "description": "Iridescent and warm. Definitely a very large fish. Definitely."
    },
    {
      "id": "wizards-hat-brim",
      "name": "Wizard's Hat Brim",
      "set": "High Fantasy",
      "area": "The Lighthouse",
      "baseCoins": 18,
      "bin": "Mixed",
      "description": "Starry felt, fraying at the edges. The point has gone missing."
    },
    {
      "id": "glowing-flask",
      "name": "Glowing Flask",
      "set": "High Fantasy",
      "area": "The Lighthouse",
      "baseCoins": 21,
      "bin": "Hazardous",
      "description": "Faintly glowing, stoppered with wax. Don't shake it."
    },
    {
      "id": "rune-stone",
      "name": "Rune Stone",
      "set": "High Fantasy",
      "area": "The Lighthouse",
      "baseCoins": 19,
      "bin": "Mixed",
      "description": "A smooth stone carved with a rune that means, apparently, \"stone\"."
    },
    {
      "id": "lucky-d20",
      "name": "Lucky D20",
      "set": "Tabletop",
      "area": "The Lighthouse",
      "baseCoins": 24,
      "bin": "Plastic",
      "description": "Rolls a natural 20 every time you're not playing."
    },
    {
      "id": "painted-miniature",
      "name": "Painted Miniature",
      "set": "Tabletop",
      "area": "The Lighthouse",
      "baseCoins": 21,
      "bin": "Metal",
      "description": "A tiny pewter wizard, lovingly painted. Two coats on the robes."
    },
    {
      "id": "character-sheet",
      "name": "Character Sheet",
      "set": "Tabletop",
      "area": "The Lighthouse",
      "baseCoins": 17,
      "bin": "Mixed",
      "description": "Level 12 halfling bard. Twelve pages of backstory. Eraser marks."
    },
    {
      "id": "folding-gm-screen",
      "name": "Folding GM Screen",
      "set": "Tabletop",
      "area": "The Lighthouse",
      "baseCoins": 20,
      "bin": "Mixed",
      "description": "Tables of numbers on one side, secrets on the other."
    },
    {
      "id": "velvet-dice-bag",
      "name": "Velvet Dice Bag",
      "set": "Tabletop",
      "area": "The Lighthouse",
      "baseCoins": 18,
      "bin": "Mixed",
      "description": "Drawstring, purple velvet, heavier than it should be."
    },
    {
      "id": "tarot-card",
      "name": "Tarot Card",
      "set": "Hedge Witch",
      "area": "The Lighthouse",
      "baseCoins": 21,
      "bin": "Mixed",
      "description": "The Star. Hope, renewal, and a very wet edge."
    },
    {
      "id": "quartz-point",
      "name": "Quartz Point",
      "set": "Hedge Witch",
      "area": "The Lighthouse",
      "baseCoins": 20,
      "bin": "Glass",
      "description": "Clear and cool. Hold it to the light and it holds a rainbow."
    },
    {
      "id": "dried-herb-bundle",
      "name": "Dried Herb Bundle",
      "set": "Hedge Witch",
      "area": "The Lighthouse",
      "baseCoins": 19,
      "bin": "Mixed",
      "description": "Lavender, rosemary, sage. Still smells like somebody's kitchen."
    },
    {
      "id": "moon-water-jar",
      "name": "Moon Water Jar",
      "set": "Hedge Witch",
      "area": "The Lighthouse",
      "baseCoins": 21,
      "bin": "Glass",
      "description": "Charged under a full moon, the label says. Sealed with wax."
    },
    {
      "id": "tiny-besom-broom",
      "name": "Tiny Besom Broom",
      "set": "Hedge Witch",
      "area": "The Lighthouse",
      "baseCoins": 19,
      "bin": "Wood",
      "description": "A broom the length of your finger. Hung by the door for luck."
    },
    {
      "id": "roll-of-ride-tickets",
      "name": "Roll of Ride Tickets",
      "set": "Carnival",
      "area": "The Sunken Carnival",
      "baseCoins": 17,
      "bin": "Mixed",
      "description": "ADMIT ONE, ADMIT ONE, ADMIT ONE... a whole soggy roll."
    },
    {
      "id": "carousel-horse-head",
      "name": "Carousel Horse Head",
      "set": "Carnival",
      "area": "The Sunken Carnival",
      "baseCoins": 27,
      "bin": "Wood",
      "description": "Painted wood, gold mane, one glass eye. Still mid-gallop."
    },
    {
      "id": "rubber-clown-nose",
      "name": "Rubber Clown Nose",
      "set": "Carnival",
      "area": "The Sunken Carnival",
      "baseCoins": 15,
      "bin": "Plastic",
      "description": "Honk it. Go on. (It doesn't honk any more.)"
    },
    {
      "id": "fortune-machine-card",
      "name": "Fortune Machine Card",
      "set": "Carnival",
      "area": "The Sunken Carnival",
      "baseCoins": 22,
      "bin": "Mixed",
      "description": "\"You will find what you were not looking for.\" Well, yes."
    },
    {
      "id": "prize-goldfish-bag",
      "name": "Prize Goldfish Bag",
      "set": "Carnival",
      "area": "The Sunken Carnival",
      "baseCoins": 20,
      "bin": "Plastic",
      "description": "Empty. The goldfish made a break for it long ago. Good for him."
    },
    {
      "id": "tattered-cape",
      "name": "Tattered Cape",
      "set": "Superheroes",
      "area": "The Sunken Carnival",
      "baseCoins": 21,
      "bin": "Mixed",
      "description": "Red, dramatic, far too long to be practical."
    },
    {
      "id": "first-issue-comic",
      "name": "First-Issue Comic",
      "set": "Superheroes",
      "area": "The Sunken Carnival",
      "baseCoins": 23,
      "bin": "Mixed",
      "description": "Laminated, luckily. Issue #1 of something nobody remembers."
    },
    {
      "id": "domino-mask",
      "name": "Domino Mask",
      "set": "Superheroes",
      "area": "The Sunken Carnival",
      "baseCoins": 17,
      "bin": "Plastic",
      "description": "Keeps a secret identity perfectly, as long as nobody looks."
    },
    {
      "id": "hero-lunchbox",
      "name": "Hero Lunchbox",
      "set": "Superheroes",
      "area": "The Sunken Carnival",
      "baseCoins": 19,
      "bin": "Metal",
      "description": "Tin, with a caped hero punching a robot. Thermos missing."
    },
    {
      "id": "action-figure",
      "name": "Action Figure",
      "set": "Superheroes",
      "area": "The Sunken Carnival",
      "baseCoins": 20,
      "bin": "Plastic",
      "description": "Bendy knees, one arm missing, heroic pose intact."
    },
    {
      "id": "chicken-egg-cup",
      "name": "Chicken Egg Cup",
      "set": "Full Breakfast",
      "area": "The Sunken Carnival",
      "baseCoins": 18,
      "bin": "Mixed",
      "description": "A ceramic hen with room for one boiled egg. It looks disappointed."
    },
    {
      "id": "silver-toast-rack",
      "name": "Silver Toast Rack",
      "set": "Full Breakfast",
      "area": "The Sunken Carnival",
      "baseCoins": 24,
      "bin": "Metal",
      "description": "Five slots for toast, all empty. Hotel silver, by the stamp."
    },
    {
      "id": "brown-betty-teapot",
      "name": "Brown Betty Teapot",
      "set": "Full Breakfast",
      "area": "The Sunken Carnival",
      "baseCoins": 22,
      "bin": "Mixed",
      "description": "Chipped spout, perfect pour. Every seaside cafe had one."
    },
    {
      "id": "honey-dipper",
      "name": "Honey Dipper",
      "set": "Full Breakfast",
      "area": "The Sunken Carnival",
      "baseCoins": 17,
      "bin": "Wood",
      "description": "Grooved wood for honey. The sea has not made it any less sticky."
    },
    {
      "id": "cereal-box-prize",
      "name": "Cereal Box Prize",
      "set": "Full Breakfast",
      "area": "The Sunken Carnival",
      "baseCoins": 19,
      "bin": "Plastic",
      "description": "A tiny plastic diver. Put it in water and it sinks... then rises."
    },
    {
      "id": "rain-soaked-fedora",
      "name": "Rain-Soaked Fedora",
      "set": "Film Noir",
      "area": "The Night Ferry",
      "baseCoins": 21,
      "bin": "Mixed",
      "description": "Brim pulled low. It's seen a lot of rain and a lot of lies."
    },
    {
      "id": "nightclub-matchbook",
      "name": "Nightclub Matchbook",
      "set": "Film Noir",
      "area": "The Night Ferry",
      "baseCoins": 18,
      "bin": "Hazardous",
      "description": "\"The Blue Lagoon, Pier 9.\" A phone number inside, half smudged."
    },
    {
      "id": "detectives-badge",
      "name": "Detective's Badge",
      "set": "Film Noir",
      "area": "The Night Ferry",
      "baseCoins": 23,
      "bin": "Metal",
      "description": "Tarnished. The name has been scratched off, deliberately."
    },
    {
      "id": "typewriter-key",
      "name": "Typewriter Key",
      "set": "Film Noir",
      "area": "The Night Ferry",
      "baseCoins": 18,
      "bin": "Metal",
      "description": "The letter M. Every case has a letter M in it somewhere."
    },
    {
      "id": "red-lipstick",
      "name": "Red Lipstick",
      "set": "Film Noir",
      "area": "The Night Ferry",
      "baseCoins": 20,
      "bin": "Plastic",
      "description": "A tube of red lipstick. Someone was very sure of themselves."
    },
    {
      "id": "silver-letter-opener",
      "name": "Silver Letter-Opener",
      "set": "Vampire's Keep",
      "area": "The Night Ferry",
      "baseCoins": 18,
      "bin": "Metal",
      "description": "Silver, sharp, and suspiciously stake-shaped."
    },
    {
      "id": "bat-wing-cape-clasp",
      "name": "Bat-Wing Cape Clasp",
      "set": "Vampire's Keep",
      "area": "The Night Ferry",
      "baseCoins": 20,
      "bin": "Metal",
      "description": "Two tiny bat wings in black enamel. Very dramatic."
    },
    {
      "id": "crystal-vial",
      "name": "Crystal Vial",
      "set": "Vampire's Keep",
      "area": "The Night Ferry",
      "baseCoins": 19,
      "bin": "Glass",
      "description": "A cut-glass vial, red inside. Definitely wine. Probably wine."
    },
    {
      "id": "coffin-music-box",
      "name": "Coffin Music Box",
      "set": "Vampire's Keep",
      "area": "The Night Ferry",
      "baseCoins": 21,
      "bin": "Wood",
      "description": "Opens with a creak. Plays a waltz, very slowly."
    },
    {
      "id": "mirror-with-no-reflection",
      "name": "Mirror With No Reflection",
      "set": "Vampire's Keep",
      "area": "The Night Ferry",
      "baseCoins": 22,
      "bin": "Glass",
      "description": "Perfectly clean. You're just... not in it."
    },
    {
      "id": "neon-data-chip",
      "name": "Neon Data Chip",
      "set": "Cyberpunk",
      "area": "The Night Ferry",
      "baseCoins": 20,
      "bin": "Electronics",
      "description": "It glows pink when you hold it. Nobody knows what's on it."
    },
    {
      "id": "chrome-finger",
      "name": "Chrome Finger",
      "set": "Cyberpunk",
      "area": "The Night Ferry",
      "baseCoins": 19,
      "bin": "Metal",
      "description": "A single jointed metal finger. Points accusingly."
    },
    {
      "id": "vr-visor",
      "name": "VR Visor",
      "set": "Cyberpunk",
      "area": "The Night Ferry",
      "baseCoins": 22,
      "bin": "Electronics",
      "description": "Put it on and the sea turns into a grid. Take it off, quickly."
    },
    {
      "id": "keycard",
      "name": "Keycard",
      "set": "Cyberpunk",
      "area": "The Night Ferry",
      "baseCoins": 18,
      "bin": "Electronics",
      "description": "Access Level: ALL. The corporation would like it back."
    },
    {
      "id": "tiny-neon-sign",
      "name": "Tiny Neon Sign",
      "set": "Cyberpunk",
      "area": "The Night Ferry",
      "baseCoins": 21,
      "bin": "Electronics",
      "description": "Says OPEN in flickering pink. It's never been more wrong."
    },
    {
      "id": "explorers-pith-helmet",
      "name": "Explorer's Pith Helmet",
      "set": "Amazon River",
      "area": "The River Delta",
      "baseCoins": 22,
      "bin": "Mixed",
      "description": "Cork and canvas. It has seen further rivers than this one."
    },
    {
      "id": "tributary-map",
      "name": "Tributary Map",
      "set": "Amazon River",
      "area": "The River Delta",
      "baseCoins": 23,
      "bin": "Mixed",
      "description": "Hand-drawn rivers, with one bend circled three times."
    },
    {
      "id": "carved-frog-charm",
      "name": "Carved Frog Charm",
      "set": "Amazon River",
      "area": "The River Delta",
      "baseCoins": 18,
      "bin": "Mixed",
      "description": "Green stone, polished smooth. Its eyes follow you, pleasantly."
    },
    {
      "id": "macaw-feather",
      "name": "Macaw Feather",
      "set": "Amazon River",
      "area": "The River Delta",
      "baseCoins": 17,
      "bin": "Mixed",
      "description": "Scarlet and blue, longer than your forearm."
    },
    {
      "id": "piranha-tooth-necklace",
      "name": "Piranha-Tooth Necklace",
      "set": "Amazon River",
      "area": "The River Delta",
      "baseCoins": 20,
      "bin": "Mixed",
      "description": "A string of tiny, very sharp teeth. Worn for courage."
    },
    {
      "id": "pressed-flower-frame",
      "name": "Pressed Flower Frame",
      "set": "Cottagecore",
      "area": "The River Delta",
      "baseCoins": 19,
      "bin": "Mixed",
      "description": "Violets and daisies under glass, still holding their colour."
    },
    {
      "id": "wicker-picnic-basket",
      "name": "Wicker Picnic Basket",
      "set": "Cottagecore",
      "area": "The River Delta",
      "baseCoins": 21,
      "bin": "Wood",
      "description": "Gingham lining, one plate left inside. A very damp picnic."
    },
    {
      "id": "hand-lettered-jam-label",
      "name": "Hand-Lettered Jam Label",
      "set": "Cottagecore",
      "area": "The River Delta",
      "baseCoins": 18,
      "bin": "Mixed",
      "description": "\"Bramble, August.\" In lovely looping handwriting."
    },
    {
      "id": "silver-thimble",
      "name": "Silver Thimble",
      "set": "Cottagecore",
      "area": "The River Delta",
      "baseCoins": 19,
      "bin": "Metal",
      "description": "Dimpled silver, just big enough for a fingertip."
    },
    {
      "id": "tin-watering-can",
      "name": "Tin Watering Can",
      "set": "Cottagecore",
      "area": "The River Delta",
      "baseCoins": 23,
      "bin": "Metal",
      "description": "A little rose-headed can. Ironically, it's full."
    },
    {
      "id": "bent-grill-tongs",
      "name": "Bent Grill Tongs",
      "set": "Seaside Barbecue",
      "area": "The River Delta",
      "baseCoins": 17,
      "bin": "Metal",
      "description": "Scorched at the tips. They've turned a thousand sausages."
    },
    {
      "id": "kiss-the-cook-apron",
      "name": "Kiss the Cook Apron",
      "set": "Seaside Barbecue",
      "area": "The River Delta",
      "baseCoins": 19,
      "bin": "Mixed",
      "description": "Stained, faded, and still making the same terrible joke."
    },
    {
      "id": "secret-sauce-bottle",
      "name": "Secret Sauce Bottle",
      "set": "Seaside Barbecue",
      "area": "The River Delta",
      "baseCoins": 22,
      "bin": "Glass",
      "description": "The label just says SECRET. The contents are, too."
    },
    {
      "id": "kebab-skewer-set",
      "name": "Kebab Skewer Set",
      "set": "Seaside Barbecue",
      "area": "The River Delta",
      "baseCoins": 16,
      "bin": "Metal",
      "description": "A bundle of long steel skewers, tied with twine."
    },
    {
      "id": "chili-cook-off-trophy",
      "name": "Chili Cook-Off Trophy",
      "set": "Seaside Barbecue",
      "area": "The River Delta",
      "baseCoins": 26,
      "bin": "Metal",
      "description": "\"2nd Place, Shoal Bay Chili Cook-Off.\" Still bitter about it."
    },
    {
      "id": "lucky-ring-pull",
      "name": "Lucky Ring-Pull",
      "set": "Trash Treasures",
      "area": "The Tip",
      "baseCoins": 18,
      "bin": "Metal",
      "description": "A ring-pull someone clearly wore as a ring. Bent to fit a finger."
    },
    {
      "id": "bottle-cap-crown",
      "name": "Bottle-Cap Crown",
      "set": "Trash Treasures",
      "area": "The Tip",
      "baseCoins": 22,
      "bin": "Metal",
      "description": "Bottle caps hammered into a crown. Fit for the king of the tip."
    },
    {
      "id": "tin-can-telephone",
      "name": "Tin-Can Telephone",
      "set": "Trash Treasures",
      "area": "The Tip",
      "baseCoins": 19,
      "bin": "Metal",
      "description": "Two cans and a long, soggy string. Somebody was listening once."
    },
    {
      "id": "trolley-token",
      "name": "Trolley Token",
      "set": "Trash Treasures",
      "area": "The Tip",
      "baseCoins": 17,
      "bin": "Plastic",
      "description": "A plastic coin for a shopping trolley. Weirdly treasured."
    },
    {
      "id": "junk-drawer-robot",
      "name": "Junk-Drawer Robot",
      "set": "Trash Treasures",
      "area": "The Tip",
      "baseCoins": 24,
      "bin": "Mixed",
      "description": "Batteries, bolts and a doll's eye. Handmade, and proud of it."
    },
    {
      "id": "emergency-radio",
      "name": "Emergency Radio",
      "set": "Zombie Apocalypse",
      "area": "The Tip",
      "baseCoins": 22,
      "bin": "Electronics",
      "description": "Hand-crank. Static, static, then something that might be a voice."
    },
    {
      "id": "nail-studded-bat",
      "name": "Nail-Studded Bat",
      "set": "Zombie Apocalypse",
      "area": "The Tip",
      "baseCoins": 20,
      "bin": "Mixed",
      "description": "Well used. Signed by an entire neighbourhood watch."
    },
    {
      "id": "quarantine-map",
      "name": "Quarantine Map",
      "set": "Zombie Apocalypse",
      "area": "The Tip",
      "baseCoins": 21,
      "bin": "Mixed",
      "description": "Red zones, safe zones, and one very underlined supermarket."
    },
    {
      "id": "tinned-peaches",
      "name": "Tinned Peaches",
      "set": "Zombie Apocalypse",
      "area": "The Tip",
      "baseCoins": 18,
      "bin": "Metal",
      "description": "Survival rations. Still sealed. Best before: the end of the world."
    },
    {
      "id": "rubber-zombie-hand",
      "name": "Rubber Zombie Hand",
      "set": "Zombie Apocalypse",
      "area": "The Tip",
      "baseCoins": 19,
      "bin": "Plastic",
      "description": "Joke-shop latex. Still makes you jump when it bobs up."
    },
    {
      "id": "breathing-vhs-tape",
      "name": "Breathing VHS Tape",
      "set": "The New Flesh",
      "area": "The Tip",
      "baseCoins": 18,
      "bin": "Plastic",
      "description": "The tape breathes. Only slightly. Only when you aren't looking."
    },
    {
      "id": "beetle-typewriter",
      "name": "Beetle Typewriter",
      "set": "The New Flesh",
      "area": "The Tip",
      "baseCoins": 20,
      "bin": "Mixed",
      "description": "Part typewriter, part insect. It types when nobody's there."
    },
    {
      "id": "telepod-hatch",
      "name": "Telepod Hatch",
      "set": "The New Flesh",
      "area": "The Tip",
      "baseCoins": 22,
      "bin": "Metal",
      "description": "A curved hatch from some chamber. A single fly buzzes inside."
    },
    {
      "id": "gristle-pistol",
      "name": "Gristle Pistol",
      "set": "The New Flesh",
      "area": "The Tip",
      "baseCoins": 21,
      "bin": "Hazardous",
      "description": "Squelchy. Warm. Put it down. Put it down."
    },
    {
      "id": "fleshy-game-pod",
      "name": "Fleshy Game Pod",
      "set": "The New Flesh",
      "area": "The Tip",
      "baseCoins": 19,
      "bin": "Hazardous",
      "description": "A game console that plugs into you. Politely, you decline."
    },
    {
      "id": "paper-crown",
      "name": "Paper Crown",
      "set": "Party Favours",
      "area": "Party only",
      "baseCoins": 18,
      "bin": "Mixed",
      "description": "From a cracker, pulled by two people. Somebody got the joke too."
    },
    {
      "id": "spent-party-popper",
      "name": "Spent Party Popper",
      "set": "Party Favours",
      "area": "Party only",
      "baseCoins": 16,
      "bin": "Plastic",
      "description": "Streamers still tangled inside. It went off for somebody."
    },
    {
      "id": "friendship-bracelet",
      "name": "Friendship Bracelet",
      "set": "Party Favours",
      "area": "Party only",
      "baseCoins": 20,
      "bin": "Mixed",
      "description": "Woven in two colours. The knot was tied by someone else."
    },
    {
      "id": "shared-thermos",
      "name": "Shared Thermos",
      "set": "Party Favours",
      "area": "Party only",
      "baseCoins": 18,
      "bin": "Metal",
      "description": "Two cups screwed on top. Still faintly smells of cocoa."
    },
    {
      "id": "waterlogged-group-photo",
      "name": "Waterlogged Group Photo",
      "set": "Party Favours",
      "area": "Party only",
      "baseCoins": 22,
      "bin": "Mixed",
      "description": "Everyone's squinting into the sun, arms round each other."
    },
    {
      "id": "embroidered-pennant",
      "name": "Embroidered Pennant",
      "set": "Guild Keepsakes",
      "area": "Guild party only",
      "baseCoins": 24,
      "bin": "Mixed",
      "description": "A little triangle of cloth, stitched with a crest nobody remembers."
    },
    {
      "id": "guild-signet-ring",
      "name": "Guild Signet Ring",
      "set": "Guild Keepsakes",
      "area": "Guild party only",
      "baseCoins": 26,
      "bin": "Metal",
      "description": "Pressed into wax on a hundred letters between friends."
    },
    {
      "id": "oar-with-two-names",
      "name": "Oar With Two Names",
      "set": "Guild Keepsakes",
      "area": "Guild party only",
      "baseCoins": 22,
      "bin": "Wood",
      "description": "Two names carved into the grip. Somebody always rowed together."
    },
    {
      "id": "soggy-guild-charter",
      "name": "Soggy Guild Charter",
      "set": "Guild Keepsakes",
      "area": "Guild party only",
      "baseCoins": 24,
      "bin": "Mixed",
      "description": "Signed at the bottom by everyone. The ink ran, the promise didn't."
    },
    {
      "id": "meeting-hall-lantern",
      "name": "Meeting-Hall Lantern",
      "set": "Guild Keepsakes",
      "area": "Guild party only",
      "baseCoins": 28,
      "bin": "Metal",
      "description": "It hung over the long table where the stories got told."
    }
  ],
  "fish": [
    {
      "id": "mackerel",
      "name": "Mackerel",
      "set": "Seaside Holiday",
      "area": "Shoal Bay",
      "weight": 2,
      "baseCoins": 5,
      "depths": "Shallows to Reef Depth",
      "description": "Tiger-striped and quick. The classic pier catch."
    },
    {
      "id": "flounder",
      "name": "Flounder",
      "set": "Seaside Holiday",
      "area": "Shoal Bay",
      "weight": 2,
      "baseCoins": 6,
      "depths": "Shallows to The Deep",
      "description": "Flat as a pancake, both eyes on one side, unbothered."
    },
    {
      "id": "sand-eel",
      "name": "Sand Eel",
      "set": "Seaside Holiday",
      "area": "Shoal Bay",
      "weight": 1,
      "baseCoins": 4,
      "depths": "Shallows to The Abyss",
      "description": "A silver sliver that buries itself in sandcastles."
    },
    {
      "id": "sea-bass",
      "name": "Sea Bass",
      "set": "Harbour History",
      "area": "Shoal Bay",
      "weight": 3,
      "baseCoins": 7,
      "depths": "Shallows to Reef Depth",
      "description": "Silver-sided and proud. The harbour's old favourite."
    },
    {
      "id": "pollock",
      "name": "Pollock",
      "set": "Harbour History",
      "area": "Shoal Bay",
      "weight": 3,
      "baseCoins": 6,
      "depths": "Shallows to The Deep",
      "description": "Greenish, sturdy, found around every old pier post."
    },
    {
      "id": "ling",
      "name": "Ling",
      "set": "Harbour History",
      "area": "Shoal Bay",
      "weight": 4,
      "baseCoins": 8,
      "depths": "Shallows to The Abyss",
      "description": "Long and bronze, fond of shipwrecks and old moorings."
    },
    {
      "id": "jewel-goby",
      "name": "Jewel Goby",
      "set": "Lost Jewellery",
      "area": "Shoal Bay",
      "weight": 1,
      "baseCoins": 6,
      "depths": "Shallows to Reef Depth",
      "description": "Speckled like a scattered brooch. Tiny and sparkly."
    },
    {
      "id": "silver-bream",
      "name": "Silver Bream",
      "set": "Lost Jewellery",
      "area": "Shoal Bay",
      "weight": 2,
      "baseCoins": 7,
      "depths": "Shallows to The Deep",
      "description": "Polished silver scales, like a coin with fins."
    },
    {
      "id": "pearlside",
      "name": "Pearlside",
      "set": "Lost Jewellery",
      "area": "Shoal Bay",
      "weight": 1,
      "baseCoins": 8,
      "depths": "Shallows to The Abyss",
      "description": "A row of glowing dots down its belly, like a string of pearls."
    },
    {
      "id": "blowfish",
      "name": "Blowfish",
      "set": "Childhood Treasures",
      "area": "Shoal Bay",
      "weight": 1,
      "baseCoins": 4,
      "depths": "Shallows to Reef Depth",
      "description": "Puffs up when startled. Deflates, embarrassed."
    },
    {
      "id": "tiddler",
      "name": "Tiddler",
      "set": "Childhood Treasures",
      "area": "Shoal Bay",
      "weight": 1,
      "baseCoins": 4,
      "depths": "Shallows to The Deep",
      "description": "The sort of fish you caught in a jam jar as a kid."
    },
    {
      "id": "stickleback",
      "name": "Stickleback",
      "set": "Childhood Treasures",
      "area": "Shoal Bay",
      "weight": 1,
      "baseCoins": 5,
      "depths": "Shallows to The Abyss",
      "description": "Three little spines on its back and a lot of attitude."
    },
    {
      "id": "tin-can-blenny",
      "name": "Tin-Can Blenny",
      "set": "Trash Treasures",
      "area": "The Tip",
      "weight": 1,
      "baseCoins": 5,
      "depths": "Shallows to Reef Depth",
      "description": "Lives in an old soda can and will not be evicted."
    },
    {
      "id": "bin-lid-plaice",
      "name": "Bin-Lid Plaice",
      "set": "Trash Treasures",
      "area": "The Tip",
      "weight": 3,
      "baseCoins": 6,
      "depths": "Reef Depth to The Deep",
      "description": "Flat, round and dented. Suspiciously the size of a bin lid."
    },
    {
      "id": "wrapper-wrasse",
      "name": "Wrapper Wrasse",
      "set": "Trash Treasures",
      "area": "The Tip",
      "weight": 2,
      "baseCoins": 7,
      "depths": "The Deep to The Abyss",
      "description": "Its scales crinkle like a crisp packet."
    },
    {
      "id": "candy-stripe-wrasse",
      "name": "Candy-Stripe Wrasse",
      "set": "Sweet Shop",
      "area": "The Coral Gardens",
      "weight": 2,
      "baseCoins": 5,
      "depths": "Shallows to Reef Depth",
      "description": "Pink and white stripes, like a stick of seaside rock."
    },
    {
      "id": "rock-candy-rockfish",
      "name": "Rock Candy Rockfish",
      "set": "Sweet Shop",
      "area": "The Coral Gardens",
      "weight": 2,
      "baseCoins": 6,
      "depths": "Reef Depth to The Deep",
      "description": "Crystalline scales. Do not lick. (Tempting, though.)"
    },
    {
      "id": "toffee-grouper",
      "name": "Toffee Grouper",
      "set": "Sweet Shop",
      "area": "The Coral Gardens",
      "weight": 3,
      "baseCoins": 7,
      "depths": "The Deep to The Abyss",
      "description": "Buttery gold and very, very chewy-looking."
    },
    {
      "id": "kipper",
      "name": "Kipper",
      "set": "Full Breakfast",
      "area": "The Sunken Carnival",
      "weight": 2,
      "baseCoins": 5,
      "depths": "Shallows to Reef Depth",
      "description": "A herring with breakfast ambitions."
    },
    {
      "id": "haddock",
      "name": "Haddock",
      "set": "Full Breakfast",
      "area": "The Sunken Carnival",
      "weight": 3,
      "baseCoins": 6,
      "depths": "Reef Depth to The Deep",
      "description": "A dark thumbprint on each side. Perfect with a poached egg."
    },
    {
      "id": "sunny-side-sunfish",
      "name": "Sunny-Side Sunfish",
      "set": "Full Breakfast",
      "area": "The Sunken Carnival",
      "weight": 2,
      "baseCoins": 7,
      "depths": "The Deep to The Abyss",
      "description": "Round, white, with one yellow spot in the middle. Hmm."
    },
    {
      "id": "button-pufferling",
      "name": "Button Pufferling",
      "set": "Cute Things",
      "area": "The Coral Gardens",
      "weight": 1,
      "baseCoins": 5,
      "depths": "Shallows to Reef Depth",
      "description": "The size of a shirt button. Puffs up, still tiny."
    },
    {
      "id": "blushing-clownfish",
      "name": "Blushing Clownfish",
      "set": "Cute Things",
      "area": "The Coral Gardens",
      "weight": 1,
      "baseCoins": 6,
      "depths": "Reef Depth to The Deep",
      "description": "Pink-cheeked and shy. Hides behind your thumb."
    },
    {
      "id": "snuggle-sole",
      "name": "Snuggle Sole",
      "set": "Cute Things",
      "area": "The Coral Gardens",
      "weight": 2,
      "baseCoins": 7,
      "depths": "The Deep to The Abyss",
      "description": "Soft, flat and tries to curl up in your palm."
    },
    {
      "id": "brook-trout",
      "name": "Brook Trout",
      "set": "Cottagecore",
      "area": "The River Delta",
      "weight": 2,
      "baseCoins": 5,
      "depths": "Shallows to Reef Depth",
      "description": "Speckled with red and gold, like a wildflower meadow."
    },
    {
      "id": "meadow-char",
      "name": "Meadow Char",
      "set": "Cottagecore",
      "area": "The River Delta",
      "weight": 3,
      "baseCoins": 6,
      "depths": "Reef Depth to The Deep",
      "description": "Somehow smells faintly of cut grass."
    },
    {
      "id": "primrose-perch",
      "name": "Primrose Perch",
      "set": "Cottagecore",
      "area": "The River Delta",
      "weight": 2,
      "baseCoins": 7,
      "depths": "The Deep to The Abyss",
      "description": "Pale yellow stripes, soft as petals."
    },
    {
      "id": "sardine",
      "name": "Sardine",
      "set": "Seaside Barbecue",
      "area": "The River Delta",
      "weight": 1,
      "baseCoins": 5,
      "depths": "Shallows to Reef Depth",
      "description": "Small, silver and destined for the grill."
    },
    {
      "id": "grill-mark-snapper",
      "name": "Grill-Mark Snapper",
      "set": "Seaside Barbecue",
      "area": "The River Delta",
      "weight": 3,
      "baseCoins": 7,
      "depths": "Reef Depth to The Deep",
      "description": "Born with dark stripes that look exactly like grill marks."
    },
    {
      "id": "spicy-red-mullet",
      "name": "Spicy Red Mullet",
      "set": "Seaside Barbecue",
      "area": "The River Delta",
      "weight": 2,
      "baseCoins": 6,
      "depths": "The Deep to The Abyss",
      "description": "Bright red and, somehow, warm to the touch."
    },
    {
      "id": "piranha",
      "name": "Piranha",
      "set": "Amazon River",
      "area": "The River Delta",
      "weight": 2,
      "baseCoins": 6,
      "depths": "Shallows to Reef Depth",
      "description": "All teeth, no manners. Keep fingers well back."
    },
    {
      "id": "arapaima",
      "name": "Arapaima",
      "set": "Amazon River",
      "area": "The River Delta",
      "weight": 5,
      "baseCoins": 7,
      "depths": "Reef Depth to The Deep",
      "description": "Huge, armoured and older-looking than the river."
    },
    {
      "id": "neon-tetra",
      "name": "Neon Tetra",
      "set": "Amazon River",
      "area": "The River Delta",
      "weight": 1,
      "baseCoins": 5,
      "depths": "The Deep to The Abyss",
      "description": "A flicker of electric blue and red. Blink and it's gone."
    },
    {
      "id": "prize-goldfish",
      "name": "Prize Goldfish",
      "set": "Carnival",
      "area": "The Sunken Carnival",
      "weight": 1,
      "baseCoins": 5,
      "depths": "Shallows to Reef Depth",
      "description": "Won at a ring toss. Escaped at the first chance."
    },
    {
      "id": "juggler-jack",
      "name": "Juggler Jack",
      "set": "Carnival",
      "area": "The Sunken Carnival",
      "weight": 2,
      "baseCoins": 6,
      "depths": "Reef Depth to The Deep",
      "description": "Leaps in threes. Never drops a bubble."
    },
    {
      "id": "candy-floss-angelfish",
      "name": "Candy-Floss Angelfish",
      "set": "Carnival",
      "area": "The Sunken Carnival",
      "weight": 2,
      "baseCoins": 7,
      "depths": "The Deep to The Abyss",
      "description": "Pink fins so wispy they look spun from sugar."
    },
    {
      "id": "dial-up-eel",
      "name": "Dial-Up Eel",
      "set": "90's Tech",
      "area": "The Wreck Field",
      "weight": 2,
      "baseCoins": 6,
      "depths": "Shallows to Reef Depth",
      "description": "Screeches and bongs for a full minute before it connects."
    },
    {
      "id": "pixel-tetra",
      "name": "Pixel Tetra",
      "set": "90's Tech",
      "area": "The Wreck Field",
      "weight": 1,
      "baseCoins": 5,
      "depths": "Reef Depth to The Deep",
      "description": "Moves in jerky little steps, eight frames a second."
    },
    {
      "id": "floppy-flatfish",
      "name": "Floppy Flatfish",
      "set": "90's Tech",
      "area": "The Wreck Field",
      "weight": 2,
      "baseCoins": 7,
      "depths": "The Deep to The Abyss",
      "description": "Square-ish, black, holds exactly 1.44 megabytes of fish."
    },
    {
      "id": "boxfish",
      "name": "Boxfish",
      "set": "Blocky Bits",
      "area": "The Wreck Field",
      "weight": 2,
      "baseCoins": 6,
      "depths": "Shallows to Reef Depth",
      "description": "A real fish, genuinely box-shaped. It fits right in."
    },
    {
      "id": "square-cod",
      "name": "Square Cod",
      "set": "Blocky Bits",
      "area": "The Wreck Field",
      "weight": 2,
      "baseCoins": 5,
      "depths": "Reef Depth to The Deep",
      "description": "Every edge is a perfect right angle. Unsettlingly tidy."
    },
    {
      "id": "voxel-salmon",
      "name": "Voxel Salmon",
      "set": "Blocky Bits",
      "area": "The Wreck Field",
      "weight": 3,
      "baseCoins": 7,
      "depths": "The Deep to The Abyss",
      "description": "Built from tiny cubes. You can almost see the grid."
    },
    {
      "id": "flying-fish",
      "name": "Flying Fish",
      "set": "Superheroes",
      "area": "The Sunken Carnival",
      "weight": 1,
      "baseCoins": 6,
      "depths": "Shallows to Reef Depth",
      "description": "Glides on outstretched fins. Clearly thinks it's a hero."
    },
    {
      "id": "mighty-marlin",
      "name": "Mighty Marlin",
      "set": "Superheroes",
      "area": "The Sunken Carnival",
      "weight": 5,
      "baseCoins": 7,
      "depths": "Reef Depth to The Deep",
      "description": "Sword-nosed, chiselled and flexing slightly."
    },
    {
      "id": "sidekick-sprat",
      "name": "Sidekick Sprat",
      "set": "Superheroes",
      "area": "The Sunken Carnival",
      "weight": 1,
      "baseCoins": 5,
      "depths": "The Deep to The Abyss",
      "description": "Small, eager, always two fins behind the Marlin."
    },
    {
      "id": "cheshire-catfish",
      "name": "Cheshire Catfish",
      "set": "Wonderwater",
      "area": "The Coral Gardens",
      "weight": 2,
      "baseCoins": 6,
      "depths": "Shallows to Reef Depth",
      "description": "Grins. Fades. The grin stays a moment longer."
    },
    {
      "id": "looking-glass-carp",
      "name": "Looking-Glass Carp",
      "set": "Wonderwater",
      "area": "The Coral Gardens",
      "weight": 3,
      "baseCoins": 6,
      "depths": "Reef Depth to The Deep",
      "description": "Swims backwards through its own reflection."
    },
    {
      "id": "queen-of-hearts-koi",
      "name": "Queen of Hearts Koi",
      "set": "Wonderwater",
      "area": "The Coral Gardens",
      "weight": 3,
      "baseCoins": 6,
      "depths": "The Deep to The Abyss",
      "description": "Red and white, and very keen on beheadings."
    },
    {
      "id": "mithril-minnow",
      "name": "Mithril Minnow",
      "set": "High Fantasy",
      "area": "The Lighthouse",
      "weight": 1,
      "baseCoins": 6,
      "depths": "Shallows to Reef Depth",
      "description": "Light as a feather, bright as starlight, harder than steel."
    },
    {
      "id": "dragonet",
      "name": "Dragonet",
      "set": "High Fantasy",
      "area": "The Lighthouse",
      "weight": 2,
      "baseCoins": 6,
      "depths": "Reef Depth to The Deep",
      "description": "A real fish with sail-like fins. Its ancestors had bigger plans."
    },
    {
      "id": "elven-salmon",
      "name": "Elven Salmon",
      "set": "High Fantasy",
      "area": "The Lighthouse",
      "weight": 3,
      "baseCoins": 7,
      "depths": "The Deep to The Abyss",
      "description": "Long, graceful and faintly disapproving of your technique."
    },
    {
      "id": "dice-snapper",
      "name": "Dice Snapper",
      "set": "Tabletop",
      "area": "The Lighthouse",
      "weight": 2,
      "baseCoins": 5,
      "depths": "Shallows to Reef Depth",
      "description": "Twenty facets on its scales. Rolls when it swims."
    },
    {
      "id": "goblin-shark",
      "name": "Goblin Shark",
      "set": "Tabletop",
      "area": "The Lighthouse",
      "weight": 4,
      "baseCoins": 7,
      "depths": "Reef Depth to The Deep",
      "description": "A real deep-sea shark with a very goblin face."
    },
    {
      "id": "mimic-fish",
      "name": "Mimic Fish",
      "set": "Tabletop",
      "area": "The Lighthouse",
      "weight": 2,
      "baseCoins": 6,
      "depths": "The Deep to The Abyss",
      "description": "Looks like an ordinary cod. It is not an ordinary cod."
    },
    {
      "id": "brass-barracuda",
      "name": "Brass Barracuda",
      "set": "Steampunk",
      "area": "The Wreck Field",
      "weight": 3,
      "baseCoins": 7,
      "depths": "Shallows to Reef Depth",
      "description": "Riveted fins, a ticking sound from somewhere inside."
    },
    {
      "id": "cogfish",
      "name": "Cogfish",
      "set": "Steampunk",
      "area": "The Wreck Field",
      "weight": 2,
      "baseCoins": 6,
      "depths": "Reef Depth to The Deep",
      "description": "A round fish with gear-toothed fins that mesh when it turns."
    },
    {
      "id": "steam-eel",
      "name": "Steam Eel",
      "set": "Steampunk",
      "area": "The Wreck Field",
      "weight": 2,
      "baseCoins": 6,
      "depths": "The Deep to The Abyss",
      "description": "Whistles faintly and leaves a trail of warm bubbles."
    },
    {
      "id": "moody-blackfish",
      "name": "Moody Blackfish",
      "set": "Film Noir",
      "area": "The Night Ferry",
      "weight": 2,
      "baseCoins": 5,
      "depths": "Shallows to Reef Depth",
      "description": "Never looks directly at you. Has seen too much."
    },
    {
      "id": "femme-fatale-lionfish",
      "name": "Femme Fatale Lionfish",
      "set": "Film Noir",
      "area": "The Night Ferry",
      "weight": 2,
      "baseCoins": 7,
      "depths": "Reef Depth to The Deep",
      "description": "Gorgeous, striped, venomous. Trouble with fins."
    },
    {
      "id": "gumshoe-grouper",
      "name": "Gumshoe Grouper",
      "set": "Film Noir",
      "area": "The Night Ferry",
      "weight": 3,
      "baseCoins": 6,
      "depths": "The Deep to The Abyss",
      "description": "Always seems to be following some other fish."
    },
    {
      "id": "neon-lanternfish",
      "name": "Neon Lanternfish",
      "set": "Cyberpunk",
      "area": "The Night Ferry",
      "weight": 1,
      "baseCoins": 6,
      "depths": "Shallows to Reef Depth",
      "description": "A real deep-sea fish. This one glows hot pink and cyan."
    },
    {
      "id": "chrome-pike",
      "name": "Chrome Pike",
      "set": "Cyberpunk",
      "area": "The Night Ferry",
      "weight": 3,
      "baseCoins": 7,
      "depths": "Reef Depth to The Deep",
      "description": "Mirror-bright scales. Probably at least half machine."
    },
    {
      "id": "glitch-guppy",
      "name": "Glitch Guppy",
      "set": "Cyberpunk",
      "area": "The Night Ferry",
      "weight": 1,
      "baseCoins": 5,
      "depths": "The Deep to The Abyss",
      "description": "Flickers between two places at once. Try not to stare."
    },
    {
      "id": "moonfish",
      "name": "Moonfish",
      "set": "Hedge Witch",
      "area": "The Lighthouse",
      "weight": 4,
      "baseCoins": 7,
      "depths": "Shallows to Reef Depth",
      "description": "Round, silvery and at its best under a full moon."
    },
    {
      "id": "hagfish",
      "name": "Hagfish",
      "set": "Hedge Witch",
      "area": "The Lighthouse",
      "weight": 2,
      "baseCoins": 5,
      "depths": "Reef Depth to The Deep",
      "description": "A real fish, and a slimy one. The witches swear by it."
    },
    {
      "id": "newt-tailed-loach",
      "name": "Newt-Tailed Loach",
      "set": "Hedge Witch",
      "area": "The Lighthouse",
      "weight": 1,
      "baseCoins": 6,
      "depths": "The Deep to The Abyss",
      "description": "An essential ingredient, apparently. It disagrees."
    },
    {
      "id": "rotting-rattail",
      "name": "Rotting Rattail",
      "set": "Zombie Apocalypse",
      "area": "The Tip",
      "weight": 2,
      "baseCoins": 6,
      "depths": "Shallows to Reef Depth",
      "description": "A real deep-sea fish, looking about as alive as it feels."
    },
    {
      "id": "undead-eel",
      "name": "Undead Eel",
      "set": "Zombie Apocalypse",
      "area": "The Tip",
      "weight": 3,
      "baseCoins": 6,
      "depths": "Reef Depth to The Deep",
      "description": "Still wriggles. Should not still wriggle."
    },
    {
      "id": "zombie-carp",
      "name": "Zombie Carp",
      "set": "Zombie Apocalypse",
      "area": "The Tip",
      "weight": 3,
      "baseCoins": 6,
      "depths": "The Deep to The Abyss",
      "description": "Grey, slow, and gumming at your bait with great determination."
    },
    {
      "id": "vampire-fish",
      "name": "Vampire Fish",
      "set": "Vampire's Keep",
      "area": "The Night Ferry",
      "weight": 3,
      "baseCoins": 6,
      "depths": "Shallows to Reef Depth",
      "description": "A real river fish with two very long, very sharp fangs."
    },
    {
      "id": "bloodfin-tetra",
      "name": "Bloodfin Tetra",
      "set": "Vampire's Keep",
      "area": "The Night Ferry",
      "weight": 1,
      "baseCoins": 5,
      "depths": "Reef Depth to The Deep",
      "description": "Silver body, crimson fins, strictly nocturnal."
    },
    {
      "id": "nightcrawler-gar",
      "name": "Nightcrawler Gar",
      "set": "Vampire's Keep",
      "area": "The Night Ferry",
      "weight": 4,
      "baseCoins": 6,
      "depths": "The Deep to The Abyss",
      "description": "Needle-toothed and only ever caught after dark."
    },
    {
      "id": "cursed-anglerfish",
      "name": "Cursed Anglerfish",
      "set": "Dark Fantasy",
      "area": "The Black Rocks",
      "weight": 3,
      "baseCoins": 6,
      "depths": "Shallows to Reef Depth",
      "description": "Its lure glows a sickly green. Don't follow the light."
    },
    {
      "id": "shadow-pike",
      "name": "Shadow Pike",
      "set": "Dark Fantasy",
      "area": "The Black Rocks",
      "weight": 4,
      "baseCoins": 6,
      "depths": "Reef Depth to The Deep",
      "description": "Darker than the water around it, somehow."
    },
    {
      "id": "bone-eel",
      "name": "Bone Eel",
      "set": "Dark Fantasy",
      "area": "The Black Rocks",
      "weight": 2,
      "baseCoins": 6,
      "depths": "The Deep to The Abyss",
      "description": "All skeleton, no eel. Still swims, though."
    },
    {
      "id": "coelacanth",
      "name": "Coelacanth",
      "set": "The Deep Ones",
      "area": "The Black Rocks",
      "weight": 4,
      "baseCoins": 6,
      "depths": "Shallows to Reef Depth",
      "description": "A real fish thought extinct for 66 million years. It wasn't."
    },
    {
      "id": "many-eyed-barreleye",
      "name": "Many-Eyed Barreleye",
      "set": "The Deep Ones",
      "area": "The Black Rocks",
      "weight": 1,
      "baseCoins": 6,
      "depths": "Reef Depth to The Deep",
      "description": "A real fish with a see-through head. This one has more eyes."
    },
    {
      "id": "fangtooth",
      "name": "Fangtooth",
      "set": "The Deep Ones",
      "area": "The Black Rocks",
      "weight": 2,
      "baseCoins": 6,
      "depths": "The Deep to The Abyss",
      "description": "A real deep-sea fish with the biggest teeth for its size."
    },
    {
      "id": "blobfish",
      "name": "Blobfish",
      "set": "The New Flesh",
      "area": "The Tip",
      "weight": 3,
      "baseCoins": 6,
      "depths": "Shallows to Reef Depth",
      "description": "A real fish. Out of the deep it melts into a sad pink blob."
    },
    {
      "id": "fused-twin-eel",
      "name": "Fused Twin Eel",
      "set": "The New Flesh",
      "area": "The Tip",
      "weight": 3,
      "baseCoins": 6,
      "depths": "Reef Depth to The Deep",
      "description": "Two eels, one body, and a lot of disagreement."
    },
    {
      "id": "mutant-mudskipper",
      "name": "Mutant Mudskipper",
      "set": "The New Flesh",
      "area": "The Tip",
      "weight": 2,
      "baseCoins": 6,
      "depths": "The Deep to The Abyss",
      "description": "Walks on its fins. Some of them look like fingers."
    },
    {
      "id": "oarfish",
      "name": "Oarfish",
      "set": "Giants & Monsters",
      "area": "The Black Rocks",
      "weight": 5,
      "baseCoins": 6,
      "depths": "Shallows to Reef Depth",
      "description": "A real fish, longer than a bus. Probably behind every sea serpent story."
    },
    {
      "id": "leviathan-fry",
      "name": "Leviathan Fry",
      "set": "Giants & Monsters",
      "area": "The Black Rocks",
      "weight": 4,
      "baseCoins": 6,
      "depths": "Reef Depth to The Deep",
      "description": "A baby. Already the size of a rowing boat."
    },
    {
      "id": "megamouth",
      "name": "Megamouth",
      "set": "Giants & Monsters",
      "area": "The Black Rocks",
      "weight": 5,
      "baseCoins": 6,
      "depths": "The Deep to The Abyss",
      "description": "A real, rarely seen shark. Mostly mouth, very polite."
    }
  ],
  "sets": [
    {
      "id": "seaside-holiday",
      "name": "Seaside Holiday",
      "area": "Shoal Bay",
      "completionBonus": "payout +5%",
      "curioNames": [
        "Faded Postcard",
        "Souvenir Snow Globe",
        "Tin Toy Boat",
        "Seashell Ashtray",
        "Child's Tin Spade"
      ],
      "fishNames": [
        "Mackerel",
        "Flounder",
        "Sand Eel"
      ]
    },
    {
      "id": "harbour-history",
      "name": "Harbour History",
      "area": "Shoal Bay",
      "completionBonus": "time +5%",
      "curioNames": [
        "Brass Compass",
        "Pocket Watch",
        "Captain's Spyglass",
        "Harbour Tavern Jug",
        "Naval Uniform Button"
      ],
      "fishNames": [
        "Sea Bass",
        "Pollock",
        "Ling"
      ]
    },
    {
      "id": "lost-jewellery",
      "name": "Lost Jewellery",
      "area": "Shoal Bay",
      "completionBonus": "curio +10%",
      "curioNames": [
        "Silver Ring",
        "Pearl Earring",
        "Charm Bracelet",
        "Cameo Brooch",
        "Emerald Pendant"
      ],
      "fishNames": [
        "Jewel Goby",
        "Silver Bream",
        "Pearlside"
      ]
    },
    {
      "id": "childhood-treasures",
      "name": "Childhood Treasures",
      "area": "Shoal Bay",
      "completionBonus": "luck +5%",
      "curioNames": [
        "Glass Marble",
        "Tin Soldier",
        "Die-Cast Toy Car",
        "Wooden Yo-Yo",
        "Paper Kite"
      ],
      "fishNames": [
        "Blowfish",
        "Tiddler",
        "Stickleback"
      ]
    },
    {
      "id": "cute-things",
      "name": "Cute Things",
      "area": "The Coral Gardens",
      "completionBonus": "forgive +20%",
      "curioNames": [
        "Little Plush Whale",
        "Kitten Keyring",
        "Bunny Slipper",
        "Sticker Album",
        "Teacup Pig Figurine"
      ],
      "fishNames": [
        "Button Pufferling",
        "Blushing Clownfish",
        "Snuggle Sole"
      ]
    },
    {
      "id": "sweet-shop",
      "name": "Sweet Shop",
      "area": "The Coral Gardens",
      "completionBonus": "+15% sorted plastic",
      "curioNames": [
        "Everlasting Gobstopper",
        "Travel Sweets Tin",
        "Giant Swirl Lollipop",
        "Wedding Cake Topper",
        "Gingerbread Mould"
      ],
      "fishNames": [
        "Candy-Stripe Wrasse",
        "Rock Candy Rockfish",
        "Toffee Grouper"
      ]
    },
    {
      "id": "wonderwater",
      "name": "Wonderwater",
      "area": "The Coral Gardens",
      "completionBonus": "rarity +10%",
      "curioNames": [
        "White Rabbit's Watch",
        "DRINK ME Bottle",
        "Hatter's Teacup",
        "Painted Playing Card",
        "Floating Grin"
      ],
      "fishNames": [
        "Cheshire Catfish",
        "Looking-Glass Carp",
        "Queen of Hearts Koi"
      ]
    },
    {
      "id": "90s-tech",
      "name": "90's Tech",
      "area": "The Wreck Field",
      "completionBonus": "+15% sorted electronics",
      "curioNames": [
        "Pager",
        "Pocket Pet",
        "Mixtape Cassette",
        "Game Cartridge",
        "Flip Phone"
      ],
      "fishNames": [
        "Dial-Up Eel",
        "Pixel Tetra",
        "Floppy Flatfish"
      ]
    },
    {
      "id": "blocky-bits",
      "name": "Blocky Bits",
      "area": "The Wreck Field",
      "completionBonus": "time +3%",
      "curioNames": [
        "Pixel Sword",
        "Tiny Green Figure",
        "Perfect Grass Cube",
        "Pickaxe Keyring",
        "Tiny Workbench Model"
      ],
      "fishNames": [
        "Boxfish",
        "Square Cod",
        "Voxel Salmon"
      ]
    },
    {
      "id": "steampunk",
      "name": "Steampunk",
      "area": "The Wreck Field",
      "completionBonus": "+15% sorted metal",
      "curioNames": [
        "Brass Goggles",
        "Clockwork Bird",
        "Pressure Gauge",
        "Gear Cufflinks",
        "Airship Ticket"
      ],
      "fishNames": [
        "Brass Barracuda",
        "Cogfish",
        "Steam Eel"
      ]
    },
    {
      "id": "the-deep-ones",
      "name": "The Deep Ones",
      "area": "The Black Rocks",
      "completionBonus": "magic +50%",
      "curioNames": [
        "Squamous Idol",
        "Tentacle Ring",
        "Coin From Nowhere",
        "Glistening Scale",
        "Mad Sailor's Journal"
      ],
      "fishNames": [
        "Coelacanth",
        "Many-Eyed Barreleye",
        "Fangtooth"
      ]
    },
    {
      "id": "dark-fantasy",
      "name": "Dark Fantasy",
      "area": "The Black Rocks",
      "completionBonus": "curio +10%",
      "curioNames": [
        "Cursed Iron Crown",
        "Bone Dagger",
        "Soul Lantern",
        "Forbidden Tome",
        "Obsidian Ring"
      ],
      "fishNames": [
        "Cursed Anglerfish",
        "Shadow Pike",
        "Bone Eel"
      ]
    },
    {
      "id": "giants-monsters",
      "name": "Giants & Monsters",
      "area": "The Black Rocks",
      "completionBonus": "+1 basket slot",
      "curioNames": [
        "Giant's Button",
        "Troll Tooth",
        "Kraken Sucker",
        "Cyclops' Monocle",
        "Giant's Thimble"
      ],
      "fishNames": [
        "Oarfish",
        "Leviathan Fry",
        "Megamouth"
      ]
    },
    {
      "id": "high-fantasy",
      "name": "High Fantasy",
      "area": "The Lighthouse",
      "completionBonus": "luck +5%",
      "curioNames": [
        "Leaf Brooch",
        "Dragon Scale",
        "Wizard's Hat Brim",
        "Glowing Flask",
        "Rune Stone"
      ],
      "fishNames": [
        "Mithril Minnow",
        "Dragonet",
        "Elven Salmon"
      ]
    },
    {
      "id": "tabletop",
      "name": "Tabletop",
      "area": "The Lighthouse",
      "completionBonus": "extraItem +10%",
      "curioNames": [
        "Lucky D20",
        "Painted Miniature",
        "Character Sheet",
        "Folding GM Screen",
        "Velvet Dice Bag"
      ],
      "fishNames": [
        "Dice Snapper",
        "Goblin Shark",
        "Mimic Fish"
      ]
    },
    {
      "id": "hedge-witch",
      "name": "Hedge Witch",
      "area": "The Lighthouse",
      "completionBonus": "doubleScrub +15%",
      "curioNames": [
        "Tarot Card",
        "Quartz Point",
        "Dried Herb Bundle",
        "Moon Water Jar",
        "Tiny Besom Broom"
      ],
      "fishNames": [
        "Moonfish",
        "Hagfish",
        "Newt-Tailed Loach"
      ]
    },
    {
      "id": "carnival",
      "name": "Carnival",
      "area": "The Sunken Carnival",
      "completionBonus": "crate +50%",
      "curioNames": [
        "Roll of Ride Tickets",
        "Carousel Horse Head",
        "Rubber Clown Nose",
        "Fortune Machine Card",
        "Prize Goldfish Bag"
      ],
      "fishNames": [
        "Prize Goldfish",
        "Juggler Jack",
        "Candy-Floss Angelfish"
      ]
    },
    {
      "id": "superheroes",
      "name": "Superheroes",
      "area": "The Sunken Carnival",
      "completionBonus": "streakCap +25%",
      "curioNames": [
        "Tattered Cape",
        "First-Issue Comic",
        "Domino Mask",
        "Hero Lunchbox",
        "Action Figure"
      ],
      "fishNames": [
        "Flying Fish",
        "Mighty Marlin",
        "Sidekick Sprat"
      ]
    },
    {
      "id": "full-breakfast",
      "name": "Full Breakfast",
      "area": "The Sunken Carnival",
      "completionBonus": "townPrice +5%",
      "curioNames": [
        "Chicken Egg Cup",
        "Silver Toast Rack",
        "Brown Betty Teapot",
        "Honey Dipper",
        "Cereal Box Prize"
      ],
      "fishNames": [
        "Kipper",
        "Haddock",
        "Sunny-Side Sunfish"
      ]
    },
    {
      "id": "film-noir",
      "name": "Film Noir",
      "area": "The Night Ferry",
      "completionBonus": "letters +25%",
      "curioNames": [
        "Rain-Soaked Fedora",
        "Nightclub Matchbook",
        "Detective's Badge",
        "Typewriter Key",
        "Red Lipstick"
      ],
      "fishNames": [
        "Moody Blackfish",
        "Femme Fatale Lionfish",
        "Gumshoe Grouper"
      ]
    },
    {
      "id": "vampires-keep",
      "name": "Vampire's Keep",
      "area": "The Night Ferry",
      "completionBonus": "+15% sorted glass",
      "curioNames": [
        "Silver Letter-Opener",
        "Bat-Wing Cape Clasp",
        "Crystal Vial",
        "Coffin Music Box",
        "Mirror With No Reflection"
      ],
      "fishNames": [
        "Vampire Fish",
        "Bloodfin Tetra",
        "Nightcrawler Gar"
      ]
    },
    {
      "id": "cyberpunk",
      "name": "Cyberpunk",
      "area": "The Night Ferry",
      "completionBonus": "streakStep +1%",
      "curioNames": [
        "Neon Data Chip",
        "Chrome Finger",
        "VR Visor",
        "Keycard",
        "Tiny Neon Sign"
      ],
      "fishNames": [
        "Neon Lanternfish",
        "Chrome Pike",
        "Glitch Guppy"
      ]
    },
    {
      "id": "amazon-river",
      "name": "Amazon River",
      "area": "The River Delta",
      "completionBonus": "kindness +100%",
      "curioNames": [
        "Explorer's Pith Helmet",
        "Tributary Map",
        "Carved Frog Charm",
        "Macaw Feather",
        "Piranha-Tooth Necklace"
      ],
      "fishNames": [
        "Piranha",
        "Arapaima",
        "Neon Tetra"
      ]
    },
    {
      "id": "cottagecore",
      "name": "Cottagecore",
      "area": "The River Delta",
      "completionBonus": "+15% sorted wood",
      "curioNames": [
        "Pressed Flower Frame",
        "Wicker Picnic Basket",
        "Hand-Lettered Jam Label",
        "Silver Thimble",
        "Tin Watering Can"
      ],
      "fishNames": [
        "Brook Trout",
        "Meadow Char",
        "Primrose Perch"
      ]
    },
    {
      "id": "seaside-barbecue",
      "name": "Seaside Barbecue",
      "area": "The River Delta",
      "completionBonus": "fish +10%",
      "curioNames": [
        "Bent Grill Tongs",
        "Kiss the Cook Apron",
        "Secret Sauce Bottle",
        "Kebab Skewer Set",
        "Chili Cook-Off Trophy"
      ],
      "fishNames": [
        "Sardine",
        "Grill-Mark Snapper",
        "Spicy Red Mullet"
      ]
    },
    {
      "id": "trash-treasures",
      "name": "Trash Treasures",
      "area": "The Tip",
      "completionBonus": "payout +5%",
      "curioNames": [
        "Lucky Ring-Pull",
        "Bottle-Cap Crown",
        "Tin-Can Telephone",
        "Trolley Token",
        "Junk-Drawer Robot"
      ],
      "fishNames": [
        "Tin-Can Blenny",
        "Bin-Lid Plaice",
        "Wrapper Wrasse"
      ]
    },
    {
      "id": "zombie-apocalypse",
      "name": "Zombie Apocalypse",
      "area": "The Tip",
      "completionBonus": "+15% sorted hazardous",
      "curioNames": [
        "Emergency Radio",
        "Nail-Studded Bat",
        "Quarantine Map",
        "Tinned Peaches",
        "Rubber Zombie Hand"
      ],
      "fishNames": [
        "Rotting Rattail",
        "Undead Eel",
        "Zombie Carp"
      ]
    },
    {
      "id": "the-new-flesh",
      "name": "The New Flesh",
      "area": "The Tip",
      "completionBonus": "+15% sorted mixed",
      "curioNames": [
        "Breathing VHS Tape",
        "Beetle Typewriter",
        "Telepod Hatch",
        "Gristle Pistol",
        "Fleshy Game Pod"
      ],
      "fishNames": [
        "Blobfish",
        "Fused Twin Eel",
        "Mutant Mudskipper"
      ]
    },
    {
      "id": "party-favours",
      "name": "Party Favours",
      "area": "Party only",
      "completionBonus": "payout +5%",
      "curioNames": [
        "Paper Crown",
        "Spent Party Popper",
        "Friendship Bracelet",
        "Shared Thermos",
        "Waterlogged Group Photo"
      ],
      "fishNames": []
    },
    {
      "id": "guild-keepsakes",
      "name": "Guild Keepsakes",
      "area": "Guild party only",
      "completionBonus": "luck +5%",
      "curioNames": [
        "Embroidered Pennant",
        "Guild Signet Ring",
        "Oar With Two Names",
        "Soggy Guild Charter",
        "Meeting-Hall Lantern"
      ],
      "fishNames": []
    }
  ],
  "decorations": [
    {
      "id": "potted-fern",
      "name": "Potted Fern",
      "rarity": "Common",
      "valueBonusOnDisplay": "+0.5%"
    },
    {
      "id": "potted-poppy",
      "name": "Potted Poppy",
      "rarity": "Common",
      "valueBonusOnDisplay": "+0.5%"
    },
    {
      "id": "brass-lantern",
      "name": "Brass Lantern",
      "rarity": "Common",
      "valueBonusOnDisplay": "+0.5%"
    },
    {
      "id": "painted-vase",
      "name": "Painted Vase",
      "rarity": "Common",
      "valueBonusOnDisplay": "+0.5%"
    },
    {
      "id": "candle-cluster",
      "name": "Candle Cluster",
      "rarity": "Common",
      "valueBonusOnDisplay": "+0.5%"
    },
    {
      "id": "old-bookshelf",
      "name": "Old Bookshelf",
      "rarity": "Common",
      "valueBonusOnDisplay": "+0.5%"
    },
    {
      "id": "potted-azalea",
      "name": "Potted Azalea",
      "rarity": "Uncommon",
      "valueBonusOnDisplay": "+1%"
    },
    {
      "id": "amethyst-geode",
      "name": "Amethyst Geode",
      "rarity": "Uncommon",
      "valueBonusOnDisplay": "+1%"
    },
    {
      "id": "glowing-float",
      "name": "Glowing Float",
      "rarity": "Uncommon",
      "valueBonusOnDisplay": "+1%"
    },
    {
      "id": "record-player",
      "name": "Record Player",
      "rarity": "Uncommon",
      "valueBonusOnDisplay": "+1%"
    },
    {
      "id": "honey-hive",
      "name": "Honey Hive",
      "rarity": "Uncommon",
      "valueBonusOnDisplay": "+1%"
    },
    {
      "id": "pirate-skull",
      "name": "Pirate Skull",
      "rarity": "Rare",
      "valueBonusOnDisplay": "+2.5%"
    },
    {
      "id": "mystery-chest",
      "name": "Mystery Chest",
      "rarity": "Rare",
      "valueBonusOnDisplay": "+2.5%"
    },
    {
      "id": "scholars-desk",
      "name": "Scholar's Desk",
      "rarity": "Rare",
      "valueBonusOnDisplay": "+2.5%"
    },
    {
      "id": "ships-lodestone",
      "name": "Ship's Lodestone",
      "rarity": "Rare",
      "valueBonusOnDisplay": "+2.5%"
    },
    {
      "id": "crystal-rod",
      "name": "Crystal Rod",
      "rarity": "Rare",
      "valueBonusOnDisplay": "+2.5%"
    },
    {
      "id": "sea-dragon-head",
      "name": "Sea Dragon Head",
      "rarity": "Epic",
      "valueBonusOnDisplay": "+5%"
    },
    {
      "id": "heart-of-the-sea-shrine",
      "name": "Heart of the Sea Shrine",
      "rarity": "Epic",
      "valueBonusOnDisplay": "+5%"
    },
    {
      "id": "lighthouse-lamp",
      "name": "Lighthouse Lamp",
      "rarity": "Epic",
      "valueBonusOnDisplay": "+5%"
    },
    {
      "id": "glowing-anchor",
      "name": "Glowing Anchor",
      "rarity": "Epic",
      "valueBonusOnDisplay": "+5%"
    }
  ],
  "bottleLetters": [
    {
      "id": "from-the-pier",
      "title": "From the pier",
      "text": "If you find this, I hope the sea was kind to it. I threw it off the pier on my tenth birthday. I wished for a dog. / - M."
    },
    {
      "id": "nans-chowder",
      "title": "Nan's chowder",
      "text": "Two potatoes, one onion, whatever the boats bring in. Cream at the end, never the start. Don't tell your uncle it's the tinned sweetcorn."
    },
    {
      "id": "the-keepers-log",
      "title": "The keeper's log",
      "text": "Light lit at dusk. Fog by nine. Heard the bell again, though we took it down in the spring. Logged it anyway."
    },
    {
      "id": "an-apology",
      "title": "An apology",
      "text": "I shouldn't have said it. You were right about the boat, and about me. If this washes up at your feet, come home. / - J."
    },
    {
      "id": "tide-times",
      "title": "Tide times",
      "text": "High water 6:12. Low water 12:40. Bring the good bucket, not the one with the hole. I'll be at the rocks past the slipway."
    },
    {
      "id": "my-homework",
      "title": "My homework",
      "text": "Miss said write a letter to someone far away. You are the furthest away person I could think of. Hello. I like crabs. / - Class 3"
    },
    {
      "id": "wish-you-were-here",
      "title": "Wish you were here",
      "text": "The weather is awful and the chips are cold and I have never been happier. Wish you were here. No I don't. Yes I do."
    },
    {
      "id": "a-scrap-of-map",
      "title": "A scrap of map",
      "text": "Three paces from the leaning post. Under the flat stone. If the gulls have had it, it was never meant to be found."
    },
    {
      "id": "shopping-list",
      "title": "Shopping list",
      "text": "Bread. Milk. Rope (long). Tar. A new hat, because the sea has the old one. Biscuits for the dog."
    },
    {
      "id": "our-first-boat",
      "title": "Our first boat",
      "text": "She leaks and she lists to port and we love her. We named her after your mother, which your mother says is not the compliment we think it is."
    },
    {
      "id": "from-the-lamp-room",
      "title": "From the lamp room",
      "text": "Two hundred and twelve steps. I count them every night. Some nights there are two hundred and thirteen."
    },
    {
      "id": "a-promise",
      "title": "A promise",
      "text": "When I come back I will fix the gate, paint the shed, and stop leaving my boots in the hall. One of those, anyway. / - Your Dad"
    },
    {
      "id": "left-on-the-ferry",
      "title": "Left on the ferry",
      "text": "To whoever finds my umbrella: keep it. It never liked me. It always turned inside out on purpose."
    },
    {
      "id": "counting-stars",
      "title": "Counting stars",
      "text": "Clear night off the point. I counted until I lost count, then started again. The sea did the same with the waves."
    },
    {
      "id": "advice",
      "title": "Advice",
      "text": "Never whistle on deck. Never trust a calm morning. Always thank the sea for what it gives back. Mostly it gives back socks."
    },
    {
      "id": "goodbye-old-harbour",
      "title": "Goodbye, old harbour",
      "text": "We're moving inland. I wanted the sea to have something of mine before we go. So here it is: this letter, and a bit of my heart. / - R."
    }
  ],
  "mapAreas": [
    {
      "id": "shoalbay",
      "name": "Shoal Bay",
      "opensAtRetirement": 0,
      "valueMultiplier": 1
    },
    {
      "id": "coralgardens",
      "name": "The Coral Gardens",
      "opensAtRetirement": 1,
      "valueMultiplier": 1.5
    },
    {
      "id": "wreckfield",
      "name": "The Wreck Field",
      "opensAtRetirement": 2,
      "valueMultiplier": 2
    },
    {
      "id": "blackrocks",
      "name": "The Black Rocks",
      "opensAtRetirement": 3,
      "valueMultiplier": 2.5
    },
    {
      "id": "lighthouse",
      "name": "The Lighthouse",
      "opensAtRetirement": 4,
      "valueMultiplier": 3
    },
    {
      "id": "sunkencarnival",
      "name": "The Sunken Carnival",
      "opensAtRetirement": 5,
      "valueMultiplier": 3.5
    },
    {
      "id": "nightferry",
      "name": "The Night Ferry",
      "opensAtRetirement": 6,
      "valueMultiplier": 4
    },
    {
      "id": "riverdelta",
      "name": "The River Delta",
      "opensAtRetirement": 7,
      "valueMultiplier": 4.5
    },
    {
      "id": "thetip",
      "name": "The Tip",
      "opensAtRetirement": 8,
      "valueMultiplier": 5
    }
  ],
  "depths": [
    {
      "level": 0,
      "name": "Shallows",
      "opensAtRetirement": 0
    },
    {
      "level": 1,
      "name": "Reef Depth",
      "opensAtRetirement": 1
    },
    {
      "level": 2,
      "name": "The Deep",
      "opensAtRetirement": 2
    },
    {
      "level": 3,
      "name": "The Abyss",
      "opensAtRetirement": 3
    }
  ],
  "bins": [
    "Plastic",
    "Metal",
    "Glass",
    "Wood",
    "Electronics",
    "Hazardous",
    "Mixed"
  ],
  "magicCurios": [
    {
      "id": "mermaids-comb",
      "name": "Mermaid's Comb",
      "bonus": "payout",
      "amount": 0.1,
      "description": "+10% value on everything sorted"
    },
    {
      "id": "tide-clock",
      "name": "Tide Clock",
      "bonus": "time",
      "amount": 0.05,
      "description": "5% faster dredging"
    },
    {
      "id": "sea-glass-lantern",
      "name": "Sea-Glass Lantern",
      "bonus": "basket",
      "amount": 1,
      "description": "+1 basket slot (above the 32 cap)"
    },
    {
      "id": "sirens-locket",
      "name": "Siren's Locket",
      "bonus": "curio",
      "amount": 0.25,
      "description": "+25% curio value"
    },
    {
      "id": "glowing-pearl",
      "name": "Glowing Pearl",
      "bonus": "rarity",
      "amount": 0.25,
      "description": "+25% better curio rarity"
    },
    {
      "id": "whispering-conch",
      "name": "Whispering Conch",
      "bonus": "luck",
      "amount": 0.1,
      "description": "+10% rare finds (luck)"
    }
  ],
  "creaturesSeen": [
    {
      "id": "hermit-crab",
      "name": "Hermit Crab"
    },
    {
      "id": "baby-turtle",
      "name": "Baby Turtle"
    },
    {
      "id": "starfish",
      "name": "Starfish"
    },
    {
      "id": "seahorse",
      "name": "Seahorse"
    },
    {
      "id": "sea-snail",
      "name": "Sea Snail"
    }
  ],
  "retirementTitles": [
    "Deckhand",
    "Tidewalker",
    "Reef Runner",
    "Trench Diver",
    "Abyss Gazer",
    "Keeper of the Light",
    "Carnival Salvager",
    "Night Ferryman",
    "Delta Wanderer",
    "Monarch of the Tip",
    "Old Salt",
    "Legend of the Shoals"
  ],
  "stations": [
    {
      "id": "oven",
      "name": "Oven",
      "cost": 400,
      "hiddenRequirement": "25 fish dressed",
      "requiresType": "fishDressed",
      "requiresAmount": 25,
      "makes": "Meals from dressed fish",
      "valueFactor": 1.5,
      "buyer": "Walt"
    },
    {
      "id": "carpentry",
      "name": "Carpentry Bench",
      "cost": 1200,
      "hiddenRequirement": "60 units of wood",
      "requiresType": "sortedBin",
      "requiresBin": "Wood",
      "requiresAmount": 60,
      "makes": "Knick-knacks from stored wood junk",
      "valueFactor": 2,
      "buyer": "Rosalind"
    },
    {
      "id": "crucible",
      "name": "Crucible",
      "cost": 2500,
      "hiddenRequirement": "80 units of metal",
      "requiresType": "sortedBin",
      "requiresBin": "Metal",
      "requiresAmount": 80,
      "makes": "Ingots from stored metal junk",
      "valueFactor": 2,
      "buyer": "Hank"
    },
    {
      "id": "recycling",
      "name": "Recycling Machine",
      "cost": 3000,
      "hiddenRequirement": "20 units of mixed",
      "requiresType": "sortedBin",
      "requiresBin": "Mixed",
      "requiresAmount": 20,
      "makes": "Materials from stored mixed junk",
      "valueFactor": 2.2,
      "buyer": "Priya"
    }
  ],
  "upgrades": [
    {
      "id": "bigger-basket",
      "name": "Bigger Basket",
      "levels": 29,
      "appearsAtBasket": 0,
      "costFormula": "round(20 + 1.2*L*L) * unlockScale",
      "effectPerLevel": "+1 item per haul"
    },
    {
      "id": "faster-winch",
      "name": "Faster Winch",
      "levels": 12,
      "appearsAtBasket": 6,
      "costFormula": "round(15 * 1.6^L)",
      "effectPerLevel": "Dredge time x0.88"
    },
    {
      "id": "soft-brush",
      "name": "Soft Brush",
      "levels": 3,
      "appearsAtBasket": 10,
      "costFormula": "round(60 * 3^L)",
      "effectPerLevel": "One fewer scrub per curio (4 down to 1)"
    },
    {
      "id": "lucky-charm",
      "name": "Lucky Charm",
      "levels": 10,
      "appearsAtBasket": 16,
      "costFormula": "round(100 * 1.6^L)",
      "effectPerLevel": "+5% rare finds"
    }
  ],
  "townsfolk": [
    {
      "id": "walt",
      "name": "Walt",
      "place": "Low Tide Diner",
      "buys": "Raw fish, dressed fish, meals",
      "appearsWhen": "townOpen"
    },
    {
      "id": "dot",
      "name": "Dot",
      "place": "Dot's Salvage Yard",
      "buys": "Sorted goods (all 7 bins)",
      "appearsWhen": "townOpen"
    },
    {
      "id": "rosalind",
      "name": "Rosalind",
      "place": "Rosalind's Antiques",
      "buys": "Knick-knacks",
      "appearsWhen": "carpentry-installed"
    },
    {
      "id": "hank",
      "name": "Hank",
      "place": "Hank's Hardware",
      "buys": "Ingots",
      "appearsWhen": "crucible-installed"
    },
    {
      "id": "priya",
      "name": "Priya",
      "place": "The Makers' Co-op",
      "buys": "Materials",
      "appearsWhen": "townOpen"
    }
  ],
  "featTitles": [
    {
      "id": "streak-master",
      "name": "Streak Master",
      "earnedBy": "A streak of 100"
    },
    {
      "id": "deep-dredger",
      "name": "Deep Dredger",
      "earnedBy": "1,000 hauls"
    },
    {
      "id": "barista",
      "name": "Barista",
      "earnedBy": "100 perfect drinks served"
    },
    {
      "id": "letter-writer",
      "name": "Letter Writer",
      "earnedBy": "10 of your letters out at sea"
    },
    {
      "id": "naturalist",
      "name": "Naturalist",
      "earnedBy": "Every sea creature seen"
    },
    {
      "id": "completionist",
      "name": "Completionist",
      "earnedBy": "The whole Collector's Log"
    },
    {
      "id": "golden-touch",
      "name": "Golden Touch",
      "earnedBy": "A golden set completed"
    }
  ],
  "crowLetters": [
    {
      "id": "an-invitation-ashore",
      "title": "An invitation ashore",
      "arrivesWhen": "first-fish-dressed"
    },
    {
      "id": "something-warm",
      "title": "Something warm",
      "arrivesWhen": "oven-installed"
    },
    {
      "id": "good-hands",
      "title": "Good hands",
      "arrivesWhen": "carpentry-installed"
    },
    {
      "id": "fire-and-iron",
      "title": "Fire and iron",
      "arrivesWhen": "crucible-installed"
    },
    {
      "id": "nothing-wasted",
      "title": "Nothing wasted",
      "arrivesWhen": "recycling-installed"
    },
    {
      "id": "the-emporium",
      "title": "The Emporium",
      "arrivesWhen": "emporium-opened"
    }
  ],
  "rareMaterials": [
    "Old-Growth Timber",
    "Brass Fittings",
    "Stained Glass Panel",
    "Neon Sign"
  ],
  "storyRequests": [
    {
      "id": "walt-1",
      "personId": "walt",
      "order": 0,
      "requires": {
        "type": "rawFish",
        "amount": 5
      },
      "reward": {
        "type": "coins",
        "amount": 60
      }
    },
    {
      "id": "walt-2",
      "personId": "walt",
      "order": 1,
      "requires": {
        "type": "dressedFish",
        "amount": 10
      },
      "reward": {
        "type": "coins",
        "amount": 150
      }
    },
    {
      "id": "walt-3",
      "personId": "walt",
      "order": 2,
      "requires": {
        "type": "meals",
        "amount": 10
      },
      "reward": {
        "type": "material",
        "material": "Old-Growth Timber"
      }
    },
    {
      "id": "dot-1",
      "personId": "dot",
      "order": 0,
      "requires": {
        "type": "sortedBin",
        "bin": "Plastic",
        "amount": 20
      },
      "reward": {
        "type": "coins",
        "amount": 80
      }
    },
    {
      "id": "dot-2",
      "personId": "dot",
      "order": 1,
      "requires": {
        "type": "sortedBin",
        "bin": "Metal",
        "amount": 30
      },
      "reward": {
        "type": "coins",
        "amount": 200
      }
    },
    {
      "id": "dot-3",
      "personId": "dot",
      "order": 2,
      "requires": {
        "type": "sortedBin",
        "bin": "Mixed",
        "amount": 40
      },
      "reward": {
        "type": "material",
        "material": "Brass Fittings"
      }
    },
    {
      "id": "rosalind-1",
      "personId": "rosalind",
      "order": 0,
      "requires": {
        "type": "knickKnacks",
        "amount": 10
      },
      "reward": {
        "type": "material",
        "material": "Stained Glass Panel"
      }
    },
    {
      "id": "rosalind-2",
      "personId": "rosalind",
      "order": 1,
      "requires": {
        "type": "knickKnacks",
        "amount": 20
      },
      "reward": {
        "type": "material",
        "material": "Old-Growth Timber"
      }
    },
    {
      "id": "rosalind-3",
      "personId": "rosalind",
      "order": 2,
      "requires": {
        "type": "knickKnacks",
        "amount": 30
      },
      "reward": {
        "type": "material",
        "material": "Stained Glass Panel"
      }
    },
    {
      "id": "hank-1",
      "personId": "hank",
      "order": 0,
      "requires": {
        "type": "ingots",
        "amount": 10
      },
      "reward": {
        "type": "material",
        "material": "Brass Fittings"
      }
    },
    {
      "id": "hank-2",
      "personId": "hank",
      "order": 1,
      "requires": {
        "type": "ingots",
        "amount": 20
      },
      "reward": {
        "type": "material",
        "material": "Brass Fittings"
      }
    },
    {
      "id": "hank-3",
      "personId": "hank",
      "order": 2,
      "requires": {
        "type": "ingots",
        "amount": 30
      },
      "reward": {
        "type": "material",
        "material": "Old-Growth Timber"
      }
    },
    {
      "id": "priya-1",
      "personId": "priya",
      "order": 0,
      "requires": {
        "type": "materials",
        "amount": 6
      },
      "reward": {
        "type": "coins",
        "amount": 400
      }
    },
    {
      "id": "priya-2",
      "personId": "priya",
      "order": 1,
      "requires": {
        "type": "materials",
        "amount": 15
      },
      "reward": {
        "type": "material",
        "material": "Neon Sign"
      }
    }
  ],
  "standingOrders": [
    {
      "personId": "walt",
      "wants": {
        "type": "meals"
      },
      "baseAmount": 10,
      "amountPerFill": 5
    },
    {
      "personId": "dot",
      "wants": {
        "type": "sortedBinCycle"
      },
      "baseAmount": 30,
      "amountPerFill": 10
    },
    {
      "personId": "rosalind",
      "wants": {
        "type": "knickKnacks"
      },
      "baseAmount": 15,
      "amountPerFill": 5
    },
    {
      "personId": "hank",
      "wants": {
        "type": "ingots"
      },
      "baseAmount": 15,
      "amountPerFill": 5
    },
    {
      "personId": "priya",
      "wants": {
        "type": "materials"
      },
      "baseAmount": 15,
      "amountPerFill": 5
    }
  ],
  "dailyRequests": [
    {
      "personId": "walt",
      "description": "Put 15 fish on ice",
      "requires": {
        "type": "fishOnIceToday",
        "amount": 15
      }
    },
    {
      "personId": "dot",
      "description": "Sort 40 units of one bin (picked each day)",
      "requires": {
        "type": "sortedUnitsToday",
        "amount": 40
      }
    },
    {
      "personId": "rosalind",
      "description": "Make 12 knick-knacks",
      "requires": {
        "type": "knickKnacksToday",
        "amount": 12
      }
    },
    {
      "personId": "hank",
      "description": "Make 12 ingots",
      "requires": {
        "type": "ingotsToday",
        "amount": 12
      }
    },
    {
      "personId": "priya",
      "description": "Make 12 materials",
      "requires": {
        "type": "materialsToday",
        "amount": 12
      }
    }
  ],
  "woods": [
    {
      "id": "oak",
      "name": "Oak",
      "free": true,
      "unlocksAtRetirement": 0
    },
    {
      "id": "spruce",
      "name": "Spruce",
      "free": true,
      "unlocksAtRetirement": 0
    },
    {
      "id": "birch",
      "name": "Birch",
      "free": true,
      "unlocksAtRetirement": 0
    },
    {
      "id": "jungle",
      "name": "Jungle",
      "free": true,
      "unlocksAtRetirement": 0
    },
    {
      "id": "acacia",
      "name": "Acacia",
      "free": true,
      "unlocksAtRetirement": 0
    },
    {
      "id": "dark-oak",
      "name": "Dark Oak",
      "free": true,
      "unlocksAtRetirement": 0
    },
    {
      "id": "mangrove",
      "name": "Mangrove",
      "free": true,
      "unlocksAtRetirement": 0
    },
    {
      "id": "cherry",
      "name": "Cherry",
      "free": true,
      "unlocksAtRetirement": 0
    },
    {
      "id": "bamboo",
      "name": "Bamboo",
      "free": true,
      "unlocksAtRetirement": 0
    },
    {
      "id": "crimson",
      "name": "Crimson",
      "free": true,
      "unlocksAtRetirement": 0
    },
    {
      "id": "warped",
      "name": "Warped",
      "free": true,
      "unlocksAtRetirement": 0
    },
    {
      "id": "teak",
      "name": "Teak",
      "free": false,
      "cost": 5000,
      "unlocksAtRetirement": 1
    },
    {
      "id": "cedar",
      "name": "Cedar",
      "free": false,
      "cost": 5000,
      "unlocksAtRetirement": 2
    },
    {
      "id": "rubberwood",
      "name": "Rubberwood",
      "free": false,
      "cost": 5000,
      "unlocksAtRetirement": 3
    },
    {
      "id": "walnut",
      "name": "Walnut",
      "free": false,
      "cost": 5000,
      "unlocksAtRetirement": 4
    },
    {
      "id": "mahogany",
      "name": "Mahogany",
      "free": false,
      "cost": 5000,
      "unlocksAtRetirement": 5
    },
    {
      "id": "zebrano",
      "name": "Zebrano",
      "free": false,
      "cost": 5000,
      "unlocksAtRetirement": 6
    },
    {
      "id": "rosewood",
      "name": "Rosewood",
      "free": false,
      "cost": 5000,
      "unlocksAtRetirement": 7
    },
    {
      "id": "rainbow-gum",
      "name": "Rainbow Gum",
      "free": false,
      "cost": 5000,
      "unlocksAtRetirement": 8
    },
    {
      "id": "purpleheart",
      "name": "Purpleheart",
      "free": false,
      "cost": 5000,
      "unlocksAtRetirement": 8
    },
    {
      "id": "ebony",
      "name": "Ebony",
      "free": false,
      "cost": 5000,
      "unlocksAtRetirement": 8
    }
  ],
  "woodParts": [
    "hull",
    "deck",
    "railing",
    "mast"
  ],
  "sails": [
    {
      "id": "white",
      "name": "White",
      "unlocksAtRetirement": 0
    },
    {
      "id": "weathered",
      "name": "Weathered",
      "unlocksAtRetirement": 0
    },
    {
      "id": "tan",
      "name": "Tan",
      "unlocksAtRetirement": 0
    },
    {
      "id": "sea-blue",
      "name": "Sea Blue",
      "unlocksAtRetirement": 1
    },
    {
      "id": "crimson-sail",
      "name": "Crimson",
      "unlocksAtRetirement": 2
    },
    {
      "id": "midnight",
      "name": "Midnight",
      "unlocksAtRetirement": 3
    },
    {
      "id": "sunshine",
      "name": "Sunshine",
      "unlocksAtRetirement": 4
    },
    {
      "id": "royal",
      "name": "Royal",
      "unlocksAtRetirement": 5
    },
    {
      "id": "sunset",
      "name": "Sunset",
      "unlocksAtRetirement": 6
    },
    {
      "id": "lagoon",
      "name": "Lagoon",
      "unlocksAtRetirement": 7
    },
    {
      "id": "rose",
      "name": "Rose",
      "unlocksAtRetirement": 8
    }
  ],
  "flags": [
    {
      "id": "plain-pennant",
      "name": "Plain Pennant",
      "unlocksAtRetirement": 0
    },
    {
      "id": "jolly-roger",
      "name": "Jolly Roger",
      "unlocksAtRetirement": 1
    },
    {
      "id": "crows-colours",
      "name": "Crow's Colours",
      "unlocksAtRetirement": 2
    },
    {
      "id": "harbour-stripes",
      "name": "Harbour Stripes",
      "unlocksAtRetirement": 3
    },
    {
      "id": "coral-bloom-flag",
      "name": "Coral Bloom",
      "unlocksAtRetirement": 4
    },
    {
      "id": "chartmaker",
      "name": "Chartmaker",
      "unlocksAtRetirement": 5
    },
    {
      "id": "lighthouse-beam",
      "name": "Lighthouse Beam",
      "unlocksAtRetirement": 6
    },
    {
      "id": "sunset-gradient",
      "name": "Sunset Gradient",
      "unlocksAtRetirement": 7
    },
    {
      "id": "the-deep-flag",
      "name": "The Deep",
      "unlocksAtRetirement": 8
    },
    {
      "id": "season-champion",
      "name": "Season Champion",
      "unlocksAtRetirement": null
    }
  ],
  "pets": [
    {
      "id": "soot",
      "name": "Ship's Cat (Soot)",
      "emoji": "🐱",
      "unlocksAtRetirement": 1
    },
    {
      "id": "rusty",
      "name": "Harbour Fox (Rusty)",
      "emoji": "🦊",
      "unlocksAtRetirement": 2
    },
    {
      "id": "biscuit",
      "name": "Deck Rabbit (Biscuit)",
      "emoji": "🐰",
      "unlocksAtRetirement": 3
    },
    {
      "id": "marmalade",
      "name": "Ginger Cat (Marmalade)",
      "emoji": "🐈",
      "unlocksAtRetirement": 4
    },
    {
      "id": "shelly",
      "name": "Baby Sea Turtle (Shelly)",
      "emoji": "🐢",
      "unlocksAtRetirement": 5
    },
    {
      "id": "captain",
      "name": "Captain Parrot (Captain)",
      "emoji": "🦜",
      "unlocksAtRetirement": 6
    },
    {
      "id": "frost",
      "name": "Snow Fox (Frost)",
      "emoji": "🦊",
      "unlocksAtRetirement": 7
    },
    {
      "id": "pearl",
      "name": "Siamese Cat (Pearl)",
      "emoji": "🐈‍⬛",
      "unlocksAtRetirement": 8
    }
  ],
  "chatBadges": [
    {
      "id": "anchor-badge",
      "name": "Anchor",
      "emoji": "⚓",
      "unlocksAtRetirement": 1
    },
    {
      "id": "sea-spark",
      "name": "Sea Spark",
      "emoji": "✨",
      "unlocksAtRetirement": 2
    },
    {
      "id": "coral-bloom-badge",
      "name": "Coral Bloom",
      "emoji": "🪸",
      "unlocksAtRetirement": 3
    },
    {
      "id": "trident",
      "name": "Trident",
      "emoji": "🔱",
      "unlocksAtRetirement": 4
    },
    {
      "id": "night-moon",
      "name": "Night Moon",
      "emoji": "🌙",
      "unlocksAtRetirement": 5
    },
    {
      "id": "harbour-sun",
      "name": "Harbour Sun",
      "emoji": "☀️",
      "unlocksAtRetirement": 6
    },
    {
      "id": "sea-crown",
      "name": "Sea Crown",
      "emoji": "👑",
      "unlocksAtRetirement": 7
    },
    {
      "id": "legend-star",
      "name": "Legend Star",
      "emoji": "⭐",
      "unlocksAtRetirement": 8
    }
  ],
  "radioTracks": [
    {
      "id": "track-1",
      "name": "Track 1",
      "unlocksAtRetirement": 0
    },
    {
      "id": "track-2",
      "name": "Track 2",
      "unlocksAtRetirement": 0
    },
    {
      "id": "track-3",
      "name": "Track 3",
      "unlocksAtRetirement": 0
    },
    {
      "id": "track-4",
      "name": "Track 4",
      "unlocksAtRetirement": 0
    },
    {
      "id": "track-5",
      "name": "Track 5",
      "unlocksAtRetirement": 1
    },
    {
      "id": "track-6",
      "name": "Track 6",
      "unlocksAtRetirement": 1
    },
    {
      "id": "track-7",
      "name": "Track 7",
      "unlocksAtRetirement": 2
    },
    {
      "id": "track-8",
      "name": "Track 8",
      "unlocksAtRetirement": 2
    },
    {
      "id": "track-9",
      "name": "Track 9",
      "unlocksAtRetirement": 3
    },
    {
      "id": "track-10",
      "name": "Track 10",
      "unlocksAtRetirement": 3
    },
    {
      "id": "track-11",
      "name": "Track 11",
      "unlocksAtRetirement": 4
    },
    {
      "id": "track-12",
      "name": "Track 12",
      "unlocksAtRetirement": 4
    },
    {
      "id": "track-13",
      "name": "Track 13",
      "unlocksAtRetirement": 5
    },
    {
      "id": "track-14",
      "name": "Track 14",
      "unlocksAtRetirement": 5
    },
    {
      "id": "track-15",
      "name": "Track 15",
      "unlocksAtRetirement": 6
    },
    {
      "id": "track-16",
      "name": "Track 16",
      "unlocksAtRetirement": 6
    },
    {
      "id": "track-17",
      "name": "Track 17",
      "unlocksAtRetirement": 7
    },
    {
      "id": "track-18",
      "name": "Track 18",
      "unlocksAtRetirement": 7
    },
    {
      "id": "track-19",
      "name": "Track 19",
      "unlocksAtRetirement": 8
    },
    {
      "id": "track-20",
      "name": "Track 20",
      "unlocksAtRetirement": 8
    },
    {
      "id": "track-21",
      "name": "Track 21",
      "unlocksAtRetirement": 9
    },
    {
      "id": "track-22",
      "name": "Track 22",
      "unlocksAtRetirement": 9
    },
    {
      "id": "track-23",
      "name": "Track 23",
      "unlocksAtRetirement": 10
    },
    {
      "id": "track-24",
      "name": "Track 24",
      "unlocksAtRetirement": 10
    },
    {
      "id": "track-25",
      "name": "Track 25",
      "unlocksAtRetirement": 11
    },
    {
      "id": "track-26",
      "name": "Track 26",
      "unlocksAtRetirement": 11
    },
    {
      "id": "track-27",
      "name": "Track 27",
      "unlocksAtRetirement": 12
    },
    {
      "id": "track-28",
      "name": "Track 28",
      "unlocksAtRetirement": 12
    },
    {
      "id": "track-29",
      "name": "Track 29",
      "unlocksAtRetirement": 13
    },
    {
      "id": "track-30",
      "name": "Track 30",
      "unlocksAtRetirement": 13
    }
  ],
  "tides": [
    { "id": "spring", "name": "Spring Tide", "effect": "+25% items in every haul" },
    { "id": "glass", "name": "Glass Tide", "effect": "Twice the chance of curios" },
    { "id": "silver", "name": "Silver Tide", "effect": "+25% value on everything sorted and made" }
  ],
  // The quest book (14-extras.md): "a placeholder set the owner will
  // rewrite" - 2 chapters, 22 quests, each locked behind the previous quest
  // in its chapter (chapter 2's first quest behind chapter 1's last).
  // Covers every task type and reward type the spec lists, at least once.
  "questBook": [
    { "id": "q1-1", "chapter": 1, "order": 0, "title": "Drop the Dredge", "description": "Haul up your very first catch.", "requires": null, "task": { "type": "hauls", "amount": 1 }, "reward": { "type": "coins", "amount": 20 } },
    { "id": "q1-2", "chapter": 1, "order": 1, "title": "Fill the Tray", "description": "Haul 5 times in total.", "requires": "q1-1", "task": { "type": "hauls", "amount": 5 }, "reward": { "type": "coins", "amount": 50 } },
    { "id": "q1-3", "chapter": 1, "order": 2, "title": "A Little Nest Egg", "description": "Have 100 coins on hand.", "requires": "q1-2", "task": { "type": "coinsOnHand", "amount": 100 }, "reward": { "type": "coins", "amount": 30 } },
    { "id": "q1-4", "chapter": 1, "order": 3, "title": "Bigger Basket", "description": "Grow your basket to hold 5 items.", "requires": "q1-3", "task": { "type": "basketSize", "amount": 5 }, "reward": { "type": "tickets", "amount": 5 } },
    { "id": "q1-5", "chapter": 1, "order": 4, "title": "First Catch", "description": "Catch your first fish species.", "requires": "q1-4", "task": { "type": "fishSpeciesCaught", "amount": 1 }, "reward": { "type": "coins", "amount": 40 } },
    { "id": "q1-6", "chapter": 1, "order": 5, "title": "A Favour for a Friend", "description": "Fulfil a townsperson's story request.", "requires": "q1-5", "task": { "type": "storyRequestsDone", "amount": 1 }, "reward": { "type": "coins", "amount": 60 } },
    { "id": "q1-7", "chapter": 1, "order": 6, "title": "Open the Books", "description": "Log 3 curios in the Collector's Log.", "requires": "q1-6", "task": { "type": "curiosLogged", "amount": 3 }, "reward": { "type": "supplies", "item": "Limes", "amount": 5 } },
    { "id": "q1-8", "chapter": 1, "order": 7, "title": "Meet the Neighbours", "description": "Meet Dot down at the Salvage Yard.", "requires": "q1-7", "task": { "type": "townspersonMet", "target": "dot" }, "reward": { "type": "look", "category": "badge", "id": "anchor-badge" } },
    { "id": "q1-9", "chapter": 1, "order": 8, "title": "Hand It In", "description": "Sell 40 units of sorted goods in total.", "requires": "q1-8", "task": { "type": "goodsHandedIn", "amount": 40 }, "reward": { "type": "coins", "amount": 70 } },
    { "id": "q1-10", "chapter": 1, "order": 9, "title": "First Station", "description": "Install your first station.", "requires": "q1-9", "task": { "type": "stationInstalled", "amount": 1 }, "reward": { "type": "tickets", "amount": 10 } },
    { "id": "q1-11", "chapter": 1, "order": 10, "title": "Open for Business", "description": "Open the Emporium.", "requires": "q1-10", "task": { "type": "emporiumOpened" }, "reward": { "type": "decoration", "rarity": "Common" } },
    { "id": "q2-1", "chapter": 2, "order": 0, "title": "A Set of Your Own", "description": "Complete any one Collector's Log set.", "requires": "q1-11", "task": { "type": "setsCompleted", "amount": 1 }, "reward": { "type": "coins", "amount": 100 } },
    { "id": "q2-2", "chapter": 2, "order": 1, "title": "A Taste of Home", "description": "Complete the Seaside Holiday set.", "requires": "q2-1", "task": { "type": "particularSet", "target": "seaside-holiday" }, "reward": { "type": "coins", "amount": 120 } },
    { "id": "q2-3", "chapter": 2, "order": 2, "title": "New Horizons", "description": "Unlock the Coral Gardens.", "requires": "q2-2", "task": { "type": "areaUnlocked", "target": "coralgardens" }, "reward": { "type": "rareMaterial", "item": "Stained Glass Panel", "amount": 1 } },
    { "id": "q2-4", "chapter": 2, "order": 3, "title": "Deeper Pockets", "description": "Earn 1,000 coins this run.", "requires": "q2-3", "task": { "type": "coinsEarnedThisRun", "amount": 1000 }, "reward": { "type": "tickets", "amount": 15 } },
    { "id": "q2-5", "chapter": 2, "order": 4, "title": "Retire in Style", "description": "Retire for the first time.", "requires": "q2-4", "task": { "type": "retirements", "amount": 1 }, "reward": { "type": "coins", "amount": 200 } },
    { "id": "q2-6", "chapter": 2, "order": 5, "title": "The Classic Catch", "description": "Catch a Mackerel.", "requires": "q2-5", "task": { "type": "particularFish", "target": "mackerel" }, "reward": { "type": "coins", "amount": 80 } },
    { "id": "q2-7", "chapter": 2, "order": 6, "title": "Many Sets", "description": "Complete 3 Collector's Log sets.", "requires": "q2-6", "task": { "type": "setsCompleted", "amount": 3 }, "reward": { "type": "decoration", "rarity": "Uncommon" } },
    { "id": "q2-8", "chapter": 2, "order": 7, "title": "Goods on Hand", "description": "Hold 100 units of sorted goods at once.", "requires": "q2-7", "task": { "type": "goodsHeld", "amount": 100 }, "reward": { "type": "coins", "amount": 150 } },
    { "id": "q2-9", "chapter": 2, "order": 8, "title": "Upgrade Master", "description": "Get the Faster Winch to level 5.", "requires": "q2-8", "task": { "type": "upgradeLevel", "target": "faster-winch", "amount": 5 }, "reward": { "type": "tickets", "amount": 20 } },
    { "id": "q2-10", "chapter": 2, "order": 9, "title": "All Stations Running", "description": "Install all 4 stations.", "requires": "q2-9", "task": { "type": "stationInstalled", "amount": 4 }, "reward": { "type": "coins", "amount": 250 } },
    { "id": "q2-11", "chapter": 2, "order": 10, "title": "A Word From the Crew", "description": "Finish the quest book - for now.", "requires": "q2-10", "task": { "type": "message" }, "reward": { "type": "message", "text": "Thanks for playing through the quest book! More to come." } }
  ]
};

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShoalTalesData;
  } else {
    root.ShoalTalesData = ShoalTalesData;
  }
})(typeof window !== 'undefined' ? window : this);
