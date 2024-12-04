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

import {
  _clearLocalStorage,
  _getCache,
  _getPosition,
  _populateCacheArray,
  _populateMementoArray,
} from "./helper.ts";
import {
  APP_NAME,
  CACHE_SPAWN_PROBABILITY,
  MAP,
  NEIGHBORHOOD_SIZE,
  TILE_DEGREES,
} from "./helper.ts";

//#endregion

//#region --------------------------------------- INTERFACES

interface Button {
  text: string;
  action: () => void;
  id: string;
}

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
  {
    text: "🚮",
    action: () => initializeGameSession(),
    id: "ClearLocalStorage",
  },
  { text: "🌐", action: () => orientPlayer(), id: "OrientPlayer" },
];

const buttonDiv = document.getElementById("buttons");
const coinDiv = document.getElementById("coins")! as HTMLDivElement;

const startPosition = await _getPosition() as LatLng;

// create board
const board: Board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);
let cacheArray: Array<Cache> = [];
let mementoArray: Array<string> = [];
if (localStorage.getItem("mementoArray") != undefined) {
  mementoArray = JSON.parse(localStorage.getItem("mementoArray")!);
}
let playerMovementArray: Array<LatLng> = [];
if (localStorage.getItem("playerMovementArray") != undefined) {
  playerMovementArray = JSON.parse(
    localStorage.getItem("playerMovementArray")!,
  );
}

// create player
// start player at starting position and no coins
const playerMarker = leaflet.marker(startPosition, {
  draggable: true,
  autoPan: true,
}).addTo(MAP);

const player: Player = {
  coords: startPosition,
  cell: board.getCellForPoint(startPosition),
  coins: [],
  marker: playerMarker,
};

if (localStorage.getItem("playerCoins") != undefined) {
  player.coins = JSON.parse(localStorage.getItem("playerCoins")!);
}

player.marker.bindTooltip(`${player.coins.length}`);
let tracking = false;
MAP.locate();

MAP.on("locationfound", function () {
  if (tracking) {
    document.dispatchEvent(playerMarkerMoved);
  }
});

const playerMarkerMoved = new Event("player-marker-moved");

globalThis.addEventListener("keydown", (event: KeyboardEvent) => {
  if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(event.key) !==
      -1
  ) {
    const interactionButton = Array.from(
      buttonDiv?.getElementsByTagName("button") || [],
    ).find((button) => button.id === event.key);

    interactionButton?.click();
  }
});

document.addEventListener("player-marker-moved", () => {
  cacheArray.forEach((cache) => {
    MAP.removeLayer(cache.rect);
  });

  mementoArray = _populateMementoArray(mementoArray, cacheArray);
  localStorage.setItem("mementoArray", JSON.stringify(mementoArray));

  playerMovementArray.push(player.coords);
  polyline.setLatLngs(playerMovementArray);
  localStorage.setItem(
    "playerMovementArray",
    JSON.stringify(playerMovementArray),
  );

  MAP.setView(player.coords);
  spawnSurroundings(player.coords);
});

const polyline = leaflet.polyline(playerMovementArray, {
  color: "blue",
  weight: 5,
  opacity: 0.7,
  lineJoin: "round",
}).addTo(MAP);

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

updatePlayerCoinDisplay(coinDiv, player.coins);

document.getElementById("OrientPlayer")!.style.backgroundColor = "#ba6376";

// populate cache array from saved data
cacheArray = _populateCacheArray(cacheArray, mementoArray);

// populate board with caches
spawnSurroundings(player.coords);
document.dispatchEvent(playerMarkerMoved);

//#endregion

//#region --------------------------------------- HELPER FUNCTIONS

// create cache
// anchor to cell, fill with coins, anchor rectangle
export function spawnCache(
  cell: Cell,
  coins: Array<Coin> | undefined = undefined,
) {
  const rect = leaflet.rectangle(board.getCellBounds(cell), {
    color: "#000000",
    weight: 2,
    fillColor: "#ffffff",
    fillOpacity: 0.5,
  });
  rect.addTo(MAP);

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
      cache.coins.push({
        location: cell,
        id: id,
      });
    }
  } else {
    cache.coins = coins;
  }

  // applying functions
  cache.toMemento = function (): string {
    return JSON.stringify({
      cell: cache.cell,
      coins: cache.coins,
    });
  };

  cache.fromMemento = function (memento: string): void {
    const state = JSON.parse(memento);
    cache.cell = state.cell,
      cache.coins = state.coins.MAP((coin: Coin) => ({
        ...coin,
        location: state.cell,
      }));
  };

  // player will interact with cache via collect and deposit
  allowCacheInteraction(cache);

  return cache;
}

// populate cells around provided coordinates
function spawnSurroundings(coords: LatLng) {
  // src = https://chat.brace.tools/s/12df7b24-bd45-4cb3-b69c-5a982779d964
  board.getCellsNearPoint(coords).forEach((cell) => {
    const cache = _getCache(cell, cacheArray);
    if (cache) {
      if (!MAP.hasLayer(cache.rect)) {
        MAP.addLayer(cache.rect);
      }
      return;
    } else if (luck([cell.i, cell.j].toString()) < CACHE_SPAWN_PROBABILITY) {
      const newCache = spawnCache(cell);
      cacheArray.push(newCache);
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

  mementoArray = _populateMementoArray(mementoArray, cacheArray);
  localStorage.setItem("mementoArray", JSON.stringify(mementoArray));
  localStorage.setItem("playerCoins", JSON.stringify(player.coins));

  updatePlayerCoinDisplay(coinDiv, player.coins);
}

function updatePlayerCoinDisplay(div: HTMLDivElement, coins: Array<Coin>) {
  const buttons = Array.from(div.getElementsByClassName("coinButton"));
  buttons.forEach((element) => {
    div.removeChild(element);
  });

  coins.forEach((element) => {
    const button = document.createElement("button");
    button.className = "coinButton";
    button.id = "coin";
    button.innerHTML = element.id;
    button.addEventListener("click", () => {
      const coord = leaflet.latLng(button.innerHTML.split(":", 2));
      MAP.setView(
        leaflet.latLng([
          (coord.lat) * TILE_DEGREES,
          (coord.lng) * TILE_DEGREES,
        ]),
      );
    });
    div?.append(button);
  });
}

function movePlayer(lat: number, lng: number) {
  const newLat = playerMarker.getLatLng().lat + (lat * TILE_DEGREES);
  const newLng = playerMarker.getLatLng().lng + (lng * TILE_DEGREES);

  playerMarker.setLatLng(leaflet.latLng(newLat, newLng));

  player.coords = leaflet.latLng(newLat, newLng);
  player.cell = board.getCellForPoint(player.coords);

  document.dispatchEvent(playerMarkerMoved);
}

function orientPlayer() {
  const button = document.getElementById("OrientPlayer");
  if (
    button?.style.backgroundColor === "#9cba63" ||
    button?.style.backgroundColor === "rgb(156, 186, 99)"
  ) {
    button!.style.backgroundColor = "#ba6376"; // off
    tracking = false;
  } else {
    button!.style.backgroundColor = "#9cba63"; // on
    tracking = true;
  }
}

function initializeGameSession() {
  if (!confirm("are you sure?")) {
    return;
  }

  _clearLocalStorage();

  playerMovementArray = [];
  polyline.setLatLngs(playerMovementArray);

  mementoArray = [];
  cacheArray = [];
  cacheArray = _populateCacheArray(cacheArray, mementoArray);

  player.coins = [];
  player.marker.setTooltipContent(`${player.coins.length}`);
  localStorage.setItem("playerCoins", JSON.stringify(player.coins));

  spawnSurroundings(player.coords);
  document.dispatchEvent(playerMarkerMoved);
}

//#endregion
