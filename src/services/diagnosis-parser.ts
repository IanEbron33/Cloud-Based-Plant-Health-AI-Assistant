import { DiagnosisResult } from '../types';
import vegetablesDb from '../../assets/data/vegetables_db.json';

// Types for the vegetables database JSON import structure
interface DatabaseCrop {
  local_name: string;
  scientific_name: string;
  category: string;
  ecological_status: string;
  watering_needs: {
    frequency: string;
    description: string;
  };
  description: string;
  habitat_ecology: string;
  uses: string;
  health_statuses: {
    [key: string]: {
      condition_name: string;
      symptoms: string;
      severity: string;
      organic_treatment: string;
      preventive_measures: string;
    };
  };
}

const db = vegetablesDb as Record<string, DatabaseCrop>;

/**
 * Parses structured markdown from the /diagnose endpoint into a typed DiagnosisResult.
 * Falls back to local database entries if parsing fails or fields are missing.
 */
export function parseDiagnosis(
  markdown: string,
  fallbackCropKey?: string | null,
  imageUri: string = ''
): DiagnosisResult {
  // Helper to extract a single line value by label (resilient to optional bullets/dashes)
  const extractLine = (label: string): string => {
    const regex = new RegExp(`[-\\s]*\\*\\*${label}:?\\*\\*\\s*(.*)`, 'i');
    const match = markdown.match(regex);
    return match ? match[1].trim() : '';
  };

  // Helper to extract multi-line or single-line list values (resilient to optional bullets/dashes)
  const extractList = (label: string, nextLabelPattern: string): string[] => {
    const regex = new RegExp(
      `[-\\s]*\\*\\*${label}:?\\*\\*\\s*([\\s\\S]*?)(?=[-\\s]*\\*\\*${nextLabelPattern}|$)`,
      'i'
    );
    const match = markdown.match(regex);
    if (!match) return [];

    const sectionContent = match[1].trim();
    if (!sectionContent) return [];

    const lines = sectionContent.split('\n');
    const items: string[] = [];

    for (let line of lines) {
      line = line.trim();
      // Remove leading bullet markers: -, *, •, or numbers like 1.
      const cleaned = line.replace(/^[-*•\d\.\s]+/, '').trim();
      if (cleaned) {
        items.push(cleaned);
      }
    }

    // Handle comma or semicolon separated single-line paragraph fallbacks
    if (
      items.length === 1 &&
      !sectionContent.startsWith('-') &&
      !sectionContent.startsWith('*') &&
      !sectionContent.startsWith('•')
    ) {
      if (items[0].includes(';') || items[0].includes(', ')) {
        return items[0]
          .split(/[;,]\s+/)
          .map((i) => i.trim())
          .filter(Boolean);
      }
    }

    return items.length > 0 ? items : [sectionContent];
  };

  // Extract raw text lines
  const cropLine = extractLine('Crop Identified');
  const condition = extractLine('Condition');
  const severityStr = extractLine('Severity');
  const healthScoreStr = extractLine('Health Score');
  const confidenceScoreStr = extractLine('Confidence Score');
  const careTip = extractLine('Care Tip');

  // Extract list fields
  const symptoms = extractList('Symptoms Observed', 'Organic Treatment');
  const treatment = extractList('Organic Treatment', 'Prevention');
  const prevention = extractList('Prevention', 'Care Tip');

  // Parse Crop Name & Scientific Name (e.g. "Talong (Solanum melongena)")
  let cropLocalName = '';
  let cropScientificName = '';
  if (cropLine) {
    const match = cropLine.match(/^([^(]+)(?:\(([^)]+)\))?/);
    if (match) {
      cropLocalName = match[1].trim();
      cropScientificName = match[2] ? match[2].trim() : '';
    }
  }

  // Parse dynamic scores, stripping non-digit symbols
  const healthScore = parseInt(healthScoreStr.replace(/[^\d]/g, ''), 10) || 100;
  const confidenceScore = parseInt(confidenceScoreStr.replace(/[^\d]/g, ''), 10) || 90;

  // Normalize Severity level to the allowed union type
  let severity: 'None' | 'Low' | 'Moderate' | 'High' = 'None';
  const lSeverity = severityStr.toLowerCase();
  if (lSeverity.includes('high') || lSeverity.includes('mataas')) {
    severity = 'High';
  } else if (lSeverity.includes('moderate') || lSeverity.includes('katamtaman')) {
    severity = 'Moderate';
  } else if (lSeverity.includes('low') || lSeverity.includes('mababa')) {
    severity = 'Low';
  } else if (lSeverity.includes('none') || lSeverity.includes('walang')) {
    severity = 'None';
  }

  // Determine database lookup key
  const cropKey = fallbackCropKey || cropLocalName || 'Talong';
  const cropDb = db[cropKey] || db['Talong'];

  // Fill in missing details from local database
  const category = cropDb ? cropDb.category : 'Vegetable';
  const ecologicalStatus = cropDb ? cropDb.ecological_status : 'Cultivated';
  const wateringFrequency = cropDb ? cropDb.watering_needs.frequency : 'Moderate';
  const wateringDescription = cropDb ? cropDb.watering_needs.description : '';

  // Get default statuses from local database for fallback
  const healthyStatus = cropDb?.health_statuses?.[`${cropKey}___Healthy`];

  return {
    cropLocalName: cropLocalName || cropDb?.local_name || cropKey,
    cropScientificName: cropScientificName || cropDb?.scientific_name || '',
    category,
    ecologicalStatus,
    condition: condition || 'Healthy (Malusog)',
    severity,
    healthScore,
    confidenceScore,
    wateringFrequency,
    wateringDescription,
    symptoms: symptoms.length > 0 ? symptoms : [healthyStatus?.symptoms || 'Healthy leaves.'],
    treatment:
      treatment.length > 0
        ? treatment
        : [healthyStatus?.organic_treatment || 'No treatment required.'],
    prevention:
      prevention.length > 0
        ? prevention
        : [healthyStatus?.preventive_measures || 'Maintain normal plant care.'],
    careTip: careTip || 'Continue monitoring your plant regularly.',
    imageUri,
  };
}
