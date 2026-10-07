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
    }
  };

  var TRAY_ICONS = {
    junk: 'Anchor', fish: 'Fish', curio: 'Gem', crate: 'Box', bottle: 'Bottle', seaCreature: 'Creature', magicCurio: 'Sparkle', puzzleBox: 'Box'
  };
  var RARITY_LABELS = { Common: 'Common', Uncommon: 'Uncommon', Rare: 'Rare', Epic: 'Epic' };

  var BIN_LABELS = { Plastic: 'Plastic', Metal: 'Metal', Glass: 'Glass', Wood: 'Wood', Electronics: 'Electronics', Hazardous: 'Hazardous', Mixed: 'Mixed' };

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
    if (requires.type === 'knickKnacks') return save.knickKnacks || 0;
    if (requires.type === 'ingots') return save.ingots || 0;
    if (requires.type === 'materials') return save.materials || 0;
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
            item.kind === 'curio' && item.identified && h('span', { className: 'shoal-tray-rarity shoal-rarity-' + item.rarity.toLowerCase() }, item.rarity, item.golden ? ' ✨' : '')
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

  function GoodsAndCoolerPanel(props) {
    var save = props.save;
    var onSell = props.onSell;
    var onDress = props.onDress;
    var busy = props.busy;

    var goodsValue = ENGINE.BINS.reduce(function (sum, b) { return sum + save.sortedGoods[b].value; }, 0);
    var rawFish = save.cooler.filter(function (f) { return f.stage === 'raw'; });
    var dressedFish = save.cooler.filter(function (f) { return f.stage === 'dressed'; });
    var rawValue = rawFish.reduce(function (sum, f) { return sum + f.value; }, 0);
    var dressedValue = dressedFish.reduce(function (sum, f) { return sum + f.value; }, 0);
    var totalValue = goodsValue + rawValue + dressedValue;

    if (totalValue <= 0 && save.cooler.length === 0) return null;

    return h('div', { className: 'shoal-card' },
      h('div', { className: 'shoal-card-title' }, 'Held Goods'),
      h('div', { className: 'shoal-goods-grid' },
        ENGINE.BINS.filter(function (b) { return save.sortedGoods[b].units > 0; }).map(function (b) {
          return h('div', { key: b, className: 'shoal-goods-row' },
            h('span', null, 'Sorted ', b), h('span', null, save.sortedGoods[b].units, ' units — ', formatCoins(save.sortedGoods[b].value), 'c')
          );
        }),
        dressedFish.length > 0 && h('div', { className: 'shoal-goods-row' },
          h('span', null, 'Dressed fish'), h('span', null, dressedFish.length, ' — ', formatCoins(dressedValue), 'c')
        )
      ),
      // Dressing is a deliberate one-click-per-fish step at the Cutting Board
      // (05-fish.md), not a bulk action - each raw fish gets its own row.
      rawFish.length > 0 && h('div', { className: 'shoal-cooler-list' },
        rawFish.map(function (f) {
          return h('div', { key: f.id, className: 'shoal-cooler-row' },
            h('span', { className: 'shoal-cooler-name' }, f.name, f.golden ? ' ✨' : '', ' (', formatCoins(f.value), 'c)'),
            h('button', { type: 'button', disabled: busy, onClick: function () { onDress(f.id); }, className: 'shoal-dress-btn' }, 'Dress')
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
        DATA.upgrades.map(function (u) {
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
        var message = data.outcome === 'letter' ? ('Found a letter: "' + data.letter.title + '"') : 'Just an empty bottle.';
        setLastResult({ ok: true, message: message });
      });
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

    if (loading) {
      return h('div', { className: 'shoal-tales-screen shoal-loading' }, 'Loading Shoal Tales...');
    }
    if (error && !save) {
      return h('div', { className: 'shoal-tales-screen shoal-loading' }, 'Could not load: ', error);
    }
    if (!save) return null;

    return h('div', { className: 'shoal-tales-screen' },
      h('div', { className: 'shoal-header' },
        h('div', { className: 'shoal-header-title' }, h(Icons.Anchor, { className: 'shoal-header-icon' }), 'Shoal Tales'),
        h('div', { className: 'shoal-header-coins' }, h(Icons.Coins, { className: 'shoal-coin-icon' }), formatCoins(save.coins)),
        save.streak > 0 && h('div', { className: 'shoal-header-streak' }, h(Icons.Zap, { className: 'shoal-streak-icon' }), 'x', save.streak)
      ),
      error && h('div', { className: 'shoal-error-banner' }, error),
      h('div', { className: 'shoal-body' },
        h(DredgeControls, { save: save, onDredge: handleDredge, onAreaChange: handleAreaChange, onDepthChange: handleDepthChange, busy: busy, dredging: dredging, dredgeCountdown: countdown }),
        h(TrayPanel, {
          save: save, selectedId: selectedId, onSelect: setSelectedId, onSort: handleSort, busy: busy, lastResult: lastResult,
          onScrub: handleScrub, onPry: handlePry, onUncork: handleUncork, onRelease: handleRelease,
          onCurioAction: handleCurioAction, curioChoosingBin: curioChoosingBin, onStartCurioSort: handleStartCurioSort
        }),
        h(GoodsAndCoolerPanel, { save: save, onSell: handleSell, onDress: handleDress, busy: busy }),
        h(TownPanel, { save: save, busy: busy, onFulfillRequest: handleFulfillRequest, onFulfillDaily: handleFulfillDaily }),
        h(CollectorsLogSummary, { save: save }),
        h(UpgradesPanel, { save: save, onBuy: handleUpgrade, busy: busy })
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
    DredgeControls: DredgeControls,
    UpgradesPanel: UpgradesPanel,
    CollectorsLogSummary: CollectorsLogSummary,
    formatCoins: formatCoins
  };
})(typeof window !== 'undefined' ? window : this);
