// Types de tuiles de la carte
export const TILE_TYPES = {
  EMPTY: 'empty',
  CITY: 'city',
  RIVER: 'river',
  MOUNTAIN: 'mountain',
  FOREST: 'forest',
}

// Identifiants des bâtiments (valeurs stockées dans tile.building)
export const BUILDING_TYPES = {
  SOLAR:      'solar',
  WIND:       'wind',
  GEOTHERMAL: 'geothermal',
  COAL_MINE:  'coalMine',
  COAL_PLANT: 'coalPlant',
  BARRAGE:    'barrage',
}

// Capacité de stockage de base (sans barrage)
export const BASE_STORAGE = 15  // kWh

// Définitions complètes des bâtiments
export const BUILDINGS = {
  solar: {
    id: 'solar',
    label: 'Panneau solaire',
    emoji: '☀️',
    cost: 10,
    prodPerUnit: 1.5,       // kWh/s, jour seulement — SEULE VALEUR À MODIFIER
    pollutionPerSecond: 0,
    isRenewable: true,
    allowedOn: [TILE_TYPES.EMPTY, TILE_TYPES.FOREST],
    get description() { return `+${this.prodPerUnit} kWh/s (jour seulement)` },
    tooltip: 'Bon marché mais faible rendement. Produit uniquement le jour. En masse, ça compte !',
  },
  wind: {
    id: 'wind',
    label: 'Éolienne',
    emoji: '🌀',
    cost: 50,
    prodPerUnit: 5,         // kWh/s × windFactor (0–1) — SEULE VALEUR À MODIFIER
    pollutionPerSecond: 0,
    isRenewable: true,
    allowedOn: [TILE_TYPES.EMPTY, TILE_TYPES.FOREST],
    get description() { return `+${this.prodPerUnit} kWh/s max (variable vent)` },
    tooltip: 'Cher mais très productif. Fonctionne jour et nuit. Attention aux tempêtes !',
  },
  geothermal: {
    id: 'geothermal',
    label: 'Géothermie',
    emoji: '♨️',
    cost: 80,
    prodPerUnit: 4,         // kWh/s constant — SEULE VALEUR À MODIFIER
    pollutionPerSecond: 0,
    isRenewable: true,
    allowedOn: [TILE_TYPES.MOUNTAIN],
    get description() { return `+${this.prodPerUnit} kWh/s (constant, 24h/24)` },
    tooltip: 'Stable et ininterruptible. Seules les montagnes ⛰️ conviennent. Aucun événement ne la stoppe.',
  },
  coalMine: {
    id: 'coalMine',
    label: 'Mine de charbon',
    emoji: '⛏️',
    cost: 15,
    prodPerUnit: 0,
    pollutionPerSecond: 0.08, // SEULE VALEUR À MODIFIER
    isRenewable: false,
    allowedOn: [TILE_TYPES.MOUNTAIN, TILE_TYPES.EMPTY, TILE_TYPES.FOREST],
    get description() { return `Active les centrales (+${this.pollutionPerSecond} pollution/s)` },
    tooltip: 'Nécessaire pour alimenter les centrales à charbon. Placez de préférence sur une montagne ⛰️.',
  },
  coalPlant: {
    id: 'coalPlant',
    label: 'Centrale à charbon',
    emoji: '🏭',
    cost: 40,
    prodPerUnit: 8,         // kWh/s si mines suffisantes — SEULE VALEUR À MODIFIER
    pollutionPerSecond: 0.40, // SEULE VALEUR À MODIFIER
    isRenewable: false,
    allowedOn: [TILE_TYPES.EMPTY, TILE_TYPES.FOREST],
    get description() { return `+${this.prodPerUnit} kWh/s (requiert mine) · +${this.pollutionPerSecond} poll/s` },
    tooltip: 'Très productive mais polluante. Le vent disperse la fumée — surveillez sa direction !',
  },
  barrage: {
    id: 'barrage',
    label: 'Barrage',
    emoji: "🏞️",
    cost: 20,
    prodPerUnit: 0,
    storagePerUnit: 50,     // kWh de capacité supplémentaire — SEULE VALEUR À MODIFIER
    pollutionPerSecond: 0,
    isRenewable: true,
    allowedOn: [TILE_TYPES.RIVER],
    get description() { return `+${this.storagePerUnit} kWh de stockage` },
    get tooltip()     { return `Stocke l'excédent, le réinjecte en déficit. +${this.storagePerUnit} kWh par barrage. Rivières uniquement.` },
  },
}

// ── Formule de demande — SOURCE UNIQUE DE VÉRITÉ ───────────
// Modifie uniquement ici pour rééquilibrer la difficulté.
export function computeDemand(population) {
  const rate = population < 150 ? 0.05
             : population < 200 ? 0.08
             : population < 250 ? 0.11
             : population < 350 ? 0.15
             :                    0.10
  return population * rate
}

// Affichage des tuiles — icônes désactivées (décor 100% CSS)
export const TILE_DISPLAY = {
  [TILE_TYPES.EMPTY]:    { bg: '#78c840', icon: null, label: 'Terrain vide' },
  [TILE_TYPES.CITY]:     { bg: '#a8aec0', icon: null, label: 'Zone urbaine' },
  [TILE_TYPES.RIVER]:    { bg: '#2272e8', icon: null, label: 'Rivière' },
  [TILE_TYPES.MOUNTAIN]: { bg: '#7a8898', icon: null, label: 'Montagne' },
  [TILE_TYPES.FOREST]:   { bg: '#1a5210', icon: null, label: 'Forêt' },
}
