import { distance as turfDistance, point } from '@turf/turf';

export interface Coordinates {
  lat: number;
  lng: number;
}

function assertValidCoordinates(coords: Coordinates): void {
  if (coords.lat < -90 || coords.lat > 90) {
    throw new RangeError(`Latitude hors bornes : ${coords.lat}`);
  }
  if (coords.lng < -180 || coords.lng > 180) {
    throw new RangeError(`Longitude hors bornes : ${coords.lng}`);
  }
}

/**
 * Distance orthodromique en km entre deux points, via @turf/turf (ADR 001).
 * Le franchissement de l'antiméridien et les latitudes polaires sont gérés
 * nativement par le calcul du grand cercle, sans traitement particulier ici.
 */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  assertValidCoordinates(a);
  assertValidCoordinates(b);
  return turfDistance(point([a.lng, a.lat]), point([b.lng, b.lat]), { units: 'kilometers' });
}

export interface MapPlaceResult {
  isCorrect: boolean;
  distanceKm: number;
  pointsEarned: number;
}

/**
 * Barème `MAP_PLACE` (docs/SCORING.md, game-rules.md §5, scoringCurve
 * "LINEAR" — la seule pour l'instant, cf. ADR/plan étape 3) : décroissance
 * linéaire du score entre 0 km (points pleins) et `toleranceKm` (0 point).
 * `isCorrect` = à l'intérieur de la tolérance, y compris pile à la limite —
 * auquel cas 0 point est tout de même gagné (cas limite volontaire, voir
 * docs/SCORING.md).
 */
export function computeMapPlaceResult(
  target: Coordinates,
  submitted: Coordinates,
  toleranceKm: number,
  points: number,
): MapPlaceResult {
  if (toleranceKm <= 0) {
    throw new RangeError(`toleranceKm doit être positif : ${toleranceKm}`);
  }

  const distance = distanceKm(target, submitted);
  const isCorrect = distance <= toleranceKm;
  const ratio = Math.max(0, 1 - distance / toleranceKm);
  const pointsEarned = isCorrect ? Math.round(points * ratio) : 0;

  return { isCorrect, distanceKm: distance, pointsEarned };
}

/**
 * `MAP_CLICK` (data-and-api.md §2) : la réponse est un identifiant de
 * feature, validée par appartenance à `featureIds`.
 */
export function isFeatureClickCorrect(
  expectedFeatureIds: string[],
  submittedFeatureId: string,
): boolean {
  return expectedFeatureIds.includes(submittedFeatureId);
}
