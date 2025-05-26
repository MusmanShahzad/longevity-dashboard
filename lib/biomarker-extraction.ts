// Biomarker extraction utilities for lab reports
export interface Biomarker {
  name: string
  value: number
  unit: string
  referenceRange: string
  status: 'normal' | 'high' | 'low' | 'critical'
  category: 'cardiovascular' | 'metabolic' | 'inflammatory' | 'hormonal' | 'other'
}

export interface ExtractedBiomarkers {
  biomarkers: Biomarker[]
  extractionMethod: 'ocr' | 'text_parsing' | 'manual'
  confidence: number
  extractedAt: string
}

// Common biomarker patterns and reference ranges
const BIOMARKER_PATTERNS = {
  // Cardiovascular markers
  crp: {
    patterns: [/c[-\s]*reactive[-\s]*protein/i, /crp/i, /c-rp/i],
    name: 'C-Reactive Protein',
    category: 'inflammatory' as const,
    referenceRange: '<3.0 mg/L',
    unit: 'mg/L'
  },
  ldl: {
    patterns: [/ldl[-\s]*cholesterol/i, /ldl[-\s]*chol/i, /low[-\s]*density/i],
    name: 'LDL Cholesterol',
    category: 'cardiovascular' as const,
    referenceRange: '<100 mg/dL',
    unit: 'mg/dL'
  },
  hdl: {
    patterns: [/hdl[-\s]*cholesterol/i, /hdl[-\s]*chol/i, /high[-\s]*density/i],
    name: 'HDL Cholesterol',
    category: 'cardiovascular' as const,
    referenceRange: '>40 mg/dL (M), >50 mg/dL (F)',
    unit: 'mg/dL'
  },
  
  // Metabolic markers
  glucose: {
    patterns: [/glucose/i, /blood[-\s]*sugar/i, /fasting[-\s]*glucose/i],
    name: 'Glucose',
    category: 'metabolic' as const,
    referenceRange: '70-100 mg/dL',
    unit: 'mg/dL'
  },
  hba1c: {
    patterns: [/hba1c/i, /hemoglobin[-\s]*a1c/i, /glycated[-\s]*hemoglobin/i],
    name: 'HbA1c',
    category: 'metabolic' as const,
    referenceRange: '<5.7%',
    unit: '%'
  },
  insulin: {
    patterns: [/insulin/i, /fasting[-\s]*insulin/i],
    name: 'Insulin',
    category: 'metabolic' as const,
    referenceRange: '2.6-24.9 μIU/mL',
    unit: 'μIU/mL'
  },
  
  // Hormonal markers
  testosterone: {
    patterns: [/testosterone/i, /total[-\s]*testosterone/i],
    name: 'Testosterone',
    category: 'hormonal' as const,
    referenceRange: '300-1000 ng/dL (M), 15-70 ng/dL (F)',
    unit: 'ng/dL'
  },
  cortisol: {
    patterns: [/cortisol/i, /morning[-\s]*cortisol/i],
    name: 'Cortisol',
    category: 'hormonal' as const,
    referenceRange: '6-23 μg/dL',
    unit: 'μg/dL'
  },
  
  // Other important markers
  vitaminD: {
    patterns: [/vitamin[-\s]*d/i, /25[-\s]*oh[-\s]*d/i, /calcidiol/i],
    name: 'Vitamin D',
    category: 'other' as const,
    referenceRange: '30-100 ng/mL',
    unit: 'ng/mL'
  }
}

// Extract biomarkers from text content
export function extractBiomarkersFromText(text: string): ExtractedBiomarkers {
  const biomarkers: Biomarker[] = []
  const lines = text.split('\n')
  
  for (const line of lines) {
    for (const [key, config] of Object.entries(BIOMARKER_PATTERNS)) {
      for (const pattern of config.patterns) {
        if (pattern.test(line)) {
          const biomarker = parseBiomarkerLine(line, config)
          if (biomarker) {
            biomarkers.push(biomarker)
            break
          }
        }
      }
    }
  }
  
  return {
    biomarkers,
    extractionMethod: 'text_parsing',
    confidence: calculateConfidence(biomarkers),
    extractedAt: new Date().toISOString()
  }
}

// Parse individual biomarker line
function parseBiomarkerLine(line: string, config: any): Biomarker | null {
  // Look for numeric values in the line
  const numericPattern = /(\d+\.?\d*)\s*([a-zA-Z/%μ]+)/g
  const matches = Array.from(line.matchAll(numericPattern))
  
  if (matches.length === 0) return null
  
  const [, valueStr, unit] = matches[0]
  const value = parseFloat(valueStr)
  
  if (isNaN(value)) return null
  
  return {
    name: config.name,
    value,
    unit: unit || config.unit,
    referenceRange: config.referenceRange,
    status: determineBiomarkerStatus(config.name, value, unit),
    category: config.category
  }
}

// Determine if biomarker value is normal, high, low, or critical
function determineBiomarkerStatus(name: string, value: number, unit: string): 'normal' | 'high' | 'low' | 'critical' {
  // Simplified status determination - in production, this would be more sophisticated
  const ranges: Record<string, { low: number; high: number; critical?: number }> = {
    'C-Reactive Protein': { low: 0, high: 3.0, critical: 10.0 },
    'LDL Cholesterol': { low: 0, high: 100, critical: 190 },
    'HDL Cholesterol': { low: 40, high: 1000 },
    'Glucose': { low: 70, high: 100, critical: 200 },
    'HbA1c': { low: 0, high: 5.7, critical: 9.0 },
    'Testosterone': { low: 300, high: 1000 },
    'Cortisol': { low: 6, high: 23, critical: 50 },
    'Vitamin D': { low: 30, high: 100 }
  }
  
  const range = ranges[name]
  if (!range) return 'normal'
  
  if (range.critical && value > range.critical) return 'critical'
  if (value > range.high) return 'high'
  if (value < range.low) return 'low'
  return 'normal'
}

// Calculate extraction confidence based on number and quality of matches
function calculateConfidence(biomarkers: Biomarker[]): number {
  if (biomarkers.length === 0) return 0
  if (biomarkers.length >= 5) return 0.9
  if (biomarkers.length >= 3) return 0.8
  if (biomarkers.length >= 2) return 0.7
  return 0.6
}

// Mock OCR function (in production, integrate with Google Vision API, AWS Textract, etc.)
export async function extractTextFromPDF(fileUrl: string): Promise<string> {
  // This is a mock implementation
  // In production, you would integrate with:
  // - Google Cloud Vision API
  // - AWS Textract
  // - Azure Computer Vision
  // - Tesseract.js for client-side OCR
  
  return `
    COMPREHENSIVE METABOLIC PANEL
    Patient: John Doe
    Date: ${new Date().toLocaleDateString()}
    
    LIPID PANEL:
    Total Cholesterol: 185 mg/dL
    LDL Cholesterol: 110 mg/dL
    HDL Cholesterol: 45 mg/dL
    Triglycerides: 150 mg/dL
    
    GLUCOSE METABOLISM:
    Glucose: 95 mg/dL
    HbA1c: 5.4%
    Insulin: 8.5 μIU/mL
    
    INFLAMMATORY MARKERS:
    C-Reactive Protein: 2.1 mg/L
    
    HORMONES:
    Testosterone: 450 ng/dL
    Cortisol: 15 μg/dL
    
    VITAMINS:
    Vitamin D: 35 ng/mL
  `
}

// Generate health insights based on biomarkers
export function generateBiomarkerInsights(biomarkers: Biomarker[]): string[] {
  const insights: string[] = []
  
  for (const biomarker of biomarkers) {
    switch (biomarker.status) {
      case 'critical':
        insights.push(`🚨 CRITICAL: ${biomarker.name} is critically elevated (${biomarker.value} ${biomarker.unit}). Seek immediate medical attention.`)
        break
      case 'high':
        insights.push(`⚠️ HIGH: ${biomarker.name} is above normal range (${biomarker.value} ${biomarker.unit}). Consider lifestyle modifications.`)
        break
      case 'low':
        insights.push(`⬇️ LOW: ${biomarker.name} is below normal range (${biomarker.value} ${biomarker.unit}). May need supplementation.`)
        break
      case 'normal':
        insights.push(`✅ NORMAL: ${biomarker.name} is within healthy range (${biomarker.value} ${biomarker.unit}).`)
        break
    }
  }
  
  return insights
} 