//#region --------------------------------------- NOTES

/*

[option + shift + f] = format

function getPosition() {
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

const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);
//const HOME = leaflet.latLng(36.95976838448142, -122.06144213676454);

const START_ZOOM = 18;
const MAX_ZOOM = 19;
const MIN_ZOOM = 10;

const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 13;
const CACHE_SPAWN_PROBABILITY = 0.1;

//#endregion

//#region --------------------------------------- INTERFACES

interface Coin {
  location: Cache | Player;
  id: string;
}

interface Cache {
  cell: Cell;
  coins: Array<Coin>;
  rect: Rectangle;
}

interface Player {
  coords: LatLng;
  marker: Marker;
  coins: Array<Coin>;
}

//#endregion

//#region --------------------------------------- SET-UP

document.getElementById("title")!.innerHTML = APP_NAME;

const startPosition = OAKES_CLASSROOM;
//const startPosition = await getPosition();

const map = leaflet.map(document.getElementById("map")!, {
  center: startPosition,
  zoom: START_ZOOM,
  maxZoom: MAX_ZOOM,
  minZoom: MIN_ZOOM,
  zoomControl: true,
  scrollWheelZoom: true,
});

// create invisible tile layer
leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: START_ZOOM,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const board: Board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

const playerMarker = leaflet.marker(startPosition, {
  draggable: true,
  autoPan: true,
}).addTo(map);

const player: Player = {
  coords: startPosition,
  coins: [],
  marker: playerMarker,
};

player.marker.bindTooltip(`${player.coins}`);

const cacheArray: Array<Cache> = [];

//#endregion

//#region --------------------------------------- CONTENT

spawnSurroundings(player.coords);

//#endregion

//#region --------------------------------------- HELPER FUNCTIONS

function spawnCache(cell: Cell) {
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
  };

  const numCoins = Math.floor(
    luck([cell.i, cell.j, "initialValue"].toString()) * 100,
  );
  for (let i = 0; i < numCoins; i++) {
    const id: string = `${cell.i}:${cell.j}:${i}`;
    cache.coins.push({ location: cache, id: id });
  }

  interact(cache);

  return cache;
}

function spawnSurroundings(coords: LatLng) {
  board.getCellsNearPoint(coords).forEach((cell) => {
    if (luck([cell.i, cell.j].toString()) < CACHE_SPAWN_PROBABILITY) {
      const cache = spawnCache(cell);
      cacheArray.push(cache);
    }
  });
}

function interact(cache: Cache) {
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

function adjustCache(
  amount: number,
  cache: Cache,
  coin: Coin,
  popupDiv: HTMLSpanElement,
) {
  if (amount == 0) {
    return;
  }

  let enterArray: Array<Coin>;
  let exitArray: Array<Coin>;

  amount < 0 ? exitArray = player.coins : exitArray = cache.coins;
  amount < 0 ? enterArray = cache.coins : enterArray = player.coins;

  enterArray.push(coin);
  exitArray.splice(exitArray.length - Math.abs(amount), Math.abs(amount));

  player.marker.setTooltipContent(`${player.coins.length}`);
  popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = cache.coins
    .length.toString();
}

//#endregion

//#region --------------------------------------- GETTERS AND SETTERS

function _getTop(coins: Array<Coin>) {
  return coins[coins.length - 1];
}

function _getBottom(coins: Array<Coin>) {
  return coins[0];
}

//#endregion
