# task tracking

## D3A
- [x] Present the player with deterministically generated, random-feeling cache locations around the player’s initial location.
- [x] Deterministically generate an offering of coins to collect at each location.
- [x] Represent the player’s location and nearby cache locations on the map with details visible either as tooltips or popups.
- [x] Allow the player transport coins from one cache to another by collecting and depositing (using buttons in the cache’s popups).
- [x] Use a latitude–longitude grid where cells are 0.0001 degrees wide. Initialize the player’s location at the site of our classroom in Oakes College at 36°59'22.2"N 122°03'46.0"W. Place a cache at about 10% of the grid cells that are within 8 cell-steps away from the player’s current location.
    - more than 8 cells away
- [ ] Assume that gameplay is permanently anchored around the Oakes College classroom site.
    - I use player's initial location as the center of gameplay.
- [x] Assume that all coins are interchangeable (a collection of the can be sufficiently represented by an integer count).

## D3B
- [x] Represent grid cells using a global coordinate system anchored at Null Island (0°N 0°E). For example, the cell for the Oakes College classroom site would be {i: 369894, j: -1220627}.
- [x] Apply the Flyweight pattern (see later slides for support) when converting latitude–longitude pairs into game cells.
- [x] Represent the unique identity of each coin based on the cache it was originally spawned in. For example, if there are two coins initially at the location above, they would be identified as {i: 369894, j: -1220627, serial: 0} and {i: 369894, j: -1220627, serial: 1}.
- [x] When representing a coin’s identity in text for the user to read, use a compact representation that still allows the user to decode the key data, e.g. “i:j#serial” as in “369894:-1220627#0”.
    - serial = i:-j:starting position
- [x] Continue to assume that the player does not move during gameplay (it is safe to only generate nearby cache locations and their contents just once on program startup).
    - player marker can be dragged, but affects nothing

## D3C
- [ ] Enable the use of the ↑ ↓ ← → on-screen buttons to move the player’s virtual location north, south, east, or west.
- [ ] Regenerate cache locations as the player moves so that only locations sufficiently close to their position are visible on the map.
- [ ] Using the Memento pattern (see later slides for support) save the state of caches so that their contents is preserved even when the player moves out of view and back.
- [ ] Have the movement buttons move the player’s location with the same cell-granularity used by other aspects of the game (e.g. 0.0001 degrees at a time).
- [ ] Assume that the player is motionless unless one of the direction buttons is pressed. (In later stages, the player’s position will be changing even as they are in the middle of collect/deposit operations.)
    - Updates on player drag
    - Player drag overwrites repeatedly checked (actual) player position

## D3D