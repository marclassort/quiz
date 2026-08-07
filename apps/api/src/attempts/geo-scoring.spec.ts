import { computeMapPlaceResult, distanceKm, isFeatureClickCorrect } from './geo-scoring';

describe('distanceKm', () => {
  it('vaut 0 pour deux points identiques (distance nulle)', () => {
    expect(distanceKm({ lat: 48.8566, lng: 2.3522 }, { lat: 48.8566, lng: 2.3522 })).toBe(0);
  });

  it('gère le franchissement de l’antiméridien', () => {
    // 179°E et 179°O : 2° d'écart réel, pas 358°.
    const distanceViaMeridian = distanceKm({ lat: 0, lng: 179 }, { lat: 0, lng: -179 });
    const distanceEquivalent = distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 2 });
    expect(distanceViaMeridian).toBeCloseTo(distanceEquivalent, 0);
  });

  it('reste calculable à proximité des pôles', () => {
    const distance = distanceKm({ lat: 89.9, lng: 0 }, { lat: 89.9, lng: 180 });
    expect(distance).toBeGreaterThan(0);
    expect(Number.isFinite(distance)).toBe(true);
  });

  it('rejette des coordonnées hors bornes', () => {
    expect(() => distanceKm({ lat: 91, lng: 0 }, { lat: 0, lng: 0 })).toThrow(RangeError);
    expect(() => distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 181 })).toThrow(RangeError);
  });
});

describe('computeMapPlaceResult', () => {
  const target = { lat: 48.8566, lng: 2.3522 };

  it('distance nulle : points pleins', () => {
    const result = computeMapPlaceResult(target, target, 50, 10);
    expect(result).toEqual({ isCorrect: true, distanceKm: 0, pointsEarned: 10 });
  });

  it('distance exactement égale à toleranceKm : correct mais 0 point', () => {
    // ~50 km plein nord de la cible.
    const submitted = { lat: target.lat + 50 / 111, lng: target.lng };
    const result = computeMapPlaceResult(target, submitted, distanceKm(target, submitted), 10);
    expect(result.isCorrect).toBe(true);
    expect(result.pointsEarned).toBe(0);
  });

  it('au-delà de toleranceKm : incorrect, 0 point', () => {
    const submitted = { lat: target.lat + 1, lng: target.lng }; // ~111 km
    const result = computeMapPlaceResult(target, submitted, 50, 10);
    expect(result.isCorrect).toBe(false);
    expect(result.pointsEarned).toBe(0);
  });

  it('décroissance linéaire à mi-tolérance', () => {
    const submitted = { lat: target.lat + 25 / 111, lng: target.lng }; // ~25 km
    const result = computeMapPlaceResult(target, submitted, 50, 10);
    expect(result.isCorrect).toBe(true);
    expect(result.pointsEarned).toBe(5);
  });

  it('rejette une tolérance non positive', () => {
    expect(() => computeMapPlaceResult(target, target, 0, 10)).toThrow(RangeError);
  });

  it('rejette des coordonnées hors bornes', () => {
    expect(() => computeMapPlaceResult(target, { lat: 200, lng: 0 }, 50, 10)).toThrow(RangeError);
  });
});

describe('isFeatureClickCorrect', () => {
  it('accepte une feature attendue', () => {
    expect(isFeatureClickCorrect(['FRA', 'DEU'], 'FRA')).toBe(true);
  });

  it('rejette une feature non attendue', () => {
    expect(isFeatureClickCorrect(['FRA'], 'DEU')).toBe(false);
  });
});
