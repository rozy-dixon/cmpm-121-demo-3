import {
  Cache,
  MAP,
  PLAYER,
  playerMovementArray,
  polyline,
  spawnSurroundings,
} from "../core/map.ts";
import { _populateCacheArray, _populateMementoArray } from "./helper.ts";
import { PLAYER_MARKER_MOVED } from "../main.ts";

function clearLocalStorage(cacheArray: Array<Cache>): void {
  localStorage.clear();

  cacheArray.forEach((cache) => {
    MAP.removeLayer(cache.rect);
  });
}

export function initializeGameSession(
  mementoArray: Array<string>,
  cacheArray: Array<Cache>,
): void {
  if (!confirm("are you sure?")) {
    return;
  }

  clearLocalStorage(cacheArray);

  playerMovementArray.splice(0, playerMovementArray.length);
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
