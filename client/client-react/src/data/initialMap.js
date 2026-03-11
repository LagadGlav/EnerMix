import { TILE_TYPES } from './buildings.js'

export const GRID_COLS = 25
export const GRID_ROWS = 20

// Centre géométrique de la ville pour les calculs de croissance
export const CITY_CENTER_COL = 12
export const CITY_CENTER_ROW = 10

function makeTile(type, building = null) {
  return { type, building }
}

// Construit la grille initiale 25×20 (500 tuiles)
// Layout :
//   - Ville centrale  : cols 10–14, rows 8–12 (5×5)
//   - Rivière gauche  : col 4, rows 2–17 (+ coude)
//   - Rivière droite  : col 20, rows 3–17 (+ coude haut)
//   - Montagnes : chaîne nord continue (rows 1-4) + flancs E/O + chaîne sud
//   - Forêts : clusters autour des rivières et de la ville
//   - Reste : terrain vide constructible
function buildInitialMap() {
  const grid = Array(GRID_COLS * GRID_ROWS).fill(null).map(() => makeTile(TILE_TYPES.EMPTY))

  const set = (col, row, type) => {
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      grid[row * GRID_COLS + col] = makeTile(type)
    }
  }

  // --- Ville centrale : 5×5 (cols 10-14, rows 8-12) ---
  for (let r = 8; r <= 12; r++) {
    for (let c = 10; c <= 14; c++) {
      set(c, r, TILE_TYPES.CITY)
    }
  }

  // --- Rivière gauche : col 4, rows 2–17 ---
  for (let r = 2; r <= 17; r++) set(4, r, TILE_TYPES.RIVER)
  for (let r = 14; r <= 17; r++) set(5, r, TILE_TYPES.RIVER)  // coude bas

  // --- Rivière droite : col 20, rows 3–17 ---
  for (let r = 3; r <= 17; r++) set(20, r, TILE_TYPES.RIVER)
  for (let r = 3; r <= 6; r++)  set(19, r, TILE_TYPES.RIVER)  // coude haut

  // --- Montagnes : grands massifs autour de la vallée centrale ---
  const mountains = [
    // === Coins ===
    [1, 1], [2, 1], [1, 2],
    [23, 1], [23, 2], [24, 1],
    [1, 17], [1, 18], [2, 18],
    [22, 17], [23, 18], [24, 18],

    // === Grande chaîne nord — crête (rang 1) ===
    // [8,1] et [17,1] existants rejoints par une ligne continue
    [5, 1], [6, 1], [7, 1], [8, 1],
    [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1], [16, 1],
    [17, 1], [18, 1], [19, 1],

    // === Grande chaîne nord — épaisseur (rang 2) ===
    [5, 2], [6, 2], [7, 2],            // [7,2] existant
    [9, 2], [10, 2], [11, 2],          // (gap en [12,2] = col de montagne)
    [13, 2], [14, 2], [15, 2], [16, 2], [18, 2],

    // === Éperons vers la ville (rangs 3-4) ===
    [9, 3], [10, 3], [11, 3],
    [13, 3], [14, 3], [15, 3],
    [9, 4], [15, 4],

    // === Flanc ouest (entre rivière gauche et ville) ===
    [6, 8], [6, 9], [6, 10], [6, 11],

    // === Flanc est (entre ville et rivière droite) ===
    [18, 8], [18, 9], [18, 10], [18, 11],

    // === Chaîne sud ===
    [8, 15], [9, 15], [10, 15],
    [14, 15], [15, 15], [16, 15],
  ]
  mountains.forEach(([c, r]) => set(c, r, TILE_TYPES.MOUNTAIN))

  // --- Forêts : clusters naturels ---
  const forests = [
    // Cluster nord-ouest (derrière rivière gauche)
    [2, 4], [3, 4], [2, 5], [3, 5], [2, 6], [3, 6],
    // Cluster sud-ouest
    [2, 12], [3, 12], [2, 13], [3, 13], [2, 14],
    // Cluster nord-est (derrière rivière droite)
    [21, 3], [22, 3], [21, 4], [22, 4], [21, 5], [22, 5],
    // Cluster sud-est
    [21, 13], [22, 13], [21, 14], [22, 14],
    // Forêts autour de la ville (buffer vert)
    [7, 7], [8, 7], [9, 7],
    [15, 7], [16, 7], [17, 7],
    [7, 13], [8, 13], [9, 13],
    [15, 13], [16, 13], [17, 13],
    // Sud
    [6, 17], [7, 17], [8, 17],
    [16, 17], [17, 17], [18, 17],
  ]
  forests.forEach(([c, r]) => set(c, r, TILE_TYPES.FOREST))

  // --- Éolienne de départ (gauche de la ville) ---
  grid[10 * GRID_COLS + 8] = { type: TILE_TYPES.EMPTY, building: 'wind' }

  return grid
}

export const INITIAL_GRID = buildInitialMap()
