export default function GeothermalSprite() {
  return (
    <div className="sprite sprite-geo">
      {/* Fondations rocheuses */}
      <div className="sprite-geo__ground" />

      {/* Bâtiment industriel principal */}
      <div className="sprite-geo__building">
        <div className="sprite-geo__window" />
        <div className="sprite-geo__window" />
      </div>

      {/* Tuyau gauche */}
      <div className="sprite-geo__pipe sprite-geo__pipe--l">
        <div className="sprite-geo__steam sprite-geo__steam--1" />
        <div className="sprite-geo__steam sprite-geo__steam--2" />
      </div>

      {/* Tuyau central (le plus haut) */}
      <div className="sprite-geo__pipe sprite-geo__pipe--c">
        <div className="sprite-geo__steam sprite-geo__steam--1" />
        <div className="sprite-geo__steam sprite-geo__steam--2" />
        <div className="sprite-geo__steam sprite-geo__steam--3" />
      </div>

      {/* Tuyau droit */}
      <div className="sprite-geo__pipe sprite-geo__pipe--r">
        <div className="sprite-geo__steam sprite-geo__steam--1" />
        <div className="sprite-geo__steam sprite-geo__steam--2" />
      </div>

      {/* Lueur géothermale au sol */}
      <div className="sprite-geo__heat" />
    </div>
  )
}
