//#region -------------------------------------- IMPORTS

// UTILS

import luck from "../luck.ts";

// CORE FUNCTIONALITY

import { Cell } from "../core/board.ts";

import { cacheArray } from "../main.ts";
import { spawnCache } from "../main.ts";

import { Cache, Coin, MAP } from "../core/map.ts";

//#endregion

//#region -------------------------------------- COIN ACCESSS

function _getTop(coins: Array<Coin>) {
  return coins[coins.length - 1];
}

function _getBottom(coins: Array<Coin>) {
  return coins[0];
}

//#endregion

//#region --------------------------------------- STATE MANAGEMENT

export function _getCache(cell: Cell, cacheArray: Array<Cache>) {
  return cacheArray.find((existingCache) =>
    existingCache.cell.i === cell.i && existingCache.cell.j === cell.j
  );
}

export function _populateCacheArray(
  array: Array<Cache>,
  mementoArray: Array<string>,
) {
  array = [];

  mementoArray.forEach((memento) => {
    const state = JSON.parse(memento);
    const newCache = spawnCache(state.cell, state.coins);
    array.push(newCache);
  });

  return array;
}

export function _populateMementoArray(
  array: Array<string>,
  cacheArray: Array<Cache>,
) {
  array = [];

  cacheArray.forEach((cache) => {
    array.push(cache.toMemento());
  });

  return array;
}

//#endregion

//#region --------------------------------------- MAP AND PLAYER HELPERS

export function _ensureCacheIsVisible(cache: Cache): void {
  if (!MAP.hasLayer(cache.rect)) {
    MAP.addLayer(cache.rect); // Re-add it to the map if it's missing.
  }
}

const CACHE_SPAWN_PROBABILITY = 0.1;
export function _trySpawnNewCache(cell: Cell): void {
  if (luck([cell.i, cell.j].toString()) < CACHE_SPAWN_PROBABILITY) {
    const newCache = spawnCache(cell); // Use the refactored `spawnCache`.
    cacheArray.push(newCache); // Add it to the runtime cache array.
  }
}

//#endregion
