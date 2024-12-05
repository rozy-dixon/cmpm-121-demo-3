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
} from "../utils/helper.ts";

// CORE FUNCTIONALITY

import { Board, Cell } from "./board.ts";
import { cacheArray, PLAYER_MARKER_MOVED } from "../main.ts";

import { tracking } from "./ui.ts";

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

//#endregion

//#region --------------------------------------- SET-UP

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

export let playerMovementArray: Array<LatLng> = [];
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

export const polyline = leaflet.polyline(playerMovementArray, {
  color: "blue",
  weight: 5,
  opacity: 0.7,
  lineJoin: "round",
}).addTo(MAP);

MAP.on("locationfound", function () {
  if (tracking) {
    document.dispatchEvent(PLAYER_MARKER_MOVED);
  }
});

//#endregion

//#region --------------------------------------- PLAYER UPDATES

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

//#endregion
