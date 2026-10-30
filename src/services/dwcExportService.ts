import { Observation } from '../schemas/bliffe';

export interface DarwinCoreRecord {
  'dwc:occurrenceID': string;
  'dwc:basisOfRecord': string;
  'dwc:scientificName'?: string;
  'dwc:vernacularName'?: string;
  'dwc:decimalLatitude': number | null;
  'dwc:decimalLongitude': number | null;
  'dwc:coordinateUncertaintyInMeters': number | null;
  'dwc:eventDate': string;
  'dwc:individualCount'?: number;
  'dwc:lifeStage'?: string;
  'dwc:habitat'?: string;
  'dwc:fieldNotes'?: string;
  'dwc:identificationVerificationStatus'?: string;
  'dwc:dynamicProperties': string;
}

export function toDarwinCoreRecord(obs: Observation): DarwinCoreRecord {
  const dynamicProps = {
    tags: obs.tags || [],
    organismStatus: obs.organismStatus,
    locationVisibility: obs.locationVisibility,
    locationSource: obs.location_source,
    hasTraditionalKnowledge: obs.hasTraditionalKnowledge,
    traditionalKnowledgeSource: obs.traditionalKnowledgeSource,
    administrativeWard: obs.wardName || obs.wardId,
    surveyId: obs.surveyId,
    projectId: obs.projectId,
    projectIds: obs.projectIds,
  };

  return {
    'dwc:occurrenceID': obs.id,
    'dwc:basisOfRecord': obs.basis_of_record || 'HumanObservation',
    'dwc:scientificName': obs.scientificName?.trim() || undefined,
    'dwc:vernacularName': obs.localName?.trim() || obs.speciesName?.trim() || undefined,
    'dwc:decimalLatitude': obs.latitude ?? null,
    'dwc:decimalLongitude': obs.longitude ?? null,
    'dwc:coordinateUncertaintyInMeters': obs.accuracyMeters ?? null,
    'dwc:eventDate':
      obs.observationAt || obs.recordedAt || obs.createdAt || new Date().toISOString(),
    'dwc:individualCount': obs.individualCount,
    'dwc:lifeStage': obs.lifeStage || undefined,
    'dwc:habitat': obs.microHabitat || undefined,
    'dwc:fieldNotes': obs.notes?.trim() || undefined,
    'dwc:identificationVerificationStatus': obs.verificationStatus,
    'dwc:dynamicProperties': JSON.stringify(dynamicProps),
  };
}

export function exportObservationsAsDwC(observations: Observation[]): {
  exportDate: string;
  recordCount: number;
  records: DarwinCoreRecord[];
} {
  return {
    exportDate: new Date().toISOString(),
    recordCount: observations.length,
    records: observations.map(toDarwinCoreRecord),
  };
}
