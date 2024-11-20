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
//import { Board } from "./board.ts";

import "leaflet/dist/leaflet.css";
import "./style.css";

import "./leafletWorkaround.ts";

import luck from "./luck.ts";
import { Marker, Rectangle } from "npm:@types/leaflet@^1.9.14";

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

/* interface Coin {
  location: Cache | Player;
  id: number;
} */

interface Cache {
  cell: Cell;
  pointValue: number;
  rect: Rectangle;
}

interface Player {
  marker: Marker;
  points: number;
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

const playerMarker = leaflet.marker(startPosition, {
  draggable: true,
  autoPan: true,
}).addTo(map);

const player: Player = {
  points: 0,
  marker: playerMarker,
};

player.marker.bindTooltip(`${player.points}`);

const cacheArray: Array<Cache> = [];

//#endregion

//#region --------------------------------------- CONTENT

// [ ] on move end, update neighborhood

// [ ] change marker style

for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      const cache = spawnCache(i, j);
      cacheArray.push(cache);
    }
  }
}

//#endregion

//#region --------------------------------------- HELPER FUNCTIONS

function spawnCache(i: number, j: number) {
  const origin: leaflet.LatLng = startPosition;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  const rect = leaflet.rectangle(bounds, {
    color: "#000000",
    weight: 2,
    fillColor: "#ffffff",
    fillOpacity: 0.5,
  });
  rect.addTo(map);

  // src = https://chat.brace.tools/s/8a5b2b11-b475-4e10-8574-fb83e9600379
  const pointValue: number = Number(
    Math.floor(luck([i, j, "initialValue"].toString()) * 100),
  );

  const cache: Cache = {
    cell: { i, j },
    pointValue: pointValue,
    rect: rect,
  };

  interact(cache);

  return cache;
}

function interact(cache: Cache) {
  cache.rect.bindPopup(() => {
    // src = https://chat.brace.tools/s/136a1f49-5351-482a-a52f-3c15ebcdda58
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
      <div class="pop-up">(${cache.cell.i},${cache.cell.j}), <span id="value">${cache.pointValue}</span>.</div>
      <button id="collect">collect</button>
      <button id="deposit">deposit</button>`;

    // collect
    popupDiv.querySelector<HTMLButtonElement>("#collect")?.addEventListener(
      "click",
      () => {
        adjustCache(1, cache, popupDiv);
      },
    );

    // deposit
    popupDiv.querySelector<HTMLButtonElement>("#deposit")?.addEventListener(
      "click",
      () => {
        adjustCache(-1, cache, popupDiv);
      },
    );

    return popupDiv;
  });
}

function adjustCache(amount: number, cache: Cache, popupDiv: HTMLSpanElement) {
  cache.pointValue = alterPointValue(Number(cache.pointValue), amount);
  popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = cache
    .pointValue.toString();
}

function alterPointValue(pointValue: number, adjust: number) {
  player.marker.setTooltipContent(`${player.points += adjust}`);
  return pointValue -= adjust;
}

//#endregion
