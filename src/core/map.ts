//#region -------------------------------------- IMPORTS

// EXTERNAL LIBRARIES

import leaflet from "leaflet";
import { LatLng, Marker } from "npm:@types/leaflet@^1.9.14";

// UTILITY
import { _getPosition } from "../utils/helper.ts";

// CORE FUNCTIONALITY

import { Board, Cell } from "./board.ts";
import { Coin, initializeGameSession, PLAYER_MARKER_MOVED } from "../main.ts";

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
    action: () => initializeGameSession(),
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

let tracking = false;
MAP.on("locationfound", function () {
  if (tracking) {
    document.dispatchEvent(PLAYER_MARKER_MOVED);
  }
});

//#endregion

//#region --------------------------------------- FUNCTIONS

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
