export default function BarrageSprite() {
  return (
    <div className="sprite sprite-barrage">
      {/* Eau amont (niveau haut) */}
      <div className="sprite-barrage__water-up" />

      {/* Corps du barrage en béton */}
      <div className="sprite-barrage__body">
        {/* Passerelle supérieure */}
        <div className="sprite-barrage__catwalk" />
        {/* Tour de contrôle */}
        <div className="sprite-barrage__tower" />
        {/* Vannes hydrauliques */}
        <div className="sprite-barrage__gates">
          <div className="sprite-barrage__gate" />
          <div className="sprite-barrage__gate" />
          <div className="sprite-barrage__gate" />
        </div>
      </div>

      {/* Eau aval (niveau bas) */}
      <div className="sprite-barrage__water-down" />
      {/* Écume au pied du barrage */}
      <div className="sprite-barrage__foam" />
    </div>
  )
}
