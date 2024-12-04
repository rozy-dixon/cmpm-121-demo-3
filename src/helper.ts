import leaflet from "leaflet";

import { Cell } from "./board.ts";

import { Cache, Coin } from "./main.ts";
import { spawnCache } from "./main.ts";

export const APP_NAME = "orange couscous";

// anchors
export const OAKES_CLASSROOM = leaflet.latLng(
  36.98949379578401,
  -122.06277128548504,
);

// map initial variables
export const START_ZOOM = 18;
export const MAX_ZOOM = 18;
export const MIN_ZOOM = 10;

// board initial variables
export const TILE_DEGREES = 1e-4;
export const NEIGHBORHOOD_SIZE = 13;
export const CACHE_SPAWN_PROBABILITY = 0.1;

// create map to access lat/lng values in which to anchor player and caches
export const MAP = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: START_ZOOM,
  maxZoom: MAX_ZOOM,
  minZoom: MIN_ZOOM,
  zoomControl: true,
  scrollWheelZoom: true,
  keyboard: false,
  watch: true,
});

// create invisible tile layer
leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: START_ZOOM,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(MAP);

function _getTop(coins: Array<Coin>) {
  return coins[coins.length - 1];
}

function _getBottom(coins: Array<Coin>) {
  return coins[0];
}

export function _getCache(cell: Cell, cacheArray: Array<Cache>) {
  return cacheArray.find((existingCache) =>
    existingCache.cell.i === cell.i && existingCache.cell.j === cell.j
  );
}

// get position of (actual) player
export function _getPosition() {
  // src = https://chat.brace.tools/s/05a34133-2b96-41e8-b9c2-21f0301335d0
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(
          leaflet.latLng(position.coords.latitude, position.coords.longitude),
        );
      },
    );
  });
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
