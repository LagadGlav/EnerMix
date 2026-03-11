import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import './App.css'
import GameMap       from './components/GameMap.jsx'
import HUD           from './components/HUD.jsx'
import BuildingPanel from './components/BuildingPanel.jsx'
import EventBanner   from './components/EventBanner.jsx'
import GameOver      from './components/GameOver.jsx'
import DisasterPopup from './components/DisasterPopup.jsx'
import DisasterTimer from './components/DisasterTimer.jsx'
import PauseWidget      from './components/PauseWidget.jsx'
import PollutionClouds  from './components/PollutionClouds.jsx'
import { BUILDINGS, TILE_TYPES, computeDemand, BASE_STORAGE } from './data/buildings.js'
import { EVENTS, EVENT_INTERVAL_MIN, EVENT_INTERVAL_MAX, TICKS_PER_DAY } from './data/events.js'
import { INITIAL_GRID, GRID_COLS, GRID_ROWS, CITY_CENTER_COL, CITY_CENTER_ROW } from './data/initialMap.js'

const SELL_RATE      = 0.35  // € par kWh stocké
// Demande par paliers → voir computeDemand() dans data/buildings.js (source unique)
const TAX_PER_POP   = 0.05  // € par habitant par 10s
const INITIAL_MONEY = 120    // budget de départ plus serré
const TILE_SIZE     = 80    // px

// Taille réelle de la grille (tuiles + gaps)
const MAP_W = GRID_COLS * TILE_SIZE + (GRID_COLS - 1) // 2024
const MAP_H = GRID_ROWS * TILE_SIZE + (GRID_ROWS - 1) // 1619

function makeInitialGrid() { return INITIAL_GRID.map(t => ({ ...t })) }
function makeInitialEventTimer() {
  return EVENT_INTERVAL_MIN + Math.floor(Math.random() * (EVENT_INTERVAL_MAX - EVENT_INTERVAL_MIN))
}

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
    const counts = { solar: 0, wind: 0, geothermal: 0, coalMine: 0, coalPlant: 0, barrage: 0 }
    for (const tile of grid) {
      if (tile.building && counts[tile.building] !== undefined) counts[tile.building]++
    }
    return counts
  }, [grid])

  const energyDemand = useMemo(() => {
    const mDemand = activeEvent?.effectKey === 'demandePlus' ? 1.5 : 1
    return computeDemand(population) * mDemand
  }, [population, activeEvent])

  const maxEnergy = useMemo(() =>
    BASE_STORAGE + buildingCounts.barrage * BUILDINGS.barrage.storagePerUnit
  , [buildingCounts.barrage])

  const totalProduction = useMemo(() => {
    const ev     = activeEvent
    const mSolar = ev?.effectKey === 'canicule' ? 1.5 : ev?.effectKey === 'journeeSoleil' ? 2 : 1
    const mWind  = ev?.effectKey === 'tempete'  ? 0 : 1
    const mMine  = ev?.effectKey === 'greve'    ? 0 : 1
    const mCoal  = ev?.effectKey === 'penurie' ? 0.5 : ev?.effectKey === 'accident' ? 0 : 1
    const solarProd     = buildingCounts.solar      * BUILDINGS.solar.prodPerUnit      * (isDay ? 1 : 0) * mSolar
    const windProd      = buildingCounts.wind       * BUILDINGS.wind.prodPerUnit       * windStrength    * mWind
    const geoThermProd  = buildingCounts.geothermal * BUILDINGS.geothermal.prodPerUnit
    const coalEff       = buildingCounts.coalPlant > 0
      ? Math.min(1, (buildingCounts.coalMine * mMine) / buildingCounts.coalPlant) : 0
    const coalProd      = buildingCounts.coalPlant  * BUILDINGS.coalPlant.prodPerUnit  * coalEff * mCoal
    return Number((solarProd + windProd + geoThermProd + coalProd).toFixed(2))
  }, [buildingCounts, isDay, windStrength, activeEvent])

  const productionBreakdown = useMemo(() => {
    const ev = activeEvent
    const mSolar = ev?.effectKey === 'canicule' ? 1.5 : ev?.effectKey === 'journeeSoleil' ? 2 : 1
    const mWind  = ev?.effectKey === 'tempete'  ? 0 : 1
    const mMine  = ev?.effectKey === 'greve'    ? 0 : 1
    const mCoal  = ev?.effectKey === 'penurie' ? 0.5 : ev?.effectKey === 'accident' ? 0 : 1
    const solarUnit = BUILDINGS.solar.prodPerUnit     * (isDay ? 1 : 0) * mSolar
    const windUnit  = BUILDINGS.wind.prodPerUnit      * windStrength    * mWind
    const geoUnit   = BUILDINGS.geothermal.prodPerUnit  // toujours constant
    const eff = buildingCounts.coalPlant > 0
      ? Math.min(1, (buildingCounts.coalMine * mMine) / buildingCounts.coalPlant) : 0
    const coalUnit  = BUILDINGS.coalPlant.prodPerUnit * eff * mCoal
    return {
      solar:       { count: buildingCounts.solar,      unit: solarUnit, total: buildingCounts.solar      * solarUnit },
      wind:        { count: buildingCounts.wind,        unit: windUnit,  total: buildingCounts.wind       * windUnit  },
      geothermal:  { count: buildingCounts.geothermal,  unit: geoUnit,   total: buildingCounts.geothermal * geoUnit   },
      coalMine:    { count: buildingCounts.coalMine,    active: Math.round(buildingCounts.coalMine * mMine) },
      coalPlant:   { count: buildingCounts.coalPlant,   unit: coalUnit,  total: buildingCounts.coalPlant  * coalUnit  },
    }
  }, [buildingCounts, isDay, activeEvent, windStrength])

  // Ratio de déficit affiché (0-1) — détermine quelles tuiles city passent en rouge
  const deficitRatio = useMemo(() =>
    energyDemand > 0 ? Math.max(0, 1 - totalProduction / energyDemand) : 0
  , [totalProduction, energyDemand])

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

      tickRef.current += 1
      const tick = tickRef.current
      const ws   = windStrengthRef.current

      // 1. Compter bâtiments
      const g      = gridRef.current
      const counts = { solar: 0, wind: 0, geothermal: 0, coalMine: 0, coalPlant: 0, barrage: 0 }
      for (const tile of g) {
        if (tile.building && counts[tile.building] !== undefined) counts[tile.building]++
      }

      // 2. Déterminer l'événement actif pour CE tick (avant les multiplicateurs)
      //    → le ref est mis à jour immédiatement, setActiveEvent notifie React pour le HUD
      let ev = activeEventRef.current
      if (ev === null) {
        if (tick >= nextEventTickRef.current) {
          const applicable = EVENTS.filter(e => {
            if (e.effectKey === 'greve'         && counts.coalMine  === 0) return false
            if (e.effectKey === 'penurie'       && counts.coalPlant === 0) return false
            if (e.effectKey === 'accident'      && counts.coalPlant === 0) return false
            if (e.effectKey === 'tempete'       && counts.wind      === 0) return false
            if (e.effectKey === 'canicule'      && counts.solar     === 0) return false
            if (e.effectKey === 'journeeSoleil' && counts.solar     === 0) return false
            return true
          })
          const pool     = applicable.length > 0 ? applicable : EVENTS.filter(e => !['greve','penurie','accident'].includes(e.effectKey))
          const newEvent = pool[Math.floor(Math.random() * pool.length)]

          nextEventTickRef.current = tick + EVENT_INTERVAL_MIN + Math.floor(Math.random() * (EVENT_INTERVAL_MAX - EVENT_INTERVAL_MIN))

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
        solar:         ev?.effectKey === 'canicule'     ? 1.5 : ev?.effectKey === 'journeeSoleil' ? 2 : 1,
        wind:          ev?.effectKey === 'tempete'      ? 0   : 1,
        coalMine:      ev?.effectKey === 'greve'        ? 0   : 1,
        coalProd:      ev?.effectKey === 'penurie' ? 0.5 : ev?.effectKey === 'accident' ? 0 : 1,
        coalPollution: ev?.effectKey === 'accident'     ? 2   : 1,
        demand:        ev?.effectKey === 'demandePlus'  ? 1.5 : 1,
      }

      // 4. Productions
      const solarProd          = counts.solar      * BUILDINGS.solar.prodPerUnit      * (isDayRef.current ? 1 : 0) * muls.solar
      const windProd           = counts.wind       * BUILDINGS.wind.prodPerUnit       * ws                          * muls.wind
      const geothermalProd     = counts.geothermal * BUILDINGS.geothermal.prodPerUnit
      const effectiveCoalMines = counts.coalMine   * muls.coalMine
      const coalEff            = counts.coalPlant > 0 ? Math.min(1, effectiveCoalMines / counts.coalPlant) : 0
      const coalProd           = counts.coalPlant  * BUILDINGS.coalPlant.prodPerUnit  * coalEff                     * muls.coalProd
      const totalProd          = solarProd + windProd + geothermalProd + coalProd

      // 5. Demande — source unique : computeDemand() dans buildings.js
      const pop    = populationRef.current
      const demand = computeDemand(pop) * muls.demand

      // 6. Capacité de stockage ce tick
      const maxEnergyThisTick = BASE_STORAGE + counts.barrage * BUILDINGS.barrage.storagePerUnit

      // 7. Surplus / déficit brut
      const surplus    = totalProd - demand
      const rawDeficit = Math.max(0, -surplus)

      // 7b. Part renouvelable
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

      // 10. Pollution
      const pollAdd    = (counts.coalMine  * BUILDINGS.coalMine.pollutionPerSecond
                       + counts.coalPlant * BUILDINGS.coalPlant.pollutionPerSecond * coalEff) * muls.coalPollution
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

      // 16. Compteur de jours
      if (tick % TICKS_PER_DAY === 0) {
        setCurrentDay(d => d + 1)
      }

      // 17. Victoire
      if (pop >= 500 && healthRef.current >= 60 && renewShare >= 50) {
        setGameStatus('won')
        return
      }

    }, 1000)

    return () => {
      clearInterval(timer)
      isLoopRunning.current = false
    }
  }, [growCity])

  // ── Cycle jour/nuit (10s chaque = 20s par jour) ───────────
  useEffect(() => {
    const t = setInterval(() => {
      if (isPausedRef.current) return
      setIsDay(d => {
        const next = !d
        isDayRef.current = next
        return next
      })
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
  }, [selectedBuilding, grid, money, activeEvent, buildingCounts, gameStatus])

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
    tickRef.current = 0
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
          Objectif : 500 hab · santé ≥ 60 · 🌱 ≥ 50%
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
    </div>
  )
}
