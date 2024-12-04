//#region -------------------------------------- IMPORTS

// EXTERNAL LIBRARIES

import leaflet from "leaflet";

import { LatLng, Rectangle } from "npm:@types/leaflet@^1.9.14";

// STYLE AND WORKAROUND

import "./style/style.css";
import "./leafletWorkaround.ts";

// UTILITY

import luck from "./luck.ts";
import {
  _ensureCacheIsVisible,
  _getCache,
  _getPosition,
  _populateCacheArray,
  _populateMementoArray,
  _trySpawnNewCache,
} from "./utils/helper.ts";

// CORE FUNCTIONALITY

import { Cell } from "./core/board.ts";
import {
  BOARD,
  MAP,
  PLAYER,
  Player,
  updatePlayerCoinDisplay,
} from "./core/map.ts";

//#endregion

//#region --------------------------------------- INTERFACES

export interface Coin {
  location: Cell | Player;
  id: string;
}

export interface Cache {
  cell: Cell;
  coins: Array<Coin>;
  rect: Rectangle;
  toMemento(): string;
  fromMemento(memento: string): void;
}

//#endregion

//#region --------------------------------------- SET-UP

// UI INITIALIZATION

const APP_NAME = "orange couscous";
document.getElementById("title")!.innerHTML = APP_NAME;
const coinDiv = document.getElementById("coins")! as HTMLDivElement;

export let cacheArray: Array<Cache> = [];
let mementoArray: Array<string> = [];
if (localStorage.getItem("mementoArray") != undefined) {
  mementoArray = JSON.parse(localStorage.getItem("mementoArray")!);
}

// GAME STATE INITIALIZATION

let playerMovementArray: Array<LatLng> = [];
if (localStorage.getItem("playerMovementArray") != undefined) {
  playerMovementArray = JSON.parse(
    localStorage.getItem("playerMovementArray")!,
  );
}

if (localStorage.getItem("playerCoins") != undefined) {
  PLAYER.coins = JSON.parse(localStorage.getItem("playerCoins")!);
}

// MAP INITIALIZATION

MAP.locate();

const polyline = leaflet.polyline(playerMovementArray, {
  color: "blue",
  weight: 5,
  opacity: 0.7,
  lineJoin: "round",
}).addTo(MAP);

// PLAYER MOVEMENT EVENT MANAGEMENT

export const PLAYER_MARKER_MOVED = new Event("player-marker-moved");

document.addEventListener("player-marker-moved", () => {
  cacheArray.forEach((cache) => {
    MAP.removeLayer(cache.rect);
  });

  mementoArray = _populateMementoArray(mementoArray, cacheArray);
  localStorage.setItem("mementoArray", JSON.stringify(mementoArray));

  playerMovementArray.push(PLAYER.coords);
  polyline.setLatLngs(playerMovementArray);
  localStorage.setItem(
    "playerMovementArray",
    JSON.stringify(playerMovementArray),
  );

  MAP.setView(PLAYER.coords);
  spawnSurroundings(PLAYER.coords);
});

//#endregion

//#region --------------------------------------- CONTENT

// UI updates
updatePlayerCoinDisplay(coinDiv, PLAYER.coins);
document.getElementById("OrientPlayer")!.style.backgroundColor = "#ba6376";

// populate cache array from saved data
cacheArray = _populateCacheArray(cacheArray, mementoArray);
// populate board with caches
spawnSurroundings(PLAYER.coords);

// player movement event dispatch
document.dispatchEvent(PLAYER_MARKER_MOVED);

//#endregion

//#region --------------------------------------- SPAWN FUNCTIONS

function createRectangle(cell: Cell): L.Rectangle {
  const rect = leaflet.rectangle(BOARD.getCellBounds(cell), {
    color: "#000000",
    weight: 2,
    fillColor: "#ffffff",
    fillOpacity: 0.5,
  });
  rect.addTo(MAP);
  return rect;
}

function generateCoins(cell: Cell): Array<Coin> {
  const numCoins = Math.floor(
    luck([cell.i, cell.j, "initialValue"].toString()) * 100,
  );
  const coins: Array<Coin> = [];
  for (let i = 0; i < numCoins; i++) {
    const id: string = `${cell.i}:${cell.j}:${i}`;
    coins.push({
      location: cell,
      id: id,
    });
  }
  return coins;
}

function attachMementoMethods(cache: Cache): void {
  cache.toMemento = function (): string {
    return JSON.stringify({
      cell: cache.cell,
      coins: cache.coins,
    });
  };

  cache.fromMemento = function (memento: string): void {
    const state = JSON.parse(memento);
    cache.cell = state.cell;
    cache.coins = state.coins.map((coin: Coin) => ({
      ...coin,
      location: state.cell,
    }));
  };
}

export function spawnCache(
  cell: Cell,
  coins: Array<Coin> | undefined = undefined,
): Cache {
  const rect = createRectangle(cell);
  const cache: Cache = {
    cell: cell,
    coins: coins ? coins : generateCoins(cell),
    rect: rect,
    toMemento: function (): string {
      return ""; // placeholder function
    },
    fromMemento: function (_memento: string): void {
      // placeholder function
    },
  };

  attachMementoMethods(cache);

  allowCacheInteraction(cache);

  return cache;
}

function spawnSurroundings(coords: LatLng): void {
  const nearbyCells = BOARD.getCellsNearPoint(coords);

  nearbyCells.forEach((cell) => {
    const cache = _getCache(cell, cacheArray);
    if (cache) {
      _ensureCacheIsVisible(cache);
    } else {
      _trySpawnNewCache(cell);
    }
  });
}

//#endregion

//#region --------------------------------------- INTERACTION FUNCTIONS

// add collect and deposit capabilities to provided cache
function allowCacheInteraction(cache: Cache) {
  cache.rect.bindPopup(() => {
    // src = https://chat.brace.tools/s/136a1f49-5351-482a-a52f-3c15ebcdda58
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
      <div class="pop-up">(${cache.cell.i},${cache.cell.j}), <span id="value">${cache.coins.length}</span>.</div>
      <button id="collect">collect</button>
      <button id="deposit">deposit</button>`;

    // collect
    popupDiv.querySelector<HTMLButtonElement>("#collect")?.addEventListener(
      "click",
      () => {
        if (cache.coins.length > 0) {
          const coin = cache.coins[cache.coins.length - 1];
          adjustCache(1, cache, coin, popupDiv);
        }
      },
    );

    // deposit
    popupDiv.querySelector<HTMLButtonElement>("#deposit")?.addEventListener(
      "click",
      () => {
        if (PLAYER.coins.length > 0) {
          const coin = PLAYER.coins[PLAYER.coins.length - 1];
          adjustCache(-1, cache, coin, popupDiv);
        }
      },
    );

    return popupDiv;
  });
}

// functions as both collect and deposit functions
function adjustCache(
  amount: number,
  cache: Cache,
  coin: Coin,
  popupDiv: HTMLSpanElement,
) {
  if (amount == 0) {
    return;
  }

  const exitArray = amount < 0 ? PLAYER.coins : cache.coins;
  const enterArray = amount < 0 ? cache.coins : PLAYER.coins;

  enterArray.push(coin);
  exitArray.splice(exitArray.length - Math.abs(amount), Math.abs(amount));

  PLAYER.marker.setTooltipContent(`${PLAYER.coins.length}`);
  popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = cache.coins
    .length.toString();

  mementoArray = _populateMementoArray(mementoArray, cacheArray);
  localStorage.setItem("mementoArray", JSON.stringify(mementoArray));
  localStorage.setItem("playerCoins", JSON.stringify(PLAYER.coins));

  updatePlayerCoinDisplay(coinDiv, PLAYER.coins);
}

export function initializeGameSession() {
  if (!confirm("are you sure?")) {
    return;
  }

  clearLocalStorage();

  playerMovementArray = [];
  polyline.setLatLngs(playerMovementArray);

  mementoArray = [];
  cacheArray = [];
  cacheArray = _populateCacheArray(cacheArray, mementoArray);

  PLAYER.coins = [];
  PLAYER.marker.setTooltipContent(`${PLAYER.coins.length}`);
  localStorage.setItem("playerCoins", JSON.stringify(PLAYER.coins));

  spawnSurroundings(PLAYER.coords);
  document.dispatchEvent(PLAYER_MARKER_MOVED);
}

function clearLocalStorage() {
  localStorage.clear();

  cacheArray.forEach((cache) => {
    MAP.removeLayer(cache.rect);
  });
}

//#endregion
