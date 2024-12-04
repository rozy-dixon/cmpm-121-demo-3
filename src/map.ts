//#region --------------------------------------- IMPORTS

// EXTERNAL LIBRARIES

import leaflet from "leaflet";
import { LatLng, Marker, Rectangle } from "npm:@types/leaflet@^1.9.14";

// UTILITY

import {
  _ensureCacheIsVisible,
  _getCache,
  _populateCacheArray,
  _populateMementoArray,
  _trySpawnNewCache,
} from "./helper.ts";

// CORE FUNCTIONALITY

import { Board, Cell } from "./board.ts";
import { cacheArray, mementoArray, PLAYER_MARKER_MOVED } from "./main.ts";

//#endregion

//#region --------------------------------------- INITS

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

export interface Player {
  coords: LatLng;
  cell: Cell;
  marker: Marker;
  coins: Array<Coin>;
}

interface Button {
  text: string;
  action: () => void;
  id: string;
}

//#endregion

//#region --------------------------------------- SET-UP

// BUTTON UI INITIALIZATION

const buttonDiv = document.getElementById("buttons");
const interactionButtons: Array<Button> = [
  { text: "↑", action: () => movePlayer(1, 0), id: "ArrowUp" },
  { text: "↓", action: () => movePlayer(-1, 0), id: "ArrowDown" },
  { text: "←", action: () => movePlayer(0, -1), id: "ArrowLeft" },
  { text: "→", action: () => movePlayer(0, 1), id: "ArrowRight" },
  {
    text: "🚮",
    action: () => initializeGameSession(mementoArray, cacheArray),
    id: "ClearLocalStorage",
  },
  { text: "🌐", action: () => orientPlayer(), id: "OrientPlayer" },
];

// add buttons to top of page
interactionButtons.forEach((element) => {
  const button = document.createElement("button");
  button.id = element.id;
  button.innerHTML = element.text;
  button.addEventListener("click", element.action);
  buttonDiv!.append(button);
});

// add interactions to buttons
globalThis.addEventListener("keydown", (event: KeyboardEvent) => {
  const interactionButton = Array.from(
    buttonDiv?.getElementsByTagName("button") || [],
  ).find((button) => button.id === event.key);
  interactionButton?.click();
});

// MAP INITIALIZATION

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

// create board
export const BOARD: Board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

// create invisible tile layer
leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: START_ZOOM,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(MAP);

// PLAYER INITIALIZATION

const startPosition = await _getPosition() as LatLng;

let playerMovementArray: Array<LatLng> = [];
if (localStorage.getItem("playerMovementArray") != undefined) {
  playerMovementArray = JSON.parse(
    localStorage.getItem("playerMovementArray")!,
  );
}

// create player
// start player at starting position and no coins
export const PLAYER_MARKER = leaflet.marker(startPosition, {
  draggable: true,
  autoPan: true,
}).addTo(MAP);

export const PLAYER: Player = {
  coords: startPosition,
  cell: BOARD.getCellForPoint(startPosition),
  coins: [],
  marker: PLAYER_MARKER,
};

PLAYER.marker.bindTooltip(`${PLAYER.coins.length}`);

// MAP EVENT MANAGEMENT

MAP.locate();

const polyline = leaflet.polyline(playerMovementArray, {
  color: "blue",
  weight: 5,
  opacity: 0.7,
  lineJoin: "round",
}).addTo(MAP);

let tracking = false;
MAP.on("locationfound", function () {
  if (tracking) {
    document.dispatchEvent(PLAYER_MARKER_MOVED);
  }
});

//#endregion

//#region --------------------------------------- PLAYER UPDATES

export function updatePlayerCoinDisplay(
  div: HTMLDivElement,
  coins: Array<Coin>,
) {
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

export function movePlayer(lat: number, lng: number) {
  const newLat = PLAYER_MARKER.getLatLng().lat + (lat * TILE_DEGREES);
  const newLng = PLAYER_MARKER.getLatLng().lng + (lng * TILE_DEGREES);

  PLAYER_MARKER.setLatLng(leaflet.latLng(newLat, newLng));

  PLAYER.coords = leaflet.latLng(newLat, newLng);
  PLAYER.cell = BOARD.getCellForPoint(PLAYER.coords);

  document.dispatchEvent(PLAYER_MARKER_MOVED);
}

export function resetPlayerView(
  cacheArray: Array<Cache>,
  mementoArray: Array<string>,
) {
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
}

export function orientPlayer() {
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

//#endregion

//#region --------------------------------------- SPAWN FUNCTIONS

export function createRectangle(cell: Cell): L.Rectangle {
  const rect = leaflet.rectangle(BOARD.getCellBounds(cell), {
    color: "#000000",
    weight: 2,
    fillColor: "#ffffff",
    fillOpacity: 0.5,
  });
  rect.addTo(MAP);
  return rect;
}

export function spawnSurroundings(coords: LatLng): void {
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

//#region --------------------------------------- RESETS

export function initializeGameSession(
  mementoArray: Array<string>,
  cacheArray: Array<Cache>,
) {
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

function clearLocalStorage() {
  localStorage.clear();

  cacheArray.forEach((cache) => {
    MAP.removeLayer(cache.rect);
  });
}

//#endregion
