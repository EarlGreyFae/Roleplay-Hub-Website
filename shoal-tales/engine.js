// Shoal Tales game-logic engine: pure functions, no React/DOM/Node-only APIs.
// Loaded as a plain <script> in the browser (assigns window.ShoalTalesEngine) and
// required() directly in server.js (assigns module.exports) - the SAME file runs
// in both places, so the server's authoritative calculations can never drift from
// what the client previews. See docs/shoal-tales-spec/ARCHITECTURE.md ("Why
// server-authoritative RNG") for why every paying roll must run server-side.
(function (root) {
  'use strict';

  var BINS = ['Plastic', 'Metal', 'Glass', 'Wood', 'Electronics', 'Hazardous', 'Mixed'];

  var RETIRE_GOALS = [
    { run: 1, retirementsBefore: 0, coinsToRetire: 1000, unlockScale: 1 },
    { run: 2, retirementsBefore: 1, coinsToRetire: 14000, unlockScale: 2.75 },
    { run: 3, retirementsBefore: 2, coinsToRetire: 27000, unlockScale: 5 },
    { run: 4, retirementsBefore: 3, coinsToRetire: 32500, unlockScale: 9 },
    { run: 5, retirementsBefore: 4, coinsToRetire: 46000, unlockScale: 14 },
    { run: 6, retirementsBefore: 5, coinsToRetire: 45000, unlockScale: 20 },
    { run: 7, retirementsBefore: 6, coinsToRetire: 88000, unlockScale: 24 },
    { run: 8, retirementsBefore: 7, coinsToRetire: 103000, unlockScale: 29 },
    { run: 9, retirementsBefore: 8, coinsToRetire: 165000, unlockScale: 38 },
    { run: 10, retirementsBefore: 9, coinsToRetire: 200000, unlockScale: 44 }
  ];

  // Station sorting rules - installing a station moves these specific junk items
  // to a new bin, and sorting them the new way pays the 1.5x "rule" bonus (see
  // sortValue below). Keyed by junk item name for O(1) lookup.
  var STATION_BIN_MOVES = {
    'Skateboard': { station: 'carpentry', newBin: 'Wood' },
    'Picture Frame': { station: 'carpentry', newBin: 'Wood' },
    'Broken Umbrella': { station: 'crucible', newBin: 'Metal' },
    'Folding Beach Chair': { station: 'crucible', newBin: 'Metal' },
    'TV Remote': { station: 'recycling', newBin: 'Mixed' },
    'Solar Garden Light': { station: 'recycling', newBin: 'Mixed' }
  };

  // --- Dredging (03-dredging.md) ---

  // t = 6s * (1 + 0.35d) * 0.88^w * (1 - b_time), b_time capped at 50% total.
  function dredgeTimeSeconds(depth, winchLevel, bTime) {
    var cappedBTime = Math.min(bTime || 0, 0.5);
    return 6 * (1 + 0.35 * depth) * Math.pow(0.88, winchLevel) * (1 - cappedBTime);
  }

  function junkCatchWeight(depth) {
    // -15% per depth, never below 20% of 60 (i.e. floor of 12).
    var w = 60 * Math.pow(0.85, depth);
    return Math.max(w, 60 * 0.2);
  }

  function catchTypeWeights(depth, luck, glassTideActive) {
    var curioWeight = 7 * (1 + (luck || 0)) * (1 + 0.4 * depth) * (glassTideActive ? 2 : 1);
    var crateWeight = 5 * (1 + (luck || 0)) * (1 + 0.4 * depth);
    var bottleWeight = 4 * (1 + (luck || 0)) * (1 + 0.4 * depth);
    return {
      junk: junkCatchWeight(depth),
      fish: 22,
      curio: curioWeight,
      crate: crateWeight,
      bottle: bottleWeight,
      seaCreature: 2
    };
  }

  // Basket size (items per haul), before the daily-first-haul/Spring-Tide bonuses.
  function basketSize(basketLevel, bonusBasketSlots) {
    // Bigger Basket upgrade: starts at 3, +1 item per level, 29 levels -> 32 max,
    // plus any flat bonus slots (magic curios, above the 32 cap).
    var base = Math.min(3 + basketLevel, 32);
    return base + (bonusBasketSlots || 0);
  }

  function hauledItemCount(basketLevel, bonusBasketSlots, opts) {
    opts = opts || {};
    var n = basketSize(basketLevel, bonusBasketSlots);
    if (opts.isFirstHaulOfDay) n = Math.ceil(n * 1.5);
    if (opts.springTideActive) n = Math.ceil(n * 1.25);
    var cap = opts.extraItemBonusHit ? 36 : 35;
    return Math.min(n, cap);
  }

  // --- Sorting (04-sorting.md) ---

  // streak = 1 + min(1 + b_streakCap, (0.05 + b_streakStep) * streakCount)
  function streakMultiplier(streakCount, bStreakCap, bStreakStep) {
    var perSort = 0.05 + (bStreakStep || 0);
    var cap = 1 + (bStreakCap || 0);
    return 1 + Math.min(cap, perSort * streakCount);
  }

  // value = base * streak * (1 + b_payout) * (1 + b_bin) * rule * area
  function correctSortValue(opts) {
    var streak = streakMultiplier(opts.streakCount, opts.bStreakCap, opts.bStreakStep);
    var rule = opts.movedByStation ? 1.5 : 1;
    return opts.base * streak * (1 + (opts.bPayout || 0)) * (1 + (opts.bBin || 0)) * rule * opts.area;
  }

  // Wrong bin: base * (0.4 + b_forgive) * area, streak resets to 0 by the caller.
  function wrongSortValue(base, bForgive, area) {
    return base * (0.4 + (bForgive || 0)) * area;
  }

  // Fish kept on ice: base * streak * (1 + b_payout) * (1 + b_fish) * area * (3 if golden)
  function fishValue(opts) {
    var streak = streakMultiplier(opts.streakCount, opts.bStreakCap, opts.bStreakStep);
    var v = opts.base * streak * (1 + (opts.bPayout || 0)) * (1 + (opts.bFish || 0)) * opts.area;
    return opts.golden ? v * 3 : v;
  }

  // Does installing `station` move `junkName` to a different bin, and is it
  // currently being sorted that new way (so the 1.5x "rule" bonus applies)?
  function stationMoveFor(junkName) {
    return STATION_BIN_MOVES[junkName] || null;
  }

  // --- Curios (06-curios.md) ---

  var CURIO_RARITY_BASE_WEIGHTS = { Common: 60, Uncommon: 28, Rare: 10, Epic: 2 };
  var CURIO_RARITY_VALUE_MULT = { Common: 1, Uncommon: 2, Rare: 4, Epic: 10 };

  // Rarity roll weights, shifted by `s` (0..1, from rarity-boosting bonuses).
  function curioRarityWeights(s) {
    s = s || 0;
    return {
      Common: CURIO_RARITY_BASE_WEIGHTS.Common * (1 - s),
      Uncommon: CURIO_RARITY_BASE_WEIGHTS.Uncommon,
      Rare: CURIO_RARITY_BASE_WEIGHTS.Rare * (1 + 2 * s),
      Epic: CURIO_RARITY_BASE_WEIGHTS.Epic * (1 + 3 * s)
    };
  }

  function weightedPick(weights, rng) {
    rng = rng || Math.random;
    var total = 0;
    var keys = Object.keys(weights);
    keys.forEach(function (k) { total += weights[k]; });
    var roll = rng() * total;
    var acc = 0;
    for (var i = 0; i < keys.length; i++) {
      acc += weights[keys[i]];
      if (roll < acc) return keys[i];
    }
    return keys[keys.length - 1];
  }

  function curioValue(baseCoins, rarity, bCurio) {
    return baseCoins * CURIO_RARITY_VALUE_MULT[rarity] * (1 + (bCurio || 0));
  }

  // Curio sorted as junk: right bin -> 2 sorted units worth value * streak;
  // wrong bin -> 40% of that, streak resets (same shape as wrongSortValue).
  function curioSortValue(curioFullValue, streakMult, correctBin) {
    return correctBin ? curioFullValue * 2 * streakMult : curioFullValue * 2 * 0.4;
  }

  // --- The Emporium (10-emporium.md) & shared Emporium-earnings formula (09-economy.md) ---

  // pay = base * area * (1 + b_payout) - used by drinks, puzzles, away earnings, daily rewards.
  function emporiumPay(base, area, bPayout) {
    return base * area * (1 + (bPayout || 0));
  }

  // The Counter: right drink = 40 * tip * area * (1 + payout); wrong = flat 5.
  // A wanted meal on top adds 2x the meal's value.
  function counterDrinkPay(opts) {
    if (!opts.correctDrink) return 5;
    return emporiumPay(40 * opts.customerTip, opts.area, opts.bPayout);
  }

  function counterMealBonus(mealValue) {
    return 2 * mealValue;
  }

  // Puzzle Bench payouts by rarity, x area x payout.
  var PUZZLE_BASE_PAY = { Common: 100, Uncommon: 250, Rare: 600, Epic: 1500 };
  function puzzleSolvePay(rarity, area, bPayout) {
    return emporiumPay(PUZZLE_BASE_PAY[rarity], area, bPayout);
  }

  // Away earnings: 100 coins/hour * area * (1 + payout), up to 8 hours.
  function awayEarnings(hoursAway, area, bPayout) {
    var hours = Math.min(hoursAway, 8);
    return emporiumPay(100 * hours, area, bPayout);
  }

  // Work Order fill: 2x the goods' value; goods required scale with retirements.
  function workOrderGoodsRequired(kind, retirements) {
    var base = kind === 'sortedGoods' ? [40, 80] : [10, 25];
    var scale = 1 + 0.25 * retirements;
    return [Math.round(base[0] * scale), Math.round(base[1] * scale)];
  }
  function workOrderSwapCost(retirements) {
    return 50 * (retirements + 1);
  }

  // --- Economy (09-economy.md) ---

  function retireGoalForRun(runNumber) {
    if (runNumber <= 10) {
      var row = RETIRE_GOALS[runNumber - 1];
      return row ? { coinsToRetire: row.coinsToRetire, unlockScale: row.unlockScale } : null;
    }
    var last = RETIRE_GOALS[RETIRE_GOALS.length - 1];
    var extraRuns = runNumber - 10;
    var coins = last.coinsToRetire;
    var scale = last.unlockScale;
    for (var i = 0; i < extraRuns; i++) {
      coins = Math.round((coins * 1.1) / 1000) * 1000;
      scale = scale * 1.06;
    }
    return { coinsToRetire: coins, unlockScale: scale };
  }

  // --- Stations & upgrades (08-stations-upgrades.md) ---

  function upgradeCost(upgradeId, levelsOwned, unlockScale) {
    var L = levelsOwned;
    var scale = unlockScale || 1;
    switch (upgradeId) {
      case 'bigger-basket':
        return Math.round(20 + 1.2 * L * L) * scale;
      case 'faster-winch':
        return Math.round(15 * Math.pow(1.6, L));
      case 'soft-brush':
        return Math.round(60 * Math.pow(3, L));
      case 'lucky-charm':
        return Math.round(100 * Math.pow(1.6, L));
      default:
        throw new Error('Unknown upgrade id: ' + upgradeId);
    }
  }

  function stationCost(baseCost, unlockScale) {
    return Math.round(baseCost * (unlockScale || 1));
  }

  // Fish processing chain (05-fish.md): raw -> dressed (x1.6) -> meal (x1.5 of
  // dressed), each optionally boosted by a Priya add-in. (Sushi/Sushi Rice
  // was dropped - each station keeps exactly one upgrade material, and
  // Limes is the Cutting Board's.)
  // `value` is the fish's value going INTO this step (raw cooler value for
  // 'dressed', the already-dressed value - Limes bonus included - for
  // 'meal'), so each step's own add-in multiplies on top of the last step's
  // result rather than recomputing from scratch.
  function processedFishValue(value, step, addInMultiplier) {
    var mult = addInMultiplier || 1;
    if (step === 'raw') return value;
    if (step === 'dressed') return value * 1.6 * mult;
    if (step === 'meal') return value * 1.5 * mult;
    throw new Error('Unknown processing step: ' + step);
  }

  // Stored junk processed at its station: 1 + weight units, worth base * stationFactor * area * addIns.
  function processedJunkValue(baseCoins, stationFactor, area, addInMultiplier) {
    return baseCoins * stationFactor * area * (addInMultiplier || 1);
  }

  var ShoalTalesEngine = {
    BINS: BINS,
    RETIRE_GOALS: RETIRE_GOALS,
    STATION_BIN_MOVES: STATION_BIN_MOVES,
    dredgeTimeSeconds: dredgeTimeSeconds,
    junkCatchWeight: junkCatchWeight,
    catchTypeWeights: catchTypeWeights,
    basketSize: basketSize,
    hauledItemCount: hauledItemCount,
    streakMultiplier: streakMultiplier,
    correctSortValue: correctSortValue,
    wrongSortValue: wrongSortValue,
    fishValue: fishValue,
    stationMoveFor: stationMoveFor,
    CURIO_RARITY_BASE_WEIGHTS: CURIO_RARITY_BASE_WEIGHTS,
    CURIO_RARITY_VALUE_MULT: CURIO_RARITY_VALUE_MULT,
    curioRarityWeights: curioRarityWeights,
    weightedPick: weightedPick,
    curioValue: curioValue,
    curioSortValue: curioSortValue,
    emporiumPay: emporiumPay,
    counterDrinkPay: counterDrinkPay,
    counterMealBonus: counterMealBonus,
    puzzleSolvePay: puzzleSolvePay,
    awayEarnings: awayEarnings,
    workOrderGoodsRequired: workOrderGoodsRequired,
    workOrderSwapCost: workOrderSwapCost,
    retireGoalForRun: retireGoalForRun,
    upgradeCost: upgradeCost,
    stationCost: stationCost,
    processedFishValue: processedFishValue,
    processedJunkValue: processedJunkValue
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShoalTalesEngine;
  } else {
    root.ShoalTalesEngine = ShoalTalesEngine;
  }
})(typeof window !== 'undefined' ? window : this);
