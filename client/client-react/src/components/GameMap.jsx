import { memo, useCallback, useMemo } from 'react'
import { GRID_COLS, GRID_ROWS } from '../data/initialMap.js'
import { BUILDINGS, TILE_TYPES, TILE_DISPLAY } from '../data/buildings.js'
import BuildingSprite from './BuildingSprite.jsx'

// Tuile individuelle — mémoïsée pour éviter les re-renders inutiles
const Tile = memo(function Tile({ tile, index, isPlaceable, isBlocked, isSellTarget, isStressed, onClick }) {
  const tileDisplay = TILE_DISPLAY[tile.type] ?? TILE_DISPLAY[TILE_TYPES.EMPTY]
  const buildingDef = tile.building ? BUILDINGS[tile.building] : null

  const classNames = [
    'tile',
    `tile--${tile.type}`,
    isPlaceable  ? 'tile--placeable'   : '',
    isBlocked    ? 'tile--blocked'     : '',
    isSellTarget ? 'tile--sell-target' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={classNames}
      onClick={() => onClick(index)}
      title={buildingDef ? `${buildingDef.label} — clic pour vendre` : tileDisplay.label}
    >
      {buildingDef ? (
        <div className="tile__building">
          <BuildingSprite type={tile.building} />
        </div>
      ) : (
        tileDisplay.icon && <span className="tile__bg-icon">{tileDisplay.icon}</span>
      )}
      {/* Overlay rouge + ❗ quand la ville est en déficit d'alimentation */}
      {isStressed && <div className="tile__stress-overlay">!</div>}
    </div>
  )
})

// Composant principal de la carte
const GameMap = memo(function GameMap({ grid, selectedBuilding, onTileClick, sellTargetIndex, deficitRatio = 0 }) {
  const handleClick = useCallback((index) => onTileClick(index), [onTileClick])

  const selectedDef = selectedBuilding ? BUILDINGS[selectedBuilding] : null

  // Calcule quelles tuiles city afficher en mode stress
  // → les tiles city les plus éloignées du centre (ajoutées en dernier) sont stressées en premier
  const stressedCityIndices = useMemo(() => {
    if (deficitRatio <= 0.02) return new Set()
    const cityIndices = grid.reduce((acc, tile, i) => {
      if (tile.type === TILE_TYPES.CITY) acc.push(i)
      return acc
    }, [])
    const count = Math.ceil(cityIndices.length * deficitRatio)
    return new Set(cityIndices.slice(-count))
  }, [grid, deficitRatio])

  return (
    <div className="game-map-container">
      <div
        className="game-map"
        style={{ '--cols': GRID_COLS, '--rows': GRID_ROWS }}
      >
        {grid.map((tile, index) => {
          const canBuildHere = !!(selectedDef &&
            !tile.building &&
            selectedDef.allowedOn.includes(tile.type))

          const isBlocked = !!(selectedBuilding &&
            !canBuildHere &&
            tile.type !== TILE_TYPES.CITY &&
            tile.type !== TILE_TYPES.RIVER)

          return (
            <Tile
              key={index}
              tile={tile}
              index={index}
              isPlaceable={canBuildHere}
              isBlocked={isBlocked}
              isSellTarget={index === sellTargetIndex}
              isStressed={stressedCityIndices.has(index)}
              onClick={handleClick}
            />
          )
        })}
      </div>
    </div>
  )
})

export default GameMap
