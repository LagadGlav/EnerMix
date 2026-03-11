export default function WindTurbineSprite() {
  return (
    <div className="sprite sprite-wind">
      {/* Mât */}
      <div className="sprite-wind__mast" />
      {/* Base */}
      <div className="sprite-wind__base" />
      {/* Rotor (tourne via CSS var --turbine-speed) */}
      <div className="sprite-wind__rotor-wrap">
        <div className="sprite-wind__rotor">
          <div className="sprite-wind__blade sprite-wind__blade--0" />
          <div className="sprite-wind__blade sprite-wind__blade--1" />
          <div className="sprite-wind__blade sprite-wind__blade--2" />
        </div>
      </div>
      {/* Hub */}
      <div className="sprite-wind__hub" />
    </div>
  )
}
