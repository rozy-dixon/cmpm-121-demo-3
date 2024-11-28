//#region --------------------------------------- NOTES

/*

[option + shift + f] = format

*/
//#endregion

//#region -------------------------------------- IMPORTS

import leaflet from "leaflet";
import { Board } from "./board.ts";

import "leaflet/dist/leaflet.css";
import "./style.css";

import "./leafletWorkaround.ts";

import luck from "./luck.ts";
import { LatLng, Marker, Rectangle } from "npm:@types/leaflet@^1.9.14";

import { Cell } from "./board.ts";

//#endregion

//#region --------------------------------------- INITS

const APP_NAME = "orange couscous";

// anchors
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);
const _HOME = leaflet.latLng(36.95976838448142, -122.06144213676454);

// map initial variables
const START_ZOOM = 18;
const MAX_ZOOM = 18;
const MIN_ZOOM = 10;

// board initial variables
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 13;
const CACHE_SPAWN_PROBABILITY = 0.1;

//#endregion

//#region --------------------------------------- INTERFACES

interface Button {
  text: string;
  action: () => void;
  id: string;
}

interface Coin {
  location: Cache | Player;
  id: string;
}

interface Cache {
  cell: Cell;
  coins: Array<Coin>;
  rect: Rectangle;
  toMemento(): string;
  fromMemento(memento: string): void;
}

interface Player {
  coords: LatLng;
  cell: Cell;
  marker: Marker;
  coins: Array<Coin>;
}

//#endregion

//#region --------------------------------------- SET-UP

document.getElementById("title")!.innerHTML = APP_NAME;

const interactionButtons: Array<Button> = [
  { text: "↑", action: () => movePlayer(1, 0), id: "ArrowUp" },
  { text: "↓", action: () => movePlayer(-1, 0), id: "ArrowDown" },
  { text: "←", action: () => movePlayer(0, -1), id: "ArrowLeft" },
  { text: "→", action: () => movePlayer(0, 1), id: "ArrowRight" },
];

const buttonDiv = document.getElementById("buttons");

const startPosition = OAKES_CLASSROOM;

// create map to access lat/lng values in which to anchor player and caches
const map = leaflet.map(document.getElementById("map")!, {
  center: startPosition,
  zoom: START_ZOOM,
  maxZoom: MAX_ZOOM,
  minZoom: MIN_ZOOM,
  zoomControl: true,
  scrollWheelZoom: true,
  keyboard: false,
});

// create invisible tile layer
leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: START_ZOOM,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// create board
const board: Board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);
const cacheArray: Array<Cache> = [];

// create player
// start player at starting position and no coins
const playerMarker = leaflet.marker(startPosition, {
  draggable: true,
  autoPan: true,
}).addTo(map);

const player: Player = {
  coords: startPosition,
  cell: board.getCellForPoint(startPosition),
  coins: [],
  marker: playerMarker,
};

player.marker.bindTooltip(`${player.coins.length}`);

const playerMarkerMoved = new Event("player-marker-moved");

globalThis.addEventListener("keydown", (event: KeyboardEvent) => {
  if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(event.key) !==
      -1
  ) {
    const interactionButton = Array.from(
      buttonDiv?.getElementsByTagName("button") || [],
    ).find((button) => button.id === event.key);

    console.log(interactionButton?.innerHTML);
    interactionButton?.click();
  }
});

document.addEventListener("player-marker-moved", () => {
  cacheArray.forEach((cache) => {
    map.removeLayer(cache.rect);
  });

  map.setView(player.coords);
  spawnSurroundings(player.coords);
});

//#endregion

//#region --------------------------------------- CONTENT

// add buttons to top of page
interactionButtons.forEach((element) => {
  const button = document.createElement("button");
  button.id = element.id;
  button.innerHTML = element.text;
  button.addEventListener("click", element.action);
  buttonDiv!.append(button);
});

// populate board with caches
spawnSurroundings(player.coords);

//#endregion

//#region --------------------------------------- HELPER FUNCTIONS

// create cache
// anchor to cell, fill with coins, anchor rectangle
function spawnCache(cell: Cell, coins: Array<Coin> | undefined = undefined) {
  const rect = leaflet.rectangle(board.getCellBounds(cell), {
    color: "#000000",
    weight: 2,
    fillColor: "#ffffff",
    fillOpacity: 0.5,
  });
  rect.addTo(map);

  const cache: Cache = {
    cell: cell,
    coins: [],
    rect: rect,
    toMemento: function (): string {
      return "";
    },
    fromMemento: function (_memento: string): void {
    },
  };

  if (coins == undefined) {
    const numCoins = Math.floor(
      luck([cell.i, cell.j, "initialValue"].toString()) * 100,
    );
    for (let i = 0; i < numCoins; i++) {
      const id: string = `${cell.i}:${cell.j}:${i}`;
      cache.coins.push({ location: cache, id: id });
    }
  }

  // applying functions
  cache.toMemento = function (): string {
    return JSON.stringify({
      coins: cache.coins,
    });
  };

  cache.fromMemento = function (memento: string): void {
    const state = JSON.parse(memento);

    cache.coins = state.coins;
  };

  // player will interact with cache via collect and deposit
  allowCacheInteraction(cache);

  return cache;
}

// populate cells around provided coordinates
function spawnSurroundings(coords: LatLng) {
  // src = https://chat.brace.tools/s/12df7b24-bd45-4cb3-b69c-5a982779d964
  board.getCellsNearPoint(coords).forEach((cell) => {
    const cache = _getCache(cell);
    if (cache) {
      if (!map.hasLayer(cache.rect)) {
        map.addLayer(cache.rect);
      }
      return;
    }
    if (luck([cell.i, cell.j].toString()) < CACHE_SPAWN_PROBABILITY) {
      cacheArray.push(spawnCache(cell));
    }
  });
}

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
        if (player.coins.length > 0) {
          const coin = player.coins[player.coins.length - 1];
          adjustCache(-1, cache, coin, popupDiv);
        }
      },
    );

    return popupDiv;
  });
}

// functions as both collect and deposit functions
// allows for chunking
function adjustCache(
  amount: number,
  cache: Cache,
  coin: Coin,
  popupDiv: HTMLSpanElement,
) {
  if (amount == 0) {
    return;
  }

  const exitArray = amount < 0 ? player.coins : cache.coins;
  const enterArray = amount < 0 ? cache.coins : player.coins;

  enterArray.push(coin);
  exitArray.splice(exitArray.length - Math.abs(amount), Math.abs(amount));

  player.marker.setTooltipContent(`${player.coins.length}`);
  popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = cache.coins
    .length.toString();
}

function movePlayer(lat: number, lng: number) {
  const newLat = playerMarker.getLatLng().lat + (lat * TILE_DEGREES);
  const newLng = playerMarker.getLatLng().lng + (lng * TILE_DEGREES);

  playerMarker.setLatLng(leaflet.latLng(newLat, newLng));

  player.coords = leaflet.latLng(newLat, newLng);
  player.cell = board.getCellForPoint(player.coords);

  document.dispatchEvent(playerMarkerMoved);
}

//#endregion

//#region --------------------------------------- GETTERS AND SETTERS

function _getTop(coins: Array<Coin>) {
  return coins[coins.length - 1];
}

function _getBottom(coins: Array<Coin>) {
  return coins[0];
}

function _getCache(cell: Cell) {
  return cacheArray.find((existingCache) =>
    existingCache.cell.i === cell.i && existingCache.cell.j === cell.j
  );
}

// get position of (actual) player
function _getPosition() {
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

//#endregion
