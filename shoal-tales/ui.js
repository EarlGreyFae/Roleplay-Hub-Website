// Shoal Tales UI: React components for the minigame, loaded as a plain
// <script> after React/ReactDOM and after shoal-tales/data.js + engine.js.
// Assigns window.ShoalTalesUI = { ShoalTalesScreen }.
//
// Style note: unlike index.html's hand-expanded React.createElement calls,
// this file uses a local `h` alias (h = React.createElement) for brevity -
// still plain function calls, no JSX, no build step, just less typing across
// what will grow into a large multi-screen UI (see ARCHITECTURE.md).
//
// Self-contained on purpose: no dependency on index.html's own Icons/helpers,
// so this file can be dropped into any page that loads React + this bundle.
(function (root) {
  'use strict';

  var h = root.React.createElement;
  var useState = root.React.useState;
  var useEffect = root.React.useEffect;
  var useCallback = root.React.useCallback;
  var useRef = root.React.useRef;

  var DATA = root.ShoalTalesData;
  var ENGINE = root.ShoalTalesEngine;

  // --- tiny inline-SVG icon helper (feather-icon style, self-contained) ---
  function Icon(pathChildren, props) {
    return h('svg', Object.assign({
      viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2',
      strokeLinecap: 'round', strokeLinejoin: 'round'
    }, props), pathChildren);
  }
  var Icons = {
    Anchor: function (props) {
      return Icon([
        h('circle', { key: 'c', cx: '12', cy: '5', r: '3' }),
        h('line', { key: 'l1', x1: '12', y1: '22', x2: '12', y2: '8' }),
        h('path', { key: 'p', d: 'M5 12H2a10 10 0 0 0 20 0h-3' })
      ], props);
    },
    Fish: function (props) {
      return Icon([
        h('path', { key: 'p1', d: 'M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.46-3.44 6-7 6-3.56 0-7.56-2.54-8.5-6Z' }),
        h('path', { key: 'p2', d: 'M18 12v.01' }),
        h('path', { key: 'p3', d: 'M2 12c1-1.5 2.5-2.5 4.5-2.5' }),
        h('path', { key: 'p4', d: 'M2 12c1 1.5 2.5 2.5 4.5 2.5' })
      ], props);
    },
    Coins: function (props) {
      return Icon([
        h('circle', { key: 'c1', cx: '8', cy: '8', r: '6' }),
        h('path', { key: 'p1', d: 'M18.09 10.37A6 6 0 1 1 10.34 18' }),
        h('path', { key: 'p2', d: 'M7 6h1v4' }),
        h('path', { key: 'p3', d: 'm16.71 13.88.7.71-2.82 2.82' })
      ], props);
    },
    Zap: function (props) {
      return Icon([h('path', { key: 'p', d: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z' })], props);
    },
    ChevronDown: function (props) {
      return Icon([h('polyline', { key: 'p', points: '6 9 12 15 18 9' })], props);
    },
    ArrowUp: function (props) {
      return Icon([h('path', { key: 'p1', d: 'm5 12 7-7 7 7' }), h('path', { key: 'p2', d: 'M12 19V5' })], props);
    },
    Trash: function (props) {
      return Icon([h('path', { key: 'p1', d: 'M3 6h18' }), h('path', { key: 'p2', d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }), h('path', { key: 'p3', d: 'm19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' })], props);
    },
    Gem: function (props) {
      return Icon([h('path', { key: 'p1', d: 'M6 3h12l4 6-10 12L2 9Z' }), h('path', { key: 'p2', d: 'M11 3 8 9l4 12 4-12-3-6' }), h('path', { key: 'p3', d: 'M2 9h20' })], props);
    },
    Box: function (props) {
      return Icon([h('path', { key: 'p1', d: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z' }), h('path', { key: 'p2', d: 'm3.3 7 8.7 5 8.7-5' }), h('path', { key: 'p3', d: 'M12 22V12' })], props);
    },
    Bottle: function (props) {
      return Icon([h('path', { key: 'p1', d: 'M9 2h6v4l2 3v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9l2-3Z' }), h('path', { key: 'p2', d: 'M9 2h6' })], props);
    },
    Creature: function (props) {
      return Icon([h('circle', { key: 'c1', cx: '12', cy: '12', r: '4' }), h('path', { key: 'p1', d: 'M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' })], props);
    },
    Sparkle: function (props) {
      return Icon([h('path', { key: 'p1', d: 'M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8' })], props);
    },
    Mail: function (props) {
      return Icon([h('rect', { key: 'r', x: '3', y: '5', width: '18', height: '14', rx: '2' }), h('path', { key: 'p', d: 'm3 7 9 6 9-6' })], props);
    },
    Users: function (props) {
      return Icon([
        h('path', { key: 'p1', d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' }),
        h('circle', { key: 'c1', cx: '9', cy: '7', r: '4' }),
        h('path', { key: 'p2', d: 'M23 21v-2a4 4 0 0 0-3-3.87' }),
        h('path', { key: 'p3', d: 'M16 3.13a4 4 0 0 1 0 7.75' })
      ], props);
    },
    Flag: function (props) {
      return Icon([h('path', { key: 'p1', d: 'M4 22V4' }), h('path', { key: 'p2', d: 'M4 4h14l-3 4 3 4H4' })], props);
    },
    Home: function (props) {
      return Icon([h('path', { key: 'p1', d: 'm3 9 9-7 9 7' }), h('path', { key: 'p2', d: 'M5 10v10h14V10' })], props);
    },
    Trophy: function (props) {
      return Icon([
        h('path', { key: 'p1', d: 'M8 21h8' }), h('path', { key: 'p2', d: 'M12 17v4' }),
        h('path', { key: 'p3', d: 'M7 4h10v5a5 5 0 0 1-10 0V4Z' }),
        h('path', { key: 'p4', d: 'M5 5H3v2a4 4 0 0 0 4 4' }), h('path', { key: 'p5', d: 'M19 5h2v2a4 4 0 0 1-4 4' })
      ], props);
    },
    Heart: function (props) {
      return Icon([h('path', { key: 'p', d: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z' })], props);
    },
    Book: function (props) {
      return Icon([
        h('path', { key: 'p1', d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20' }),
        h('path', { key: 'p2', d: 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z' })
      ], props);
    },
    Settings: function (props) {
      return Icon([
        h('circle', { key: 'c', cx: '12', cy: '12', r: '3' }),
        h('path', { key: 'p', d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z' })
      ], props);
    },
    BarChart: function (props) {
      return Icon([
        h('line', { key: 'l1', x1: '12', y1: '20', x2: '12', y2: '10' }),
        h('line', { key: 'l2', x1: '18', y1: '20', x2: '18', y2: '4' }),
        h('line', { key: 'l3', x1: '6', y1: '20', x2: '6', y2: '16' })
      ], props);
    },
    Shield: function (props) {
      return Icon([h('path', { key: 'p', d: 'M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z' })], props);
    }
  };

  var TRAY_ICONS = {
    junk: 'Anchor', fish: 'Fish', curio: 'Gem', crate: 'Box', bottle: 'Bottle', seaCreature: 'Creature', magicCurio: 'Sparkle', puzzleBox: 'Box', emptyBottle: 'Bottle'
  };
  var RARITY_LABELS = { Common: 'Common', Uncommon: 'Uncommon', Rare: 'Rare', Epic: 'Epic' };

  var BIN_LABELS = { Plastic: 'Plastic', Metal: 'Metal', Glass: 'Glass', Wood: 'Wood', Electronics: 'Electronics', Hazardous: 'Hazardous', Mixed: 'Mixed' };

  // --- The Emporium (10-emporium.md) - mirrors server.js's own constants ---
  var EMPORIUM_REQUIRED_MATERIALS = { 'Stained Glass Panel': 2, 'Old-Growth Timber': 3, 'Brass Fittings': 3, 'Neon Sign': 1 };
  var EMPORIUM_OPEN_COST = 6000;
  var PEDESTAL_EXPANSION_COSTS = [5000, 10000, 20000, 40000, 80000];
  var BACK_ROOM_COST = 250000;
  var RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic'];
  var DRINK_PARTS = {
    base: ['Coffee', 'Tea', 'Hot Cocoa', 'Warm Milk'],
    flavour: ['Vanilla', 'Caramel', 'Mint', 'Salted Kelp'],
    finish: ['Whipped Cream', 'Cinnamon', 'Marshmallows', 'Sea Salt']
  };
  var CUSTOMER_TYPE_LABELS = { local: 'Local', townsfolk: 'Townsfolk', traveller: 'Traveller', tourist: 'Tourist', rare: 'Rare Visitor' };
  var PRIZE_BOXES = [
    { tier: 'common', label: 'Common Prize Box', cost: 20 },
    { tier: 'uncommon', label: 'Uncommon Prize Box', cost: 60 },
    { tier: 'rare', label: 'Rare Prize Box', cost: 150 }
  ];

  // --- fetch helpers (res.ok IS checked - see docs/shoal-tales-spec, a prior
  // bug in this same app's push-notification code came from skipping this) ---
  function apiGet(url) {
    return fetch(url).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.error || ('Server returned ' + res.status));
        return data;
      });
    });
  }
  function apiPost(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.error || ('Server returned ' + res.status));
        return data;
      });
    });
  }

  function formatCoins(n) {
    return Math.round(n).toLocaleString();
  }

  // Party/guild chat: a lightweight, separate WebSocket connection (not
  // routed through index.html's own App-level one - this file stays
  // self-contained, per the header comment) that IDENTIFYs the same way the
  // main app does and listens for just the one chat broadcast type it
  // cares about. Returns null (rather than throwing) outside a browser.
  function shoalOpenChatSocket(handle, messageType, groupId, onMessage) {
    if (typeof root.WebSocket === 'undefined' || !root.location) return null;
    try {
      var protocol = root.location.protocol === 'https:' ? 'wss:' : 'ws:';
      var ws = new root.WebSocket(protocol + '//' + root.location.host + '/');
      ws.onopen = function () { ws.send(JSON.stringify({ type: 'IDENTIFY', handle: handle })); };
      ws.onmessage = function (event) {
        try {
          var data = JSON.parse(event.data);
          if (data.type === messageType && data.id === groupId) onMessage(data.message);
        } catch (e) { /* ignore a malformed frame */ }
      };
      return ws;
    } catch (e) { return null; }
  }

  // Live presence for the point-and-click Harbor: reports this player's
  // current scene to the server (see server.js's SHOAL_SCENE handling) and
  // listens for the personalized SHOAL_PRESENCE_UPDATE roster it broadcasts
  // whenever anyone's scene changes. One connection per mount of
  // ShoalTalesScreen, not per-scene - scene changes are sent over the same
  // socket via sendScene, not by reopening it.
  function shoalOpenPresenceSocket(handle, initialScene, onRoster) {
    if (typeof root.WebSocket === 'undefined' || !root.location) return null;
    try {
      var protocol = root.location.protocol === 'https:' ? 'wss:' : 'ws:';
      var ws = new root.WebSocket(protocol + '//' + root.location.host + '/');
      ws.onopen = function () {
        ws.send(JSON.stringify({ type: 'IDENTIFY', handle: handle }));
        ws.send(JSON.stringify({ type: 'SHOAL_SCENE', scene: initialScene }));
      };
      ws.onmessage = function (event) {
        try {
          var data = JSON.parse(event.data);
          if (data.type === 'SHOAL_PRESENCE_UPDATE') onRoster(data.roster);
        } catch (e) { /* ignore a malformed frame */ }
      };
      return ws;
    } catch (e) { return null; }
  }

  // --- Town/NPC display helpers. These mirror server.js's shoalTownspersonAppears/
  // shoalCurrentRequestFor/shoalAvailableFor purely for rendering ("has this
  // person shown up yet", "what do they want", "do I have enough") - the
  // server is still the sole source of truth and re-checks everything itself
  // when fulfill-request/fulfill-daily is actually called. ---
  function shoalPersonAppears(save, personId) {
    var p = DATA.townsfolk.find(function (t) { return t.id === personId; });
    if (!p) return false;
    if (p.appearsWhen === 'townOpen') return save.townOpen;
    if (p.appearsWhen === 'carpentry-installed') return save.stationsInstalled.indexOf('carpentry') !== -1;
    if (p.appearsWhen === 'crucible-installed') return save.stationsInstalled.indexOf('crucible') !== -1;
    return false;
  }

  function shoalHaveFor(save, requires) {
    if (requires.type === 'rawFish') return save.cooler.filter(function (f) { return f.stage === 'raw'; }).length;
    if (requires.type === 'dressedFish') return save.cooler.filter(function (f) { return f.stage === 'dressed'; }).length;
    if (requires.type === 'sortedBin') return save.sortedGoods[requires.bin] ? save.sortedGoods[requires.bin].units : 0;
    if (requires.type === 'meals') return save.cooler.filter(function (f) { return f.stage === 'meal'; }).length;
    if (requires.type === 'knickKnacks') return save.knickKnacks ? save.knickKnacks.units : 0;
    if (requires.type === 'ingots') return save.ingots ? save.ingots.units : 0;
    if (requires.type === 'materials') return save.materials ? save.materials.units : 0;
    return 0;
  }

  var REQUIRES_LABEL = {
    rawFish: 'raw fish', dressedFish: 'dressed fish', meals: 'meals',
    knickKnacks: 'knick-knacks', ingots: 'ingots', materials: 'materials'
  };
  function describeRequires(requires) {
    if (requires.type === 'sortedBin') return BIN_LABELS[requires.bin] + ' goods';
    return REQUIRES_LABEL[requires.type] || requires.type;
  }

  // The next thing a townsperson wants: their next story request, or (once
  // that chain is exhausted) their repeatable standing order. Returns null
  // if they haven't appeared yet. Matches server.js's shoalCurrentRequestFor.
  function shoalCurrentRequestFor(save, personId) {
    if (!shoalPersonAppears(save, personId)) return null;
    var chain = DATA.storyRequests.filter(function (r) { return r.personId === personId; })
      .sort(function (a, b) { return a.order - b.order; });
    var idx = save.storyRequestIndex[personId] || 0;
    if (idx < chain.length) return { kind: 'story', requires: chain[idx].requires, reward: chain[idx].reward };
    var standing = DATA.standingOrders.find(function (s) { return s.personId === personId; });
    if (!standing) return null;
    var filled = save.standingOrdersFilled[personId] || 0;
    var amount = standing.baseAmount + standing.amountPerFill * filled;
    var requires = standing.wants.type === 'sortedBinCycle'
      ? { type: 'sortedBin', bin: ENGINE.BINS[filled % ENGINE.BINS.length], amount: amount }
      : { type: standing.wants.type, amount: amount };
    return { kind: 'standing', requires: requires, reward: { type: 'coins', amount: Math.round(amount * 3) } };
  }

  // --- The Tray: shows current haul, lets the player select an item then
  // act on it. Junk -> a bin; fish -> the cooler; curios need an extra scrub
  // step before Log/Sell/Store/Sort; crates/bottles/creatures are one tap. ---
  function TrayPanel(props) {
    var save = props.save;
    var selectedId = props.selectedId;
    var onSelect = props.onSelect;
    var onSort = props.onSort;
    var onScrub = props.onScrub;
    var onPry = props.onPry;
    var onUncork = props.onUncork;
    var onRelease = props.onRelease;
    var onCurioAction = props.onCurioAction;
    var curioChoosingBin = props.curioChoosingBin;
    var onStartCurioSort = props.onStartCurioSort;
    var onStartPuzzle = props.onStartPuzzle;
    var onKeepBottle = props.onKeepBottle;
    var busy = props.busy;
    var lastResult = props.lastResult;
    // Soft Brush (08-stations-upgrades.md: "One fewer scrub per curio, 4
    // down to 1") lowers the click count the Scrub button advertises -
    // matches the server's own SCRUBS_NEEDED in the /scrub endpoint.
    var scrubsNeeded = Math.max(1, 4 - (save.brushLevel || 0));

    if (save.tray.length === 0) return null;

    var selectedItem = save.tray.find(function (t) { return t.id === selectedId; });

    return h('div', { className: 'shoal-card' },
      h('div', { className: 'shoal-card-title' }, 'The Tray (', save.tray.length, ' item', save.tray.length === 1 ? '' : 's', ')'),
      h('p', { className: 'shoal-hint' }, 'Tap an item, then tap what to do with it.'),
      h('div', { className: 'shoal-tray-grid' },
        save.tray.map(function (item) {
          var isSelected = item.id === selectedId;
          var iconName = TRAY_ICONS[item.kind] || 'Anchor';
          return h('button', {
            key: item.id,
            type: 'button',
            disabled: busy,
            onClick: function () { onSelect(isSelected ? null : item.id); },
            className: 'shoal-tray-item' + (isSelected ? ' shoal-tray-item-selected' : '') + (' shoal-tray-item-' + item.kind)
          },
            h(Icons[iconName], { className: 'shoal-tray-icon' }),
            h('span', { className: 'shoal-tray-name' }, item.name),
            item.kind === 'curio' && item.identified && h('span', { className: 'shoal-tray-rarity shoal-rarity-' + item.rarity.toLowerCase() }, item.rarity, item.golden ? ' ✨' : ''),
            item.kind === 'puzzleBox' && h('span', { className: 'shoal-tray-rarity shoal-rarity-' + item.rarity.toLowerCase() }, item.rarity, ' ', item.size, 'x', item.size)
          );
        })
      ),
      selectedItem && h('div', { className: 'shoal-bin-row' }, renderActionArea(selectedItem)),
      lastResult && h('div', { className: 'shoal-sort-feedback ' + (lastResult.ok ? 'shoal-sort-correct' : 'shoal-sort-wrong') }, lastResult.message)
    );

    function renderActionArea(item) {
      if (item.kind === 'fish') {
        return h('button', {
          type: 'button', disabled: busy, onClick: function () { onSort(item.id, 'cooler'); },
          className: 'shoal-bin-btn shoal-bin-btn-cooler'
        }, h(Icons.Fish, { className: 'shoal-bin-icon' }), h('span', null, 'Cooler'));
      }
      if (item.kind === 'junk') {
        return ENGINE.BINS.map(function (bin) {
          return h('button', {
            key: bin, type: 'button', disabled: busy, onClick: function () { onSort(item.id, bin); },
            className: 'shoal-bin-btn'
          }, BIN_LABELS[bin]);
        });
      }
      // An empty bottle sorts like any other Glass junk, OR can be kept for
      // a writing kit (13-social.md step 1) - the bottle-letter grind.
      if (item.kind === 'emptyBottle') {
        return [
          h('button', {
            key: 'glass', type: 'button', disabled: busy, onClick: function () { onSort(item.id, item.bin); },
            className: 'shoal-bin-btn'
          }, 'Sort (', BIN_LABELS[item.bin], ')'),
          h('button', {
            key: 'keep', type: 'button', disabled: busy, onClick: function () { onKeepBottle(item.id); },
            className: 'shoal-action-btn'
          }, h(Icons.Bottle, { className: 'shoal-bin-icon' }), h('span', null, 'Keep for a Writing Kit'))
        ];
      }
      if (item.kind === 'crate') {
        return h('button', { type: 'button', disabled: busy, onClick: function () { onPry(item.id); }, className: 'shoal-action-btn' },
          h(Icons.Box, { className: 'shoal-bin-icon' }), h('span', null, 'Pry Open'));
      }
      if (item.kind === 'bottle') {
        return h('button', { type: 'button', disabled: busy, onClick: function () { onUncork(item.id); }, className: 'shoal-action-btn' },
          h(Icons.Bottle, { className: 'shoal-bin-icon' }), h('span', null, 'Uncork'));
      }
      if (item.kind === 'seaCreature') {
        return h('button', { type: 'button', disabled: busy, onClick: function () { onRelease(item.id); }, className: 'shoal-action-btn' },
          h(Icons.Creature, { className: 'shoal-bin-icon' }), h('span', null, 'Set Free'));
      }
      if (item.kind === 'magicCurio') {
        return h('button', { type: 'button', disabled: busy, onClick: function () { onScrub(item.id); }, className: 'shoal-action-btn shoal-action-btn-magic' },
          h(Icons.Sparkle, { className: 'shoal-bin-icon' }), h('span', null, 'Scrub' + (item.scrubProgress ? ' (' + item.scrubProgress + '/' + scrubsNeeded + ')' : '')));
      }
      if (item.kind === 'puzzleBox') {
        return h('button', { type: 'button', disabled: busy, onClick: function () { onStartPuzzle(item.id); }, className: 'shoal-action-btn' },
          h(Icons.Box, { className: 'shoal-bin-icon' }), h('span', null, 'Take to Puzzle Bench'));
      }
      if (item.kind === 'curio') {
        if (!item.identified) {
          return h('button', { type: 'button', disabled: busy, onClick: function () { onScrub(item.id); }, className: 'shoal-action-btn' },
            h(Icons.Gem, { className: 'shoal-bin-icon' }), h('span', null, 'Scrub' + (item.scrubProgress ? ' (' + item.scrubProgress + '/' + scrubsNeeded + ')' : '')));
        }
        if (curioChoosingBin === item.id) {
          return ENGINE.BINS.map(function (bin) {
            return h('button', {
              key: bin, type: 'button', disabled: busy, onClick: function () { onCurioAction(item.id, 'sort', bin); },
              className: 'shoal-bin-btn'
            }, BIN_LABELS[bin]);
          });
        }
        return [
          h('button', { key: 'log', type: 'button', disabled: busy, onClick: function () { onCurioAction(item.id, 'log'); }, className: 'shoal-action-btn' }, 'Log'),
          h('button', { key: 'sell', type: 'button', disabled: busy, onClick: function () { onCurioAction(item.id, 'sell'); }, className: 'shoal-action-btn' }, 'Sell'),
          h('button', { key: 'store', type: 'button', disabled: busy, onClick: function () { onCurioAction(item.id, 'store'); }, className: 'shoal-action-btn' }, 'Store'),
          h('button', { key: 'sort', type: 'button', disabled: busy, onClick: function () { onStartCurioSort(item.id); }, className: 'shoal-action-btn' }, 'Sort')
        ];
      }
      return null;
    }
  }

  function CollectorsLogSummary(props) {
    var save = props.save;
    var totalCurios = DATA.curios.length;
    var totalFish = DATA.fish.length;
    var curiosLogged = Object.keys(save.collectorsLog.curios).length;
    var fishLogged = Object.keys(save.collectorsLog.fish).length;
    var setsComplete = DATA.sets.filter(function (s) {
      var curiosDone = s.curioNames.every(function (n) {
        var c = DATA.curios.find(function (x) { return x.name === n; });
        return c && save.collectorsLog.curios[c.id];
      });
      var fishDone = s.fishNames.every(function (n) {
        var f = DATA.fish.find(function (x) { return x.name === n; });
        return f && save.collectorsLog.fish[f.id];
      });
      return curiosDone && fishDone;
    }).length;

    return h('div', { className: 'shoal-card' },
      h('div', { className: 'shoal-card-title' }, "Collector's Log"),
      h('div', { className: 'shoal-log-grid' },
        h('div', { className: 'shoal-log-stat' }, h('span', { className: 'shoal-log-num' }, curiosLogged, '/', totalCurios), h('span', null, 'Curios')),
        h('div', { className: 'shoal-log-stat' }, h('span', { className: 'shoal-log-num' }, fishLogged, '/', totalFish), h('span', null, 'Fish')),
        h('div', { className: 'shoal-log-stat' }, h('span', { className: 'shoal-log-num' }, setsComplete, '/', DATA.sets.length), h('span', null, 'Sets')),
        h('div', { className: 'shoal-log-stat' }, h('span', { className: 'shoal-log-num' }, save.magicCurios.length, '/6'), h('span', null, 'Magic Curios')),
        h('div', { className: 'shoal-log-stat' }, h('span', { className: 'shoal-log-num' }, save.creaturesSeen.length, '/5'), h('span', null, 'Creatures Seen')),
        h('div', { className: 'shoal-log-stat' }, h('span', { className: 'shoal-log-num' }, save.storedCurios.length), h('span', null, 'Stored Curios'))
      )
    );
  }

  // Stored Curios (06-curios.md: "keep it in Stored Curios ... to log,
  // donate, sell, gift, or process later"). Rare/Epic curios ask for a
  // confirm click before processing, since that permanently breaks them
  // down for station resources.
  function StoredCuriosPanel(props) {
    var save = props.save;
    var busy = props.busy;
    var onAction = props.onStoredCurioAction;
    var onGift = props.onGiftCurio;
    var _confirmId = useState(null); var confirmProcessId = _confirmId[0]; var setConfirmProcessId = _confirmId[1];
    var _giftTo = useState({}); var giftTargets = _giftTo[0]; var setGiftTargets = _giftTo[1];

    if (!save.storedCurios.length) return null;

    return h('div', { className: 'shoal-card' },
      h('div', { className: 'shoal-card-title' }, 'Stored Curios'),
      h('div', { className: 'shoal-stored-curio-list' },
        save.storedCurios.map(function (item) {
          var stationId = PROCESS_STATION_FOR_BIN[item.bin];
          var canProcess = stationId && save.stationsInstalled.indexOf(stationId) !== -1;
          var needsConfirm = item.rarity === 'Rare' || item.rarity === 'Epic';
          var confirming = confirmProcessId === item.id;
          return h('div', { key: item.id, className: 'shoal-stored-curio-row' },
            h('div', { className: 'shoal-cooler-name' }, item.name, ' ',
              h('span', { className: 'shoal-tray-rarity shoal-rarity-' + item.rarity.toLowerCase() }, item.rarity, item.golden ? ' ✨' : '')),
            h('div', { className: 'shoal-bin-row' },
              confirming
                ? [
                    h('button', { key: 'confirm', type: 'button', disabled: busy, className: 'shoal-action-btn shoal-action-btn-danger',
                      onClick: function () { setConfirmProcessId(null); onAction(item.id, 'process'); } }, 'Confirm: Process'),
                    h('button', { key: 'cancel', type: 'button', disabled: busy, className: 'shoal-action-btn',
                      onClick: function () { setConfirmProcessId(null); } }, 'Cancel')
                  ]
                : [
                    h('button', { key: 'log', type: 'button', disabled: busy, className: 'shoal-action-btn', onClick: function () { onAction(item.id, 'log'); } }, 'Log'),
                    h('button', { key: 'sell', type: 'button', disabled: busy, className: 'shoal-action-btn', onClick: function () { onAction(item.id, 'sell'); } }, 'Sell'),
                    save.guildId && h('button', { key: 'donate', type: 'button', disabled: busy, className: 'shoal-action-btn', onClick: function () { onAction(item.id, 'donate'); } }, 'Donate'),
                    canProcess && h('button', {
                      key: 'process', type: 'button', disabled: busy, className: 'shoal-action-btn',
                      onClick: function () { needsConfirm ? setConfirmProcessId(item.id) : onAction(item.id, 'process'); }
                    }, 'Process'),
                    h('input', {
                      key: 'gift-input', type: 'text', placeholder: '@handle to gift', className: 'shoal-gift-input',
                      value: giftTargets[item.id] || '',
                      onChange: function (e) { setGiftTargets(Object.assign({}, giftTargets, { [item.id]: e.target.value })); }
                    }),
                    h('button', {
                      key: 'gift', type: 'button', disabled: busy || !giftTargets[item.id], className: 'shoal-action-btn',
                      onClick: function () { onGift(item.id, giftTargets[item.id]); setGiftTargets(Object.assign({}, giftTargets, { [item.id]: '' })); }
                    }, 'Gift')
                  ]
            )
          );
        })
      )
    );
  }

  var RESOURCE_LABEL = { knickKnacks: 'Knick-knacks', ingots: 'Ingots', materials: 'Materials' };

  function GoodsAndCoolerPanel(props) {
    var save = props.save;
    var onSell = props.onSell;
    var onDress = props.onDress;
    var onMakeMeal = props.onMakeMeal;
    var busy = props.busy;
    var _confirmSell = useState(false); var confirmingSell = _confirmSell[0]; var setConfirmingSell = _confirmSell[1];

    var ovenInstalled = save.stationsInstalled.indexOf('oven') !== -1;
    var goodsValue = ENGINE.BINS.reduce(function (sum, b) { return sum + save.sortedGoods[b].value; }, 0);
    var rawFish = save.cooler.filter(function (f) { return f.stage === 'raw'; });
    var dressedFish = save.cooler.filter(function (f) { return f.stage === 'dressed'; });
    var mealFish = save.cooler.filter(function (f) { return f.stage === 'meal'; });
    var mealValue = mealFish.reduce(function (sum, f) { return sum + f.value; }, 0);
    var resourceValue = ['knickKnacks', 'ingots', 'materials'].reduce(function (sum, k) { return sum + save[k].value; }, 0);
    var totalValue = goodsValue + rawFish.reduce(function (s, f) { return s + f.value; }, 0)
      + dressedFish.reduce(function (s, f) { return s + f.value; }, 0) + mealValue + resourceValue;

    var hasRareMaterials = Object.keys(save.rareMaterials || {}).some(function (m) { return save.rareMaterials[m] > 0; });
    if (totalValue <= 0 && save.cooler.length === 0 && !hasRareMaterials) return null;

    // "It warns when a current request needs some of those goods"
    // (07-story.md) - Sell Everything wipes every sortedGoods bin, the
    // whole cooler, and all 3 resources, so any townsperson whose current
    // request/standing order draws on one of those and who has stock
    // toward it right now gets named before the sell actually happens.
    var sellWarnings = DATA.townsfolk.map(function (p) {
      var current = shoalCurrentRequestFor(save, p.id);
      if (!current) return null;
      var have = shoalHaveFor(save, current.requires);
      if (have <= 0) return null;
      return p.name + ' (' + describeRequires(current.requires) + ')';
    }).filter(Boolean);
    // "Warns when meals are included, since the Counter can use them"
    // (10-emporium.md's Sell Room) - unconditional on meals existing at
    // all, unlike the request warning above.
    if (mealFish.length > 0) {
      sellWarnings.push('the Counter (' + mealFish.length + ' meal' + (mealFish.length === 1 ? '' : 's') + ')');
    }

    return h('div', { className: 'shoal-card' },
      h('div', { className: 'shoal-card-title' }, 'Held Goods'),
      h('div', { className: 'shoal-goods-grid' },
        ENGINE.BINS.filter(function (b) { return save.sortedGoods[b].units > 0; }).map(function (b) {
          return h('div', { key: b, className: 'shoal-goods-row' },
            h('span', null, 'Sorted ', b), h('span', null, save.sortedGoods[b].units, ' units — ', formatCoins(save.sortedGoods[b].value), 'c')
          );
        }),
        ['knickKnacks', 'ingots', 'materials'].filter(function (k) { return save[k].units > 0; }).map(function (k) {
          return h('div', { key: k, className: 'shoal-goods-row' },
            h('span', null, RESOURCE_LABEL[k]), h('span', null, save[k].units, ' — ', formatCoins(save[k].value), 'c')
          );
        }),
        // "The storage chest shows ... rare materials ... only appear once
        // you've had one (no empty placeholder rows)" (08-stations-
        // upgrades.md) - otherwise only ever surfaced buried in the
        // Emporium build checklist, with no general inventory view.
        Object.keys(save.rareMaterials || {}).filter(function (m) { return save.rareMaterials[m] > 0; }).map(function (m) {
          return h('div', { key: m, className: 'shoal-goods-row' },
            h('span', null, m), h('span', null, save.rareMaterials[m])
          );
        }),
        mealFish.length > 0 && h('div', { className: 'shoal-goods-row' },
          h('span', null, 'Meals'), h('span', null, mealFish.length, ' — ', formatCoins(mealValue), 'c')
        )
      ),
      // Dressing (and meal-making) is a deliberate one-click-per-fish step at
      // the Cutting Board/Oven (05-fish.md), not a bulk action - each fish
      // gets its own row and button.
      rawFish.length > 0 && h('div', { className: 'shoal-cooler-list' },
        rawFish.map(function (f) {
          return h('div', { key: f.id, className: 'shoal-cooler-row' },
            h('span', { className: 'shoal-cooler-name' }, f.name, f.golden ? ' ✨' : '', ' (', formatCoins(f.value), 'c)'),
            h('button', { type: 'button', disabled: busy, onClick: function () { onDress(f.id); }, className: 'shoal-dress-btn' }, 'Dress')
          );
        })
      ),
      dressedFish.length > 0 && h('div', { className: 'shoal-cooler-list' },
        dressedFish.map(function (f) {
          return h('div', { key: f.id, className: 'shoal-cooler-row' },
            h('span', { className: 'shoal-cooler-name' }, f.name, ' (dressed, ', formatCoins(f.value), 'c)'),
            ovenInstalled && h('button', { type: 'button', disabled: busy, onClick: function () { onMakeMeal(f.id); }, className: 'shoal-dress-btn' }, 'Make Meal')
          );
        })
      ),
      !save.townOpen && h('p', { className: 'shoal-hint' }, 'Dress a fish to open the Town before you can sell.'),
      sellWarnings.length > 0 && h('p', { className: 'shoal-hint shoal-sell-warning' },
        '⚠ Selling everything will use up stock a current request needs: ', sellWarnings.join(', '), '.'),
      confirmingSell
        ? [
            h('button', {
              key: 'confirm', type: 'button', disabled: busy, className: 'shoal-sell-btn',
              onClick: function () { setConfirmingSell(false); onSell('all'); }
            }, 'Confirm: Sell All for ', formatCoins(totalValue)),
            h('button', {
              key: 'cancel', type: 'button', disabled: busy, className: 'shoal-action-btn',
              onClick: function () { setConfirmingSell(false); }
            }, 'Cancel')
          ]
        : h('button', {
            type: 'button', disabled: busy || totalValue <= 0 || !save.townOpen, onClick: function () { setConfirmingSell(true); },
            className: 'shoal-sell-btn'
          }, 'Sell Everything for ', formatCoins(totalValue), ' coins')
    );
  }

  // --- The Town: Crow's letters received, appeared townsfolk, their current
  // story request/standing order, and their once-a-day request. Hidden
  // entirely until the first fish is dressed (see 07-story.md). ---
  function TownPanel(props) {
    var save = props.save;
    var busy = props.busy;
    var onFulfillRequest = props.onFulfillRequest;
    var onFulfillDaily = props.onFulfillDaily;

    if (!save.townOpen) return null;

    var today = new Date().toISOString().slice(0, 10);
    var appeared = DATA.townsfolk.filter(function (p) { return shoalPersonAppears(save, p.id); });

    return h('div', { className: 'shoal-card' },
      h('div', { className: 'shoal-card-title' }, 'The Town'),
      save.crowLettersReceived.length > 0 && h('div', { className: 'shoal-letters-list' },
        save.crowLettersReceived.map(function (id) {
          var letter = DATA.crowLetters.find(function (l) { return l.id === id; });
          return h('div', { key: id, className: 'shoal-letter-row' },
            h(Icons.Mail, { className: 'shoal-bin-icon' }),
            h('span', null, letter ? letter.title : id)
          );
        })
      ),
      h('div', { className: 'shoal-town-list' },
        appeared.map(function (p) {
          var current = shoalCurrentRequestFor(save, p.id);
          var daily = DATA.dailyRequests.find(function (d) { return d.personId === p.id; });
          var dailyDone = save.dailyRequestsDate === today && save.dailyRequestsDone.indexOf(p.id) !== -1;
          return h('div', { key: p.id, className: 'shoal-town-person' },
            h('div', { className: 'shoal-town-person-header' },
              h('span', { className: 'shoal-town-person-name' }, p.name),
              h('span', { className: 'shoal-town-person-place' }, p.place)
            ),
            current && h('div', { className: 'shoal-town-request' },
              h('span', null, 'Wants ', current.requires.amount, ' ', describeRequires(current.requires),
                ' (have ', shoalHaveFor(save, current.requires), ')'),
              h('button', {
                type: 'button',
                disabled: busy || shoalHaveFor(save, current.requires) < current.requires.amount,
                onClick: function () { onFulfillRequest(p.id); },
                className: 'shoal-action-btn'
              }, current.kind === 'story' ? 'Fulfill' : 'Fulfill (standing order)')
            ),
            daily && h('div', { className: 'shoal-town-daily' },
              h('span', null, daily.description),
              h('button', {
                type: 'button',
                disabled: busy || dailyDone,
                onClick: function () { onFulfillDaily(p.id); },
                className: 'shoal-action-btn'
              }, dailyDone ? 'Done today' : 'Fulfill daily')
            )
          );
        })
      )
    );
  }

  var PROCESS_STATION_FOR_BIN = { Wood: 'carpentry', Metal: 'crucible', Mixed: 'recycling' };
  var RESOURCE_FOR_BIN = { Wood: 'knickKnacks', Metal: 'ingots', Mixed: 'materials' };

  // --- Stations: installed list, the next pending station (a vague hint
  // pre-Emporium, an exact progress bar once it's open, or Install once
  // unlocked - per 08-stations-upgrades.md), and a Process button for each
  // installed station with stock on hand to convert. ---
  function StationsPanel(props) {
    var save = props.save;
    var busy = props.busy;
    var onInstall = props.onInstall;
    var onProcessJunk = props.onProcessJunk;
    var next = save.nextStation;

    return h('div', { className: 'shoal-card' },
      h('div', { className: 'shoal-card-title' }, 'Stations'),
      save.stationsInstalled.length > 0 && h('div', { className: 'shoal-stations-installed' },
        save.stationsInstalled.map(function (id) {
          var st = DATA.stations.find(function (s) { return s.id === id; });
          return h('div', { key: id, className: 'shoal-station-row' },
            h('span', null, st ? st.name : id), h('span', { className: 'shoal-station-tag' }, 'Installed')
          );
        })
      ),
      next ? h('div', { className: 'shoal-station-next' },
        h('div', { className: 'shoal-station-row' },
          h('span', null, next.name),
          next.unlocked
            ? h('button', { type: 'button', disabled: busy, onClick: onInstall, className: 'shoal-action-btn' }, 'Install (', formatCoins(next.cost), 'c)')
            : h('span', { className: 'shoal-station-hint' }, next.hint)
        ),
        // Once the Emporium is open, the vague hint sharpens into an exact
        // progress bar (08-stations-upgrades.md: "the winch and the Desk
        // show a progress bar toward the goal").
        !next.unlocked && next.requiresAmount != null && h('div', { className: 'shoal-progress-bar' },
          h('div', { className: 'shoal-progress-bar-fill', style: { width: Math.min(100, Math.round(100 * next.progress / next.requiresAmount)) + '%' } })
        ),
        !next.unlocked && next.requiresAmount != null && h('p', { className: 'shoal-hint' }, next.progress, ' / ', next.requiresAmount)
      ) : h('p', { className: 'shoal-hint' }, 'All stations installed.'),
      Object.keys(PROCESS_STATION_FOR_BIN).filter(function (bin) {
        return save.stationsInstalled.indexOf(PROCESS_STATION_FOR_BIN[bin]) !== -1 && save.sortedGoods[bin].units > 0;
      }).map(function (bin) {
        return h('button', {
          key: bin, type: 'button', disabled: busy, onClick: function () { onProcessJunk(bin); },
          className: 'shoal-action-btn'
        }, 'Process ', save.sortedGoods[bin].units, ' ', bin, ' into ', RESOURCE_LABEL[RESOURCE_FOR_BIN[bin]]);
      })
    );
  }

  // --- The Emporium (10-emporium.md): shown once the Town is open, first as
  // "The Empty Shop" with a readiness checklist, then as the full shop-sim
  // once opened. Split into one sub-component per room to keep each piece
  // manageable; EmporiumPanel just composes them. ---

  function EmporiumGate(props) {
    var save = props.save;
    var busy = props.busy;
    var onOpen = props.onOpen;
    var stationsReady = save.stationsInstalled.length >= DATA.stations.length;
    var coinsReady = save.coins >= EMPORIUM_OPEN_COST;
    var materialsReady = Object.keys(EMPORIUM_REQUIRED_MATERIALS).every(function (m) { return (save.rareMaterials[m] || 0) >= EMPORIUM_REQUIRED_MATERIALS[m]; });
    var allReady = stationsReady && coinsReady && materialsReady;

    return h('div', { className: 'shoal-card' },
      h('div', { className: 'shoal-card-title' }, 'The Empty Shop'),
      h('p', { className: 'shoal-hint' }, 'A note on the door: "Coming soon - the Emporium."'),
      h('div', { className: 'shoal-emporium-checklist' },
        h('div', { className: 'shoal-checklist-row' }, stationsReady ? '✓' : '○', ' All 4 stations installed'),
        h('div', { className: 'shoal-checklist-row' }, coinsReady ? '✓' : '○', ' ', formatCoins(EMPORIUM_OPEN_COST), ' coins (have ', formatCoins(save.coins), ')'),
        Object.keys(EMPORIUM_REQUIRED_MATERIALS).map(function (m) {
          var have = save.rareMaterials[m] || 0;
          var need = EMPORIUM_REQUIRED_MATERIALS[m];
          return h('div', { key: m, className: 'shoal-checklist-row' }, have >= need ? '✓' : '○', ' ', need, ' ', m, ' (have ', have, ')');
        })
      ),
      h('button', { type: 'button', disabled: busy || !allReady, onClick: onOpen, className: 'shoal-dredge-btn' }, 'Open the Emporium')
    );
  }

  function ShopFloorPanel(props) {
    var save = props.save;
    var busy = props.busy;
    var onPlace = props.onPlace;
    var onTake = props.onTake;
    var onExpand = props.onExpand;
    var onBuildBackRoom = props.onBuildBackRoom;
    var onTradeUp = props.onTradeUp;
    var emp = save.emporium;
    var _picked = useState(null); var pickedId = _picked[0]; var setPickedId = _picked[1];
    // "Each expansion... (two clicks each)" and "Trade Up... (two clicks)"
    // (10-emporium.md) - same confirm pattern as Sell Everything/Retire.
    var _confirmExpand = useState(false); var confirmingExpand = _confirmExpand[0]; var setConfirmingExpand = _confirmExpand[1];
    var _confirmTradeUp = useState(null); var confirmingTradeUpRarity = _confirmTradeUp[0]; var setConfirmingTradeUpRarity = _confirmTradeUp[1];

    function decorationById(id) { return DATA.decorations.find(function (d) { return d.id === id; }); }
    var spareIds = Object.keys(emp.decorationsOwned).filter(function (id) { return emp.decorationsOwned[id] > 0; });
    var tier = (emp.pedestalCount - 6) / 2;
    var expansionCost = PEDESTAL_EXPANSION_COSTS[tier];

    return h('div', { className: 'shoal-card' },
      h('div', { className: 'shoal-card-title' }, 'Shop Floor'),
      h('p', { className: 'shoal-hint' }, pickedId
        ? ('Holding: ' + (decorationById(pickedId) ? decorationById(pickedId).name : pickedId) + ' - tap a pedestal to place it.')
        : 'Tap a spare decoration to pick it up, then tap a pedestal. Tap a filled pedestal with nothing held to take it down.'),
      spareIds.length > 0 && h('div', { className: 'shoal-decoration-grid' },
        spareIds.map(function (id) {
          var d = decorationById(id);
          return h('button', {
            key: id, type: 'button', disabled: busy,
            onClick: function () { setPickedId(pickedId === id ? null : id); },
            className: 'shoal-decoration-chip' + (pickedId === id ? ' shoal-decoration-chip-selected' : '')
          }, d ? d.name : id, ' x', emp.decorationsOwned[id]);
        })
      ),
      h('div', { className: 'shoal-pedestal-grid' },
        emp.pedestals.map(function (decoId, i) {
          var d = decoId ? decorationById(decoId) : null;
          return h('button', {
            key: i, type: 'button', disabled: busy,
            onClick: function () {
              if (pickedId) { onPlace(i, pickedId); setPickedId(null); } else if (decoId) { onTake(i); }
            },
            className: 'shoal-pedestal' + (decoId ? ' shoal-pedestal-filled' : '')
          }, d ? d.name : 'Empty');
        })
      ),
      h('div', { className: 'shoal-controls-row' },
        tier < PEDESTAL_EXPANSION_COSTS.length && (
          confirmingExpand
            ? [
                h('button', {
                  key: 'confirm', type: 'button', disabled: busy || save.coins < expansionCost, className: 'shoal-action-btn',
                  onClick: function () { setConfirmingExpand(false); onExpand(); }
                }, 'Confirm: Add 2 Pedestals (', formatCoins(expansionCost), 'c)'),
                h('button', { key: 'cancel', type: 'button', disabled: busy, className: 'shoal-action-btn', onClick: function () { setConfirmingExpand(false); } }, 'Cancel')
              ]
            : h('button', {
                type: 'button', disabled: busy || save.coins < expansionCost, onClick: function () { setConfirmingExpand(true); }, className: 'shoal-action-btn'
              }, 'Add 2 Pedestals (', formatCoins(expansionCost), 'c)')
        ),
        emp.pedestalCount >= 16 && !emp.backRoomBuilt && h('button', {
          type: 'button', disabled: busy || save.coins < BACK_ROOM_COST, onClick: onBuildBackRoom, className: 'shoal-action-btn'
        }, 'Build the Back Room (', formatCoins(BACK_ROOM_COST), 'c)')
      ),
      h('div', { className: 'shoal-controls-row' },
        RARITY_ORDER.slice(0, 3).map(function (rarity) {
          var count = spareIds.filter(function (id) { var d = decorationById(id); return d && d.rarity === rarity; })
            .reduce(function (s, id) { return s + emp.decorationsOwned[id]; }, 0);
          if (confirmingTradeUpRarity === rarity) {
            return [
              h('button', {
                key: rarity + '-confirm', type: 'button', disabled: busy || count < 3, className: 'shoal-action-btn',
                onClick: function () { setConfirmingTradeUpRarity(null); onTradeUp(rarity); }
              }, 'Confirm: Trade Up 3 ', rarity),
              h('button', { key: rarity + '-cancel', type: 'button', disabled: busy, className: 'shoal-action-btn', onClick: function () { setConfirmingTradeUpRarity(null); } }, 'Cancel')
            ];
          }
          return h('button', {
            key: rarity, type: 'button', disabled: busy || count < 3, onClick: function () { setConfirmingTradeUpRarity(rarity); }, className: 'shoal-action-btn'
          }, 'Trade Up 3 ', rarity, ' (have ', count, ')');
        })
      )
    );
  }

  function CounterPanel(props) {
    var save = props.save;
    var busy = props.busy;
    var onNextCustomer = props.onNextCustomer;
    var onServe = props.onServe;
    var emp = save.emporium;
    var _sel = useState({}); var selections = _sel[0]; var setSelections = _sel[1];
    var mealOptions = save.cooler.filter(function (f) { return f.stage === 'meal'; });

    function selFor(id) {
      return selections[id] || { base: DRINK_PARTS.base[0], flavour: DRINK_PARTS.flavour[0], finish: DRINK_PARTS.finish[0], mealId: '' };
    }
    function setPart(id, part, value) {
      var next = Object.assign({}, selFor(id));
      next[part] = value;
      var copy = Object.assign({}, selections);
      copy[id] = next;
      setSelections(copy);
    }

    return h('div', { className: 'shoal-card' },
      h('div', { className: 'shoal-card-title' }, 'The Counter'),
      h('button', {
        type: 'button', disabled: busy || emp.counterCustomers.length >= 3, onClick: onNextCustomer, className: 'shoal-action-btn'
      }, 'Next Customer (', emp.counterCustomers.length, '/3 waiting)'),
      emp.counterCustomers.map(function (c) {
        var sel = selFor(c.id);
        return h('div', { key: c.id, className: 'shoal-customer-row' },
          h('div', { className: 'shoal-customer-name' },
            c.name, ' (', CUSTOMER_TYPE_LABELS[c.type] || c.type, ', tip x', c.tip, ')', c.wantsMeal ? ' - also wants a meal' : ''),
          h('div', { className: 'shoal-drink-builder' },
            ['base', 'flavour', 'finish'].map(function (part) {
              return h('select', {
                key: part, value: sel[part], disabled: busy,
                onChange: function (e) { setPart(c.id, part, e.target.value); }
              }, DRINK_PARTS[part].map(function (opt) { return h('option', { key: opt, value: opt }, opt); }));
            }),
            c.wantsMeal && mealOptions.length > 0 && h('select', {
              value: sel.mealId, disabled: busy,
              onChange: function (e) { setPart(c.id, 'mealId', e.target.value); }
            }, [h('option', { key: 'none', value: '' }, 'No meal')].concat(mealOptions.map(function (f) {
              return h('option', { key: f.id, value: f.id }, f.name, ' (', formatCoins(f.value), 'c)');
            })))
          ),
          h('button', {
            type: 'button', disabled: busy,
            onClick: function () { onServe(c.id, { base: sel.base, flavour: sel.flavour, finish: sel.finish }, sel.mealId || null); },
            className: 'shoal-action-btn'
          }, 'Serve')
        );
      })
    );
  }

  function PuzzleBenchPanel(props) {
    var save = props.save;
    var busy = props.busy;
    var onPress = props.onPress;
    var onHint = props.onHint;
    var puzzle = save.emporium.activePuzzle;
    if (!puzzle) return null;

    return h('div', { className: 'shoal-card' },
      h('div', { className: 'shoal-card-title' }, 'Puzzle Bench (', puzzle.rarity, ' ', puzzle.size, 'x', puzzle.size, ')'),
      h('p', { className: 'shoal-hint' }, 'Pressing a cell toggles it and its neighbours. Turn every light off.'),
      h('div', { className: 'shoal-puzzle-grid', style: { gridTemplateColumns: 'repeat(' + puzzle.size + ', 1fr)' } },
        puzzle.cells.map(function (lit, i) {
          return h('button', {
            key: i, type: 'button', disabled: busy, onClick: function () { onPress(i); },
            className: 'shoal-puzzle-cell' + (lit ? ' shoal-puzzle-cell-lit' : '')
          });
        })
      ),
      h('button', {
        type: 'button', disabled: busy || save.emporium.tickets < 3, onClick: onHint, className: 'shoal-action-btn'
      }, 'Hint (3 tickets, have ', save.emporium.tickets, ')')
    );
  }

  // The three Arcade games (10-emporium.md) are real timing/memory
  // minigames the client plays out, not one-click gambles - the server
  // still owns the money and the final payout, but Tide Timer and Crab
  // Grab need the client to report what actually happened during the
  // round (see the matching endpoints' comments in server.js).
  function ArcadePanel(props) {
    var save = props.save;
    var busy = props.busy;
    var onTideTimer = props.onTideTimer;
    var onCrabGrab = props.onCrabGrab;
    var onShellGame = props.onShellGame;
    var affordable = save.coins >= 25;

    // --- Tide Timer: a float bounces along 9 cells; Stop locks in the
    // current cell. ---
    var _tidePlaying = useState(false); var tidePlaying = _tidePlaying[0]; var setTidePlaying = _tidePlaying[1];
    var _tideIndex = useState(0); var tideIndex = _tideIndex[0]; var setTideIndex = _tideIndex[1];
    var tideTimerRef = useRef(null);
    var tideDirRef = useRef(1);
    function startTideTimer() {
      setTideIndex(0); tideDirRef.current = 1; setTidePlaying(true);
      tideTimerRef.current = setInterval(function () {
        setTideIndex(function (i) {
          var next = i + tideDirRef.current;
          if (next >= 8) { next = 8; tideDirRef.current = -1; }
          else if (next <= 0) { next = 0; tideDirRef.current = 1; }
          return next;
        });
      }, 140);
    }
    function stopTideTimer() {
      clearInterval(tideTimerRef.current);
      setTidePlaying(false);
      onTideTimer(tideIndex);
    }
    useEffect(function () { return function () { clearInterval(tideTimerRef.current); }; }, []);

    // --- Crab Grab: crabs pop up one at a time in a 3x3 patch for 1.1s
    // each; click before they duck, 20 seconds total. ---
    var _crabPlaying = useState(false); var crabPlaying = _crabPlaying[0]; var setCrabPlaying = _crabPlaying[1];
    var _crabCell = useState(null); var crabCell = _crabCell[0]; var setCrabCell = _crabCell[1];
    var crabHitsRef = useRef(0);
    var crabSpawnRef = useRef(null);
    var crabEndRef = useRef(null);
    function startCrabGrab() {
      crabHitsRef.current = 0;
      setCrabPlaying(true);
      setCrabCell(Math.floor(Math.random() * 9));
      crabSpawnRef.current = setInterval(function () {
        setCrabCell(Math.floor(Math.random() * 9));
      }, 1100);
      crabEndRef.current = setTimeout(function () {
        clearInterval(crabSpawnRef.current);
        setCrabPlaying(false);
        setCrabCell(null);
        onCrabGrab(Math.min(20, crabHitsRef.current));
      }, 20000);
    }
    function clickCrabCell(cellIndex) {
      if (crabPlaying && cellIndex === crabCell) {
        crabHitsRef.current += 1;
        setCrabCell(null);
      }
    }
    useEffect(function () {
      return function () { clearInterval(crabSpawnRef.current); clearTimeout(crabEndRef.current); };
    }, []);

    // --- Shell Game: a cosmetic shuffle before the pick buttons unlock. ---
    var _shellShuffling = useState(false); var shellShuffling = _shellShuffling[0]; var setShellShuffling = _shellShuffling[1];
    var _shellReady = useState(false); var shellReady = _shellReady[0]; var setShellReady = _shellReady[1];
    var shellTimerRef = useRef(null);
    function startShellGame() {
      setShellShuffling(true); setShellReady(false);
      shellTimerRef.current = setTimeout(function () { setShellShuffling(false); setShellReady(true); }, 1200);
    }
    function pickShell(i) {
      setShellReady(false);
      onShellGame(i);
    }
    useEffect(function () { return function () { clearTimeout(shellTimerRef.current); }; }, []);

    return h('div', { className: 'shoal-card' },
      h('div', { className: 'shoal-card-title' }, 'Arcade (25 coins a game)'),

      h('div', { className: 'shoal-arcade-game' },
        h('div', { className: 'shoal-arcade-game-title' }, 'Tide Timer'),
        h('div', { className: 'shoal-tide-track' },
          [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (i) {
            return h('div', { key: i, className: 'shoal-tide-cell' + (tidePlaying && i === tideIndex ? ' shoal-tide-cell-active' : '') + (i === 4 ? ' shoal-tide-cell-center' : '') });
          })
        ),
        tidePlaying
          ? h('button', { type: 'button', disabled: busy, onClick: stopTideTimer, className: 'shoal-action-btn' }, 'Stop!')
          : h('button', { type: 'button', disabled: busy || !affordable, onClick: startTideTimer, className: 'shoal-action-btn' }, 'Play Tide Timer')
      ),

      h('div', { className: 'shoal-arcade-game' },
        h('div', { className: 'shoal-arcade-game-title' }, 'Crab Grab', crabPlaying ? ' (' + crabHitsRef.current + ' hit)' : ''),
        h('div', { className: 'shoal-crab-grid' },
          [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (i) {
            return h('button', {
              key: i, type: 'button', disabled: !crabPlaying, onClick: function () { clickCrabCell(i); },
              className: 'shoal-crab-cell' + (crabPlaying && i === crabCell ? ' shoal-crab-cell-active' : '')
            }, crabPlaying && i === crabCell ? '🦀' : '');
          })
        ),
        !crabPlaying && h('button', { type: 'button', disabled: busy || !affordable, onClick: startCrabGrab, className: 'shoal-action-btn' }, 'Play Crab Grab')
      ),

      h('div', { className: 'shoal-arcade-game' },
        h('div', { className: 'shoal-arcade-game-title' }, 'Shell Game'),
        h('p', { className: 'shoal-hint' }, 'Guess which shell hides the pearl.'),
        shellShuffling
          ? h('p', { className: 'shoal-hint' }, 'Shuffling...')
          : shellReady
          ? h('div', { className: 'shoal-controls-row' },
              [0, 1, 2].map(function (i) {
                return h('button', {
                  key: i, type: 'button', disabled: busy, onClick: function () { pickShell(i); }, className: 'shoal-action-btn'
                }, 'Shell ', i + 1);
              })
            )
          : h('button', { type: 'button', disabled: busy || !affordable, onClick: startShellGame, className: 'shoal-action-btn' }, 'Play Shell Game')
      )
    );
  }

  function PrizeCounterPanel(props) {
    var save = props.save;
    var busy = props.busy;
    var onOpenBox = props.onOpenBox;
    var tickets = save.emporium.tickets;

    return h('div', { className: 'shoal-card' },
      h('div', { className: 'shoal-card-title' }, 'Prize Counter (', tickets, ' tickets)'),
      PRIZE_BOXES.map(function (b) {
        return h('button', {
          key: b.tier, type: 'button', disabled: busy || tickets < b.cost, onClick: function () { onOpenBox(b.tier); }, className: 'shoal-action-btn'
        }, b.label, ' (', b.cost, ')');
      })
    );
  }

  function WorkOrdersPanel(props) {
    var save = props.save;
    var busy = props.busy;
    var onFill = props.onFill;
    var onSwap = props.onSwap;
    var swapCost = Math.round(50 * ((save.retirements || 0) + 1));

    return h('div', { className: 'shoal-card' },
      h('div', { className: 'shoal-card-title' }, 'Work Orders'),
      save.emporium.workOrders.map(function (o) {
        var have = shoalHaveFor(save, o.requires);
        return h('div', { key: o.id, className: 'shoal-town-request' },
          h('span', null, 'Wants ', o.requires.amount, ' ', describeRequires(o.requires), ' (have ', have, ')'),
          h('div', null,
            h('button', { type: 'button', disabled: busy || have < o.requires.amount, onClick: function () { onFill(o.id); }, className: 'shoal-action-btn' }, 'Fill'),
            h('button', { type: 'button', disabled: busy || save.coins < swapCost, onClick: function () { onSwap(o.id); }, className: 'shoal-action-btn' }, 'Swap (', swapCost, 'c)')
          )
        );
      })
    );
  }

  // Composes the rooms above. Takes a single `handlers` bag (rather than
  // ~14 individual on* props) since EmporiumPanel is just a pass-through
  // wrapper - keeps ShoalTalesScreen's own render call readable.
  function EmporiumPanel(props) {
    var save = props.save;
    var busy = props.busy;
    var handlers = props.handlers;
    // "Customers walk in every 25 seconds while the owner is in the game,
    // up to 3 waiting" (10-emporium.md) - arrival is automatic, not
    // something the player has to click for; the manual button stays too,
    // for whenever a player wants one sooner.
    var waitingRef = useRef(0);
    waitingRef.current = save.emporiumOpen ? save.emporium.counterCustomers.length : 3;
    useEffect(function () {
      if (!save.emporiumOpen) return undefined;
      var interval = setInterval(function () {
        if (waitingRef.current < 3) handlers.onNextCustomer();
      }, 25000);
      return function () { clearInterval(interval); };
    }, [save.emporiumOpen]);

    if (!save.emporiumOpen) {
      return h(EmporiumGate, { save: save, busy: busy, onOpen: handlers.onOpenEmporium });
    }

    return h('div', { className: 'shoal-emporium' },
      h('div', { className: 'shoal-card' },
        h('div', { className: 'shoal-card-title' }, 'The Emporium'),
        h('button', { type: 'button', disabled: busy, onClick: handlers.onCollectAwayEarnings, className: 'shoal-action-btn' }, 'Collect Away Earnings'),
        save.emporium.tipJar > 0 && h('button', {
          type: 'button', disabled: busy, onClick: handlers.onCollectTips, className: 'shoal-action-btn'
        }, 'Collect Tip Jar (', formatCoins(save.emporium.tipJar), 'c)')
      ),
      h(ShopFloorPanel, { save: save, busy: busy, onPlace: handlers.onPlaceDecoration, onTake: handlers.onTakeDecoration, onExpand: handlers.onExpandPedestals, onBuildBackRoom: handlers.onBuildBackRoom, onTradeUp: handlers.onTradeUp }),
      h(CounterPanel, { save: save, busy: busy, onNextCustomer: handlers.onNextCustomer, onServe: handlers.onServeCustomer }),
      h(PuzzleBenchPanel, { save: save, busy: busy, onPress: handlers.onPressPuzzle, onHint: handlers.onPuzzleHint }),
      h(ArcadePanel, { save: save, busy: busy, onTideTimer: handlers.onTideTimer, onCrabGrab: handlers.onCrabGrab, onShellGame: handlers.onShellGame }),
      h(PrizeCounterPanel, { save: save, busy: busy, onOpenBox: handlers.onPrizeBox }),
      h(WorkOrdersPanel, { save: save, busy: busy, onFill: handlers.onFillWorkOrder, onSwap: handlers.onSwapWorkOrder })
    );
  }

  // --- Retiring (11-retiring.md): the prestige/NG+ reset. Only shown once
  // the Emporium is open, since that's required anyway. A two-click confirm
  // (matches the app's existing pattern for big/consequential actions, e.g.
  // Sell Everything, station installs) since this resets so much. ---
  function RetirePanel(props) {
    var save = props.save;
    var busy = props.busy;
    var onRetire = props.onRetire;
    var _confirm = useState(false); var confirming = _confirm[0]; var setConfirming = _confirm[1];

    if (!save.emporiumOpen) return null;

    var stationsReady = save.stationsInstalled.length >= DATA.stations.length;
    var basketReady = save.basketLevel >= 29;
    var goal = ENGINE.retireGoalForRun(save.retirements + 1);
    var coinsReady = save.coins >= goal.coinsToRetire;
    var allReady = stationsReady && basketReady && coinsReady;

    return h('div', { className: 'shoal-card' },
      h('div', { className: 'shoal-card-title' }, 'Retire the Boat'),
      h('p', { className: 'shoal-hint' },
        'Current title: ', save.title || 'Deckhand', ' (', save.retirements, ' retirement', save.retirements === 1 ? '' : 's', ')'),
      h('div', { className: 'shoal-emporium-checklist' },
        h('div', { className: 'shoal-checklist-row' }, stationsReady ? '✓' : '○', ' All 4 stations installed'),
        h('div', { className: 'shoal-checklist-row' }, basketReady ? '✓' : '○', ' Basket upgraded to 32 items'),
        h('div', { className: 'shoal-checklist-row' }, coinsReady ? '✓' : '○', ' ', formatCoins(goal.coinsToRetire), ' coins on hand (have ', formatCoins(save.coins), ')')
      ),
      confirming
        ? h('button', {
            type: 'button', disabled: busy,
            onClick: function () { setConfirming(false); onRetire(); },
            className: 'shoal-dredge-btn'
          }, 'Confirm: Retire Now (resets this run)')
        : h('button', {
            type: 'button', disabled: busy || !allReady,
            onClick: function () { setConfirming(true); },
            className: 'shoal-dredge-btn'
          }, 'Retire')
    );
  }

  // --- Cosmetics / the Shipwright (12-cosmetics.md). This build replaces
  // the original's real-money-adjacent Seal Token shop with a coin-priced
  // Premium Looks catalog instead (site owner's call - see server.js's
  // matching comment): any look with a `cost` field is bought with coins,
  // no retirement required, same as the exotic woods above it. The Season
  // Champion flag and other event/season looks still aren't buyable (they
  // need a leaderboard/seasons system, or an event completed). The radio
  // has no real audio yet either - that needs original/licensed tracks, a
  // content decision, not code. ---

  function shoalLookUnlockHint(item) {
    if (item.unlocksAtRetirement > 0) return 'Unlocks at retirement ' + item.unlocksAtRetirement;
    if (item.id === 'season-champion') return "This month's top 3 coin earners";
    if (item.eventReward) return 'Complete the ' + (item.eventRewardName || 'event') + ' at the Shipwright';
    if (item.cost) return 'Buy for ' + formatCoins(item.cost) + ' coins, below';
    return null;
  }

  // Shared grid for sails/flags/pets/badges/tracks - all "pick one from a
  // retirement-gated list" with the same shape, modulo pets/badges/tracks
  // allowing "none" (click the equipped one again to clear it). While
  // tryOnMode is on, EVERY item is clickable (even locked ones) and clicking
  // previews instead of equipping - "Try It On" per 12-cosmetics.md.
  function LookGrid(opts) {
    return h('div', { className: 'shoal-look-grid' },
      opts.items.map(function (item) {
        var unlocked = opts.unlockedIds.indexOf(item.id) !== -1;
        var equipped = opts.equippedId === item.id;
        var clickable = opts.tryOnMode || unlocked;
        return h('button', {
          key: item.id, type: 'button', disabled: opts.busy || !clickable,
          onClick: function () {
            if (opts.tryOnMode) { opts.onTryOn(item, !unlocked); return; }
            opts.onEquip(opts.allowNone && equipped ? null : item.id);
          },
          className: 'shoal-look-chip' + (equipped ? ' shoal-look-chip-equipped' : '') + (!unlocked ? ' shoal-look-chip-locked' : '')
        },
          item.emoji ? (item.emoji + ' ') : '', item.name,
          !unlocked && h('span', { className: 'shoal-look-lock' }, ' (', shoalLookUnlockHint(item), ')')
        );
      })
    );
  }

  function ShipwrightPanel(props) {
    var save = props.save;
    var busy = props.busy;
    var onEquipWood = props.onEquipWood;
    var onBuyWood = props.onBuyWood;
    var onBuyLook = props.onBuyLook;
    var onEquipSail = props.onEquipSail;
    var onEquipFlag = props.onEquipFlag;
    var onEquipPet = props.onEquipPet;
    var onEquipBadge = props.onEquipBadge;
    var onPatPet = props.onPatPet;
    var onSelectTrack = props.onSelectTrack;
    var c = save.cosmetics;

    var _tryOn = useState(false); var tryOnMode = _tryOn[0]; var setTryOnMode = _tryOn[1];
    var _preview = useState(null); var preview = _preview[0]; var setPreview = _preview[1];

    function previewItem(item, locked) {
      setPreview({ name: item.name, locked: locked });
      setTimeout(function () { setPreview(null); }, 30000);
    }

    var buyableWoods = DATA.woods.filter(function (w) { return !w.free && c.unlockedWoods.indexOf(w.id) === -1; });
    // Premium Looks: any sail/flag/pet/badge with a `cost` - coin-priced,
    // no retirement gate, in place of the original's Seal Token shop.
    var buyableLooks = []
      .concat(DATA.sails.filter(function (s) { return s.cost && c.unlockedSails.indexOf(s.id) === -1; }).map(function (item) { return { category: 'sail', item: item }; }))
      .concat(DATA.flags.filter(function (f) { return f.cost && c.unlockedFlags.indexOf(f.id) === -1; }).map(function (item) { return { category: 'flag', item: item }; }))
      .concat(DATA.pets.filter(function (p) { return p.cost && c.unlockedPets.indexOf(p.id) === -1; }).map(function (item) { return { category: 'pet', item: item }; }))
      .concat(DATA.chatBadges.filter(function (b) { return b.cost && c.unlockedBadges.indexOf(b.id) === -1; }).map(function (item) { return { category: 'badge', item: item }; }));
    var todayStr = new Date().toISOString().slice(0, 10);
    var pattedToday = c.petPattedDate === todayStr;
    var treatActive = !!c.petTreatExpiresAt && Date.now() < new Date(c.petTreatExpiresAt).getTime();

    return h('div', { className: 'shoal-card' },
      h('div', { className: 'shoal-card-title' }, 'The Shipwright'),
      h('button', {
        type: 'button', disabled: busy, onClick: function () { setTryOnMode(!tryOnMode); },
        className: 'shoal-action-btn' + (tryOnMode ? ' shoal-action-btn-magic' : '')
      }, tryOnMode ? 'Try It On: ON (clicking previews, even locked looks)' : 'Try It On: OFF'),
      preview && h('div', { className: 'shoal-preview-banner' }, 'Previewing: ', preview.name, preview.locked ? ' (not owned - just a look)' : '', ' - 30s'),

      h('div', { className: 'shoal-shipwright-section' },
        h('div', { className: 'shoal-shipwright-subtitle' }, 'Hull, Deck, Railing, Mast (wood)'),
        DATA.woodParts.map(function (part) {
          var equipped = c.equippedWood[part];
          var options = tryOnMode ? DATA.woods : DATA.woods.filter(function (w) { return c.unlockedWoods.indexOf(w.id) !== -1; });
          return h('div', { key: part, className: 'shoal-wood-part-row' },
            h('span', { className: 'shoal-wood-part-label' }, part.charAt(0).toUpperCase() + part.slice(1)),
            h('select', {
              value: equipped, disabled: busy,
              onChange: function (e) {
                var wood = DATA.woods.find(function (w) { return w.id === e.target.value; });
                if (tryOnMode) { previewItem(wood, c.unlockedWoods.indexOf(wood.id) === -1); return; }
                onEquipWood(part, e.target.value);
              }
            }, options.map(function (w) { return h('option', { key: w.id, value: w.id }, w.name); }))
          );
        }),
        buyableWoods.length > 0 && h('div', { className: 'shoal-buy-wood-list' },
          buyableWoods.map(function (w) {
            var unlocked = save.retirements >= w.unlocksAtRetirement;
            return h('button', {
              key: w.id, type: 'button', disabled: busy || !unlocked || save.coins < w.cost,
              onClick: function () { onBuyWood(w.id); },
              className: 'shoal-action-btn'
            }, unlocked ? ('Buy ' + w.name + ' (' + formatCoins(w.cost) + 'c)') : (w.name + ' - retirement ' + w.unlocksAtRetirement));
          })
        )
      ),

      h('div', { className: 'shoal-shipwright-section' },
        h('div', { className: 'shoal-shipwright-subtitle' }, 'Sails'),
        h(LookGrid, { items: DATA.sails, unlockedIds: c.unlockedSails, equippedId: c.equippedSail, onEquip: onEquipSail, busy: busy, allowNone: false, tryOnMode: tryOnMode, onTryOn: previewItem })
      ),

      h('div', { className: 'shoal-shipwright-section' },
        h('div', { className: 'shoal-shipwright-subtitle' }, 'Flags'),
        h(LookGrid, { items: DATA.flags, unlockedIds: c.unlockedFlags, equippedId: c.equippedFlag, onEquip: onEquipFlag, busy: busy, allowNone: false, tryOnMode: tryOnMode, onTryOn: previewItem })
      ),

      h('div', { className: 'shoal-shipwright-section' },
        h('div', { className: 'shoal-shipwright-subtitle' }, 'Pets'),
        h(LookGrid, { items: DATA.pets, unlockedIds: c.unlockedPets, equippedId: c.equippedPet, onEquip: onEquipPet, busy: busy, allowNone: true, tryOnMode: tryOnMode, onTryOn: previewItem }),
        // "Anyone can pet any boat's pet for hearts and a happy sound"
        // (12-cosmetics.md) - patting stays available after today's treat
        // is used; it just won't grant a second one.
        c.equippedPet && h('button', {
          type: 'button', disabled: busy, onClick: onPatPet, className: 'shoal-action-btn'
        }, 'Pat ', (DATA.pets.find(function (p) { return p.id === c.equippedPet; }) || {}).name || c.equippedPet,
           pattedToday ? '' : ' (+5% value, 10 min)', ' (', c.petHearts || 0, ' ❤️)'),
        treatActive && h('p', { className: 'shoal-hint' }, "Treat active: +5% value until the timer runs out.")
      ),

      h('div', { className: 'shoal-shipwright-section' },
        h('div', { className: 'shoal-shipwright-subtitle' }, 'Chat Badges'),
        h(LookGrid, { items: DATA.chatBadges, unlockedIds: c.unlockedBadges, equippedId: c.equippedBadge, onEquip: onEquipBadge, busy: busy, allowNone: true, tryOnMode: tryOnMode, onTryOn: previewItem })
      ),

      h('div', { className: 'shoal-shipwright-section' },
        h('div', { className: 'shoal-shipwright-subtitle' }, 'Radio'),
        h('p', { className: 'shoal-hint' }, 'The web version needs its own licensed music - selecting a track here doesn’t play audio yet.'),
        h(LookGrid, { items: DATA.radioTracks, unlockedIds: c.unlockedTracks, equippedId: c.equippedTrack, onEquip: onSelectTrack, busy: busy, allowNone: true, tryOnMode: tryOnMode, onTryOn: previewItem })
      ),

      h('div', { className: 'shoal-shipwright-section' },
        h('div', { className: 'shoal-shipwright-subtitle' }, 'Premium Looks'),
        h('p', { className: 'shoal-hint' }, "Steep, coin-priced extras for a boat that stands out - no retirement required, just the coins. Bought looks join their category above."),
        buyableLooks.length === 0
          ? h('p', { className: 'shoal-hint' }, "You've bought every premium look.")
          : h('div', { className: 'shoal-buy-wood-list' },
              buyableLooks.map(function (entry) {
                return h('button', {
                  key: entry.category + '-' + entry.item.id, type: 'button', disabled: busy || save.coins < entry.item.cost,
                  onClick: function () { onBuyLook(entry.category, entry.item.id); },
                  className: 'shoal-action-btn'
                }, 'Buy ' + (entry.item.emoji ? (entry.item.emoji + ' ') : '') + entry.item.name + ' (' + formatCoins(entry.item.cost) + 'c)');
              })
            )
      )
    );
  }

  function DredgeControls(props) {
    var save = props.save;
    var onDredge = props.onDredge;
    var onAreaChange = props.onAreaChange;
    var onDepthChange = props.onDepthChange;
    var busy = props.busy;
    var dredging = props.dredging;
    var dredgeCountdown = props.dredgeCountdown;

    var areas = DATA.mapAreas.filter(function (a) { return save.unlockedAreas.indexOf(a.id) !== -1; });
    var depths = DATA.depths.filter(function (d) { return save.unlockedDepths.indexOf(d.level) !== -1; });

    return h('div', { className: 'shoal-card' },
      h('div', { className: 'shoal-controls-row' },
        h('div', { className: 'shoal-select-wrap' },
          h('label', null, 'Area'),
          h('select', {
            value: save.area, disabled: busy || dredging || save.tray.length > 0,
            onChange: function (e) { onAreaChange(e.target.value); }
          }, areas.map(function (a) { return h('option', { key: a.id, value: a.id }, a.name, ' (x', a.valueMultiplier, ')'); }))
        ),
        h('div', { className: 'shoal-select-wrap' },
          h('label', null, 'Depth'),
          h('select', {
            value: save.depth, disabled: busy || dredging || save.tray.length > 0,
            onChange: function (e) { onDepthChange(Number(e.target.value)); }
          }, depths.map(function (d) { return h('option', { key: d.level, value: d.level }, d.name); }))
        )
      ),
      save.tray.length === 0 && h('button', {
        type: 'button',
        disabled: busy || dredging,
        onClick: onDredge,
        className: 'shoal-dredge-btn'
      }, dredging ? ('Dredging... ' + dredgeCountdown + 's') : 'Drop the Dredge')
    );
  }

  function UpgradesPanel(props) {
    var save = props.save;
    var onBuy = props.onBuy;
    var onBuyMax = props.onBuyMax;
    var busy = props.busy;
    var unlockScale = ENGINE.retireGoalForRun(save.retirements + 1).unlockScale;
    var _confirmMax = useState(null); var confirmMaxId = _confirmMax[0]; var setConfirmMaxId = _confirmMax[1];

    var LEVEL_FIELD = { 'bigger-basket': 'basketLevel', 'faster-winch': 'winchLevel', 'soft-brush': 'brushLevel', 'lucky-charm': 'charmLevel' };
    var MAX_LEVEL = { 'bigger-basket': 29, 'faster-winch': 12, 'soft-brush': 3, 'lucky-charm': 10 };

    // "'Buy What I Can Afford' buys as many levels in a row as coins cover"
    // (08-stations-upgrades.md) - previewed locally with the same formula
    // the server uses, so the first click can show exactly what it would buy.
    function previewBuyMax(u, level) {
      var l = level, spent = 0, bought = 0;
      while (l < MAX_LEVEL[u.id]) {
        var cost = Math.round(ENGINE.upgradeCost(u.id, l, unlockScale));
        if (spent + cost > save.coins) break;
        spent += cost; l += 1; bought += 1;
      }
      return { bought: bought, spent: spent };
    }

    return h('div', { className: 'shoal-card' },
      h('div', { className: 'shoal-card-title' }, 'Work Table'),
      h('div', { className: 'shoal-upgrade-list' },
        // "Each upgrade appears once the basket (bought levels only) reaches
        // the listed size" (08-stations-upgrades.md).
        DATA.upgrades.filter(function (u) { return save.basketLevel >= u.appearsAtBasket; }).map(function (u) {
          var level = save[LEVEL_FIELD[u.id]];
          var maxed = level >= u.levels;
          var cost = maxed ? null : Math.round(ENGINE.upgradeCost(u.id, level, unlockScale));
          var affordable = !maxed && save.coins >= cost;
          var confirmingMax = confirmMaxId === u.id;
          var preview = !maxed && previewBuyMax(u, level);
          return h('div', { key: u.id, className: 'shoal-upgrade-row' },
            h('div', { className: 'shoal-upgrade-info' },
              h('div', { className: 'shoal-upgrade-name' }, u.name, ' ', h('span', { className: 'shoal-upgrade-level' }, 'Lv.', level, '/', u.levels)),
              h('div', { className: 'shoal-upgrade-effect' }, u.effectPerLevel)
            ),
            h('div', { className: 'shoal-upgrade-buttons' },
              h('button', {
                type: 'button',
                disabled: busy || maxed || !affordable,
                onClick: function () { onBuy(u.id); },
                className: 'shoal-upgrade-btn'
              }, maxed ? 'MAX' : (formatCoins(cost) + 'c')),
              !maxed && (confirmingMax
                ? h('button', {
                    type: 'button', disabled: busy || preview.bought === 0,
                    onClick: function () { setConfirmMaxId(null); onBuyMax(u.id); },
                    className: 'shoal-upgrade-btn'
                  }, 'Confirm: +', preview.bought, ' for ', formatCoins(preview.spent), 'c')
                : h('button', {
                    type: 'button', disabled: busy || preview.bought === 0,
                    onClick: function () { setConfirmMaxId(u.id); },
                    className: 'shoal-upgrade-btn'
                  }, 'Buy What I Can Afford'))
            )
          );
        })
      )
    );
  }

  // --- Social (13-social.md): Parties, Guilds, Visits, Leaderboards, Bottle
  // Letters. Self-contained: fetches its own sub-state (party/guild/visit/
  // leaderboard don't live on the main `save` object) rather than routing
  // everything through ShoalTalesScreen's single poll loop. `onRefreshSave`
  // is called after anything that also changes fields on `save` itself
  // (coins, partyId, guildId, writingKits, ...) so the rest of the screen
  // stays in sync. ---

  // Guild management moved out to its own Guild Hall scene (point-and-click
  // rework) - this list (and SocialPanel below) now covers everything else
  // social that doesn't belong to a specific building: forming a party,
  // visiting another player's boat, leaderboards, and bottle letters.
  var SOCIAL_TABS = [
    { id: 'party', label: 'Party', icon: 'Users' },
    { id: 'visit', label: 'Visit', icon: 'Home' },
    { id: 'leaderboard', label: 'Leaderboards', icon: 'Trophy' },
    { id: 'letters', label: 'Letters', icon: 'Mail' }
  ];

  function SocialPanel(props) {
    var save = props.save;
    var handle = props.handle;
    var onRefreshSave = props.onRefreshSave;
    var lastFoundLetter = props.lastFoundLetter;
    var onHeartLetter = props.onHeartLetter;
    var onReportLetter = props.onReportLetter;
    var onReplyLetter = props.onReplyLetter;

    var _tab = useState('party'); var tab = _tab[0]; var setTab = _tab[1];

    return h('div', { className: 'shoal-card shoal-social-card' },
      h('div', { className: 'shoal-card-title' }, 'Social'),
      h('div', { className: 'shoal-social-tabs' },
        SOCIAL_TABS.map(function (t) {
          return h('button', {
            key: t.id, type: 'button',
            className: 'shoal-social-tab' + (tab === t.id ? ' shoal-social-tab-active' : ''),
            onClick: function () { setTab(t.id); }
          }, h(Icons[t.icon], { className: 'shoal-social-tab-icon' }), t.label);
        })
      ),
      tab === 'party' && h(PartyTab, { key: 'party-' + handle, save: save, handle: handle, onRefreshSave: onRefreshSave }),
      tab === 'visit' && h(VisitTab, { key: 'visit-' + handle, save: save, handle: handle }),
      tab === 'leaderboard' && h(LeaderboardTab, { key: 'lb' }),
      tab === 'letters' && h(LettersTab, {
        key: 'letters-' + handle, save: save, handle: handle, onRefreshSave: onRefreshSave,
        lastFoundLetter: lastFoundLetter, onHeartLetter: onHeartLetter, onReportLetter: onReportLetter, onReplyLetter: onReplyLetter
      })
    );
  }

  function PartyTab(props) {
    var save = props.save;
    var handle = props.handle;
    var onRefreshSave = props.onRefreshSave;

    var _party = useState(null); var party = _party[0]; var setParty = _party[1];
    var _dredgeBonus = useState(0); var dredgeBonus = _dredgeBonus[0]; var setDredgeBonus = _dredgeBonus[1];
    var _busy = useState(false); var busy = _busy[0]; var setBusy = _busy[1];
    var _msg = useState(null); var msg = _msg[0]; var setMsg = _msg[1];
    var _inviteHandle = useState(''); var inviteHandle = _inviteHandle[0]; var setInviteHandle = _inviteHandle[1];
    var _chatText = useState(''); var chatText = _chatText[0]; var setChatText = _chatText[1];
    var _helpItem = useState(null); var helpItem = _helpItem[0]; var setHelpItem = _helpItem[1];

    var refresh = useCallback(function () {
      return apiGet('/api/shoal-tales/party/state?handle=' + encodeURIComponent(handle)).then(function (data) {
        setParty(data.party); setDredgeBonus(data.dredgeBonus || 0);
      }).catch(function (e) { setMsg(e.message); });
    }, [handle]);

    useEffect(function () { refresh(); }, [handle, save.partyId]);

    // Live chat: open once a party is loaded, close on unmount/party change.
    useEffect(function () {
      if (!party || !party.id) return undefined;
      var ws = shoalOpenChatSocket(handle, 'SHOAL_PARTY_CHAT', party.id, function (message) {
        setParty(function (prev) { return prev ? Object.assign({}, prev, { chat: prev.chat.concat([message]) }) : prev; });
      });
      return function () { if (ws) ws.close(); };
    }, [handle, party && party.id]);

    function run(promise, afterMsg) {
      setBusy(true); setMsg(null);
      return promise.then(function (data) {
        setMsg(afterMsg || null);
        return Promise.all([refresh(), onRefreshSave()]).then(function () { return data; });
      }).catch(function (e) { setMsg(e.message); return null; }).finally(function () { setBusy(false); });
    }

    if (!party) {
      return h('div', { className: 'shoal-social-tab-body' },
        h('p', { className: 'shoal-hint' }, "You're not in a party. Parties give a dredge-together payout bonus, a shot at Party Favours curios, and let you help each other sort."),
        (save.pendingPartyInvites || []).length > 0 && h('div', { className: 'shoal-invite-list' },
          save.pendingPartyInvites.map(function (pid) {
            return h('div', { key: pid, className: 'shoal-invite-row' },
              h('span', null, 'Party invite'),
              h('button', { type: 'button', disabled: busy, onClick: function () { run(apiPost('/api/shoal-tales/party/accept-invite', { handle: handle, partyId: pid })); } }, 'Accept'),
              h('button', { type: 'button', disabled: busy, onClick: function () { run(apiPost('/api/shoal-tales/party/decline-invite', { handle: handle, partyId: pid })); } }, 'Decline')
            );
          })
        ),
        h('button', { type: 'button', disabled: busy, className: 'shoal-action-btn', onClick: function () { run(apiPost('/api/shoal-tales/party/create', { handle: handle })); } }, 'Create a Party'),
        msg && h('div', { className: 'shoal-sort-feedback' }, msg)
      );
    }

    var others = party.members.filter(function (m) { return m.handle !== handle; });

    return h('div', { className: 'shoal-social-tab-body' },
      h('div', { className: 'shoal-social-stat-row' },
        h('span', null, party.members.length, '/4 members'),
        h('span', null, 'Dredge bonus: +', Math.round(dredgeBonus * 100), '%')
      ),
      h('div', { className: 'shoal-member-list' },
        party.members.map(function (m) {
          return h('div', { key: m.handle, className: 'shoal-member-row' },
            h('span', { className: 'shoal-member-dot' + (m.active ? ' shoal-member-dot-active' : '') }),
            h('span', null, m.handle, m.handle === handle ? ' (you)' : ''),
            h('span', { className: 'shoal-member-title' }, m.title)
          );
        })
      ),
      party.members.length < 4 && h('div', { className: 'shoal-invite-form' },
        h('input', { type: 'text', placeholder: '@handle to invite', value: inviteHandle, onChange: function (e) { setInviteHandle(e.target.value); } }),
        h('button', { type: 'button', disabled: busy || !inviteHandle, onClick: function () { run(apiPost('/api/shoal-tales/party/invite', { handle: handle, toHandle: inviteHandle })); setInviteHandle(''); } }, 'Invite')
      ),
      others.length > 0 && h('div', { className: 'shoal-help-sort-section' },
        h('div', { className: 'shoal-subtitle' }, 'Help Sort'),
        others.map(function (m) {
          if (!m.tray || m.tray.length === 0) return h('div', { key: m.handle, className: 'shoal-hint' }, m.handle, "'s tray is empty.");
          return h('div', { key: m.handle }, h('div', { className: 'shoal-hint' }, m.handle, "'s tray:"),
            h('div', { className: 'shoal-tray-grid' },
              m.tray.map(function (item) {
                var isSel = helpItem && helpItem.hostHandle === m.handle && helpItem.itemId === item.id;
                return h('button', {
                  key: item.id, type: 'button', disabled: busy,
                  onClick: function () { setHelpItem(isSel ? null : { hostHandle: m.handle, itemId: item.id, item: item }); },
                  className: 'shoal-tray-item' + (isSel ? ' shoal-tray-item-selected' : '')
                }, h(Icons[TRAY_ICONS[item.kind] || 'Anchor'], { className: 'shoal-tray-icon' }), h('span', { className: 'shoal-tray-name' }, item.name));
              })
            ),
            helpItem && helpItem.hostHandle === m.handle && h('div', { className: 'shoal-bin-row' },
              helpItem.item.kind === 'fish'
                ? h('button', { type: 'button', disabled: busy, className: 'shoal-bin-btn', onClick: function () { run(apiPost('/api/shoal-tales/party/help-sort', { handle: handle, hostHandle: m.handle, trayItemId: helpItem.itemId, bin: 'cooler' })); setHelpItem(null); } }, 'Cooler')
                : ENGINE.BINS.map(function (bin) {
                  return h('button', { key: bin, type: 'button', disabled: busy, className: 'shoal-bin-btn', onClick: function () { run(apiPost('/api/shoal-tales/party/help-sort', { handle: handle, hostHandle: m.handle, trayItemId: helpItem.itemId, bin: bin })); setHelpItem(null); } }, BIN_LABELS[bin]);
                })
            )
          );
        })
      ),
      h('div', { className: 'shoal-chat-box' },
        h('div', { className: 'shoal-chat-log' },
          party.chat.map(function (m, i) { return h('div', { key: i, className: 'shoal-chat-line' }, h('b', null, m.handle, ': '), m.text); })
        ),
        h('div', { className: 'shoal-chat-input-row' },
          h('input', { type: 'text', placeholder: 'Say something...', value: chatText, maxLength: 500, onChange: function (e) { setChatText(e.target.value); } }),
          h('button', { type: 'button', disabled: busy || !chatText, onClick: function () { run(apiPost('/api/shoal-tales/party/chat', { handle: handle, text: chatText })); setChatText(''); } }, 'Send')
        )
      ),
      h('button', { type: 'button', disabled: busy, className: 'shoal-action-btn shoal-action-btn-danger', onClick: function () { run(apiPost('/api/shoal-tales/party/leave', { handle: handle })); } }, 'Leave Party'),
      msg && h('div', { className: 'shoal-sort-feedback' }, msg)
    );
  }

  var GUILD_UPGRADE_INFO = {
    guildFund: { name: 'Guild Fund', effect: '+1% value for every member' },
    busyNoticeboard: { name: 'Busy Noticeboard', effect: '+1 daily quest' },
    betterRewards: { name: 'Better Rewards', effect: '+25% daily quest coins' }
  };

  function GuildTab(props) {
    var save = props.save;
    var handle = props.handle;
    var onRefreshSave = props.onRefreshSave;
    // Optional room filter for the Guild Hall's multi-room scene
    // ('common'/'quests'/'bank'). Omitted (as every existing caller/test
    // does) shows everything in one scroll, same as before the point-and-
    // click rework.
    var room = props.room;
    function showIn(r) { return !room || room === r; }

    var _guild = useState(null); var guildInfo = _guild[0]; var setGuildInfo = _guild[1];
    var _busy = useState(false); var busy = _busy[0]; var setBusy = _busy[1];
    var _msg = useState(null); var msg = _msg[0]; var setMsg = _msg[1];
    var _form = useState({ name: '', tag: '', tagColor: '#4a90d9' }); var form = _form[0]; var setForm = _form[1];
    var _inviteHandle = useState(''); var inviteHandle = _inviteHandle[0]; var setInviteHandle = _inviteHandle[1];
    var _chatText = useState(''); var chatText = _chatText[0]; var setChatText = _chatText[1];
    var _depositAmt = useState(100); var depositAmt = _depositAmt[0]; var setDepositAmt = _depositAmt[1];

    var refresh = useCallback(function () {
      return apiGet('/api/shoal-tales/guild/state?handle=' + encodeURIComponent(handle)).then(function (data) {
        setGuildInfo(data.guild ? { guild: data.guild, myRole: data.myRole, payoutBonus: data.payoutBonus } : null);
      }).catch(function (e) { setMsg(e.message); });
    }, [handle]);

    useEffect(function () { refresh(); }, [handle, save.guildId]);

    // Live chat: open once a guild is loaded, close on unmount/guild change.
    useEffect(function () {
      if (!guildInfo || !guildInfo.guild) return undefined;
      var guildId = guildInfo.guild.id;
      var ws = shoalOpenChatSocket(handle, 'SHOAL_GUILD_CHAT', guildId, function (message) {
        setGuildInfo(function (prev) {
          if (!prev || !prev.guild) return prev;
          return Object.assign({}, prev, { guild: Object.assign({}, prev.guild, { chat: prev.guild.chat.concat([message]) }) });
        });
      });
      return function () { if (ws) ws.close(); };
    }, [handle, guildInfo && guildInfo.guild && guildInfo.guild.id]);

    function run(promise, afterMsg) {
      setBusy(true); setMsg(null);
      return promise.then(function (data) {
        setMsg(afterMsg || null);
        return Promise.all([refresh(), onRefreshSave()]).then(function () { return data; });
      }).catch(function (e) { setMsg(e.message); return null; }).finally(function () { setBusy(false); });
    }

    if (!guildInfo) {
      return h('div', { className: 'shoal-social-tab-body' },
        h('p', { className: 'shoal-hint' }, 'Guilds costs 1,500 coins to found. Members share a Guild Log, daily quests, and a Guild Bank that buys shared upgrades.'),
        (save.pendingGuildInvites || []).length > 0 && h('div', { className: 'shoal-invite-list' },
          save.pendingGuildInvites.map(function (gid) {
            return h('div', { key: gid, className: 'shoal-invite-row' },
              h('span', null, 'Guild invite'),
              h('button', { type: 'button', disabled: busy, onClick: function () { run(apiPost('/api/shoal-tales/guild/accept-invite', { handle: handle, guildId: gid })); } }, 'Accept'),
              h('button', { type: 'button', disabled: busy, onClick: function () { run(apiPost('/api/shoal-tales/guild/decline-invite', { handle: handle, guildId: gid })); } }, 'Decline')
            );
          })
        ),
        h('div', { className: 'shoal-guild-found-form' },
          h('input', { type: 'text', placeholder: 'Guild name', value: form.name, onChange: function (e) { setForm(Object.assign({}, form, { name: e.target.value })); } }),
          h('input', { type: 'text', placeholder: 'Tag (2-4 letters)', value: form.tag, maxLength: 4, onChange: function (e) { setForm(Object.assign({}, form, { tag: e.target.value })); } }),
          h('input', { type: 'color', value: form.tagColor, onChange: function (e) { setForm(Object.assign({}, form, { tagColor: e.target.value })); } }),
          h('button', {
            type: 'button', disabled: busy || !form.name || form.tag.length < 2 || save.coins < 1500,
            onClick: function () { run(apiPost('/api/shoal-tales/guild/found', { handle: handle, name: form.name, tag: form.tag, tagColor: form.tagColor })); }
          }, 'Found Guild (1,500c)')
        ),
        msg && h('div', { className: 'shoal-sort-feedback' }, msg)
      );
    }

    var guild = guildInfo.guild, myRole = guildInfo.myRole;
    var isOwner = myRole === 'owner', canManageBank = myRole === 'owner' || myRole === 'officer';

    return h('div', { className: 'shoal-social-tab-body' },
      h('div', { className: 'shoal-social-stat-row' },
        h('span', { className: 'shoal-guild-tag', style: { background: guild.tagColor } }, '[', guild.tag, ']'),
        h('span', null, guild.name),
        h('span', null, 'Payout bonus: +', Math.round(guildInfo.payoutBonus * 100), '%')
      ),
      showIn('common') && h('div', { className: 'shoal-member-list' },
        guild.members.map(function (m) {
          return h('div', { key: m.handle, className: 'shoal-member-row' },
            h('span', { className: 'shoal-member-dot' + (m.active ? ' shoal-member-dot-active' : '') }),
            h('span', null, m.handle, m.handle === handle ? ' (you)' : ''),
            h('span', { className: 'shoal-member-role' }, m.role),
            isOwner && m.handle !== handle && m.role === 'member' && h('button', { type: 'button', disabled: busy, onClick: function () { run(apiPost('/api/shoal-tales/guild/promote', { handle: handle, targetHandle: m.handle })); } }, 'Promote'),
            isOwner && m.handle !== handle && m.role === 'officer' && h('button', { type: 'button', disabled: busy, onClick: function () { run(apiPost('/api/shoal-tales/guild/demote', { handle: handle, targetHandle: m.handle })); } }, 'Demote')
          );
        })
      ),
      showIn('common') && h('div', { className: 'shoal-invite-form' },
        h('input', { type: 'text', placeholder: '@handle to invite', value: inviteHandle, onChange: function (e) { setInviteHandle(e.target.value); } }),
        h('button', { type: 'button', disabled: busy || !inviteHandle, onClick: function () { run(apiPost('/api/shoal-tales/guild/invite', { handle: handle, toHandle: inviteHandle })); setInviteHandle(''); } }, 'Invite')
      ),
      showIn('quests') && h('div', { className: 'shoal-subtitle' }, "Today's Quests"),
      showIn('quests') && h('div', { className: 'shoal-quest-list' },
        guild.dailyQuests.map(function (q) {
          var done = q.progress >= q.goal;
          var claimed = q.claimedBy.indexOf(handle) !== -1;
          return h('div', { key: q.type, className: 'shoal-quest-row' },
            h('div', { className: 'shoal-quest-label' }, q.label),
            h('div', { className: 'shoal-quest-bar' }, h('div', { className: 'shoal-quest-bar-fill', style: { width: Math.min(100, Math.round(q.progress / q.goal * 100)) + '%' } })),
            h('div', { className: 'shoal-quest-progress' }, q.progress, '/', q.goal),
            h('button', { type: 'button', disabled: busy || !done || claimed, onClick: function () { run(apiPost('/api/shoal-tales/guild/quest-claim', { handle: handle, questType: q.type })); } }, claimed ? 'Claimed' : 'Claim')
          );
        })
      ),
      showIn('bank') && h('div', { className: 'shoal-subtitle' }, 'Guild Bank: ', formatCoins(guild.bank.coins), ' coins'),
      showIn('bank') && h('div', { className: 'shoal-bank-row' },
        [100, 1000, 5000].map(function (amt) {
          return h('button', { key: amt, type: 'button', disabled: busy || save.coins < amt, onClick: function () { run(apiPost('/api/shoal-tales/guild/bank/deposit', { handle: handle, amount: amt })); } }, 'Deposit ', formatCoins(amt));
        })
      ),
      showIn('bank') && canManageBank && h('div', { className: 'shoal-upgrade-list' },
        Object.keys(GUILD_UPGRADE_INFO).map(function (uid) {
          var level = guild.upgrades[uid] || 0;
          var info = GUILD_UPGRADE_INFO[uid];
          return h('div', { key: uid, className: 'shoal-upgrade-row' },
            h('div', { className: 'shoal-upgrade-info' },
              h('div', { className: 'shoal-upgrade-name' }, info.name, ' ', h('span', { className: 'shoal-upgrade-level' }, 'Lv.', level)),
              h('div', { className: 'shoal-upgrade-effect' }, info.effect)
            ),
            h('button', { type: 'button', disabled: busy, onClick: function () { run(apiPost('/api/shoal-tales/guild/bank/purchase-upgrade', { handle: handle, upgradeId: uid })); } }, 'Buy Next Level')
          );
        })
      ),
      showIn('common') && h('div', { className: 'shoal-chat-box' },
        h('div', { className: 'shoal-chat-log' },
          guild.chat.map(function (m, i) { return h('div', { key: i, className: 'shoal-chat-line' }, h('b', null, m.handle, ': '), m.text); })
        ),
        h('div', { className: 'shoal-chat-input-row' },
          h('input', { type: 'text', placeholder: 'Say something...', value: chatText, maxLength: 500, onChange: function (e) { setChatText(e.target.value); } }),
          h('button', { type: 'button', disabled: busy || !chatText, onClick: function () { run(apiPost('/api/shoal-tales/guild/chat', { handle: handle, text: chatText })); setChatText(''); } }, 'Send')
        )
      ),
      showIn('common') && h('div', { className: 'shoal-action-row' },
        h('button', { type: 'button', disabled: busy, className: 'shoal-action-btn shoal-action-btn-danger', onClick: function () { run(apiPost('/api/shoal-tales/guild/leave', { handle: handle })); } }, 'Leave Guild'),
        isOwner && h('button', { type: 'button', disabled: busy, className: 'shoal-action-btn shoal-action-btn-danger', onClick: function () { run(apiPost('/api/shoal-tales/guild/disband', { handle: handle })); } }, 'Disband Guild')
      ),
      msg && h('div', { className: 'shoal-sort-feedback' }, msg)
    );
  }

  function VisitTab(props) {
    var save = props.save;
    var handle = props.handle;
    // Arriving by clicking a specific ship in the Harbor (point-and-click
    // rework) skips typing a handle - the manual form below still works
    // too, e.g. to visit someone not currently shown there.
    var initialTarget = props.initialTarget;

    var _target = useState(initialTarget || ''); var target = _target[0]; var setTarget = _target[1];
    var _boat = useState(null); var boat = _boat[0]; var setBoat = _boat[1];
    var _busy = useState(false); var busy = _busy[0]; var setBusy = _busy[1];
    var _msg = useState(null); var msg = _msg[0]; var setMsg = _msg[1];
    // "500 needs a confirm click" (10-emporium.md) - the other 3 amounts don't.
    var _confirmTip = useState(false); var confirmingBigTip = _confirmTip[0]; var setConfirmingBigTip = _confirmTip[1];
    var _drink = useState({ base: DRINK_PARTS.base[0], flavour: DRINK_PARTS.flavour[0], finish: DRINK_PARTS.finish[0] });
    var drink = _drink[0]; var setDrink = _drink[1];

    function doVisit(targetOverride) {
      var t = targetOverride || target;
      if (!t) return;
      setBusy(true); setMsg(null);
      apiGet('/api/shoal-tales/visit?handle=' + encodeURIComponent(handle) + '&ownerHandle=' + encodeURIComponent(t))
        .then(function (data) { setBoat(data.boat); }).catch(function (e) { setMsg(e.message); setBoat(null); }).finally(function () { setBusy(false); });
    }

    useEffect(function () {
      if (initialTarget) doVisit(initialTarget);
    }, [initialTarget]);

    function doTip(amount) {
      setConfirmingBigTip(false);
      setBusy(true); setMsg(null);
      apiPost('/api/shoal-tales/visit/tip', { handle: handle, ownerHandle: target, amount: amount })
        .then(function () { setMsg('Tipped ' + formatCoins(amount) + ' coins!'); return doVisit(); })
        .catch(function (e) { setMsg(e.message); }).finally(function () { setBusy(false); });
    }

    function doPatPet() {
      setBusy(true); setMsg(null);
      apiPost('/api/shoal-tales/visit/pat-pet', { handle: handle, ownerHandle: target })
        .then(function () { setMsg('❤️'); return doVisit(); })
        .catch(function (e) { setMsg(e.message); }).finally(function () { setBusy(false); });
    }

    function doServe(customerId) {
      setBusy(true); setMsg(null);
      apiPost('/api/shoal-tales/visit/serve-counter', { handle: handle, ownerHandle: target, customerId: customerId, drink: drink })
        .then(function (data) { setMsg((data.correctDrink ? 'Correct drink! ' : 'Wrong drink. ') + '+' + formatCoins(data.coinsEarned) + ' coins for the host.'); return doVisit(); })
        .catch(function (e) { setMsg(e.message); }).finally(function () { setBusy(false); });
    }

    return h('div', { className: 'shoal-social-tab-body' },
      h('div', { className: 'shoal-invite-form' },
        h('input', { type: 'text', placeholder: '@handle to visit', value: target, onChange: function (e) { setTarget(e.target.value); } }),
        h('button', { type: 'button', disabled: busy || !target, onClick: doVisit }, "Visit Boat")
      ),
      boat && h('div', { className: 'shoal-visit-boat' },
        h('div', { className: 'shoal-subtitle' }, boat.handle, ' - ', boat.title, boat.guild ? (' [' + boat.guild.tag + ']') : ''),
        h('div', { className: 'shoal-social-stat-row' },
          h('span', null, boat.retirements, ' retirements'),
          h('span', null, boat.setsCompleted, ' sets logged'),
          h('span', null, 'Best streak x', boat.bestStreakEver)
        ),
        boat.emporiumOpen && h('div', { className: 'shoal-hint' }, 'Tip jar: ', formatCoins(boat.tipJar), ' coins'),
        // "Anyone can pet any boat's pet for hearts and a happy sound"
        // (12-cosmetics.md) - lives on deck regardless of emporiumOpen.
        boat.cosmetics && boat.cosmetics.equippedPet && h('div', { className: 'shoal-bank-row' },
          h('button', {
            type: 'button', disabled: busy, onClick: doPatPet, className: 'shoal-action-btn'
          }, 'Pat ', (DATA.pets.find(function (p) { return p.id === boat.cosmetics.equippedPet; }) || {}).name || boat.cosmetics.equippedPet,
             ' (', boat.cosmetics.petHearts || 0, ' ❤️)')
        ),
        boat.canTip && h('div', { className: 'shoal-bank-row' },
          [10, 50, 100].map(function (amt) {
            return h('button', { key: amt, type: 'button', disabled: busy || save.coins < amt, onClick: function () { doTip(amt); } }, 'Tip ', amt);
          }),
          confirmingBigTip
            ? [
                h('button', { key: 'confirm500', type: 'button', disabled: busy || save.coins < 500, onClick: function () { doTip(500); } }, 'Confirm: Tip 500'),
                h('button', { key: 'cancel500', type: 'button', disabled: busy, onClick: function () { setConfirmingBigTip(false); } }, 'Cancel')
              ]
            : h('button', { key: 500, type: 'button', disabled: busy || save.coins < 500, onClick: function () { setConfirmingBigTip(true); } }, 'Tip 500')
        ),
        boat.canServeCounter && boat.counterCustomers && boat.counterCustomers.length > 0 && h('div', null,
          h('div', { className: 'shoal-subtitle' }, 'Serve at the Counter'),
          h('div', { className: 'shoal-drink-picker' },
            ['base', 'flavour', 'finish'].map(function (part) {
              return h('select', {
                key: part, value: drink[part],
                onChange: function (e) { var d = {}; d[part] = e.target.value; setDrink(Object.assign({}, drink, d)); }
              }, DRINK_PARTS[part].map(function (opt) { return h('option', { key: opt, value: opt }, opt); }));
            })
          ),
          boat.counterCustomers.map(function (c) {
            return h('div', { key: c.id, className: 'shoal-member-row' },
              h('span', null, c.name, ' wants ', c.drink.base, ', ', c.drink.flavour, ', ', c.drink.finish),
              h('button', { type: 'button', disabled: busy, onClick: function () { doServe(c.id); } }, 'Serve')
            );
          })
        )
      ),
      msg && h('div', { className: 'shoal-sort-feedback' }, msg)
    );
  }

  var LEADERBOARD_TYPES = [
    { id: 'retirements', label: 'Times Retired' },
    { id: 'setsCompleted', label: 'Sets Completed' },
    { id: 'bestStreak', label: 'Best Streak' },
    { id: 'lifetimeCoins', label: 'Lifetime Coins' },
    { id: 'monthlyCoins', label: "This Month's Coins" },
    { id: 'monthlySets', label: "This Month's Sets" }
  ];

  function LeaderboardTab() {
    var _type = useState('retirements'); var type = _type[0]; var setType = _type[1];
    var _rows = useState([]); var rows = _rows[0]; var setRows = _rows[1];

    useEffect(function () {
      apiGet('/api/shoal-tales/leaderboard?type=' + type).then(function (data) { setRows(data.rows); }).catch(function () { setRows([]); });
    }, [type]);

    return h('div', { className: 'shoal-social-tab-body' },
      h('div', { className: 'shoal-social-tabs' },
        LEADERBOARD_TYPES.map(function (t) {
          return h('button', {
            key: t.id, type: 'button', className: 'shoal-social-tab' + (type === t.id ? ' shoal-social-tab-active' : ''),
            onClick: function () { setType(t.id); }
          }, t.label);
        })
      ),
      h('div', { className: 'shoal-leaderboard-list' },
        rows.length === 0 && h('p', { className: 'shoal-hint' }, 'Nobody on this board yet.'),
        rows.map(function (r, i) {
          return h('div', { key: r.handle, className: 'shoal-leaderboard-row' },
            h('span', { className: 'shoal-leaderboard-rank' }, i + 1),
            h('span', null, r.handle, ' (', r.title, ')'),
            h('span', { className: 'shoal-leaderboard-value' }, formatCoins(r.value))
          );
        })
      )
    );
  }

  function LettersTab(props) {
    var save = props.save;
    var handle = props.handle;
    var onRefreshSave = props.onRefreshSave;
    var lastFoundLetter = props.lastFoundLetter;
    var onHeartLetter = props.onHeartLetter;
    var onReportLetter = props.onReportLetter;
    var onReplyLetter = props.onReplyLetter;

    var _busy = useState(false); var busy = _busy[0]; var setBusy = _busy[1];
    var _msg = useState(null); var msg = _msg[0]; var setMsg = _msg[1];
    var _text = useState(''); var text = _text[0]; var setText = _text[1];
    var _anon = useState(false); var anon = _anon[0]; var setAnon = _anon[1];
    var _replyText = useState(''); var replyText = _replyText[0]; var setReplyText = _replyText[1];

    function run(promise, afterMsg) {
      setBusy(true); setMsg(null);
      return promise.then(function (data) {
        setMsg(afterMsg || null);
        return onRefreshSave().then(function () { return data; });
      }).catch(function (e) { setMsg(e.message); return null; }).finally(function () { setBusy(false); });
    }

    return h('div', { className: 'shoal-social-tab-body' },
      h('div', { className: 'shoal-social-stat-row' },
        h('span', null, save.writingKits || 0, ' writing kit(s)'),
        h('span', null, save.emptyBottlesKept || 0, ' empty bottle(s) kept')
      ),
      (save.emptyBottlesKept || 0) > 0 && h('button', {
        type: 'button', disabled: busy, className: 'shoal-action-btn',
        onClick: function () { run(apiPost('/api/shoal-tales/bottle/trade-for-kit', { handle: handle }), 'Traded a bottle for a writing kit.'); }
      }, 'Trade a Bottle for a Writing Kit'),
      h('div', { className: 'shoal-subtitle' }, 'Write a Letter'),
      h('textarea', {
        maxLength: 900, rows: 4, placeholder: 'Write something to toss out to sea...', value: text,
        onChange: function (e) { setText(e.target.value); }
      }),
      h('div', { className: 'shoal-social-stat-row' },
        h('span', null, text.length, '/900'),
        h('label', null, h('input', { type: 'checkbox', checked: anon, onChange: function (e) { setAnon(e.target.checked); } }), ' Send anonymously')
      ),
      h('button', {
        type: 'button', disabled: busy || !text.trim() || (save.writingKits || 0) < 1,
        onClick: function () { run(apiPost('/api/shoal-tales/letters/write', { handle: handle, text: text, anonymous: anon }), 'Letter sent off for review.'); setText(''); }
      }, 'Cork and Throw'),
      lastFoundLetter && h('div', { className: 'shoal-found-letter' },
        h('div', { className: 'shoal-subtitle' }, 'Last Letter Found'),
        h('p', null, '"', lastFoundLetter.text, '"', lastFoundLetter.authorHandle ? (' - ' + lastFoundLetter.authorHandle) : ' - anonymous'),
        h('div', { className: 'shoal-action-row' },
          h('button', { type: 'button', disabled: busy, onClick: function () { onHeartLetter(lastFoundLetter.id); } }, h(Icons.Heart, { className: 'shoal-bin-icon' }), ' Heart'),
          h('button', { type: 'button', disabled: busy, onClick: function () { onReportLetter(lastFoundLetter.id); } }, 'Report')
        ),
        h('div', { className: 'shoal-invite-form' },
          h('input', { type: 'text', placeholder: 'Write a reply...', value: replyText, maxLength: 900, onChange: function (e) { setReplyText(e.target.value); } }),
          h('button', { type: 'button', disabled: busy || !replyText.trim(), onClick: function () { onReplyLetter(lastFoundLetter.id, replyText); setReplyText(''); } }, 'Send Reply')
        )
      ),
      msg && h('div', { className: 'shoal-sort-feedback' }, msg)
    );
  }

  // --- Extras (14-extras.md): Tides/Events banner, Stats (The Desk's
  // Profile), Feat Titles, the Quest Book, and Settings. Same
  // self-contained-tab approach as SocialPanel. ---

  function TideEventBanner() {
    var _tide = useState(null); var tide = _tide[0]; var setTide = _tide[1];
    var _event = useState(null); var event = _event[0]; var setEvent = _event[1];

    useEffect(function () {
      apiGet('/api/shoal-tales/tide/status').then(function (d) { setTide(d.tide); }).catch(function () {});
      apiGet('/api/shoal-tales/event/status').then(function (d) { setEvent(d.event); }).catch(function () {});
    }, []);

    if (!tide && !event) return null;
    return h('div', { className: 'shoal-tide-event-banner' },
      tide && h('span', { className: 'shoal-tide-chip' }, h(Icons.Zap, { className: 'shoal-social-tab-icon' }), tide.name, ': ', tide.effect),
      event && h('span', { className: 'shoal-event-chip' }, h(Icons.Sparkle, { className: 'shoal-social-tab-icon' }), event.name, ' is running!')
    );
  }

  // New-player guide (14-extras.md): "sparkles hover over the next thing to
  // use on deck: the winch, then the Cutting Board, the Desk, the bell, and
  // the Work Table - each until used once... Retired players never see the
  // sparkles." A single running text hint (rather than a positioned overlay
  // pinned to each distant component) - same information, simpler to keep
  // correct across a page with no separate screens to walk between.
  var NEW_PLAYER_HINTS = [
    { id: 'winch', text: 'Try the winch - drop the dredge to haul up your first catch.' },
    { id: 'cutting-board', text: 'Dress a raw fish at the Cutting Board to open the Town.' },
    { id: 'desk', text: 'Check the Quest Book down at the Desk for what to do next.' },
    { id: 'bell', text: 'Ring the bell - sell your sorted goods in Town.' },
    { id: 'work-table', text: 'Visit the Work Table and buy your first upgrade.' }
  ];

  function NewPlayerHintBanner(props) {
    var save = props.save;
    if ((save.retirements || 0) > 0) return null;
    if (save.settings && save.settings.sparkles === false) return null;
    var seen = save.newPlayerHintsSeen || [];
    var next = NEW_PLAYER_HINTS.filter(function (hnt) { return seen.indexOf(hnt.id) === -1; })[0];
    if (!next) return null;
    var isVeryFirstHaul = (save.allTimeStats.hauls || 0) === 0;
    return h('div', { className: 'shoal-hint-banner' },
      h(Icons.Sparkle, { className: 'shoal-social-tab-icon' }),
      isVeryFirstHaul ? 'Welcome aboard! Look for the dredge basket, and check the Quest Book for what to do next.' : next.text
    );
  }

  var EXTRAS_TABS = [
    { id: 'stats', label: 'Stats', icon: 'BarChart' },
    { id: 'feats', label: 'Feat Titles', icon: 'Trophy' },
    { id: 'quests', label: 'Quest Book', icon: 'Book' },
    { id: 'settings', label: 'Settings', icon: 'Settings' }
  ];

  function ExtrasPanel(props) {
    var save = props.save;
    var handle = props.handle;
    var onRefreshSave = props.onRefreshSave;
    var isStaff = props.isStaff;

    var _tab = useState('stats'); var tab = _tab[0]; var setTab = _tab[1];
    var tabs = isStaff ? EXTRAS_TABS.concat([{ id: 'staff', label: 'Staff', icon: 'Shield' }]) : EXTRAS_TABS;

    return h('div', { className: 'shoal-card shoal-social-card' },
      h('div', { className: 'shoal-card-title' }, 'The Desk'),
      h('div', { className: 'shoal-social-tabs' },
        tabs.map(function (t) {
          return h('button', {
            key: t.id, type: 'button',
            className: 'shoal-social-tab' + (tab === t.id ? ' shoal-social-tab-active' : ''),
            onClick: function () { setTab(t.id); }
          }, h(Icons[t.icon], { className: 'shoal-social-tab-icon' }), t.label);
        })
      ),
      tab === 'stats' && h(StatsTab, { key: 'stats-' + handle, handle: handle, save: save }),
      tab === 'feats' && h(FeatsTab, { key: 'feats-' + handle, save: save, handle: handle, onRefreshSave: onRefreshSave }),
      tab === 'quests' && h(QuestBookTab, { key: 'quests-' + handle, handle: handle, onRefreshSave: onRefreshSave }),
      tab === 'settings' && h(SettingsTab, { key: 'settings-' + handle, save: save, handle: handle, onRefreshSave: onRefreshSave }),
      tab === 'staff' && isStaff && h(StaffTab, { key: 'staff-' + handle, handle: handle })
    );
  }

  var STAT_LABELS = {
    hauls: 'Hauls', junkSorted: 'Junk Sorted', fishOnIce: 'Fish on Ice', curiosScrubbed: 'Curios Scrubbed',
    goodsMade: 'Goods Made', customersServed: 'Customers Served', perfectDrinksServed: 'Perfect Drinks',
    unitsSold: 'Units Sold', secondsAtSea: 'Minutes at Sea', coinsEarned: 'Coins Earned', bestStreak: 'Best Streak',
    retirements: 'Retirements', setsCompleted: 'Sets Completed', goldenSets: 'Golden Sets', creaturesSeen: 'Creatures Seen',
    lettersFound: 'Letters Found', cratesOpened: 'Crates Opened', creaturesReleased: 'Creatures Released'
  };
  var STAT_ORDER = ['hauls', 'secondsAtSea', 'junkSorted', 'fishOnIce', 'curiosScrubbed', 'goodsMade', 'customersServed', 'perfectDrinksServed', 'unitsSold', 'coinsEarned', 'bestStreak', 'retirements', 'setsCompleted', 'goldenSets', 'creaturesSeen', 'lettersFound'];

  function StatsTab(props) {
    var handle = props.handle;
    var save = props.save;
    var _stats = useState(null); var stats = _stats[0]; var setStats = _stats[1];

    // Refetches whenever the parent's `save` is replaced (every dredge/
    // sort/sell/etc. refresh), not just once on mount - otherwise this tab
    // goes stale the moment you do anything elsewhere on the page.
    useEffect(function () {
      apiGet('/api/shoal-tales/stats?handle=' + encodeURIComponent(handle)).then(function (d) { setStats(d.stats); }).catch(function () {});
    }, [handle, save]);

    if (!stats) return h('div', { className: 'shoal-social-tab-body' }, h('p', { className: 'shoal-hint' }, 'Loading...'));

    return h('div', { className: 'shoal-social-tab-body' },
      h('div', { className: 'shoal-subtitle' }, 'All Time'),
      h('div', { className: 'shoal-log-grid' },
        STAT_ORDER.map(function (key) {
          var value = key === 'secondsAtSea' ? Math.round((stats.allTime[key] || 0) / 60) : stats.allTime[key];
          return h('div', { key: key, className: 'shoal-log-stat' },
            h('span', { className: 'shoal-log-num' }, formatCoins(value || 0)),
            h('span', null, STAT_LABELS[key])
          );
        })
      ),
      h('div', { className: 'shoal-subtitle' }, 'This Run'),
      h('div', { className: 'shoal-log-grid' },
        h('div', { className: 'shoal-log-stat' }, h('span', { className: 'shoal-log-num' }, formatCoins(stats.thisRun.coinsEarned)), h('span', null, 'Coins Earned')),
        h('div', { className: 'shoal-log-stat' }, h('span', { className: 'shoal-log-num' }, stats.thisRun.bestStreak), h('span', null, 'Best Streak'))
      )
    );
  }

  function FeatsTab(props) {
    var save = props.save;
    var handle = props.handle;
    var onRefreshSave = props.onRefreshSave;
    var _busy = useState(false); var busy = _busy[0]; var setBusy = _busy[1];

    function equip(id) {
      setBusy(true);
      apiPost('/api/shoal-tales/cosmetics/equip-feat-title', { handle: handle, featTitleId: id })
        .then(function () { return onRefreshSave(); })
        .catch(function () {}).finally(function () { setBusy(false); });
    }

    return h('div', { className: 'shoal-social-tab-body' },
      h('p', { className: 'shoal-hint' }, 'Earned once, shown instead of your retirement title if chosen.'),
      h('div', { className: 'shoal-member-row' },
        h('span', null, 'Retirement title (', shoalRetirementTitleName(save), ')'),
        h('button', { type: 'button', disabled: busy || !save.featTitleChosen, onClick: function () { equip(null); } }, save.featTitleChosen ? 'Use This' : 'In Use')
      ),
      DATA.featTitles.map(function (f) {
        var unlocked = (save.unlockedFeatTitles || []).indexOf(f.id) !== -1;
        var equipped = save.featTitleChosen === f.id;
        return h('div', { key: f.id, className: 'shoal-member-row' },
          h('span', null, f.name, h('span', { className: 'shoal-member-title' }, f.earnedBy)),
          unlocked
            ? h('button', { type: 'button', disabled: busy || equipped, onClick: function () { equip(f.id); } }, equipped ? 'In Use' : 'Use This')
            : h('span', { className: 'shoal-look-lock' }, 'Locked')
        );
      })
    );
  }
  // ARCHITECTURE note: the retirement title itself isn't in ShoalTalesData
  // by index lookup helper client-side, so mirror server.js's
  // shoalRetirementTitle exactly (same clamp-to-last-title rule).
  function shoalRetirementTitleName(save) {
    var titles = DATA.retirementTitles;
    return titles[Math.min(save.retirements, titles.length - 1)];
  }

  function QuestBookTab(props) {
    var handle = props.handle;
    var onRefreshSave = props.onRefreshSave;
    var _quests = useState([]); var quests = _quests[0]; var setQuests = _quests[1];
    var _busy = useState(false); var busy = _busy[0]; var setBusy = _busy[1];
    var _msg = useState(null); var msg = _msg[0]; var setMsg = _msg[1];
    var _chapter = useState(1); var chapter = _chapter[0]; var setChapter = _chapter[1];

    var refresh = useCallback(function () {
      return apiGet('/api/shoal-tales/quest-book?handle=' + encodeURIComponent(handle)).then(function (d) { setQuests(d.quests); }).catch(function () {});
    }, [handle]);
    useEffect(function () { refresh(); }, [handle]);

    function claim(questId) {
      setBusy(true); setMsg(null);
      apiPost('/api/shoal-tales/quest-book/claim', { handle: handle, questId: questId }).then(function (d) {
        setMsg('Claimed: ' + (d.granted ? (d.granted.type === 'coins' ? ('+' + formatCoins(d.granted.amount) + ' coins') : d.granted.type) : ''));
        return Promise.all([refresh(), onRefreshSave()]);
      }).catch(function (e) { setMsg(e.message); }).finally(function () { setBusy(false); });
    }

    var chapterQuests = quests.filter(function (q) { return q.chapter === chapter; }).sort(function (a, b) { return a.order - b.order; });
    var chapters = Array.from(new Set(quests.map(function (q) { return q.chapter; })));

    return h('div', { className: 'shoal-social-tab-body' },
      h('div', { className: 'shoal-social-tabs' },
        chapters.map(function (c) {
          return h('button', {
            key: c, type: 'button', className: 'shoal-social-tab' + (chapter === c ? ' shoal-social-tab-active' : ''),
            onClick: function () { setChapter(c); }
          }, 'Chapter ', c);
        })
      ),
      h('div', { className: 'shoal-quest-list' },
        chapterQuests.map(function (q) {
          return h('div', { key: q.id, className: 'shoal-quest-row' + (!q.unlocked ? ' shoal-quest-row-locked' : '') },
            h('div', { className: 'shoal-quest-label' }, q.title, q.claimed && ' ✓'),
            h('div', { className: 'shoal-hint' }, q.unlocked ? q.description : 'Locked - complete the previous quest first.'),
            q.unlocked && q.progress && !q.claimed && h('div', { className: 'shoal-quest-bar' }, h('div', { className: 'shoal-quest-bar-fill', style: { width: Math.min(100, Math.round(q.progress.have / q.progress.need * 100)) + '%' } })),
            q.unlocked && q.progress && !q.claimed && h('div', { className: 'shoal-quest-progress' }, q.progress.have, '/', q.progress.need),
            q.unlocked && !q.claimed && h('button', { type: 'button', disabled: busy || !q.done, onClick: function () { claim(q.id); } }, 'Claim')
          );
        })
      ),
      msg && h('div', { className: 'shoal-sort-feedback' }, msg)
    );
  }

  function SettingsTab(props) {
    var save = props.save;
    var handle = props.handle;
    var onRefreshSave = props.onRefreshSave;
    var _busy = useState(false); var busy = _busy[0]; var setBusy = _busy[1];

    function toggle(path, value) {
      setBusy(true);
      apiPost(path, { handle: handle, enabled: value }).then(function () { return onRefreshSave(); }).catch(function () {}).finally(function () { setBusy(false); });
    }

    var settings = save.settings || { seaSounds: true, dredgeChatLine: true, sparkles: true, titleDisplay: true };
    var rows = [
      { key: 'visitorsEnabled', label: 'Allow visitors to your boat', value: save.visitorsEnabled, path: '/api/shoal-tales/settings/visitors' },
      { key: 'announcementsEnabled', label: 'Show announcements (retirements, sets, etc.)', value: save.announcementsEnabled, path: '/api/shoal-tales/settings/announcements' },
      { key: 'seaSounds', label: 'Sea sounds', value: settings.seaSounds, path: '/api/shoal-tales/settings/sea-sounds' },
      { key: 'dredgeChatLine', label: '"Dredge is up" chat line', value: settings.dredgeChatLine, path: '/api/shoal-tales/settings/dredge-chat-line' },
      { key: 'sparkles', label: 'New-player sparkles', value: settings.sparkles, path: '/api/shoal-tales/settings/sparkles' },
      { key: 'titleDisplay', label: 'Show my title to others', value: settings.titleDisplay, path: '/api/shoal-tales/settings/title-display' }
    ];

    return h('div', { className: 'shoal-social-tab-body' },
      rows.map(function (r) {
        return h('div', { key: r.key, className: 'shoal-member-row' },
          h('span', null, r.label),
          h('button', { type: 'button', disabled: busy, onClick: function () { toggle(r.path, !r.value); } }, r.value ? 'On' : 'Off')
        );
      })
    );
  }

  // Staff-only (superadmin). Wraps the letter-moderation and admin/tide,
  // admin/event endpoints that already exist server-side - visible only
  // when ShoalTalesScreen's own isStaff check (userProfile.role ===
  // 'superadmin') passes, same gate the server itself re-checks.
  function StaffTab(props) {
    var handle = props.handle;
    var _pending = useState([]); var pending = _pending[0]; var setPending = _pending[1];
    var _tide = useState(null); var tide = _tide[0]; var setTide = _tide[1];
    var _event = useState(null); var event = _event[0]; var setEvent = _event[1];
    var _busy = useState(false); var busy = _busy[0]; var setBusy = _busy[1];
    var _msg = useState(null); var msg = _msg[0]; var setMsg = _msg[1];
    var _tideType = useState('spring'); var tideType = _tideType[0]; var setTideType = _tideType[1];
    var _tideMinutes = useState(10); var tideMinutes = _tideMinutes[0]; var setTideMinutes = _tideMinutes[1];
    var _eventForm = useState({ id: '', name: '', curioIds: '', fishIds: '', minutes: 1440 });
    var eventForm = _eventForm[0]; var setEventForm = _eventForm[1];
    var _templateId = useState(''); var templateId = _templateId[0]; var setTemplateId = _templateId[1];

    var refresh = useCallback(function () {
      return Promise.all([
        apiGet('/api/shoal-tales/letters/moderate/list-pending?handle=' + encodeURIComponent(handle)).then(function (d) { setPending(d.letters || []); }).catch(function () {}),
        apiGet('/api/shoal-tales/tide/status').then(function (d) { setTide(d.tide); }).catch(function () {}),
        apiGet('/api/shoal-tales/event/status').then(function (d) { setEvent(d.event); }).catch(function () {})
      ]);
    }, [handle]);
    useEffect(function () { refresh(); }, [handle]);

    function run(promise, after) {
      setBusy(true); setMsg(null);
      return promise.then(function () { setMsg(after || null); return refresh(); })
        .catch(function (e) { setMsg(e.message); }).finally(function () { setBusy(false); });
    }

    return h('div', { className: 'shoal-social-tab-body' },
      h('div', { className: 'shoal-subtitle' }, 'Pending Letters (', pending.length, '/3)'),
      pending.length === 0 && h('p', { className: 'shoal-hint' }, 'Nothing waiting for review.'),
      pending.map(function (l) {
        return h('div', { key: l.id, className: 'shoal-found-letter' },
          h('p', null, '"', l.text, '"', l.anonymous ? ' - anonymous' : (' - ' + l.authorHandle)),
          h('div', { className: 'shoal-action-row' },
            h('button', { type: 'button', disabled: busy, onClick: function () { run(apiPost('/api/shoal-tales/letters/moderate/approve', { handle: handle, letterId: l.id }), 'Approved.'); } }, 'Approve'),
            h('button', { type: 'button', disabled: busy, className: 'shoal-action-btn-danger', onClick: function () { run(apiPost('/api/shoal-tales/letters/moderate/reject', { handle: handle, letterId: l.id, reason: 'Rejected by staff' }), 'Rejected.'); } }, 'Reject')
          )
        );
      }),

      h('div', { className: 'shoal-subtitle' }, 'Tides'),
      tide
        ? h('div', { className: 'shoal-member-row' },
            h('span', null, tide.name, ': ', tide.effect, ' (ends ', new Date(tide.endsAt).toLocaleTimeString(), ')'),
            h('button', { type: 'button', disabled: busy, onClick: function () { run(apiPost('/api/shoal-tales/admin/tide/stop', { handle: handle }), 'Tide stopped.'); } }, 'Stop')
          )
        : h('div', { className: 'shoal-invite-form' },
            h('select', { value: tideType, onChange: function (e) { setTideType(e.target.value); } },
              DATA.tides.map(function (t) { return h('option', { key: t.id, value: t.id }, t.name); })
            ),
            h('input', { type: 'number', min: 1, max: 240, value: tideMinutes, onChange: function (e) { setTideMinutes(Number(e.target.value)); } }),
            h('button', { type: 'button', disabled: busy, onClick: function () { run(apiPost('/api/shoal-tales/admin/tide/start', { handle: handle, type: tideType, minutes: tideMinutes }), 'Tide started.'); } }, 'Start')
          ),

      h('div', { className: 'shoal-subtitle' }, 'Events'),
      event
        ? h('div', { className: 'shoal-member-row' },
            h('span', null, event.name, ' (ends ', new Date(event.endsAt).toLocaleString(), ')'),
            h('button', { type: 'button', disabled: busy, onClick: function () { run(apiPost('/api/shoal-tales/admin/event/end', { handle: handle }), 'Event ended.'); } }, 'End')
          )
        : h('div', { className: 'shoal-event-form' },
            h('select', {
              value: templateId,
              onChange: function (e) {
                var tid = e.target.value;
                setTemplateId(tid);
                var tpl = (DATA.eventTemplates || []).find(function (t) { return t.id === tid; });
                if (tpl) {
                  setEventForm({
                    id: tpl.id, name: tpl.name,
                    curioIds: (tpl.curioIds || []).join(', '), fishIds: (tpl.fishIds || []).join(', '),
                    minutes: tpl.minutes
                  });
                }
              }
            },
              h('option', { value: '' }, '-- custom event --'),
              (DATA.eventTemplates || []).map(function (t) { return h('option', { key: t.id, value: t.id }, t.name, ' (template)'); })
            ),
            h('input', { type: 'text', placeholder: 'event id (e.g. summer-splash)', value: eventForm.id, onChange: function (e) { setTemplateId(''); setEventForm(Object.assign({}, eventForm, { id: e.target.value })); } }),
            h('input', { type: 'text', placeholder: 'Event name', value: eventForm.name, onChange: function (e) { setTemplateId(''); setEventForm(Object.assign({}, eventForm, { name: e.target.value })); } }),
            h('input', { type: 'text', placeholder: 'curio ids, comma-separated', value: eventForm.curioIds, onChange: function (e) { setTemplateId(''); setEventForm(Object.assign({}, eventForm, { curioIds: e.target.value })); } }),
            h('input', { type: 'text', placeholder: 'fish ids, comma-separated', value: eventForm.fishIds, onChange: function (e) { setTemplateId(''); setEventForm(Object.assign({}, eventForm, { fishIds: e.target.value })); } }),
            h('input', { type: 'number', min: 1, value: eventForm.minutes, onChange: function (e) { setEventForm(Object.assign({}, eventForm, { minutes: Number(e.target.value) })); } }),
            h('button', {
              type: 'button', disabled: busy || !eventForm.id || !eventForm.name,
              onClick: function () {
                var curioIds = eventForm.curioIds.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
                var fishIds = eventForm.fishIds.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
                var tpl = (DATA.eventTemplates || []).find(function (t) { return t.id === templateId; });
                run(apiPost('/api/shoal-tales/admin/event/start', {
                  handle: handle, id: eventForm.id, name: eventForm.name, curioIds: curioIds, fishIds: fishIds, minutes: eventForm.minutes,
                  looks: tpl ? tpl.looks : undefined
                }), 'Event started.');
              }
            }, 'Start')
          ),
      msg && h('div', { className: 'shoal-sort-feedback' }, msg)
    );
  }

  // --- Point-and-click rework: illustrated (CSS/SVG, no image assets)
  // scenes in place of the old always-stacked panel list. Scene is a
  // shared frame (a themed background + title + optional Back button);
  // SceneHotspot is the shared clickable-location/person button used
  // throughout every scene below. ---

  function Scene(props) {
    return h('div', { className: 'shoal-scene ' + (props.themeClass || '') },
      h('div', { className: 'shoal-scene-header' },
        props.onBack && h('button', { type: 'button', className: 'shoal-scene-back', onClick: props.onBack }, '← ', props.backLabel || 'Back'),
        h('div', { className: 'shoal-scene-title' }, props.title)
      ),
      h('div', { className: 'shoal-scene-stage' }, props.children)
    );
  }

  function SceneHotspot(props) {
    return h('button', {
      type: 'button',
      className: 'shoal-scene-hotspot' + (props.small ? ' shoal-scene-hotspot-small' : '') + (props.disabled ? ' shoal-scene-hotspot-disabled' : ''),
      disabled: props.disabled, onClick: props.onClick
    },
      h('span', { className: 'shoal-scene-hotspot-icon' }, props.emoji),
      h('span', { className: 'shoal-scene-hotspot-label' }, props.label),
      props.sublabel && h('span', { className: 'shoal-scene-hotspot-sublabel' }, props.sublabel)
    );
  }

  // The Harbor: the point-and-click hub. Your Ship/The Town/Your Emporium/
  // Your Guild Hall/The Dock Board are always-there buildings; "Ships at
  // Anchor" is the live presence roster (task 35) - other currently-online
  // players, each clickable straight into Visiting them, no typing a
  // handle required.
  function HarborScene(props) {
    var save = props.save;
    var roster = props.roster;
    var onEnter = props.onEnter;
    var onVisit = props.onVisit;

    return h(Scene, { themeClass: 'shoal-scene-harbor', title: 'The Harbor' },
      h('div', { className: 'shoal-scene-hotspot-row' },
        h(SceneHotspot, { emoji: '⛵', label: 'Your Ship', onClick: function () { onEnter('ship'); } }),
        h(SceneHotspot, { emoji: '🏘️', label: 'The Town', onClick: function () { onEnter('town'); } }),
        save.townOpen && h(SceneHotspot, { emoji: '🏪', label: 'Your Emporium', onClick: function () { onEnter('emporium'); } }),
        h(SceneHotspot, { emoji: '🚩', label: save.guildId ? 'Guild Hall' : 'Find a Guild', onClick: function () { onEnter('guildhall'); } }),
        h(SceneHotspot, { emoji: '📜', label: 'The Dock Board', sublabel: 'Party, Visit, Leaderboards, Letters', onClick: function () { onEnter('dockboard'); } })
      ),
      h('div', { className: 'shoal-scene-subtitle' }, 'Ships at Anchor'),
      roster.length === 0
        ? h('p', { className: 'shoal-hint' }, 'Nobody else is around right now.')
        : h('div', { className: 'shoal-harbor-roster' },
            roster.map(function (r) {
              return h(SceneHotspot, {
                key: r.handle, emoji: '⛴️', small: true,
                label: r.handle + (r.title ? (' (' + r.title + ')') : ''),
                sublabel: 'in ' + (SCENE_NAMES[r.scene] || r.scene),
                onClick: function () { onVisit(r.handle); }
              });
            })
          )
    );
  }

  var SCENE_NAMES = { harbor: 'the Harbor', ship: 'their Ship', town: 'the Town', emporium: 'their Emporium', guildhall: 'their Guild Hall', dockboard: 'the Dock Board', visiting: 'the Harbor' };

  var GUILD_HALL_ROOMS = [
    { id: 'common', emoji: '🏛️', label: 'Common Room', sublabel: 'Roster & chat' },
    { id: 'quests', emoji: '📋', label: 'Quest Board', sublabel: "Today's quests" },
    { id: 'bank', emoji: '💰', label: 'Bank Vault', sublabel: 'Deposits & upgrades' }
  ];

  // The Guild Hall: a multi-room scene wrapping GuildTab's existing content
  // (unchanged logic/endpoints) in place of its old single long scroll.
  // Not in a guild yet -> GuildTab's own found/accept-invite flow, no rooms.
  function GuildHallScene(props) {
    var save = props.save;
    var handle = props.handle;
    var onRefreshSave = props.onRefreshSave;
    var onBack = props.onBack;
    var _room = useState(null); var room = _room[0]; var setRoom = _room[1];

    if (!save.guildId) {
      return h(Scene, { themeClass: 'shoal-scene-guildhall', title: 'Find a Guild', onBack: onBack },
        h(GuildTab, { save: save, handle: handle, onRefreshSave: onRefreshSave })
      );
    }

    if (!room) {
      return h(Scene, { themeClass: 'shoal-scene-guildhall', title: 'The Guild Hall', onBack: onBack },
        h('div', { className: 'shoal-scene-hotspot-row' },
          GUILD_HALL_ROOMS.map(function (r) {
            return h(SceneHotspot, { key: r.id, emoji: r.emoji, label: r.label, sublabel: r.sublabel, onClick: function () { setRoom(r.id); } });
          })
        )
      );
    }

    var roomInfo = GUILD_HALL_ROOMS.find(function (r) { return r.id === room; });
    return h(Scene, { themeClass: 'shoal-scene-guildhall', title: roomInfo.label, onBack: function () { setRoom(null); }, backLabel: 'Guild Hall' },
      h(GuildTab, { save: save, handle: handle, onRefreshSave: onRefreshSave, room: room })
    );
  }

  function ShoalTalesScreen(props) {
    var handle = props.userProfile && props.userProfile.handle;
    var isStaff = !!(props.userProfile && props.userProfile.role === 'superadmin');
    var _save = useState(null); var save = _save[0]; var setSave = _save[1];
    var _loading = useState(true); var loading = _loading[0]; var setLoading = _loading[1];
    var _error = useState(null); var error = _error[0]; var setError = _error[1];
    var _busy = useState(false); var busy = _busy[0]; var setBusy = _busy[1];
    var _selectedId = useState(null); var selectedId = _selectedId[0]; var setSelectedId = _selectedId[1];
    var _lastResult = useState(null); var lastResult = _lastResult[0]; var setLastResult = _lastResult[1];
    var _dredging = useState(false); var dredging = _dredging[0]; var setDredging = _dredging[1];
    var _countdown = useState(0); var countdown = _countdown[0]; var setCountdown = _countdown[1];
    var _curioChoosingBin = useState(null); var curioChoosingBin = _curioChoosingBin[0]; var setCurioChoosingBin = _curioChoosingBin[1];
    var _lastFoundLetter = useState(null); var lastFoundLetter = _lastFoundLetter[0]; var setLastFoundLetter = _lastFoundLetter[1];
    // Point-and-click scene state: 'harbor' (default/hub) / 'ship' / 'town' /
    // 'emporium' / 'guildhall' / 'dockboard' / 'visiting'. visitingHandle is
    // only set while scene === 'visiting' (clicked a ship in the Harbor).
    var _scene = useState('harbor'); var scene = _scene[0]; var setScene = _scene[1];
    var _visitingHandle = useState(null); var visitingHandle = _visitingHandle[0]; var setVisitingHandle = _visitingHandle[1];
    var _roster = useState([]); var roster = _roster[0]; var setRoster = _roster[1];
    var presenceWsRef = useRef(null);

    function goTo(nextScene) { setVisitingHandle(null); setScene(nextScene); }
    function goToHarbor() { goTo('harbor'); }
    function visitShip(targetHandle) { setVisitingHandle(targetHandle); setScene('visiting'); }

    // One live presence connection per mount, reporting the current scene
    // and listening for everyone else's (14-extras.md has no precedent for
    // this - it's the new point-and-click Harbor, server.js task 35).
    useEffect(function () {
      if (!handle) return undefined;
      var ws = shoalOpenPresenceSocket(handle, scene, function (newRoster) { setRoster(newRoster); });
      presenceWsRef.current = ws;
      apiGet('/api/shoal-tales/presence?handle=' + encodeURIComponent(handle)).then(function (d) { setRoster(d.roster || []); }).catch(function () {});
      return function () { if (ws) ws.close(); presenceWsRef.current = null; };
    }, [handle]);

    useEffect(function () {
      var ws = presenceWsRef.current;
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'SHOAL_SCENE', scene: scene }));
    }, [scene]);

    var refresh = useCallback(function () {
      if (!handle) return Promise.resolve();
      return apiGet('/api/shoal-tales/save?handle=' + encodeURIComponent(handle)).then(function (data) {
        setSave(data.save);
        setError(null);
      }).catch(function (e) { setError(e.message); });
    }, [handle]);

    useEffect(function () {
      setLoading(true);
      refresh().then(function () { setLoading(false); });
    }, [handle]);

    function runAction(promise) {
      setBusy(true);
      return promise.then(function (data) {
        setSelectedId(null);
        setCurioChoosingBin(null);
        return refresh().then(function () { return data; });
      }).catch(function (e) { setError(e.message); return null; }).finally(function () { setBusy(false); });
    }

    function handleDredge() {
      setBusy(true); setSelectedId(null); setLastResult(null); setCurioChoosingBin(null);
      apiPost('/api/shoal-tales/dredge', { handle: handle }).then(function (data) {
        var seconds = Math.max(1, Math.round(data.dredgeTimeSeconds));
        setDredging(true);
        setCountdown(seconds);
        var remaining = seconds;
        var timer = setInterval(function () {
          remaining -= 1;
          if (remaining <= 0) {
            clearInterval(timer);
            setDredging(false);
            setSave(function (prev) { return Object.assign({}, prev, { tray: data.tray }); });
          } else {
            setCountdown(remaining);
          }
        }, 1000);
      }).catch(function (e) { setError(e.message); }).finally(function () { setBusy(false); });
    }

    function handleSort(trayItemId, bin) {
      runAction(apiPost('/api/shoal-tales/sort', { handle: handle, trayItemId: trayItemId, bin: bin })).then(function (data) {
        if (!data) return;
        var message = data.correct
          ? ('✓ Correct! +' + formatCoins(data.value) + ' coins' + (data.newStreak > 1 ? (' (streak x' + data.newStreak + ')') : ''))
          : ('✗ Wrong bin. +' + formatCoins(data.value) + ' coins');
        setLastResult({ ok: data.correct, message: message });
      });
    }

    function handleScrub(trayItemId) {
      // Doesn't go through the generic runAction, which always clears the
      // tray selection - "Scrub it clean (4 clicks)" (06-curios.md) needs
      // the item to stay selected/visible between clicks so Scrub can be
      // tapped again immediately, not re-selected from the grid each time.
      setBusy(true);
      apiPost('/api/shoal-tales/scrub', { handle: handle, trayItemId: trayItemId }).then(function (data) {
        if (data.kind === 'scrubbing') {
          setLastResult({ ok: true, message: 'Scrubbing... (' + data.scrubProgress + '/' + data.scrubsNeeded + ')' });
        } else if (data.kind === 'magicCurio') {
          setSelectedId(null);
          setLastResult({ ok: true, message: '✨ Found ' + data.magicCurio.name + '! ' + data.magicCurio.description });
        } else {
          setLastResult({ ok: true, message: 'Scrubbed clean: ' + data.item.name + ' (' + data.item.rarity + (data.item.golden ? ', golden!' : '') + ')' });
        }
        return refresh();
      }).catch(function (e) { setError(e.message); }).finally(function () { setBusy(false); });
    }

    function handlePry(trayItemId) {
      runAction(apiPost('/api/shoal-tales/pry', { handle: handle, trayItemId: trayItemId })).then(function (data) {
        if (!data) return;
        var message = data.outcome === 'coins' ? ('Found ' + formatCoins(data.coins) + ' coins inside!')
          : data.outcome === 'junk' ? 'Found more junk inside.'
          : data.item ? 'Found a curio inside!' : 'It was empty.';
        setLastResult({ ok: true, message: message });
      });
    }

    function handleUncork(trayItemId) {
      runAction(apiPost('/api/shoal-tales/uncork', { handle: handle, trayItemId: trayItemId })).then(function (data) {
        if (!data) return;
        var message;
        if (data.outcome === 'letter' && data.isPlayerWritten) {
          message = 'Found a letter' + (data.letter.authorHandle ? (' from ' + data.letter.authorHandle) : ' (anonymous)') + ': "' + data.letter.text + '"';
          setLastFoundLetter(data.letter);
        } else if (data.outcome === 'letter') {
          message = 'Found a letter: "' + data.letter.title + '"';
        } else {
          message = 'Just an empty bottle - sort it, or keep it for a writing kit.';
        }
        setLastResult({ ok: true, message: message });
      });
    }

    function handleKeepBottle(trayItemId) {
      runAction(apiPost('/api/shoal-tales/bottle/keep', { handle: handle, trayItemId: trayItemId })).then(function (data) {
        if (!data) return;
        setLastResult({ ok: true, message: 'Kept (' + data.emptyBottlesKept + ' saved up for a writing kit).' });
      });
    }

    function handleHeartLetter(letterId) {
      setBusy(true);
      apiPost('/api/shoal-tales/letters/heart', { handle: handle, letterId: letterId })
        .then(function () { setLastResult({ ok: true, message: 'Hearted!' }); })
        .catch(function (e) { setError(e.message); }).finally(function () { setBusy(false); });
    }
    function handleReportLetter(letterId) {
      setBusy(true);
      apiPost('/api/shoal-tales/letters/report', { handle: handle, letterId: letterId, reason: 'Reported by finder' })
        .then(function () { setLastResult({ ok: true, message: 'Reported - sent back to staff for review.' }); setLastFoundLetter(null); })
        .catch(function (e) { setError(e.message); }).finally(function () { setBusy(false); });
    }
    function handleReplyLetter(letterId, text) {
      setBusy(true);
      apiPost('/api/shoal-tales/letters/reply', { handle: handle, letterId: letterId, text: text })
        .then(function () { setLastResult({ ok: true, message: 'Reply sent - the writer will find it on their next haul.' }); })
        .catch(function (e) { setError(e.message); }).finally(function () { setBusy(false); });
    }

    function handleRelease(trayItemId) {
      runAction(apiPost('/api/shoal-tales/release', { handle: handle, trayItemId: trayItemId })).then(function (data) {
        if (!data) return;
        setLastResult({ ok: true, message: 'Set free for +' + formatCoins(data.coins) + ' coins' + (data.newlySeen ? ' (new in Creatures Seen!)' : '') });
      });
    }

    function handleCurioAction(trayItemId, action, bin) {
      runAction(apiPost('/api/shoal-tales/curio-action', { handle: handle, trayItemId: trayItemId, action: action, bin: bin })).then(function (data) {
        if (!data) return;
        var message = action === 'log' ? (data.logged ? 'Added to the Collector\'s Log!' : 'Already logged a better copy.')
          : action === 'sell' ? ('Sold for +' + formatCoins(data.coins) + ' coins')
          : action === 'store' ? 'Stored for later.'
          : action === 'sort' ? (data.correct ? ('✓ Correct bin! +' + formatCoins(data.value) + ' coins') : ('✗ Wrong bin. +' + formatCoins(data.value) + ' coins'))
          : '';
        setLastResult({ ok: action !== 'sort' || data.correct, message: message });
      });
    }

    function handleStartCurioSort(trayItemId) {
      setCurioChoosingBin(trayItemId);
    }

    function handleStoredCurioAction(storedCurioId, action) {
      runAction(apiPost('/api/shoal-tales/stored-curio-action', { handle: handle, storedCurioId: storedCurioId, action: action })).then(function (data) {
        if (!data) return;
        var message = action === 'log' ? (data.logged ? 'Added to the Collector\'s Log!' : 'Already logged a better copy.')
          : action === 'sell' ? ('Sold for +' + formatCoins(data.coins) + ' coins')
          : action === 'donate' ? (data.logged ? 'Donated to the Guild Log!' : 'Your guild already has a better copy.')
          : action === 'process' ? ('Processed into ' + formatCoins(data.producedValue) + 'c of ' + data.resource)
          : '';
        setLastResult({ ok: true, message: message });
      });
    }

    function handleGiftCurio(storedCurioId, toHandle) {
      runAction(apiPost('/api/shoal-tales/gift/send', { handle: handle, toHandle: toHandle, storedCurioId: storedCurioId })).then(function (data) {
        if (!data) return;
        setLastResult({ ok: true, message: 'Gifted to ' + toHandle + '!' });
      });
    }

    function handleSell(what) {
      setBusy(true);
      apiPost('/api/shoal-tales/sell', { handle: handle, what: what }).then(function () { return refresh(); })
        .catch(function (e) { setError(e.message); }).finally(function () { setBusy(false); });
    }

    function handleUpgrade(upgradeId) {
      setBusy(true);
      apiPost('/api/shoal-tales/upgrade', { handle: handle, upgradeId: upgradeId }).then(function () { return refresh(); })
        .catch(function (e) { setError(e.message); }).finally(function () { setBusy(false); });
    }

    function handleUpgradeMax(upgradeId) {
      runAction(apiPost('/api/shoal-tales/upgrade-max', { handle: handle, upgradeId: upgradeId })).then(function (data) {
        if (!data) return;
        setLastResult({ ok: true, message: 'Bought ' + data.levelsBought + ' level' + (data.levelsBought === 1 ? '' : 's') + ' for ' + formatCoins(data.coinsSpent) + ' coins.' });
      });
    }

    function handleAreaChange(area) {
      setBusy(true);
      apiPost('/api/shoal-tales/area', { handle: handle, area: area }).then(function () { return refresh(); })
        .catch(function (e) { setError(e.message); }).finally(function () { setBusy(false); });
    }

    function handleDepthChange(depth) {
      setBusy(true);
      apiPost('/api/shoal-tales/depth', { handle: handle, depth: depth }).then(function () { return refresh(); })
        .catch(function (e) { setError(e.message); }).finally(function () { setBusy(false); });
    }

    function handleDress(coolerItemId) {
      runAction(apiPost('/api/shoal-tales/dress', { handle: handle, coolerItemId: coolerItemId })).then(function (data) {
        if (!data) return;
        var message = data.newLetter ? ('Dressed! A crow drops a letter: "' + data.newLetter.title + '"') : 'Fish dressed.';
        setLastResult({ ok: true, message: message });
      });
    }

    function handleFulfillRequest(personId) {
      runAction(apiPost('/api/shoal-tales/fulfill-request', { handle: handle, personId: personId })).then(function (data) {
        if (!data) return;
        var message = data.kind === 'story'
          ? ('Request fulfilled! Reward: ' + data.rewardMessage)
          : ('Standing order filled! +' + formatCoins(data.reward) + ' coins');
        setLastResult({ ok: true, message: message });
      });
    }

    function handleFulfillDaily(personId) {
      runAction(apiPost('/api/shoal-tales/fulfill-daily', { handle: handle, personId: personId })).then(function (data) {
        if (!data) return;
        setLastResult({ ok: true, message: 'Daily request done! +' + formatCoins(data.reward) + ' coins' });
      });
    }

    function handleMakeMeal(coolerItemId) {
      runAction(apiPost('/api/shoal-tales/make-meal', { handle: handle, coolerItemId: coolerItemId })).then(function (data) {
        if (!data) return;
        setLastResult({ ok: true, message: 'Meal made: +' + formatCoins(data.fish.value) + ' coins worth' });
      });
    }

    function handleProcessJunk(bin) {
      runAction(apiPost('/api/shoal-tales/process-junk', { handle: handle, bin: bin })).then(function (data) {
        if (!data) return;
        setLastResult({ ok: true, message: 'Made ' + data.producedUnits + ' ' + RESOURCE_LABEL[data.resource] + ' worth ' + formatCoins(data.producedValue) + ' coins' });
      });
    }

    function handleInstallStation() {
      runAction(apiPost('/api/shoal-tales/install-station', { handle: handle })).then(function (data) {
        if (!data) return;
        var message = 'Station installed for ' + formatCoins(data.coinsSpent) + ' coins!' + (data.newLetter ? (' A crow drops a letter: "' + data.newLetter.title + '"') : '');
        setLastResult({ ok: true, message: message });
      });
    }

    function handleStartPuzzle(trayItemId) {
      runAction(apiPost('/api/shoal-tales/emporium/puzzle/start', { handle: handle, trayItemId: trayItemId })).then(function (data) {
        if (!data) return;
        setLastResult({ ok: true, message: 'Puzzle box opened - solve it at the Puzzle Bench.' });
      });
    }

    var emporiumHandlers = {
      onOpenEmporium: function () {
        runAction(apiPost('/api/shoal-tales/open-emporium', { handle: handle })).then(function (data) {
          if (!data) return;
          setLastResult({ ok: true, message: 'The Emporium is open!' + (data.newLetter ? (' A crow drops a last letter: "' + data.newLetter.title + '"') : '') });
        });
      },
      onCollectAwayEarnings: function () {
        runAction(apiPost('/api/shoal-tales/emporium/collect-away-earnings', { handle: handle })).then(function (data) {
          if (!data) return;
          setLastResult({ ok: true, message: 'Collected +' + formatCoins(data.earnings) + ' coins while you were away.' });
        });
      },
      onCollectTips: function () {
        runAction(apiPost('/api/shoal-tales/visit/collect-tips', { handle: handle })).then(function (data) {
          if (!data) return;
          setLastResult({ ok: true, message: 'Collected +' + formatCoins(data.collected) + ' coins from the tip jar.' });
        });
      },
      onPlaceDecoration: function (pedestalIndex, decorationId) {
        runAction(apiPost('/api/shoal-tales/emporium/place-decoration', { handle: handle, pedestalIndex: pedestalIndex, decorationId: decorationId }));
      },
      onTakeDecoration: function (pedestalIndex) {
        runAction(apiPost('/api/shoal-tales/emporium/take-decoration', { handle: handle, pedestalIndex: pedestalIndex }));
      },
      onExpandPedestals: function () {
        runAction(apiPost('/api/shoal-tales/emporium/expand-pedestals', { handle: handle })).then(function (data) {
          if (!data) return;
          setLastResult({ ok: true, message: 'Added 2 pedestals for ' + formatCoins(data.coinsSpent) + ' coins.' });
        });
      },
      onBuildBackRoom: function () {
        runAction(apiPost('/api/shoal-tales/emporium/build-back-room', { handle: handle })).then(function (data) {
          if (!data) return;
          setLastResult({ ok: true, message: 'The Back Room is built!' });
        });
      },
      onTradeUp: function (rarity) {
        runAction(apiPost('/api/shoal-tales/emporium/trade-up', { handle: handle, rarity: rarity })).then(function (data) {
          if (!data) return;
          setLastResult({ ok: true, message: data.granted ? ('Traded up for a ' + data.granted.name + '!') : 'Trade failed.' });
        });
      },
      onNextCustomer: function () {
        runAction(apiPost('/api/shoal-tales/emporium/counter/next-customer', { handle: handle })).then(function (data) {
          if (!data) return;
          setLastResult({ ok: true, message: data.customer.name + ' walks in.' });
        });
      },
      onServeCustomer: function (customerId, drink, coolerItemId) {
        runAction(apiPost('/api/shoal-tales/emporium/counter/serve', { handle: handle, customerId: customerId, drink: drink, coolerItemId: coolerItemId })).then(function (data) {
          if (!data) return;
          var message = (data.correctDrink ? '✓ Correct drink! ' : '✗ Wrong drink. ') + '+' + formatCoins(data.coinsEarned) + ' coins' + (data.mealGiven ? ' (meal included)' : '');
          setLastResult({ ok: data.correctDrink, message: message });
        });
      },
      onPressPuzzle: function (cellIndex) {
        runAction(apiPost('/api/shoal-tales/emporium/puzzle/press', { handle: handle, cellIndex: cellIndex })).then(function (data) {
          if (!data) return;
          var message = data.solved
            ? ('Solved! +' + formatCoins(data.coinsEarned) + ' coins' + (data.decoration ? (' and a ' + data.decoration.name) : ''))
            : 'Click.';
          setLastResult({ ok: true, message: message });
        });
      },
      onPuzzleHint: function () {
        runAction(apiPost('/api/shoal-tales/emporium/puzzle/hint', { handle: handle })).then(function (data) {
          if (!data) return;
          setLastResult({ ok: true, message: 'Hint used (' + data.ticketsLeft + ' tickets left).' });
        });
      },
      onTideTimer: function (stopIndex) {
        runAction(apiPost('/api/shoal-tales/emporium/arcade/tide-timer', { handle: handle, stopIndex: stopIndex })).then(function (data) {
          if (!data) return;
          setLastResult({ ok: true, message: '+' + data.tickets + ' tickets' });
        });
      },
      onCrabGrab: function (crabsHit) {
        runAction(apiPost('/api/shoal-tales/emporium/arcade/crab-grab', { handle: handle, crabsHit: crabsHit })).then(function (data) {
          if (!data) return;
          setLastResult({ ok: true, message: 'Hit ' + data.crabsHit + ' crabs - +' + data.tickets + ' tickets' });
        });
      },
      onShellGame: function (guess) {
        runAction(apiPost('/api/shoal-tales/emporium/arcade/shell-game', { handle: handle, guess: guess })).then(function (data) {
          if (!data) return;
          setLastResult({ ok: data.win, message: data.win ? ('Found it! +' + data.tickets + ' tickets (streak x' + data.streak + ')') : 'Wrong shell.' });
        });
      },
      onPrizeBox: function (tier) {
        runAction(apiPost('/api/shoal-tales/emporium/prize-box', { handle: handle, tier: tier })).then(function (data) {
          if (!data) return;
          setLastResult({ ok: true, message: data.decoration ? ('Won a ' + data.decoration.name + '!') : 'Nothing this time.' });
        });
      },
      onFillWorkOrder: function (orderId) {
        runAction(apiPost('/api/shoal-tales/emporium/work-order/fill', { handle: handle, orderId: orderId })).then(function (data) {
          if (!data) return;
          setLastResult({ ok: true, message: 'Order filled! +' + formatCoins(data.coinsEarned) + ' coins' + (data.decoration ? (' and a ' + data.decoration.name) : '') });
        });
      },
      onSwapWorkOrder: function (orderId) {
        runAction(apiPost('/api/shoal-tales/emporium/work-order/swap', { handle: handle, orderId: orderId })).then(function (data) {
          if (!data) return;
          setLastResult({ ok: true, message: 'Order swapped for ' + formatCoins(data.coinsSpent) + ' coins.' });
        });
      }
    };

    function handleRetire() {
      runAction(apiPost('/api/shoal-tales/retire', { handle: handle })).then(function (data) {
        if (!data) return;
        var message = 'Retired! New title: ' + data.title + '.'
          + (data.newArea ? (' ' + data.newArea + ' is now open!') : '')
          + (data.newDepth ? (' ' + data.newDepth + ' is now open!') : '');
        setLastResult({ ok: true, message: message });
      });
    }

    function handleEquipWood(part, woodId) {
      runAction(apiPost('/api/shoal-tales/cosmetics/equip-wood', { handle: handle, part: part, woodId: woodId }));
    }
    function handleBuyWood(woodId) {
      runAction(apiPost('/api/shoal-tales/cosmetics/buy-exotic-wood', { handle: handle, woodId: woodId })).then(function (data) {
        if (!data) return;
        setLastResult({ ok: true, message: 'Bought for ' + formatCoins(data.coinsSpent) + ' coins.' });
      });
    }
    function handleBuyLook(category, id) {
      runAction(apiPost('/api/shoal-tales/cosmetics/buy-look', { handle: handle, category: category, id: id })).then(function (data) {
        if (!data) return;
        setLastResult({ ok: true, message: 'Bought for ' + formatCoins(data.coinsSpent) + ' coins.' });
      });
    }
    function handleEquipSail(sailId) {
      runAction(apiPost('/api/shoal-tales/cosmetics/equip-sail', { handle: handle, sailId: sailId }));
    }
    function handleEquipFlag(flagId) {
      runAction(apiPost('/api/shoal-tales/cosmetics/equip-flag', { handle: handle, flagId: flagId }));
    }
    function handleEquipPet(petId) {
      runAction(apiPost('/api/shoal-tales/cosmetics/equip-pet', { handle: handle, petId: petId }));
    }
    function handleEquipBadge(badgeId) {
      runAction(apiPost('/api/shoal-tales/cosmetics/equip-badge', { handle: handle, badgeId: badgeId }));
    }
    function handlePatPet() {
      runAction(apiPost('/api/shoal-tales/cosmetics/pat-pet', { handle: handle })).then(function (data) {
        if (!data) return;
        setLastResult({ ok: true, message: data.treatGranted ? 'Your pet is happy! +5% value for 10 minutes.' : 'Your pet is happy! ❤️' });
      });
    }
    function handleSelectTrack(trackId) {
      runAction(apiPost('/api/shoal-tales/cosmetics/select-track', { handle: handle, trackId: trackId }));
    }

    if (loading) {
      return h('div', { className: 'shoal-tales-screen shoal-loading' }, 'Loading Shoal Tales...');
    }
    if (error && !save) {
      return h('div', { className: 'shoal-tales-screen shoal-loading' }, 'Could not load: ', error);
    }
    if (!save) return null;

    // Point-and-click scene routing: Ship/Town/Emporium each wrap their
    // existing panels (unchanged props/logic) in the shared Scene frame;
    // Harbor and Guild Hall are their own components above since they carry
    // real navigation state of their own (the live roster, the hall's rooms).
    var sceneBody;
    if (scene === 'ship') {
      // The ship is what you decorate and work from deck to deck: dredging,
      // the tray/goods, Stations, the Work Table, the Shipwright (including
      // Radio/music), the Desk (quest book/stats/feats/settings), and your
      // Collector's Log all live here.
      sceneBody = h(Scene, { themeClass: 'shoal-scene-ship', title: 'Your Ship', onBack: goToHarbor },
        h(DredgeControls, { save: save, onDredge: handleDredge, onAreaChange: handleAreaChange, onDepthChange: handleDepthChange, busy: busy, dredging: dredging, dredgeCountdown: countdown }),
        h(TrayPanel, {
          save: save, selectedId: selectedId, onSelect: setSelectedId, onSort: handleSort, busy: busy, lastResult: lastResult,
          onScrub: handleScrub, onPry: handlePry, onUncork: handleUncork, onRelease: handleRelease,
          onCurioAction: handleCurioAction, curioChoosingBin: curioChoosingBin, onStartCurioSort: handleStartCurioSort,
          onStartPuzzle: handleStartPuzzle, onKeepBottle: handleKeepBottle
        }),
        h(GoodsAndCoolerPanel, { save: save, onSell: handleSell, onDress: handleDress, onMakeMeal: handleMakeMeal, busy: busy }),
        h(StationsPanel, { save: save, busy: busy, onInstall: handleInstallStation, onProcessJunk: handleProcessJunk }),
        h(UpgradesPanel, { save: save, onBuy: handleUpgrade, onBuyMax: handleUpgradeMax, busy: busy }),
        h(ShipwrightPanel, {
          save: save, busy: busy, onEquipWood: handleEquipWood, onBuyWood: handleBuyWood, onBuyLook: handleBuyLook,
          onEquipSail: handleEquipSail, onEquipFlag: handleEquipFlag, onEquipPet: handleEquipPet,
          onEquipBadge: handleEquipBadge, onPatPet: handlePatPet, onSelectTrack: handleSelectTrack
        }),
        h(CollectorsLogSummary, { save: save }),
        h(StoredCuriosPanel, { save: save, busy: busy, onStoredCurioAction: handleStoredCurioAction, onGiftCurio: handleGiftCurio }),
        h(ExtrasPanel, { save: save, handle: handle, onRefreshSave: refresh, isStaff: isStaff }),
        save.townOpen && h(RetirePanel, { save: save, busy: busy, onRetire: handleRetire })
      );
    } else if (scene === 'town') {
      // Just the villagers: sell goods/fish to them, fulfil story requests
      // and daily requests (their "work orders").
      sceneBody = h(Scene, { themeClass: 'shoal-scene-town', title: 'The Town', onBack: goToHarbor },
        h(TownPanel, { save: save, busy: busy, onFulfillRequest: handleFulfillRequest, onFulfillDaily: handleFulfillDaily })
      );
    } else if (scene === 'emporium') {
      sceneBody = h(Scene, { themeClass: 'shoal-scene-emporium', title: 'Your Emporium', onBack: goToHarbor },
        h(EmporiumPanel, { save: save, busy: busy, handlers: emporiumHandlers })
      );
    } else if (scene === 'guildhall') {
      sceneBody = h(GuildHallScene, { save: save, handle: handle, onRefreshSave: refresh, onBack: goToHarbor });
    } else if (scene === 'dockboard') {
      sceneBody = h(Scene, { themeClass: 'shoal-scene-dockboard', title: 'The Dock Board', onBack: goToHarbor },
        h(SocialPanel, {
          save: save, handle: handle, onRefreshSave: refresh,
          lastFoundLetter: lastFoundLetter, onHeartLetter: handleHeartLetter, onReportLetter: handleReportLetter, onReplyLetter: handleReplyLetter
        })
      );
    } else if (scene === 'visiting') {
      sceneBody = h(Scene, { themeClass: 'shoal-scene-harbor', title: 'Visiting ' + visitingHandle, onBack: goToHarbor },
        h(VisitTab, { key: 'visit-' + visitingHandle, save: save, handle: handle, initialTarget: visitingHandle })
      );
    } else {
      sceneBody = h(HarborScene, { save: save, roster: roster, onEnter: goTo, onVisit: visitShip });
    }

    return h('div', { className: 'shoal-tales-screen' },
      h('div', { className: 'shoal-header' },
        h('div', { className: 'shoal-header-title' }, h(Icons.Anchor, { className: 'shoal-header-icon' }), 'Shoal Tales', save.title ? (' — ' + save.title) : ''),
        h('div', { className: 'shoal-header-coins' }, h(Icons.Coins, { className: 'shoal-coin-icon' }), formatCoins(save.coins)),
        save.streak > 0 && h('div', { className: 'shoal-header-streak' }, h(Icons.Zap, { className: 'shoal-streak-icon' }), 'x', save.streak)
      ),
      error && h('div', { className: 'shoal-error-banner' }, error),
      h(TideEventBanner, { key: 'tide-event' }),
      h(NewPlayerHintBanner, { key: 'hint', save: save }),
      sceneBody
    );
  }

  root.ShoalTalesUI = {
    ShoalTalesScreen: ShoalTalesScreen,
    // Exported for direct testing of the data-driven render paths, which the
    // top-level screen only reaches after an async fetch + state update that
    // this project's lightweight component-test harness (mocked useEffect)
    // can't simulate. Not meant to be used standalone outside this module.
    TrayPanel: TrayPanel,
    GoodsAndCoolerPanel: GoodsAndCoolerPanel,
    TownPanel: TownPanel,
    StationsPanel: StationsPanel,
    EmporiumGate: EmporiumGate,
    ShopFloorPanel: ShopFloorPanel,
    CounterPanel: CounterPanel,
    PuzzleBenchPanel: PuzzleBenchPanel,
    ArcadePanel: ArcadePanel,
    PrizeCounterPanel: PrizeCounterPanel,
    WorkOrdersPanel: WorkOrdersPanel,
    EmporiumPanel: EmporiumPanel,
    RetirePanel: RetirePanel,
    ShipwrightPanel: ShipwrightPanel,
    LookGrid: LookGrid,
    DredgeControls: DredgeControls,
    UpgradesPanel: UpgradesPanel,
    CollectorsLogSummary: CollectorsLogSummary,
    StoredCuriosPanel: StoredCuriosPanel,
    SocialPanel: SocialPanel,
    PartyTab: PartyTab,
    GuildTab: GuildTab,
    VisitTab: VisitTab,
    LeaderboardTab: LeaderboardTab,
    LettersTab: LettersTab,
    ExtrasPanel: ExtrasPanel,
    TideEventBanner: TideEventBanner,
    NewPlayerHintBanner: NewPlayerHintBanner,
    StatsTab: StatsTab,
    FeatsTab: FeatsTab,
    QuestBookTab: QuestBookTab,
    SettingsTab: SettingsTab,
    StaffTab: StaffTab,
    Scene: Scene,
    SceneHotspot: SceneHotspot,
    HarborScene: HarborScene,
    GuildHallScene: GuildHallScene,
    formatCoins: formatCoins
  };
})(typeof window !== 'undefined' ? window : this);
