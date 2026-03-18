import WindTurbineSprite  from './WindTurbineSprite.jsx'
import SolarPanelSprite   from './SolarPanelSprite.jsx'
import CoalPlantSprite    from './CoalPlantSprite.jsx'
import CoalMineSprite     from './CoalMineSprite.jsx'
import GeothermalSprite   from './GeothermalSprite.jsx'
import BarrageSprite      from './BarrageSprite.jsx'
import UraniumMineSprite  from './UraniumMineSprite.jsx'
import NuclearPlantSprite from './NuclearPlantSprite.jsx'

export default function BuildingSprite({ type }) {
  if (type === 'wind')         return <WindTurbineSprite />
  if (type === 'solar')        return <SolarPanelSprite />
  if (type === 'coalPlant')    return <CoalPlantSprite />
  if (type === 'coalMine')     return <CoalMineSprite />
  if (type === 'geothermal')   return <GeothermalSprite />
  if (type === 'barrage')      return <BarrageSprite />
  if (type === 'uraniumMine')  return <UraniumMineSprite />
  if (type === 'nuclearPlant') return <NuclearPlantSprite />
  return null
}
