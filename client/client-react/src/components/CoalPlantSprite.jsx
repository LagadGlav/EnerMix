export default function CoalPlantSprite() {
  return (
    <div className="sprite sprite-coal-plant">
      {/* Cheminée gauche avec fumée */}
      <div className="sprite-coal-plant__chimney sprite-coal-plant__chimney--main">
        <div className="sprite-coal-plant__smoke s1" />
        <div className="sprite-coal-plant__smoke s2" />
        <div className="sprite-coal-plant__smoke s3" />
      </div>
      {/* Petite cheminée */}
      <div className="sprite-coal-plant__chimney sprite-coal-plant__chimney--small">
        <div className="sprite-coal-plant__smoke s2" />
      </div>
      {/* Bâtiment principal */}
      <div className="sprite-coal-plant__body">
        <div className="sprite-coal-plant__window" />
        <div className="sprite-coal-plant__window" />
      </div>
      {/* Annexe turbine */}
      <div className="sprite-coal-plant__annex" />
    </div>
  )
}
