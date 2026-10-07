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
          h(Icons.Sparkle, { className: 'shoal-bin-icon' }), h('span', null, 'Scrub'));
      }
      if (item.kind === 'puzzleBox') {
        return h('button', { type: 'button', disabled: busy, onClick: function () { onStartPuzzle(item.id); }, className: 'shoal-action-btn' },
          h(Icons.Box, { className: 'shoal-bin-icon' }), h('span', null, 'Take to Puzzle Bench'));
      }
      if (item.kind === 'curio') {
        if (!item.identified) {
          return h('button', { type: 'button', disabled: busy, onClick: function () { onScrub(item.id); }, className: 'shoal-action-btn' },
            h(Icons.Gem, { className: 'shoal-bin-icon' }), h('span', null, 'Scrub'));
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

  var RESOURCE_LABEL = { knickKnacks: 'Knick-knacks', ingots: 'Ingots', materials: 'Materials' };

  function GoodsAndCoolerPanel(props) {
    var save = props.save;
    var onSell = props.onSell;
    var onDress = props.onDress;
    var onMakeMeal = props.onMakeMeal;
    var busy = props.busy;

    var ovenInstalled = save.stationsInstalled.indexOf('oven') !== -1;
    var goodsValue = ENGINE.BINS.reduce(function (sum, b) { return sum + save.sortedGoods[b].value; }, 0);
    var rawFish = save.cooler.filter(function (f) { return f.stage === 'raw'; });
    var dressedFish = save.cooler.filter(function (f) { return f.stage === 'dressed'; });
    var mealFish = save.cooler.filter(function (f) { return f.stage === 'meal'; });
    var mealValue = mealFish.reduce(function (sum, f) { return sum + f.value; }, 0);
    var resourceValue = ['knickKnacks', 'ingots', 'materials'].reduce(function (sum, k) { return sum + save[k].value; }, 0);
    var totalValue = goodsValue + rawFish.reduce(function (s, f) { return s + f.value; }, 0)
      + dressedFish.reduce(function (s, f) { return s + f.value; }, 0) + mealValue + resourceValue;

    if (totalValue <= 0 && save.cooler.length === 0) return null;

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
      h('button', {
        type: 'button', disabled: busy || totalValue <= 0 || !save.townOpen, onClick: function () { onSell('all'); },
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

  // --- Stations: installed list, the next pending station (vague hint, or
  // Install once unlocked - never exact progress numbers, per 08-stations-
  // upgrades.md), and a Process button for each installed station with
  // stock on hand to convert. ---
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
      next ? h('div', { className: 'shoal-station-row' },
        h('span', null, next.name),
        next.unlocked
          ? h('button', { type: 'button', disabled: busy, onClick: onInstall, className: 'shoal-action-btn' }, 'Install (', formatCoins(next.cost), 'c)')
          : h('span', { className: 'shoal-station-hint' }, next.hint)
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
        tier < PEDESTAL_EXPANSION_COSTS.length && h('button', {
          type: 'button', disabled: busy || save.coins < expansionCost, onClick: onExpand, className: 'shoal-action-btn'
        }, 'Add 2 Pedestals (', formatCoins(expansionCost), 'c)'),
        emp.pedestalCount >= 16 && !emp.backRoomBuilt && h('button', {
          type: 'button', disabled: busy || save.coins < BACK_ROOM_COST, onClick: onBuildBackRoom, className: 'shoal-action-btn'
        }, 'Build the Back Room (', formatCoins(BACK_ROOM_COST), 'c)')
      ),
      h('div', { className: 'shoal-controls-row' },
        RARITY_ORDER.slice(0, 3).map(function (rarity) {
          var count = spareIds.filter(function (id) { var d = decorationById(id); return d && d.rarity === rarity; })
            .reduce(function (s, id) { return s + emp.decorationsOwned[id]; }, 0);
          return h('button', {
            key: rarity, type: 'button', disabled: busy || count < 3, onClick: function () { onTradeUp(rarity); }, className: 'shoal-action-btn'
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

  function ArcadePanel(props) {
    var save = props.save;
    var busy = props.busy;
    var onTideTimer = props.onTideTimer;
    var onCrabGrab = props.onCrabGrab;
    var onShellGame = props.onShellGame;
    var affordable = save.coins >= 25;

    return h('div', { className: 'shoal-card' },
      h('div', { className: 'shoal-card-title' }, 'Arcade (25 coins a game)'),
      h('div', { className: 'shoal-controls-row' },
        h('button', { type: 'button', disabled: busy || !affordable, onClick: onTideTimer, className: 'shoal-action-btn' }, 'Tide Timer'),
        h('button', { type: 'button', disabled: busy || !affordable, onClick: onCrabGrab, className: 'shoal-action-btn' }, 'Crab Grab')
      ),
      h('p', { className: 'shoal-hint' }, 'Shell Game: guess which shell hides the pearl.'),
      h('div', { className: 'shoal-controls-row' },
        [0, 1, 2].map(function (i) {
          return h('button', {
            key: i, type: 'button', disabled: busy || !affordable, onClick: function () { onShellGame(i); }, className: 'shoal-action-btn'
          }, 'Shell ', i + 1);
        })
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

    if (!save.emporiumOpen) {
      return h(EmporiumGate, { save: save, busy: busy, onOpen: handlers.onOpenEmporium });
    }

    return h('div', { className: 'shoal-emporium' },
      h('div', { className: 'shoal-card' },
        h('div', { className: 'shoal-card-title' }, 'The Emporium'),
        h('button', { type: 'button', disabled: busy, onClick: handlers.onCollectAwayEarnings, className: 'shoal-action-btn' }, 'Collect Away Earnings')
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

  // --- Cosmetics / the Shipwright (12-cosmetics.md). Premium (Seal Token)
  // looks, the Season Champion flag, and event sets are NOT shown as
  // purchasable here - see server.js's matching comment: Seal Tokens are a
  // real-money-adjacent decision for the site owner, never built by
  // default, and Season/events need a leaderboard this build doesn't have
  // yet (Social, task 24). A short note says so rather than silently
  // omitting the category. The radio has no real audio yet either - that
  // needs original/licensed tracks, a content decision, not code. ---

  function shoalLookUnlockHint(item) {
    if (item.unlocksAtRetirement > 0) return 'Unlocks at retirement ' + item.unlocksAtRetirement;
    if (item.id === 'season-champion') return "This month's top 3 coin earners";
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
        c.equippedPet && h('button', {
          type: 'button', disabled: busy || pattedToday, onClick: onPatPet, className: 'shoal-action-btn'
        }, pattedToday ? 'Already patted today' : 'Pat your pet (+5% value, 10 min)'),
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
        h('div', { className: 'shoal-shipwright-subtitle' }, 'Premium Looks (Seal Tokens)'),
        h('p', { className: 'shoal-hint' },
          'Not available here. Seal Tokens are a real-money-adjacent currency from the original game - whether/how to sell them on Roleplay Hub is a decision for the site owner, not something built by default. The Season Champion flag and event looks also aren’t available yet (they need a leaderboard/seasons system).')
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
    var busy = props.busy;
    var unlockScale = ENGINE.retireGoalForRun(save.retirements + 1).unlockScale;

    var LEVEL_FIELD = { 'bigger-basket': 'basketLevel', 'faster-winch': 'winchLevel', 'soft-brush': 'brushLevel', 'lucky-charm': 'charmLevel' };

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
          return h('div', { key: u.id, className: 'shoal-upgrade-row' },
            h('div', { className: 'shoal-upgrade-info' },
              h('div', { className: 'shoal-upgrade-name' }, u.name, ' ', h('span', { className: 'shoal-upgrade-level' }, 'Lv.', level, '/', u.levels)),
              h('div', { className: 'shoal-upgrade-effect' }, u.effectPerLevel)
            ),
            h('button', {
              type: 'button',
              disabled: busy || maxed || !affordable,
              onClick: function () { onBuy(u.id); },
              className: 'shoal-upgrade-btn'
            }, maxed ? 'MAX' : (formatCoins(cost) + 'c'))
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

  var SOCIAL_TABS = [
    { id: 'party', label: 'Party', icon: 'Users' },
    { id: 'guild', label: 'Guild', icon: 'Flag' },
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
      tab === 'guild' && h(GuildTab, { key: 'guild-' + handle, save: save, handle: handle, onRefreshSave: onRefreshSave }),
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
      h('div', { className: 'shoal-member-list' },
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
      h('div', { className: 'shoal-invite-form' },
        h('input', { type: 'text', placeholder: '@handle to invite', value: inviteHandle, onChange: function (e) { setInviteHandle(e.target.value); } }),
        h('button', { type: 'button', disabled: busy || !inviteHandle, onClick: function () { run(apiPost('/api/shoal-tales/guild/invite', { handle: handle, toHandle: inviteHandle })); setInviteHandle(''); } }, 'Invite')
      ),
      h('div', { className: 'shoal-subtitle' }, "Today's Quests"),
      h('div', { className: 'shoal-quest-list' },
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
      h('div', { className: 'shoal-subtitle' }, 'Guild Bank: ', formatCoins(guild.bank.coins), ' coins'),
      h('div', { className: 'shoal-bank-row' },
        [100, 1000, 5000].map(function (amt) {
          return h('button', { key: amt, type: 'button', disabled: busy || save.coins < amt, onClick: function () { run(apiPost('/api/shoal-tales/guild/bank/deposit', { handle: handle, amount: amt })); } }, 'Deposit ', formatCoins(amt));
        })
      ),
      canManageBank && h('div', { className: 'shoal-upgrade-list' },
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
      h('div', { className: 'shoal-chat-box' },
        h('div', { className: 'shoal-chat-log' },
          guild.chat.map(function (m, i) { return h('div', { key: i, className: 'shoal-chat-line' }, h('b', null, m.handle, ': '), m.text); })
        ),
        h('div', { className: 'shoal-chat-input-row' },
          h('input', { type: 'text', placeholder: 'Say something...', value: chatText, maxLength: 500, onChange: function (e) { setChatText(e.target.value); } }),
          h('button', { type: 'button', disabled: busy || !chatText, onClick: function () { run(apiPost('/api/shoal-tales/guild/chat', { handle: handle, text: chatText })); setChatText(''); } }, 'Send')
        )
      ),
      h('div', { className: 'shoal-action-row' },
        h('button', { type: 'button', disabled: busy, className: 'shoal-action-btn shoal-action-btn-danger', onClick: function () { run(apiPost('/api/shoal-tales/guild/leave', { handle: handle })); } }, 'Leave Guild'),
        isOwner && h('button', { type: 'button', disabled: busy, className: 'shoal-action-btn shoal-action-btn-danger', onClick: function () { run(apiPost('/api/shoal-tales/guild/disband', { handle: handle })); } }, 'Disband Guild')
      ),
      msg && h('div', { className: 'shoal-sort-feedback' }, msg)
    );
  }

  function VisitTab(props) {
    var save = props.save;
    var handle = props.handle;

    var _target = useState(''); var target = _target[0]; var setTarget = _target[1];
    var _boat = useState(null); var boat = _boat[0]; var setBoat = _boat[1];
    var _busy = useState(false); var busy = _busy[0]; var setBusy = _busy[1];
    var _msg = useState(null); var msg = _msg[0]; var setMsg = _msg[1];
    var _tipAmount = useState(10); var tipAmount = _tipAmount[0]; var setTipAmount = _tipAmount[1];
    var _drink = useState({ base: DRINK_PARTS.base[0], flavour: DRINK_PARTS.flavour[0], finish: DRINK_PARTS.finish[0] });
    var drink = _drink[0]; var setDrink = _drink[1];

    function doVisit() {
      if (!target) return;
      setBusy(true); setMsg(null);
      apiGet('/api/shoal-tales/visit?handle=' + encodeURIComponent(handle) + '&ownerHandle=' + encodeURIComponent(target))
        .then(function (data) { setBoat(data.boat); }).catch(function (e) { setMsg(e.message); setBoat(null); }).finally(function () { setBusy(false); });
    }

    function doTip() {
      setBusy(true); setMsg(null);
      apiPost('/api/shoal-tales/visit/tip', { handle: handle, ownerHandle: target, amount: tipAmount })
        .then(function () { setMsg('Tipped ' + formatCoins(tipAmount) + ' coins!'); return doVisit(); })
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
        boat.canTip && h('div', { className: 'shoal-bank-row' },
          [10, 25, 50, 100].map(function (amt) {
            return h('button', { key: amt, type: 'button', disabled: busy || save.coins < amt, onClick: function () { setTipAmount(amt); doTip(); } }, 'Tip ', amt);
          })
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

  function ShoalTalesScreen(props) {
    var handle = props.userProfile && props.userProfile.handle;
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
      runAction(apiPost('/api/shoal-tales/scrub', { handle: handle, trayItemId: trayItemId })).then(function (data) {
        if (!data) return;
        if (data.kind === 'magicCurio') {
          setLastResult({ ok: true, message: '✨ Found ' + data.magicCurio.name + '! ' + data.magicCurio.description });
        } else {
          setLastResult({ ok: true, message: 'Scrubbed clean: ' + data.item.name + ' (' + data.item.rarity + (data.item.golden ? ', golden!' : '') + ')' });
        }
      });
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
      onTideTimer: function () {
        runAction(apiPost('/api/shoal-tales/emporium/arcade/tide-timer', { handle: handle })).then(function (data) {
          if (!data) return;
          setLastResult({ ok: true, message: '+' + data.tickets + ' tickets' });
        });
      },
      onCrabGrab: function () {
        runAction(apiPost('/api/shoal-tales/emporium/arcade/crab-grab', { handle: handle })).then(function (data) {
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
        setLastResult({ ok: true, message: 'Your pet is happy! +5% value for 10 minutes.' });
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

    return h('div', { className: 'shoal-tales-screen' },
      h('div', { className: 'shoal-header' },
        h('div', { className: 'shoal-header-title' }, h(Icons.Anchor, { className: 'shoal-header-icon' }), 'Shoal Tales', save.title ? (' — ' + save.title) : ''),
        h('div', { className: 'shoal-header-coins' }, h(Icons.Coins, { className: 'shoal-coin-icon' }), formatCoins(save.coins)),
        save.streak > 0 && h('div', { className: 'shoal-header-streak' }, h(Icons.Zap, { className: 'shoal-streak-icon' }), 'x', save.streak)
      ),
      error && h('div', { className: 'shoal-error-banner' }, error),
      h('div', { className: 'shoal-body' },
        h(DredgeControls, { save: save, onDredge: handleDredge, onAreaChange: handleAreaChange, onDepthChange: handleDepthChange, busy: busy, dredging: dredging, dredgeCountdown: countdown }),
        h(TrayPanel, {
          save: save, selectedId: selectedId, onSelect: setSelectedId, onSort: handleSort, busy: busy, lastResult: lastResult,
          onScrub: handleScrub, onPry: handlePry, onUncork: handleUncork, onRelease: handleRelease,
          onCurioAction: handleCurioAction, curioChoosingBin: curioChoosingBin, onStartCurioSort: handleStartCurioSort,
          onStartPuzzle: handleStartPuzzle, onKeepBottle: handleKeepBottle
        }),
        h(GoodsAndCoolerPanel, { save: save, onSell: handleSell, onDress: handleDress, onMakeMeal: handleMakeMeal, busy: busy }),
        h(TownPanel, { save: save, busy: busy, onFulfillRequest: handleFulfillRequest, onFulfillDaily: handleFulfillDaily }),
        h(StationsPanel, { save: save, busy: busy, onInstall: handleInstallStation, onProcessJunk: handleProcessJunk }),
        save.townOpen && h(EmporiumPanel, { save: save, busy: busy, handlers: emporiumHandlers }),
        save.townOpen && h(RetirePanel, { save: save, busy: busy, onRetire: handleRetire }),
        h(ShipwrightPanel, {
          save: save, busy: busy, onEquipWood: handleEquipWood, onBuyWood: handleBuyWood,
          onEquipSail: handleEquipSail, onEquipFlag: handleEquipFlag, onEquipPet: handleEquipPet,
          onEquipBadge: handleEquipBadge, onPatPet: handlePatPet, onSelectTrack: handleSelectTrack
        }),
        h(CollectorsLogSummary, { save: save }),
        h(UpgradesPanel, { save: save, onBuy: handleUpgrade, busy: busy }),
        h(SocialPanel, {
          save: save, handle: handle, onRefreshSave: refresh,
          lastFoundLetter: lastFoundLetter, onHeartLetter: handleHeartLetter, onReportLetter: handleReportLetter, onReplyLetter: handleReplyLetter
        })
      )
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
    SocialPanel: SocialPanel,
    PartyTab: PartyTab,
    GuildTab: GuildTab,
    VisitTab: VisitTab,
    LeaderboardTab: LeaderboardTab,
    LettersTab: LettersTab,
    formatCoins: formatCoins
  };
})(typeof window !== 'undefined' ? window : this);
