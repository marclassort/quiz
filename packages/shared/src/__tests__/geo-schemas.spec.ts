import { describe, expect, it } from 'vitest';

import {
  geoDatasetSchema,
  geoQuestionPayloadSchema,
  mapClickPayloadSchema,
  mapPlacePayloadSchema,
  publicGeoQuestionPayloadSchema,
  publicMapClickPayloadSchema,
  publicMapPlacePayloadSchema,
} from '../quiz/geo';

const datasetId = '11111111-1111-4111-8111-111111111111';
const datasetSlug = 'world-countries';

const fullMapClickPayload = {
  datasetId,
  datasetVersion: 'v1',
  featureIds: ['FRA', 'DEU'],
  prompt: 'Cliquez sur la France',
  distractorPolicy: 'ALL_FEATURES',
};

const fullMapPlacePayload = {
  datasetId,
  datasetVersion: 'v1',
  targetLat: 48.8566,
  targetLng: 2.3522,
  toleranceKm: 50,
  scoringCurve: 'LINEAR',
};

describe('mapClickPayloadSchema', () => {
  it('accepte un payload complet valide', () => {
    expect(mapClickPayloadSchema.safeParse(fullMapClickPayload).success).toBe(true);
  });

  it('rejette une liste de features vide (aucune bonne réponse possible)', () => {
    expect(
      mapClickPayloadSchema.safeParse({ ...fullMapClickPayload, featureIds: [] }).success,
    ).toBe(false);
  });
});

describe('mapPlacePayloadSchema', () => {
  it('accepte un payload complet valide', () => {
    expect(mapPlacePayloadSchema.safeParse(fullMapPlacePayload).success).toBe(true);
  });

  it.each([
    ['latitude hors bornes', { targetLat: 91 }],
    ['longitude hors bornes', { targetLng: -181 }],
    ['tolérance négative', { toleranceKm: -1 }],
  ])('rejette : %s', (_label, override) => {
    expect(mapPlacePayloadSchema.safeParse({ ...fullMapPlacePayload, ...override }).success).toBe(
      false,
    );
  });
});

describe('anti-triche : schémas publics', () => {
  // Simule ce que construit le serveur : le payload admin (avec datasetId)
  // complété par le slug résolu, avant d'être filtré par le schéma public.
  it('publicMapClickPayloadSchema ne porte jamais featureIds ni datasetId, même reçus en entrée', () => {
    const result = publicMapClickPayloadSchema.parse({ ...fullMapClickPayload, datasetSlug });
    expect((result as Record<string, unknown>).featureIds).toBeUndefined();
    expect((result as Record<string, unknown>).datasetId).toBeUndefined();
    expect(result).toEqual({
      datasetSlug,
      datasetVersion: 'v1',
      prompt: 'Cliquez sur la France',
      distractorPolicy: 'ALL_FEATURES',
    });
  });

  it('publicMapPlacePayloadSchema ne porte jamais targetLat/targetLng ni datasetId, même reçus en entrée', () => {
    const result = publicMapPlacePayloadSchema.parse({ ...fullMapPlacePayload, datasetSlug });
    expect((result as Record<string, unknown>).targetLat).toBeUndefined();
    expect((result as Record<string, unknown>).targetLng).toBeUndefined();
    expect((result as Record<string, unknown>).datasetId).toBeUndefined();
    expect(result).toEqual({
      datasetSlug,
      datasetVersion: 'v1',
      toleranceKm: 50,
      scoringCurve: 'LINEAR',
    });
  });
});

describe('unions discriminées', () => {
  it('geoQuestionPayloadSchema route MAP_CLICK et MAP_PLACE vers le bon payload', () => {
    expect(
      geoQuestionPayloadSchema.safeParse({ type: 'MAP_CLICK', payload: fullMapClickPayload })
        .success,
    ).toBe(true);
    expect(
      geoQuestionPayloadSchema.safeParse({ type: 'MAP_PLACE', payload: fullMapPlacePayload })
        .success,
    ).toBe(true);
  });

  it('geoQuestionPayloadSchema rejette un payload qui ne correspond pas au type déclaré', () => {
    expect(
      geoQuestionPayloadSchema.safeParse({ type: 'MAP_CLICK', payload: fullMapPlacePayload })
        .success,
    ).toBe(false);
  });

  it('publicGeoQuestionPayloadSchema route aussi correctement et reste dépouillé', () => {
    const result = publicGeoQuestionPayloadSchema.parse({
      type: 'MAP_PLACE',
      payload: { ...fullMapPlacePayload, datasetSlug },
    });
    expect(result.type).toBe('MAP_PLACE');
    expect((result.payload as Record<string, unknown>).targetLat).toBeUndefined();
  });
});

describe('geoDatasetSchema', () => {
  it('accepte un dataset complet', () => {
    expect(
      geoDatasetSchema.safeParse({
        id: datasetId,
        slug: 'world-countries',
        name: 'Pays du monde',
        kind: 'COUNTRY',
        scope: 'world',
        sourceName: 'Natural Earth — Admin 0 Countries (1:110m)',
        sourceUrl: 'https://www.naturalearthdata.com/',
        license: 'Public Domain',
        attributionText: 'Cartographie : Natural Earth (domaine public).',
        version: 'v1',
        updatedAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
  });

  it('rejette un kind hors énumération', () => {
    expect(
      geoDatasetSchema.safeParse({
        id: datasetId,
        slug: 'x',
        name: 'x',
        kind: 'PLANET',
        scope: 'world',
        sourceName: 'x',
        sourceUrl: 'x',
        license: 'x',
        attributionText: 'x',
        version: 'v1',
        updatedAt: new Date().toISOString(),
      }).success,
    ).toBe(false);
  });
});
