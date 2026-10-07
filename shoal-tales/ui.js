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
    }
  };

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

  // --- The Tray: shows current haul, lets the player select an item then
  // tap a bin/the cooler to sort it ---
  function TrayPanel(props) {
    var save = props.save;
    var selectedId = props.selectedId;
    var onSelect = props.onSelect;
    var onSort = props.onSort;
    var busy = props.busy;
    var lastResult = props.lastResult;

    if (save.tray.length === 0) return null;

    var selectedItem = save.tray.find(function (t) { return t.id === selectedId; });

    return h('div', { className: 'shoal-card' },
      h('div', { className: 'shoal-card-title' }, 'The Tray (', save.tray.length, ' item', save.tray.length === 1 ? '' : 's', ')'),
      h('p', { className: 'shoal-hint' }, 'Tap an item, then tap where it goes.'),
      h('div', { className: 'shoal-tray-grid' },
        save.tray.map(function (item) {
          var isSelected = item.id === selectedId;
          return h('button', {
            key: item.id,
            type: 'button',
            disabled: busy,
            onClick: function () { onSelect(isSelected ? null : item.id); },
            className: 'shoal-tray-item' + (isSelected ? ' shoal-tray-item-selected' : '') + (item.kind === 'fish' ? ' shoal-tray-item-fish' : '')
          },
            h(item.kind === 'fish' ? Icons.Fish : Icons.Anchor, { className: 'shoal-tray-icon' }),
            h('span', { className: 'shoal-tray-name' }, item.name),
            item.kind === 'junk' && h('span', { className: 'shoal-tray-bin-hint' }, '')
          );
        })
      ),
      selectedItem && h('div', { className: 'shoal-bin-row' },
        selectedItem.kind === 'fish'
          ? h('button', {
              type: 'button', disabled: busy, onClick: function () { onSort(selectedItem.id, 'cooler'); },
              className: 'shoal-bin-btn shoal-bin-btn-cooler'
            }, h(Icons.Fish, { className: 'shoal-bin-icon' }), h('span', null, 'Cooler'))
          : ENGINE.BINS.map(function (bin) {
              return h('button', {
                key: bin, type: 'button', disabled: busy, onClick: function () { onSort(selectedItem.id, bin); },
                className: 'shoal-bin-btn'
              }, BIN_LABELS[bin]);
            })
      ),
      lastResult && h('div', { className: 'shoal-sort-feedback ' + (lastResult.correct ? 'shoal-sort-correct' : 'shoal-sort-wrong') },
        lastResult.correct ? '✓ Correct! +' : '✗ Wrong bin. +',
        formatCoins(lastResult.value), ' coins', lastResult.newStreak > 1 ? (' (streak x' + lastResult.newStreak + ')') : ''
      )
    );
  }

  function GoodsAndCoolerPanel(props) {
    var save = props.save;
    var onSell = props.onSell;
    var busy = props.busy;

    var goodsValue = ENGINE.BINS.reduce(function (sum, b) { return sum + save.sortedGoods[b].value; }, 0);
    var fishValue = save.cooler.reduce(function (sum, f) { return sum + f.value; }, 0);
    var totalValue = goodsValue + fishValue;

    if (totalValue <= 0 && save.cooler.length === 0) return null;

    return h('div', { className: 'shoal-card' },
      h('div', { className: 'shoal-card-title' }, 'Held Goods'),
      h('div', { className: 'shoal-goods-grid' },
        ENGINE.BINS.filter(function (b) { return save.sortedGoods[b].units > 0; }).map(function (b) {
          return h('div', { key: b, className: 'shoal-goods-row' },
            h('span', null, 'Sorted ', b), h('span', null, save.sortedGoods[b].units, ' units — ', formatCoins(save.sortedGoods[b].value), 'c')
          );
        }),
        save.cooler.length > 0 && h('div', { className: 'shoal-goods-row' },
          h('span', null, 'Raw fish'), h('span', null, save.cooler.length, ' — ', formatCoins(fishValue), 'c')
        )
      ),
      h('button', {
        type: 'button', disabled: busy || totalValue <= 0, onClick: function () { onSell('all'); },
        className: 'shoal-sell-btn'
      }, 'Sell Everything for ', formatCoins(totalValue), ' coins')
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

    function handleDredge() {
      setBusy(true); setSelectedId(null); setLastResult(null);
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
      setBusy(true);
      apiPost('/api/shoal-tales/sort', { handle: handle, trayItemId: trayItemId, bin: bin }).then(function (data) {
        setLastResult(data);
        setSelectedId(null);
        return refresh();
      }).catch(function (e) { setError(e.message); }).finally(function () { setBusy(false); });
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
        h(TrayPanel, { save: save, selectedId: selectedId, onSelect: setSelectedId, onSort: handleSort, busy: busy, lastResult: lastResult }),
        h(GoodsAndCoolerPanel, { save: save, onSell: handleSell, busy: busy }),
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
    DredgeControls: DredgeControls,
    UpgradesPanel: UpgradesPanel,
    formatCoins: formatCoins
  };
})(typeof window !== 'undefined' ? window : this);
