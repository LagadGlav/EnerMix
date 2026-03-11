export default function SolarPanelSprite() {
  return (
    <div className="sprite sprite-solar">
      <div className="sprite-solar__frame">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="sprite-solar__cell" />
        ))}
      </div>
      <div className="sprite-solar__leg sprite-solar__leg--l" />
      <div className="sprite-solar__leg sprite-solar__leg--r" />
    </div>
  )
}
