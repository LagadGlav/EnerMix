export default function UraniumMineSprite() {
  return (
    <div className="sprite sprite-uranium-mine">
      {/* Panneau hazmat en haut */}
      <div className="sprite-uranium-mine__sign" />
      {/* Poutres de soutènement */}
      <div className="sprite-uranium-mine__beam sprite-uranium-mine__beam--l" />
      <div className="sprite-uranium-mine__beam sprite-uranium-mine__beam--r" />
      {/* Toit triangulaire */}
      <div className="sprite-uranium-mine__roof" />
      {/* Entrée (arche sombre) */}
      <div className="sprite-uranium-mine__entrance" />
      {/* Fûts de stockage uranium */}
      <div className="sprite-uranium-mine__barrel" />
      <div className="sprite-uranium-mine__barrel sprite-uranium-mine__barrel--2" />
    </div>
  )
}
