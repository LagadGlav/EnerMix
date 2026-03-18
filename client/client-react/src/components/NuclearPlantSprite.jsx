export default function NuclearPlantSprite() {
  return (
    <div className="sprite sprite-nuclear">
      {/* Tour de refroidissement gauche (grande) */}
      <div className="sprite-nuclear__tower sprite-nuclear__tower--l">
        <div className="sprite-nuclear__steam s1" />
        <div className="sprite-nuclear__steam s2" />
      </div>
      {/* Tour de refroidissement droite (petite) */}
      <div className="sprite-nuclear__tower sprite-nuclear__tower--r">
        <div className="sprite-nuclear__steam s3" />
      </div>
      {/* Dôme réacteur */}
      <div className="sprite-nuclear__dome" />
      {/* Base commune */}
      <div className="sprite-nuclear__base" />
    </div>
  )
}
