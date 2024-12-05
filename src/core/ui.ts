//#region --------------------------------------- IMPORTS

// EXTERNAL LIBRARIES

import leaflet from "leaflet";

// CORE FUNCTIONALITY

import {
  Coin,
  initializeGameSession,
  MAP,
  movePlayer,
  TILE_DEGREES,
} from "./map.ts";
import { cacheArray, mementoArray } from "../main.ts";

//#endregion

//#region --------------------------------------- INTERFACES

interface Button {
  text: string;
  action: () => void;
  id: string;
}

//#endregion

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

export let tracking = false;
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
