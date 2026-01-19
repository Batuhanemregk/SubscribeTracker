/**
 * Detection Service - Email scanning and subscription detection
 * Stub implementation - to be connected to real email APIs
 */
import knownServices from '../data/known-services.json';
import type { DetectionCandidate, EmailAccount, Subscription } from '../types';

export interface ScanOptions {
  accountId: string;
  lookbackDays?: number;
  fullBodyParsing?: boolean;
}

export interface ScanResult {
  success: boolean;
  emailsScanned: number;
  candidates: DetectionCandidate[];
  errors?: string[];
}

// Known services for pattern matching
export const KNOWN_SERVICES = knownServices.services;
export const CATEGORIES = knownServices.categories;

/**
 * Find matching service by sender domain
 */
export function findServiceByDomain(domain: string): typeof KNOWN_SERVICES[0] | null {
  const lowerDomain = domain.toLowerCase();
  return KNOWN_SERVICES.find(service => 
    service.senderPatterns.some(pattern => 
      lowerDomain.includes(pattern.toLowerCase())
    )
  ) || null;
}

/**
 * Check if email subject matches subscription patterns
 */
export function isSubscriptionEmail(subject: string, body?: string): boolean {
  const subjectLower = subject.toLowerCase();
  const subscriptionKeywords = [
    'subscription', 'payment', 'receipt', 'invoice', 'billing',
    'renewal', 'membership', 'charge', 'order confirmation'
  ];
  
  return subscriptionKeywords.some(keyword => subjectLower.includes(keyword));
}

/**
 * Extract amount from text using regex patterns
 */
export function extractAmount(text: string): { amount: number; currency: string } | null {
  // Match common price patterns: $12.99, €15.00, £9.99, 12.99 USD
  const patterns = [
    /\$(\d+\.?\d*)/,
    /€(\d+\.?\d*)/,
    /£(\d+\.?\d*)/,
    /(\d+\.?\d*)\s*(USD|EUR|GBP|TRY)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let amount = parseFloat(match[1]);
      let currency = 'USD';
      
      if (text.includes('€')) currency = 'EUR';
      else if (text.includes('£')) currency = 'GBP';
      else if (text.includes('₺') || text.toLowerCase().includes('try')) currency = 'TRY';
      else if (match[2]) currency = match[2].toUpperCase();
      
      return { amount, currency };
    }
  }
  
  return null;
}

/**
 * Detect billing cycle from text
 */
export function detectBillingCycle(text: string): 'weekly' | 'monthly' | 'quarterly' | 'yearly' {
  const textLower = text.toLowerCase();
  
  if (textLower.includes('weekly') || textLower.includes('per week')) return 'weekly';
  if (textLower.includes('annual') || textLower.includes('yearly') || textLower.includes('per year')) return 'yearly';
  if (textLower.includes('quarterly') || textLower.includes('every 3 months')) return 'quarterly';
  
  return 'monthly'; // Default
}

/**
 * Calculate detection confidence based on various factors
 */
export function calculateConfidence(
  hasKnownService: boolean,
  hasAmount: boolean,
  hasCycle: boolean,
  fullBodyParsed: boolean
): number {
  let confidence = 0.5; // Base confidence
  
  if (hasKnownService) confidence += 0.25;
  if (hasAmount) confidence += 0.15;
  if (hasCycle) confidence += 0.05;
  if (fullBodyParsed) confidence += 0.05;
  
  return Math.min(confidence, 1.0);
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `cand-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create detection candidate from parsed email data
 */
export function createCandidate(
  senderDomain: string,
  subject: string,
  body: string | null,
  fullBodyParsed: boolean
): DetectionCandidate | null {
  const service = findServiceByDomain(senderDomain);
  
  if (!service && !isSubscriptionEmail(subject, body || undefined)) {
    return null;
  }

  const textToAnalyze = body || subject;
  const extractedAmount = extractAmount(textToAnalyze);
  const detectedCycle = detectBillingCycle(textToAnalyze);
  
  const confidence = calculateConfidence(
    !!service,
    !!extractedAmount,
    true,
    fullBodyParsed
  );

  // Skip low confidence candidates
  if (confidence < 0.6) {
    return null;
  }

  return {
    id: generateId(),
    merchantName: service?.name || senderDomain.split('.')[0],
    merchantDomain: senderDomain,
    detectedAmount: extractedAmount?.amount || 0,
    detectedCurrency: extractedAmount?.currency || 'USD',
    detectedCycle,
    confidence,
    evidenceSnippet: subject.substring(0, 100),
    sourceEmailId: generateId(),
    suggestedIcon: service?.icon || '📧',
    suggestedColor: service?.color || '#8B5CF6',
    suggestedCategory: service?.category || 'Other',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Scan service - orchestrates the scanning process
 * This is a stub that simulates scanning - to be replaced with real email API calls
 */
export class ScanService {
  private isScanning = false;
  private progress = 0;
  private onProgressUpdate?: (progress: number, phase: string) => void;

  setProgressCallback(callback: (progress: number, phase: string) => void) {
    this.onProgressUpdate = callback;
  }

  async startScan(options: ScanOptions): Promise<ScanResult> {
    if (this.isScanning) {
      return {
        success: false,
        emailsScanned: 0,
        candidates: [],
        errors: ['Scan already in progress'],
      };
    }

    this.isScanning = true;
    this.progress = 0;

    try {
      // Phase 1: Connect
      this.updateProgress(10, 'Connecting to email...');
      await this.delay(500);

      // Phase 2: Fetch
      this.updateProgress(30, 'Fetching emails...');
      await this.delay(1000);

      // Phase 3: Analyze
      this.updateProgress(60, 'Analyzing content...');
      await this.delay(1000);

      // Phase 4: Detect
      this.updateProgress(90, 'Detecting subscriptions...');
      await this.delay(500);

      // Complete
      this.updateProgress(100, 'Scan complete!');

      return {
        success: true,
        emailsScanned: Math.floor(Math.random() * 100) + 50,
        candidates: [], // Real implementation would return actual candidates
      };
    } finally {
      this.isScanning = false;
    }
  }

  cancelScan() {
    this.isScanning = false;
  }

  private updateProgress(progress: number, phase: string) {
    this.progress = progress;
    this.onProgressUpdate?.(progress, phase);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const scanService = new ScanService();
