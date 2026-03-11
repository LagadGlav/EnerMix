export default function CoalMineSprite() {
  return (
    <div className="sprite sprite-mine">
      {/* Poutres de soutènement */}
      <div className="sprite-mine__beam sprite-mine__beam--l" />
      <div className="sprite-mine__beam sprite-mine__beam--r" />
      {/* Toit triangulaire */}
      <div className="sprite-mine__roof" />
      {/* Entrée (arche noire) */}
      <div className="sprite-mine__entrance" />
      {/* Rails */}
      <div className="sprite-mine__tracks">
        <div className="sprite-mine__rail" />
        <div className="sprite-mine__rail" />
        <div className="sprite-mine__crosstie" />
        <div className="sprite-mine__crosstie sprite-mine__crosstie--2" />
        <div className="sprite-mine__crosstie sprite-mine__crosstie--3" />
      </div>
    </div>
  )
}
