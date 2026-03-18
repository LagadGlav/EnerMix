import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import './App.css'
import GameMap        from './components/GameMap.jsx'
import HUD            from './components/HUD.jsx'
import BuildingPanel  from './components/BuildingPanel.jsx'
import EventBanner    from './components/EventBanner.jsx'
import GameOver       from './components/GameOver.jsx'
import DisasterPopup  from './components/DisasterPopup.jsx'
import DisasterTimer  from './components/DisasterTimer.jsx'
import PauseWidget    from './components/PauseWidget.jsx'
import PollutionClouds from './components/PollutionClouds.jsx'
import LevelSelect    from './components/LevelSelect.jsx'
import TutorialOverlay, { FREE_PLAY_STEP } from './components/TutorialOverlay.jsx'
import EasyIndicators  from './components/EasyIndicators.jsx'
import ComponentBubble from './components/ComponentBubble.jsx'
import { BUILDINGS, TILE_TYPES, computeDemand, BASE_STORAGE } from './data/buildings.js'
import { EVENTS, EVENT_INTERVAL_MIN, EVENT_INTERVAL_MAX, TICKS_PER_DAY } from './data/events.js'
import { INITIAL_GRID, GRID_COLS, GRID_ROWS, CITY_CENTER_COL, CITY_CENTER_ROW } from './data/initialMap.js'

const SELL_RATE      = 0.35  // € par kWh stocké
const TAX_PER_POP   = 0.05  // € par habitant par 10s
const INITIAL_MONEY = 120    // budget de départ
const TILE_SIZE     = 80    // px

// Taille réelle de la grille (tuiles + gaps)
const MAP_W = GRID_COLS * TILE_SIZE + (GRID_COLS - 1) // 2024
const MAP_H = GRID_ROWS * TILE_SIZE + (GRID_ROWS - 1) // 1619

// ── Configurations par niveau ──────────────────────────────
const LEVEL_CONFIGS = {
  tutorial: {
    id: 'tutorial',
    availableBuildings: ['wind', 'barrage'],
    availableEventIds: ['subvention', 'demandePlus'],
    demandMultiplier: 0.55,
    demandRates: [0.035, 0.05, 0.07, 0.09, 0.08],  // courbe plus douce
    eventIntervalMin: 80, eventIntervalMax: 150,
    winCondition: { population: 150, health: 50, renewableShare: 30 },
    initialMoney: 200,
    simTickMs: 2000,   // 1 tick de jeu toutes les 2s (plus lent pour les élèves)
    ticksPerDay: 10,
  },
  easy: {
    id: 'easy',
    availableBuildings: ['wind', 'barrage', 'coalMine', 'coalPlant'],
    availableEventIds: 'all',
    demandMultiplier: 0.75,
    demandRates: [0.042, 0.065, 0.09, 0.12, 0.09],  // courbe légèrement plus douce
    eventIntervalMin: 60, eventIntervalMax: 120,
    winCondition: { population: 200, health: 50, renewableShare: 30 },
    initialMoney: 150,
    simTickMs: 2000,   // 1 tick de jeu toutes les 2s
    ticksPerDay: 10,   // 10 × 2s = 20s par jour
  },
  medium: {
    id: 'medium',
    availableBuildings: 'all', availableEventIds: 'all',
    demandMultiplier: 0.85,
    eventIntervalMin: 40, eventIntervalMax: 100,
    winCondition: { population: 275, health: 60, renewableShare: 50 },
    initialMoney: 120,
    simTickMs: 1000,
    ticksPerDay: 20,
  },
  hard: {
    id: 'hard',
    availableBuildings: 'all', availableEventIds: 'all',
    demandMultiplier: 1.0,
    eventIntervalMin: 20, eventIntervalMax: 100,
    winCondition: { population: 600, health: 60, renewableShare: 50 },
    initialMoney: 120,
    simTickMs: 1000,
    ticksPerDay: 20,
  },
}

function makeInitialGrid() { return INITIAL_GRID.map(t => ({ ...t })) }
// Grille sans bâtiments pré-placés (pour le tutoriel)
function makeCleanGrid() { return INITIAL_GRID.map(t => ({ ...t, building: null })) }
function makeInitialEventTimer(min = EVENT_INTERVAL_MIN, max = EVENT_INTERVAL_MAX) {
  return min + Math.floor(Math.random() * (max - min))
}

// ── Bulles intro Easy / Medium ───────────────────────────────────
const INTRO_BUBBLES_EASY = [
  {
    pos: 'panel', highlight: 'building-panel',
    title: '🏗️ Comment construire',
    text: "Clique sur un bâtiment dans ce panneau pour le sélectionner, puis clique sur une tuile compatible de la carte.\nÉoliennes 🌀 → terrain vert · Barrages 🏞️ → rivière bleue.",
    btnLabel: 'OK !',
  },
  {
    pos: 'center', highlight: 'hud-panel',
    title: '📊 Tableau de bord',
    text: "Surveille ta production ⚡ vs ta demande, ton argent 💰, le stockage 🔋, la satisfaction 😊 et la santé ❤️ de tes habitants. Si la satisfaction tombe à 0 → Game Over !",
    btnLabel: 'Compris !',
  },
  {
    pos: 'top', highlight: 'pause-widget',
    title: '▶ Lance la simulation',
    text: "Clique sur ce bouton pour démarrer. Le jeu se mettra automatiquement en pause lors d'alertes importantes — lis-les bien avant de reprendre.",
    btnLabel: "C'est parti !",
  },
]

const INTRO_BUBBLES_MEDIUM = [
  {
    pos: 'center', highlight: 'hud-panel',
    title: '📊 Difficulté Moyen',
    text: "Les événements sont plus fréquents et la demande plus élevée. Construis un mix énergétique varié et du stockage 🔋 AVANT que les catastrophes arrivent.",
    btnLabel: 'Compris !',
  },
]

export default function App() {
  // ── Ressources ─────────────────────────────────────────────
  const [energy,       setEnergy]       = useState(0)
  const [money,        setMoney]        = useState(INITIAL_MONEY)
  const [pollution,    setPollution]    = useState(0)
  const [health,       setHealth]       = useState(100)
  const [population,   setPopulation]   = useState(100)
  const [satisfaction, setSatisfaction] = useState(80) // deuxième condition de défaite
  const [currentDay,   setCurrentDay]   = useState(1)  // compteur de jours

  // ── Grille ─────────────────────────────────────────────────
  const [grid, setGrid] = useState(makeInitialGrid)

  // ── UI ─────────────────────────────────────────────────────
  const [selectedBuilding, setSelectedBuilding] = useState(null)
  const [isDay,            setIsDay]            = useState(true)
  const [gameStatus,       setGameStatus]       = useState('playing')
  const [loseReason,       setLoseReason]       = useState('')
  const [placementError,   setPlacementError]   = useState('')
  const [renewableShare,   setRenewableShare]   = useState(0)
  const [sellTarget,       setSellTarget]       = useState(null) // {index, buildingId, cost}

  // ── Vent ───────────────────────────────────────────────────
  const [windStrength, setWindStrength] = useState(0.5)  // 0-1
  const [windAngle,    setWindAngle]    = useState(225)  // degrés (direction d'où souffle le vent)

  // ── Événements ─────────────────────────────────────────────
  const [activeEvent,   setActiveEvent]   = useState(null)
  const [eventLog,      setEventLog]      = useState([])
  const [disasterPopup, setDisasterPopup] = useState(null)
  const [endedEvent,    setEndedEvent]    = useState(null)  // toast de fin d'événement

  // ── Pause ──────────────────────────────────────────────────
  const [isPaused,       setIsPaused]       = useState(true)   // démarre pausé
  const [hasEverStarted, setHasEverStarted] = useState(false)

  // ── Sélection de niveau ────────────────────────────────────
  const [level,          setLevel]          = useState(null)   // null = menu
  const [tutorialStep,   setTutorialStep]   = useState(null)
  const [demandMultiplier, setDemandMultiplier] = useState(1.0)
  const levelConfigRef       = useRef(null)
  const demandMultiplierRef  = useRef(1.0)

  // ── Easy/Medium : aides contextuelles ─────────────────────
  const [seenBuildings,    setSeenBuildings]    = useState(() => new Set())
  const [newBuildingHint,  setNewBuildingHint]  = useState(null)  // building id
  const [skipHints,        setSkipHints]        = useState(false)
  const [introBubbleIdx,   setIntroBubbleIdx]   = useState(null)  // null = pas d'intro

  // ── Tutoriel : ref miroir + flags anti-double-déclenchement
  const tutorialStepRef        = useRef(null)
  const tutDeficitShownRef     = useRef(false)
  const tutDeficit2ShownRef    = useRef(false)
  const tutStorageUsedShownRef = useRef(false)
  const tutPop150ShownRef      = useRef(false)
  const tutSatShownRef         = useRef(false)
  const tutEventShownRef       = useRef(false)
  const tutEnergySaleShownRef  = useRef(false)
  const tutNightShownRef       = useRef(false)

  // ── Vitesse de simulation par niveau ───────────────────────
  const simTickMsRef    = useRef(1000)   // intervalle entre deux ticks de jeu (ms)
  const ticksPerDayRef  = useRef(20)     // ticks par cycle jour/nuit
  const lastTickTimeRef = useRef(0)      // timestamp du dernier tick traité

  // ── Refs pour éviter stale closures dans la boucle ─────────
  const gridRef         = useRef(grid)
  const isDayRef        = useRef(isDay)
  const healthRef       = useRef(health)
  const pollutionRef    = useRef(pollution)
  const populationRef   = useRef(population)
  const satisfactionRef = useRef(satisfaction)
  const activeEventRef  = useRef(null)  // géré directement dans la boucle (pas de useEffect sync)
  const gameStatusRef   = useRef(gameStatus)
  const windStrengthRef = useRef(0.5)
  const windAngleRef    = useRef(225)
  const isPausedRef     = useRef(true)
  const energyRef       = useRef(0)       // lecture directe dans la boucle (buffer déficit)

  // Compteurs internes (pas de state, pas de re-render)
  const tickRef                  = useRef(0)
  const nextEventTickRef         = useRef(makeInitialEventTimer())
  const lastGrowthThresholdRef   = useRef(2) // paliers de 50 pop
  const isLoopRunning            = useRef(false)

  // Panning
  const mapPannerRef = useRef(null)
  const dragState    = useRef({ dragging: false, startX: 0, startY: 0, panX: 0, panY: 0, moved: false })
  const wasDragging  = useRef(false) // capturé avant le reset dans mouseup (click arrive après mouseup)

  // ── Synchronisation refs ────────────────────────────────────
  useEffect(() => { gridRef.current         = grid        }, [grid])
  useEffect(() => { isDayRef.current        = isDay       }, [isDay])
  useEffect(() => { healthRef.current       = health      }, [health])
  useEffect(() => { pollutionRef.current    = pollution   }, [pollution])
  useEffect(() => { populationRef.current   = population  }, [population])
  useEffect(() => { satisfactionRef.current = satisfaction}, [satisfaction])
  // activeEventRef est géré directement dans la boucle — pas de useEffect ici
  useEffect(() => { gameStatusRef.current   = gameStatus  }, [gameStatus])
  useEffect(() => { windStrengthRef.current = windStrength}, [windStrength])
  useEffect(() => { windAngleRef.current    = windAngle   }, [windAngle])
  useEffect(() => { isPausedRef.current     = isPaused    }, [isPaused])
  useEffect(() => { energyRef.current       = energy      }, [energy])

  // ── Sync tutorialStepRef ────────────────────────────────────
  useEffect(() => { tutorialStepRef.current = tutorialStep }, [tutorialStep])

  // ── CSS variables pour sprites ─────────────────────────────
  // Vitesse rotation éolienne selon force du vent
  useEffect(() => {
    const speed = windStrength > 0.05 ? (2.5 / windStrength).toFixed(1) : '999'
    document.documentElement.style.setProperty('--turbine-speed', `${speed}s`)
  }, [windStrength])

  // Opacité fumée selon pollution
  useEffect(() => {
    const opacity = Math.min(1, pollution / 50).toFixed(2)
    document.documentElement.style.setProperty('--smoke-opacity', opacity)
  }, [pollution])

  // ── Cycle vent (changement graduel toutes les 5s) ──────────
  useEffect(() => {
    const t = setInterval(() => {
      if (isPausedRef.current) return
      setWindAngle(a  => (a + (Math.random() - 0.5) * 25 + 360) % 360)
      setWindStrength(s => Math.max(0.05, Math.min(1, s + (Math.random() - 0.5) * 0.15)))
    }, 5000)
    return () => clearInterval(t)
  }, [])

  // ── Centrage initial de la map sur la ville ────────────────
  useEffect(() => {
    const cityPxX = CITY_CENTER_COL * (TILE_SIZE + 1) + TILE_SIZE / 2
    const cityPxY = CITY_CENTER_ROW * (TILE_SIZE + 1) + TILE_SIZE / 2
    const initialX = Math.min(0, Math.max(-(MAP_W - window.innerWidth),  window.innerWidth  / 2 - cityPxX))
    const initialY = Math.min(0, Math.max(-(MAP_H - window.innerHeight), window.innerHeight / 2 - cityPxY))
    dragState.current.panX = initialX
    dragState.current.panY = initialY
    if (mapPannerRef.current) {
      mapPannerRef.current.style.transform = `translate(${initialX}px, ${initialY}px)`
    }
  }, []) // eslint-disable-line

  // ── Panning ────────────────────────────────────────────────
  const handleViewportMouseDown = useCallback((e) => {
    if (e.button !== 0 || selectedBuilding) return
    dragState.current = {
      dragging: true,
      startX:   e.clientX,
      startY:   e.clientY,
      panX:     dragState.current.panX,
      panY:     dragState.current.panY,
      moved:    false,
    }
  }, [selectedBuilding])

  const handleViewportMouseMove = useCallback((e) => {
    if (!dragState.current.dragging || !e.buttons) return
    const dx = e.clientX - dragState.current.startX
    const dy = e.clientY - dragState.current.startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragState.current.moved = true
    if (!dragState.current.moved) return
    const newX = Math.min(0, Math.max(-(MAP_W - window.innerWidth),  dragState.current.panX + dx))
    const newY = Math.min(0, Math.max(-(MAP_H - window.innerHeight), dragState.current.panY + dy))
    if (mapPannerRef.current) {
      mapPannerRef.current.style.transform = `translate(${newX}px, ${newY}px)`
    }
  }, [])

  const handleViewportMouseUp = useCallback((e) => {
    wasDragging.current = dragState.current.moved  // capturer avant reset
    if (dragState.current.dragging && dragState.current.moved) {
      const dx   = (e.clientX ?? 0) - dragState.current.startX
      const dy   = (e.clientY ?? 0) - dragState.current.startY
      const newX = Math.min(0, Math.max(-(MAP_W - window.innerWidth),  dragState.current.panX + dx))
      const newY = Math.min(0, Math.max(-(MAP_H - window.innerHeight), dragState.current.panY + dy))
      dragState.current.panX = newX
      dragState.current.panY = newY
    }
    dragState.current.dragging = false
    dragState.current.moved    = false
  }, [])

  // ── Dérivés mémoïsés ───────────────────────────────────────
  const buildingCounts = useMemo(() => {
    const counts = { solar: 0, wind: 0, geothermal: 0, coalMine: 0, coalPlant: 0, barrage: 0, uraniumMine: 0, nuclearPlant: 0 }
    for (const tile of grid) {
      if (tile.building && counts[tile.building] !== undefined) counts[tile.building]++
    }
    return counts
  }, [grid])

  const energyDemand = useMemo(() => {
    const mDemand = activeEvent?.effectKey === 'demandePlus' ? 1.5 : 1
    return computeDemand(population) * mDemand * demandMultiplier
  }, [population, activeEvent, demandMultiplier])

  const maxEnergy = useMemo(() =>
    BASE_STORAGE + buildingCounts.barrage * BUILDINGS.barrage.storagePerUnit
  , [buildingCounts.barrage])

  const totalProduction = useMemo(() => {
    const ev      = activeEvent
    const mSolar  = ev?.effectKey === 'canicule' ? 1.5 : ev?.effectKey === 'journeeSoleil' ? 2 : ev?.effectKey === 'tempeteSable' ? 0.5 : 1
    const mWind   = ev?.effectKey === 'tempete' ? 0 : ev?.effectKey === 'coupDeVent' ? 1.5 : 1
    const mGeo    = ev?.effectKey === 'seisme' ? 0 : 1
    const mMine   = ev?.effectKey === 'greve'    ? 0 : 1
    const mCoal   = ev?.effectKey === 'penurie' ? 0.5 : ev?.effectKey === 'accident' ? 0 : 1
    const mNuclear = ev?.effectKey === 'incidentNucleaire' ? 0 : 1
    const solarProd    = buildingCounts.solar      * BUILDINGS.solar.prodPerUnit      * (isDay ? 1 : 0) * mSolar
    const windProd     = buildingCounts.wind       * BUILDINGS.wind.prodPerUnit       * windStrength    * mWind
    const geoThermProd = buildingCounts.geothermal * BUILDINGS.geothermal.prodPerUnit                  * mGeo
    const coalEff      = buildingCounts.coalPlant > 0
      ? Math.min(1, (buildingCounts.coalMine * mMine) / buildingCounts.coalPlant) : 0
    const coalProd     = buildingCounts.coalPlant  * BUILDINGS.coalPlant.prodPerUnit  * coalEff * mCoal
    const nuclearEff   = buildingCounts.nuclearPlant > 0
      ? Math.min(1, buildingCounts.uraniumMine / buildingCounts.nuclearPlant) : 0
    const nuclearProd  = buildingCounts.nuclearPlant * BUILDINGS.nuclearPlant.prodPerUnit * nuclearEff * mNuclear
    return Number((solarProd + windProd + geoThermProd + coalProd + nuclearProd).toFixed(2))
  }, [buildingCounts, isDay, windStrength, activeEvent])

  const productionBreakdown = useMemo(() => {
    const ev      = activeEvent
    const mSolar  = ev?.effectKey === 'canicule' ? 1.5 : ev?.effectKey === 'journeeSoleil' ? 2 : ev?.effectKey === 'tempeteSable' ? 0.5 : 1
    const mWind   = ev?.effectKey === 'tempete' ? 0 : ev?.effectKey === 'coupDeVent' ? 1.5 : 1
    const mGeo    = ev?.effectKey === 'seisme' ? 0 : 1
    const mMine   = ev?.effectKey === 'greve'    ? 0 : 1
    const mCoal   = ev?.effectKey === 'penurie' ? 0.5 : ev?.effectKey === 'accident' ? 0 : 1
    const mNuclear = ev?.effectKey === 'incidentNucleaire' ? 0 : 1
    const solarUnit   = BUILDINGS.solar.prodPerUnit      * (isDay ? 1 : 0) * mSolar
    const windUnit    = BUILDINGS.wind.prodPerUnit       * windStrength    * mWind
    const geoUnit     = BUILDINGS.geothermal.prodPerUnit                   * mGeo
    const coalEff     = buildingCounts.coalPlant > 0
      ? Math.min(1, (buildingCounts.coalMine * mMine) / buildingCounts.coalPlant) : 0
    const coalUnit    = BUILDINGS.coalPlant.prodPerUnit  * coalEff * mCoal
    const nuclearEff  = buildingCounts.nuclearPlant > 0
      ? Math.min(1, buildingCounts.uraniumMine / buildingCounts.nuclearPlant) : 0
    const nuclearUnit = BUILDINGS.nuclearPlant.prodPerUnit * nuclearEff * mNuclear
    return {
      solar:        { count: buildingCounts.solar,        unit: solarUnit,   total: buildingCounts.solar        * solarUnit   },
      wind:         { count: buildingCounts.wind,         unit: windUnit,    total: buildingCounts.wind         * windUnit    },
      geothermal:   { count: buildingCounts.geothermal,   unit: geoUnit,     total: buildingCounts.geothermal   * geoUnit     },
      coalMine:     { count: buildingCounts.coalMine,     active: Math.round(buildingCounts.coalMine * mMine) },
      coalPlant:    { count: buildingCounts.coalPlant,    unit: coalUnit,    total: buildingCounts.coalPlant    * coalUnit    },
      uraniumMine:  { count: buildingCounts.uraniumMine,  active: buildingCounts.uraniumMine },
      nuclearPlant: { count: buildingCounts.nuclearPlant, unit: nuclearUnit, total: buildingCounts.nuclearPlant * nuclearUnit },
    }
  }, [buildingCounts, isDay, activeEvent, windStrength])

  // Ratio de déficit affiché (0-1) — détermine quelles tuiles city passent en rouge
  // Déclenché uniquement quand les réserves sont épuisées
  const deficitRatio = useMemo(() => {
    if (energyDemand <= 0) return 0
    const surplus = totalProduction - energyDemand
    if (surplus >= 0) return 0
    if (energy > 0)   return 0   // réserve dispo → pas de stress
    return Math.min(1, -surplus / energyDemand)
  }, [totalProduction, energyDemand, energy])

  // ── Croissance de la ville ─────────────────────────────────
  const growCity = useCallback(() => {
    setGrid(prev => {
      const newGrid    = [...prev]
      const candidates = []
      for (let i = 0; i < newGrid.length; i++) {
        if (newGrid[i].type === TILE_TYPES.CITY) {
          const col = i % GRID_COLS
          const row = Math.floor(i / GRID_COLS)
          for (const [nc, nr] of [[col-1,row],[col+1,row],[col,row-1],[col,row+1]]) {
            if (nc >= 0 && nc < GRID_COLS && nr >= 0 && nr < GRID_ROWS) {
              const ni = nr * GRID_COLS + nc
              if (newGrid[ni].type === TILE_TYPES.EMPTY && !newGrid[ni].building) {
                candidates.push({ ni, dist: Math.abs(nc - CITY_CENTER_COL) + Math.abs(nr - CITY_CENTER_ROW) })
              }
            }
          }
        }
      }
      if (candidates.length === 0) return prev
      candidates.sort((a, b) => a.dist - b.dist)
      newGrid[candidates[0].ni] = { type: TILE_TYPES.CITY, building: null }
      return newGrid
    })
  }, [])

  // ── Boucle de jeu principale ───────────────────────────────
  useEffect(() => {
    if (isLoopRunning.current) return
    isLoopRunning.current = true

    const timer = setInterval(() => {
      if (gameStatusRef.current !== 'playing') return
      if (isPausedRef.current) return

      // Throttle : ne traiter un tick de jeu que si simTickMs s'est écoulé
      const now = Date.now()
      if (now - lastTickTimeRef.current < simTickMsRef.current) return
      lastTickTimeRef.current = now

      tickRef.current += 1
      const tick = tickRef.current
      const ws   = windStrengthRef.current

      // 1. Compter bâtiments
      const g      = gridRef.current
      const counts = { solar: 0, wind: 0, geothermal: 0, coalMine: 0, coalPlant: 0, barrage: 0, uraniumMine: 0, nuclearPlant: 0 }
      for (const tile of g) {
        if (tile.building && counts[tile.building] !== undefined) counts[tile.building]++
      }

      // 2. Déterminer l'événement actif pour CE tick (avant les multiplicateurs)
      //    → le ref est mis à jour immédiatement, setActiveEvent notifie React pour le HUD
      let ev = activeEventRef.current
      if (ev === null) {
        if (tick >= nextEventTickRef.current) {
          const cfg = levelConfigRef.current
          let applicable = EVENTS.filter(e => {
            if (e.hardModeOnly && levelConfigRef.current?.id !== 'hard') return false
            if (e.effectKey === 'greve'             && counts.coalMine     === 0) return false
            if (e.effectKey === 'penurie'           && counts.coalPlant    === 0) return false
            if (e.effectKey === 'accident'          && counts.coalPlant    === 0) return false
            if (e.effectKey === 'tempete'           && counts.wind         === 0) return false
            if (e.effectKey === 'canicule'          && counts.solar        === 0) return false
            if (e.effectKey === 'journeeSoleil'     && counts.solar        === 0) return false
            if (e.effectKey === 'tempeteSable'      && counts.solar        === 0) return false
            if (e.effectKey === 'seisme'            && counts.geothermal   === 0) return false
            if (e.effectKey === 'coupDeVent'        && counts.wind         === 0) return false
            if (e.effectKey === 'incidentNucleaire' && counts.nuclearPlant === 0) return false
            return true
          })
          // Filtrage par niveau
          if (cfg?.availableEventIds && cfg.availableEventIds !== 'all') {
            const allowed = cfg.availableEventIds
            applicable = applicable.filter(e => allowed.includes(e.id))
          }
          const fallback = EVENTS.filter(e => {
            if (e.hardModeOnly && levelConfigRef.current?.id !== 'hard') return false
            if (!['greve','penurie','accident'].includes(e.effectKey)) {
              const cfg2 = levelConfigRef.current
              if (cfg2?.availableEventIds && cfg2.availableEventIds !== 'all') {
                return cfg2.availableEventIds.includes(e.id)
              }
              return true
            }
            return false
          })
          const pool     = applicable.length > 0 ? applicable : fallback
          const newEvent = pool[Math.floor(Math.random() * pool.length)]

          const eMin = cfg?.eventIntervalMin ?? EVENT_INTERVAL_MIN
          const eMax = cfg?.eventIntervalMax ?? EVENT_INTERVAL_MAX
          nextEventTickRef.current = tick + eMin + Math.floor(Math.random() * (eMax - eMin))

          // Effets instantanés
          if (newEvent.instantEffect?.health) {
            setHealth(h => Math.max(0, h + newEvent.instantEffect.health))
          }
          if (newEvent.effectKey === 'tempete') {
            setWindStrength(1.0)
          }

          ev = { ...newEvent, timeLeft: newEvent.durationDays * TICKS_PER_DAY }
          activeEventRef.current = ev          // ← sync immédiat du ref
          setActiveEvent(ev)                   // ← notif HUD
          setDisasterPopup({ ...newEvent })
          setEventLog(log => [{ id: newEvent.id, name: newEvent.name, emoji: newEvent.emoji }, ...log.slice(0, 4)])
          // En tutoriel : pause auto + step 18 au premier événement
          if (levelConfigRef.current?.id === 'tutorial') {
            isPausedRef.current = true
            setIsPaused(true)
            if (!tutEventShownRef.current && tutorialStepRef.current !== null &&
              (tutorialStepRef.current === FREE_PLAY_STEP || tutorialStepRef.current < 21)) {
              tutEventShownRef.current = true
              tutorialStepRef.current  = 21
              setTutorialStep(21)
            }
          }
        }
      } else {
        const newTimeLeft = ev.timeLeft - 1
        if (newTimeLeft <= 0) {
          setEndedEvent(ev)
          setTimeout(() => setEndedEvent(null), 5000)
          ev = null
          activeEventRef.current = null        // ← sync immédiat du ref
          setActiveEvent(null)                 // ← notif HUD
        } else {
          ev = { ...ev, timeLeft: newTimeLeft }
          activeEventRef.current = ev          // ← sync immédiat du ref
          setActiveEvent(ev)                   // ← notif HUD
        }
      }

      // 3. Multiplicateurs d'événement (utilise ev du tick courant, sans délai)
      const muls = {
        solar:         ev?.effectKey === 'canicule' ? 1.5 : ev?.effectKey === 'journeeSoleil' ? 2 : ev?.effectKey === 'tempeteSable' ? 0.5 : 1,
        wind:          ev?.effectKey === 'tempete'  ? 0   : ev?.effectKey === 'coupDeVent' ? 1.5 : 1,
        geothermal:    ev?.effectKey === 'seisme'         ? 0   : 1,
        nuclear:       ev?.effectKey === 'incidentNucleaire' ? 0 : 1,
        coalMine:      ev?.effectKey === 'greve'        ? 0   : 1,
        coalProd:      ev?.effectKey === 'penurie' ? 0.5 : ev?.effectKey === 'accident' ? 0 : 1,
        coalPollution: ev?.effectKey === 'accident'     ? 2   : 1,
        demand:        ev?.effectKey === 'demandePlus'  ? 1.5 : 1,
      }

      // 4. Productions
      const solarProd          = counts.solar       * BUILDINGS.solar.prodPerUnit       * (isDayRef.current ? 1 : 0) * muls.solar
      const windProd           = counts.wind        * BUILDINGS.wind.prodPerUnit        * ws                          * muls.wind
      const geothermalProd     = counts.geothermal  * BUILDINGS.geothermal.prodPerUnit                               * muls.geothermal
      const effectiveCoalMines = counts.coalMine    * muls.coalMine
      const coalEff            = counts.coalPlant > 0 ? Math.min(1, effectiveCoalMines / counts.coalPlant) : 0
      const coalProd           = counts.coalPlant   * BUILDINGS.coalPlant.prodPerUnit   * coalEff                     * muls.coalProd
      const nuclearEff         = counts.nuclearPlant > 0 ? Math.min(1, counts.uraniumMine / counts.nuclearPlant) : 0
      const nuclearProd        = counts.nuclearPlant * BUILDINGS.nuclearPlant.prodPerUnit * nuclearEff               * muls.nuclear
      const totalProd          = solarProd + windProd + geothermalProd + coalProd + nuclearProd

      // 5. Demande — source unique : computeDemand() dans buildings.js
      const pop    = populationRef.current
      const demand = computeDemand(pop, levelConfigRef.current?.demandRates)
                     * muls.demand * demandMultiplierRef.current

      // 6. Capacité de stockage ce tick
      const maxEnergyThisTick = BASE_STORAGE + counts.barrage * BUILDINGS.barrage.storagePerUnit

      // 7. Surplus / déficit brut
      const surplus    = totalProd - demand
      const rawDeficit = Math.max(0, -surplus)

      // 7b. Part renouvelable (nuclear n'est pas renouvelable)
      const renewShare = totalProd > 0 ? Math.round(((solarProd + windProd + geothermalProd) / totalProd) * 100) : 0
      setRenewableShare(renewShare)

      // 8. Énergie stockée + buffer déficit
      const energyDraw       = Math.min(energyRef.current, rawDeficit)  // on pioche dans le stock
      const uncoveredDeficit = rawDeficit - energyDraw                  // reste non couvert

      if (surplus > 0) {
        // Accumulation plafonnée à la capacité max
        setEnergy(prev => Math.min(maxEnergyThisTick, Number((prev + surplus).toFixed(2))))
      } else if (energyDraw > 0) {
        // Réinjection depuis le stock
        setEnergy(prev => Math.max(0, Number((prev - rawDeficit).toFixed(2))))
      }
      if (uncoveredDeficit > 0) {
        setHealth(prev => Math.max(0, Number((prev - uncoveredDeficit * 0.08).toFixed(2))))
      }

      // 9. Satisfaction — basée sur le déficit NON couvert par le stock
      const deficitRatio = demand > 0 ? uncoveredDeficit / demand : 0
      if (deficitRatio > 0.15) {
        const satLoss = deficitRatio > 0.5 ? 3.0 : 1.5
        setSatisfaction(prev => Math.max(0, Number((prev - satLoss).toFixed(2))))
      } else if (surplus > 0 || (rawDeficit > 0 && energyDraw >= rawDeficit)) {
        // Surplus réel OU déficit totalement couvert par le stock = pas de pénalité
        setSatisfaction(prev => Math.min(100, Number((prev + 0.5).toFixed(2))))
      }

      if (satisfactionRef.current <= 0) {
        setGameStatus('lost')
        setLoseReason('Les habitants ont fui — la ville était plongée dans le noir trop longtemps.')
        return
      }

      // ── Triggers tutoriel (dans la boucle, après calcul déficit) ─
      if (tutorialStepRef.current !== null) {
        const ts = tutorialStepRef.current
        // FREE_PLAY_STEP (99) = jeu libre après step 12, mais les triggers restent actifs
        const isFP = ts === FREE_PLAY_STEP

        // ① Déficit immédiat → step 14 (étapes ≥ 12 ou jeu libre)
        if (uncoveredDeficit > 0 && (isFP || ts >= 12) && !tutDeficitShownRef.current) {
          tutDeficitShownRef.current = true
          tutorialStepRef.current    = 14
          setTutorialStep(14)
          isPausedRef.current = true
          setIsPaused(true)
        }

        // ② Stock utilisé pour amortir → step 16 (étapes ≥ 12 ou jeu libre)
        if (energyDraw > 0 && (isFP || ts >= 12) && !tutStorageUsedShownRef.current) {
          tutStorageUsedShownRef.current = true
          tutorialStepRef.current        = 16
          setTutorialStep(16)
          isPausedRef.current = true
          setIsPaused(true)
        }

        // ③ Population ≥ 150 → step 17 (étapes ≥ 12 ou jeu libre)
        if (tick % 15 === 0 && populationRef.current >= 150 && (isFP || ts >= 12) && !tutPop150ShownRef.current) {
          tutPop150ShownRef.current = true
          tutorialStepRef.current   = 17
          setTutorialStep(17)
          isPausedRef.current = true
          setIsPaused(true)
        }

        // ④ Satisfaction < 75 → step 18 (étapes ≥ 12 ou jeu libre)
        if (satisfactionRef.current < 75 && (isFP || ts >= 12) && !tutSatShownRef.current) {
          tutSatShownRef.current  = true
          tutorialStepRef.current = 18
          setTutorialStep(18)
          isPausedRef.current = true
          setIsPaused(true)
        }

        // ⑤ Déficit post-milestone (pop ≥ 150) → step 19 (après step 17 ou jeu libre)
        if (uncoveredDeficit > 0 && populationRef.current >= 150 && (isFP || ts >= 17) && !tutDeficit2ShownRef.current) {
          tutDeficit2ShownRef.current = true
          tutorialStepRef.current     = 19
          setTutorialStep(19)
          isPausedRef.current = true
          setIsPaused(true)
        }

        // ⑥ Énergie proche du max (> 80%) → step 22 (étapes ≥ 12 ou jeu libre)
        if (energyRef.current > maxEnergyThisTick * 0.8 && maxEnergyThisTick > 0 && (isFP || ts >= 12) && !tutEnergySaleShownRef.current) {
          tutEnergySaleShownRef.current = true
          tutorialStepRef.current       = 22
          setTutorialStep(22)
          isPausedRef.current = true
          setIsPaused(true)
        }
      }

      // 10. Pollution
      const pollAdd    = (counts.coalMine  * BUILDINGS.coalMine.pollutionPerSecond
                       + counts.coalPlant * BUILDINGS.coalPlant.pollutionPerSecond * coalEff
                       + counts.uraniumMine * BUILDINGS.uraniumMine.pollutionPerSecond) * muls.coalPollution
      const pollRemove = ws * 1.2
      setPollution(prev => Math.max(0, Math.min(100, Number((prev + pollAdd - pollRemove).toFixed(2)))))

      // 11. Santé via pollution
      const poll = pollutionRef.current
      setHealth(prev => {
        let h = prev
        if (poll > 50) h -= (poll - 50) * 0.04
        if (poll < 35) h = Math.min(100, h + 0.15)
        return Math.max(0, Math.min(100, Number(h.toFixed(2))))
      })

      // 12. Game Over santé nulle
      if (healthRef.current <= 1) {
        setGameStatus('lost')
        setLoseReason('La pollution a empoisonné tous les habitants — la ville est abandonnée.')
        return
      }

      // 13. Évolution population toutes les 15s
      if (tick % 15 === 0) {
        const h = healthRef.current
        setPopulation(prev => {
          if (h > 60) return prev + 10
          if (h > 30) return prev + 6
          if (h < 20) return Math.max(0, prev - 5)
          return prev
        })
      }

      // 14. Croissance ville (paliers de 50 habitants)
      if (tick % 15 === 0) {
        const currentThreshold = Math.floor(populationRef.current / 50)
        if (currentThreshold > lastGrowthThresholdRef.current) {
          lastGrowthThresholdRef.current = currentThreshold
          growCity()
        }
      }

      // 15. Taxes toutes les 10s
      if (tick % 10 === 0) {
        setMoney(prev => Number((prev + pop * TAX_PER_POP).toFixed(2)))
      }

      // 16. Compteur de jours (utilise ticksPerDay du niveau pour rester cohérent)
      if (tick % ticksPerDayRef.current === 0) {
        setCurrentDay(d => d + 1)
      }

      // 17. Victoire
      const wc = levelConfigRef.current?.winCondition ?? { population: 500, health: 60, renewableShare: 50 }
      if (pop >= wc.population && healthRef.current >= wc.health && renewShare >= wc.renewableShare) {
        const lvlId = levelConfigRef.current?.id
        if (lvlId) {
          const done = JSON.parse(localStorage.getItem('enermix-completed') || '{}')
          done[lvlId] = true
          localStorage.setItem('enermix-completed', JSON.stringify(done))
        }
        setGameStatus('won')
        return
      }

    }, 200)

    return () => {
      clearInterval(timer)
      isLoopRunning.current = false
    }
  }, [growCity])

  // ── Cycle jour/nuit (10s chaque = 20s par jour) ───────────
  useEffect(() => {
    const t = setInterval(() => {
      if (isPausedRef.current) return
      // Calcul synchrone avant setIsDay pour éviter les stale closures
      const nextIsDay = !isDayRef.current
      isDayRef.current = nextIsDay
      setIsDay(nextIsDay)

      // Trigger step 13 à la première nuit (après que le jeu soit lancé)
      if (!nextIsDay && !tutNightShownRef.current &&
          tutorialStepRef.current !== null &&
          (tutorialStepRef.current === FREE_PLAY_STEP || tutorialStepRef.current >= 12)) {
        tutNightShownRef.current = true
        tutorialStepRef.current  = 13
        setTutorialStep(13)
      }
    }, 10000)
    return () => clearInterval(t)
  }, [])

  // ── Clic sur tuile ─────────────────────────────────────────
  const handleTileClick = useCallback((index) => {
    if (gameStatus !== 'playing') return
    if (wasDragging.current) { wasDragging.current = false; return }

    const tile = grid[index]

    // Sans bâtiment sélectionné : proposer la vente
    if (!selectedBuilding) {
      if (tile.building) {
        const def = BUILDINGS[tile.building]
        setSellTarget({ index, buildingId: tile.building, cost: def.cost })
      } else {
        setSellTarget(null)
      }
      return
    }

    // En mode construction : fermer le panneau de vente
    setSellTarget(null)

    const buildingDef = BUILDINGS[selectedBuilding]

    if (tile.building) {
      setPlacementError('Cette tuile est déjà occupée.')
      setTimeout(() => setPlacementError(''), 2500)
      return
    }
    if (!buildingDef.allowedOn.includes(tile.type)) {
      setPlacementError(`${buildingDef.label} ne peut pas être construit ici. Terrains : ${buildingDef.allowedOn.join(', ')}.`)
      setTimeout(() => setPlacementError(''), 3000)
      return
    }
    if (selectedBuilding === 'coalPlant' && buildingCounts.coalMine === 0) {
      setPlacementError('Une centrale nécessite au moins une mine de charbon !')
      setTimeout(() => setPlacementError(''), 3000)
      return
    }

    const isDiscount = activeEvent?.effectKey === 'subvention' && buildingDef.isRenewable
    const cost = isDiscount ? Math.round(buildingDef.cost * 0.5) : buildingDef.cost

    if (money < cost) {
      setPlacementError(`Pas assez d'argent. Coût : ${cost}€, disponible : ${money.toFixed(1)}€`)
      setTimeout(() => setPlacementError(''), 2500)
      return
    }

    setMoney(prev => Number((prev - cost).toFixed(2)))
    setGrid(prev => {
      const newGrid = [...prev]
      newGrid[index] = { ...newGrid[index], building: selectedBuilding }
      return newGrid
    })
    setPlacementError('')

    // First-time building hint (Easy + Medium uniquement)
    const lvl = levelConfigRef.current?.id
    if ((lvl === 'easy' || lvl === 'medium') && !skipHints && !seenBuildings.has(selectedBuilding)) {
      setSeenBuildings(prev => new Set([...prev, selectedBuilding]))
      setNewBuildingHint(selectedBuilding)
      // Pause le jeu le temps que le joueur lise l'aide
      isPausedRef.current = true
      setIsPaused(true)
    }
  }, [selectedBuilding, grid, money, activeEvent, buildingCounts, gameStatus, skipHints, seenBuildings])

  // ── Vente d'un bâtiment ────────────────────────────────────
  const confirmSell = useCallback(() => {
    if (!sellTarget) return
    const refund = Math.round(BUILDINGS[sellTarget.buildingId].cost * 0.5)
    setMoney(m => Number((m + refund).toFixed(2)))
    setGrid(prev => {
      const g = [...prev]
      g[sellTarget.index] = { ...g[sellTarget.index], building: null }
      return g
    })
    setSellTarget(null)
  }, [sellTarget])

  const cancelSell = useCallback(() => setSellTarget(null), [])

  // ── Fermeture popup ────────────────────────────────────────
  const dismissPopup = useCallback(() => setDisasterPopup(null), [])

  // ── Vente d'énergie stockée ────────────────────────────────
  const sellEnergy = useCallback(() => {
    if (energy <= 0) return
    const gain = Number((energy * SELL_RATE).toFixed(2))
    setMoney(m => Number((m + gain).toFixed(2)))
    setEnergy(0)
  }, [energy])

  // ── Sélection de niveau ────────────────────────────────────
  const handleSelectLevel = useCallback((levelId) => {
    const cfg = LEVEL_CONFIGS[levelId]
    levelConfigRef.current       = cfg
    demandMultiplierRef.current  = cfg.demandMultiplier
    simTickMsRef.current         = cfg.simTickMs   ?? 1000
    ticksPerDayRef.current       = cfg.ticksPerDay ?? 20
    lastTickTimeRef.current      = 0   // force le premier tick immédiatement
    setDemandMultiplier(cfg.demandMultiplier)
    setMoney(cfg.initialMoney)
    setLevel(levelId)
    if (levelId === 'tutorial') {
      setGrid(makeCleanGrid())   // pas de bâtiment pré-placé pour le tuto
      setTutorialStep(0)
      tutorialStepRef.current = 0
    }
    // Bulles intro pour Easy et Medium (le jeu est déjà pausé par défaut)
    if (levelId === 'easy' || levelId === 'medium') {
      setIntroBubbleIdx(0)
    }
  }, [])

  // ── Pause depuis le tutoriel (sync immédiat du ref) ────────
  const handleTutorialPause = useCallback((val) => {
    isPausedRef.current = val
    setIsPaused(val)
  }, [])

  // ── Bulles intro Easy/Medium ────────────────────────────────
  // Dérivé du niveau courant — pas de state pour éviter la désynchronisation
  const introBubbles = useMemo(() => {
    if (level === 'easy')   return INTRO_BUBBLES_EASY
    if (level === 'medium') return INTRO_BUBBLES_MEDIUM
    return []
  }, [level])

  const handleIntroBubbleClose = useCallback(() => {
    setIntroBubbleIdx(prev => {
      if (prev === null) return null
      const next = prev + 1
      // Fin de la séquence → le jeu reste pausé, le joueur clique sur ▶ pour démarrer
      return next >= introBubbles.length ? null : next
    })
  }, [introBubbles.length])

  // ── Toggle pause ───────────────────────────────────────────
  const handleTogglePause = useCallback(() => {
    setIsPaused(p => {
      const next = !p
      isPausedRef.current = next
      return next
    })
    setHasEverStarted(true)
  }, [])

  // ── Réinitialisation ───────────────────────────────────────
  const resetGame = useCallback(() => {
    setEnergy(0); setMoney(INITIAL_MONEY); setPollution(0)
    setHealth(100); setPopulation(100); setSatisfaction(80); setCurrentDay(1)
    setGrid(makeInitialGrid())
    setSelectedBuilding(null); setIsDay(true)
    setGameStatus('playing'); setLoseReason('')
    setPlacementError(''); setRenewableShare(0); setSellTarget(null)
    setActiveEvent(null); setEventLog([]); setDisasterPopup(null); setEndedEvent(null)
    setWindStrength(0.5); setWindAngle(225)
    setIsPaused(true); setHasEverStarted(false)
    // Retour au menu de sélection de niveau
    setLevel(null); setTutorialStep(null)
    setDemandMultiplier(1.0)
    levelConfigRef.current      = null
    demandMultiplierRef.current = 1.0
    // Réinitialiser les aides Easy/Medium
    setSeenBuildings(new Set()); setNewBuildingHint(null); setSkipHints(false)
    setIntroBubbleIdx(null)
    // Réinitialiser les flags tutoriel
    tutorialStepRef.current        = null
    tutDeficitShownRef.current     = false
    tutDeficit2ShownRef.current    = false
    tutStorageUsedShownRef.current = false
    tutPop150ShownRef.current      = false
    tutSatShownRef.current         = false
    tutEventShownRef.current       = false
    tutEnergySaleShownRef.current  = false
    tutNightShownRef.current       = false
    tickRef.current = 0
    lastTickTimeRef.current = 0
    simTickMsRef.current    = 1000
    ticksPerDayRef.current  = 20
    nextEventTickRef.current = makeInitialEventTimer()
    lastGrowthThresholdRef.current = 2
    isDayRef.current = true; healthRef.current = 100
    pollutionRef.current = 0; populationRef.current = 100
    satisfactionRef.current = 80
    windStrengthRef.current = 0.5; windAngleRef.current = 225
    activeEventRef.current = null; gameStatusRef.current = 'playing'
    isPausedRef.current = true
    energyRef.current   = 0
    dragState.current = { dragging: false, startX: 0, startY: 0, panX: 0, panY: 0, moved: false }
    wasDragging.current = false
  }, [])

  // ── Rendu ──────────────────────────────────────────────────
  if (level === null) {
    return <LevelSelect onSelect={handleSelectLevel} />
  }

  const winCond = LEVEL_CONFIGS[level]?.winCondition ?? { population: 500, health: 60, renewableShare: 50 }
  const _rawBuildings = LEVEL_CONFIGS[level]?.availableBuildings ?? 'all'
  const availableBuildings = _rawBuildings === 'all'
    ? (level === 'hard'
        ? Object.values(BUILDINGS).map(b => b.id)
        : Object.values(BUILDINGS).filter(b => !b.hardModeOnly).map(b => b.id))
    : _rawBuildings

  return (
    <div className={`app ${isDay ? 'app--day' : 'app--night'}`}>

      {/* ── Viewport plein écran ── */}
      <div
        className="map-viewport"
        onMouseDown={handleViewportMouseDown}
        onMouseMove={handleViewportMouseMove}
        onMouseUp={handleViewportMouseUp}
        onMouseLeave={handleViewportMouseUp}
      >
        <div className="map-panner" ref={mapPannerRef}>
          <GameMap
            grid={grid}
            selectedBuilding={selectedBuilding}
            onTileClick={handleTileClick}
            sellTargetIndex={sellTarget?.index ?? null}
            deficitRatio={deficitRatio}
          />
        </div>
        {/* ── Nuages de pollution (overlay viewport) ── */}
        <PollutionClouds pollution={pollution} />
      </div>

      {/* ── Header centré en haut ── */}
      <header className="app-header">
        <div className="app-header__row">
          <h1 className="app-header__title">EnerMix ⚡</h1>
          <span className="app-header__day">{isDay ? '☀️' : '🌙'} Jour {currentDay}</span>
        </div>
        <p className="app-header__subtitle">
          Objectif : {winCond.population} hab · santé ≥ {winCond.health} · 🌱 ≥ {winCond.renewableShare}%
        </p>
      </header>

      {/* ── Panneau gauche ── */}
      <BuildingPanel
        selectedBuilding={selectedBuilding}
        onSelectBuilding={setSelectedBuilding}
        money={money}
        activeEvent={activeEvent}
        placementError={placementError}
        onSellEnergy={sellEnergy}
        energy={energy}
        maxEnergy={maxEnergy}
        sellTarget={sellTarget}
        onConfirmSell={confirmSell}
        onCancelSell={cancelSell}
        availableBuildings={availableBuildings}
      />

      {/* ── HUD droit ── */}
      <HUD
        money={money}
        energy={energy}
        maxEnergy={maxEnergy}
        pollution={pollution}
        health={health}
        population={population}
        totalProduction={totalProduction}
        energyDemand={energyDemand}
        renewableShare={renewableShare}
        isDay={isDay}
        productionBreakdown={productionBreakdown}
        satisfaction={satisfaction}
        windStrength={windStrength}
        windAngle={windAngle}
        activeEvent={activeEvent}
      />

      {/* ── Bandeau événement bas ── */}
      <EventBanner activeEvent={activeEvent} eventLog={eventLog} endedEvent={endedEvent} />

      {/* ── Timer catastrophe (widget centré haut) ── */}
      <DisasterTimer activeEvent={activeEvent} />

      {/* ── Pause / Play ── */}
      <PauseWidget isPaused={isPaused} onToggle={handleTogglePause} hasEverStarted={hasEverStarted} />

      {/* ── Bouton reset ── */}
      <button className="app-footer__reset" onClick={resetGame} title="Réinitialiser la partie">
        🔄
      </button>

      <GameOver gameStatus={gameStatus} loseReason={loseReason} onRestart={resetGame} />
      <DisasterPopup event={disasterPopup} onDismiss={dismissPopup} />

      {/* ── Tutoriel ── */}
      {level === 'tutorial' && tutorialStep !== null && (
        <TutorialOverlay
          step={tutorialStep}
          grid={grid}
          energy={energy}
          deficitRatio={deficitRatio}
          isPaused={isPaused}
          isDay={isDay}
          onPause={handleTutorialPause}
          onAdvance={(targetStep) => {
            tutorialStepRef.current = targetStep
            setTutorialStep(targetStep)
          }}
          onComplete={() => {
            tutorialStepRef.current = null
            setTutorialStep(null)
          }}
        />
      )}

      {/* ── Bulles intro Easy/Medium (séquence guidée au démarrage du niveau) ── */}
      {introBubbleIdx !== null && introBubbles[introBubbleIdx] && (
        <ComponentBubble
          {...introBubbles[introBubbleIdx]}
          step={introBubbleIdx}
          total={introBubbles.length}
          onClose={handleIntroBubbleClose}
        />
      )}

      {/* ── Indicateurs contextuels (Easy + Medium) — pausent le jeu tant que non fermés ── */}
      {(level === 'easy' || level === 'medium') && (
        <EasyIndicators
          deficitRatio={deficitRatio}
          satisfaction={satisfaction}
          health={health}
          pollution={pollution}
          skipHints={skipHints}
          onPause={handleTutorialPause}
        />
      )}

      {/* ── Aide premier bâtiment (Easy + Medium) ── */}
      {newBuildingHint && (
        <div className="building-hint-overlay">
          <div className="building-hint-box">
            <div className="building-hint__emoji">{BUILDINGS[newBuildingHint]?.emoji}</div>
            <div className="building-hint__title">{BUILDINGS[newBuildingHint]?.label}</div>
            <div className="building-hint__desc">{BUILDINGS[newBuildingHint]?.tooltip}</div>
            <button className="building-hint__btn" onClick={() => {
              setNewBuildingHint(null)
              handleTutorialPause(false)   // reprend le jeu
            }}>
              Compris !
            </button>
          </div>
        </div>
      )}

      {/* ── Bouton "Passer les aides" (Easy + Medium uniquement) ── */}
      {(level === 'easy' || level === 'medium') && !skipHints && (
        <button
          className="skip-hints-btn"
          onClick={() => setSkipHints(true)}
          title="Désactiver les aides contextuelles"
        >
          Passer les aides
        </button>
      )}
    </div>
  )
}
