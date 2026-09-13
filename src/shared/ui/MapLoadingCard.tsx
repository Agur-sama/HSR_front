/**
 * Карточка на месте карты, пока та едет.
 *
 * Карта тянет за собой библиотеку MapLibre — самый тяжёлый кусок сборки, — и
 * подключается по требованию, только на шагах, где она есть. Заглушка носит
 * тот же класс `osm-map-card`, что и сама карта: раскладка шага задана через
 * него, и без этого экран на мгновение перестраивался бы.
 */
export function MapLoadingCard({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <section aria-busy="true" className="osm-map-card" aria-label="Карта трассы">
      <div className="osm-map-card__head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
      </div>
      <div className="map-placeholder">
        <p>Карта загружается…</p>
      </div>
    </section>
  );
}
