/**
 * Moderation rule engine for async content scanning
 * File-based rule definitions with TypeScript typing
 */

import { ModerationRule, RuleCategory, RuleMatch, ModerationSeverity } from '../types/moderation';

/**
 * Moderation rule definitions
 * These are the first-pass rule-based checks before AI escalation
 */
export const MODERATION_RULES: ModerationRule[] = [
  // Offensive language
  {
    id: 'offensive_fuck',
    category: 'offensive_language',
    type: 'normalized',
    pattern: 'fuck',
    severity: 'medium',
    weight: 5,
    enabled: true,
    description: 'Strong profanity',
  },
  {
    id: 'offensive_shit',
    category: 'offensive_language',
    type: 'normalized',
    pattern: 'shit',
    severity: 'low',
    weight: 2,
    enabled: true,
    description: 'Common profanity',
  },
  {
    id: 'offensive_bitch',
    category: 'offensive_language',
    type: 'normalized',
    pattern: 'bitch',
    severity: 'medium',
    weight: 5,
    enabled: true,
    description: 'Gendered slur',
  },
  {
    id: 'offensive_ass',
    category: 'offensive_language',
    type: 'normalized',
    pattern: 'ass',
    severity: 'low',
    weight: 2,
    enabled: true,
    description: 'Mild profanity',
  },
  {
    id: 'offensive_damn',
    category: 'offensive_language',
    type: 'normalized',
    pattern: 'damn',
    severity: 'low',
    weight: 1,
    enabled: true,
    description: 'Mild profanity',
  },
  {
    id: 'offensive_hell',
    category: 'offensive_language',
    type: 'normalized',
    pattern: 'hell',
    severity: 'low',
    weight: 1,
    enabled: true,
    description: 'Mild profanity',
  },

  // Hate speech / abuse
  {
    id: 'hate_nword',
    category: 'hate_abuse',
    type: 'normalized',
    pattern: 'nigger',
    severity: 'critical',
    weight: 10,
    enabled: true,
    description: 'Racial slur',
  },
  {
    id: 'hate_faggot',
    category: 'hate_abuse',
    type: 'normalized',
    pattern: 'faggot',
    severity: 'critical',
    weight: 10,
    enabled: true,
    description: 'Homophobic slur',
  },
  {
    id: 'hate_kike',
    category: 'hate_abuse',
    type: 'normalized',
    pattern: 'kike',
    severity: 'critical',
    weight: 10,
    enabled: true,
    description: 'Antisemitic slur',
  },
  {
    id: 'hape_spic',
    category: 'hate_abuse',
    type: 'normalized',
    pattern: 'spic',
    severity: 'critical',
    weight: 10,
    enabled: true,
    description: 'Ethnic slur',
  },
  {
    id: 'hate_chink',
    category: 'hate_abuse',
    type: 'normalized',
    pattern: 'chink',
    severity: 'critical',
    weight: 10,
    enabled: true,
    description: 'Ethnic slur',
  },
  {
    id: 'hape_paki',
    category: 'hate_abuse',
    type: 'normalized',
    pattern: 'paki',
    severity: 'critical',
    weight: 10,
    enabled: true,
    description: 'Ethnic slur',
  },

  // Harassment
  {
    id: 'harass_kill_yourself',
    category: 'harassment',
    type: 'phrase',
    pattern: 'kill yourself',
    severity: 'high',
    weight: 8,
    enabled: true,
    description: 'Self-harm encouragement',
  },
  {
    id: 'harass kys',
    category: 'harassment',
    type: 'phrase',
    pattern: 'kys',
    severity: 'high',
    weight: 8,
    enabled: true,
    description: 'Self-harm encouragement (abbreviated)',
  },
  {
    id: 'harass_go_die',
    category: 'harassment',
    type: 'phrase',
    pattern: 'go die',
    severity: 'high',
    weight: 7,
    enabled: true,
    description: 'Death threat',
  },
  {
    id: 'harass_stupid',
    category: 'harassment',
    type: 'normalized',
    pattern: 'stupid',
    severity: 'low',
    weight: 2,
    enabled: true,
    description: 'Insult',
  },
  {
    id: 'harass_idiot',
    category: 'harassment',
    type: 'normalized',
    pattern: 'idiot',
    severity: 'low',
    weight: 2,
    enabled: true,
    description: 'Insult',
  },
  {
    id: 'harass_retard',
    category: 'harassment',
    type: 'normalized',
    pattern: 'retard',
    severity: 'medium',
    weight: 5,
    enabled: true,
    description: 'Ableist slur',
  },

  // NSFW text
  {
    id: 'nsfw_porn',
    category: 'nsfw_text',
    type: 'normalized',
    pattern: 'porn',
    severity: 'medium',
    weight: 5,
    enabled: true,
    description: 'Adult content reference',
  },
  {
    id: 'nsfw_nude',
    category: 'nsfw_text',
    type: 'normalized',
    pattern: 'nude',
    severity: 'medium',
    weight: 5,
    enabled: true,
    description: 'Adult content reference',
  },
  {
    id: 'nsfw_sex',
    category: 'nsfw_text',
    type: 'normalized',
    pattern: 'sex',
    severity: 'low',
    weight: 2,
    enabled: true,
    description: 'Adult content reference',
  },
  {
    id: 'nsfw_nsfw',
    category: 'nsfw_text',
    type: 'phrase',
    pattern: 'nsfw',
    severity: 'medium',
    weight: 5,
    enabled: true,
    description: 'NSFW tag reference',
  },

  // Spam / promotional
  {
    id: 'spam_click_here',
    category: 'spam_promo',
    type: 'phrase',
    pattern: 'click here',
    severity: 'low',
    weight: 2,
    enabled: true,
    description: 'Common spam phrase',
  },
  {
    id: 'spam_free',
    category: 'spam_promo',
    type: 'normalized',
    pattern: 'free',
    severity: 'low',
    weight: 1,
    enabled: true,
    description: 'Promotional language',
  },
  {
    id: 'spam_win',
    category: 'spam_promo',
    type: 'normalized',
    pattern: 'win',
    severity: 'low',
    weight: 1,
    enabled: true,
    description: 'Promotional language',
  },
  {
    id: 'spam_prize',
    category: 'spam_promo',
    type: 'normalized',
    pattern: 'prize',
    severity: 'low',
    weight: 1,
    enabled: true,
    description: 'Promotional language',
  },
  {
    id: 'spam_limited_time',
    category: 'spam_promo',
    type: 'phrase',
    pattern: 'limited time',
    severity: 'low',
    weight: 2,
    enabled: true,
    description: 'Promotional urgency',
  },
  {
    id: 'spam_act_now',
    category: 'spam_promo',
    type: 'phrase',
    pattern: 'act now',
    severity: 'low',
    weight: 2,
    enabled: true,
    description: 'Promotional urgency',
  },
  {
    id: 'spam_buynow',
    category: 'spam_promo',
    type: 'phrase',
    pattern: 'buy now',
    severity: 'low',
    weight: 2,
    enabled: true,
    description: 'Promotional call to action',
  },
  {
    id: 'spam_offer',
    category: 'spam_promo',
    type: 'normalized',
    pattern: 'offer',
    severity: 'low',
    weight: 1,
    enabled: true,
    description: 'Promotional language',
  },

  // Suspicious links
  {
    id: 'link_bitly',
    category: 'suspicious_links',
    type: 'normalized',
    pattern: 'bit.ly',
    severity: 'medium',
    weight: 4,
    enabled: true,
    description: 'URL shortener (often spam)',
  },
  {
    id: 'link_tinyurl',
    category: 'suspicious_links',
    type: 'normalized',
    pattern: 'tinyurl.com',
    severity: 'medium',
    weight: 4,
    enabled: true,
    description: 'URL shortener (often spam)',
  },
  {
    id: 'link_goo_gl',
    category: 'suspicious_links',
    type: 'normalized',
    pattern: 'goo.gl',
    severity: 'medium',
    weight: 4,
    enabled: true,
    description: 'URL shortener (often spam)',
  },
  {
    id: 'link_bit_do',
    category: 'suspicious_links',
    type: 'normalized',
    pattern: 'bit.do',
    severity: 'medium',
    weight: 4,
    enabled: true,
    description: 'URL shortener (often spam)',
  },

  // Impersonation signals
  {
    id: 'imperson_admin',
    category: 'impersonation_signals',
    type: 'normalized',
    pattern: 'admin',
    severity: 'medium',
    weight: 4,
    enabled: true,
    description: 'Potential impersonation claim',
  },
  {
    id: 'imperson_mod',
    category: 'impersonation_signals',
    type: 'normalized',
    pattern: 'mod',
    severity: 'medium',
    weight: 4,
    enabled: true,
    description: 'Potential impersonation claim',
  },
  {
    id: 'imperson_official',
    category: 'impersonation_signals',
    type: 'normalized',
    pattern: 'official',
    severity: 'medium',
    weight: 3,
    enabled: true,
    description: 'Potential impersonation claim',
  },
  {
    id: 'imperson_support',
    category: 'impersonation_signals',
    type: 'normalized',
    pattern: 'support',
    severity: 'low',
    weight: 2,
    enabled: true,
    description: 'Potential impersonation claim',
  },
];

/**
 * Scan text against enabled moderation rules
 * Returns array of rule matches
 */
export function scanTextWithRules(text: string, normalizedText: string): RuleMatch[] {
  const matches: RuleMatch[] = [];
  const enabledRules = MODERATION_RULES.filter(rule => rule.enabled);

  for (const rule of enabledRules) {
    const match = testRule(rule, text, normalizedText);
    if (match) {
      matches.push(match);
    }
  }

  return matches;
}

/**
 * Test a single rule against text
 */
function testRule(rule: ModerationRule, text: string, normalizedText: string): RuleMatch | null {
  const targetText = rule.type === 'normalized' ? normalizedText : text;

  let matched = false;
  let matchedText = '';

  switch (rule.type) {
    case 'exact':
      matched = targetText === rule.pattern;
      matchedText = matched ? rule.pattern : '';
      break;

    case 'phrase':
      matched = targetText.includes(rule.pattern);
      matchedText = matched ? rule.pattern : '';
      break;

    case 'case_insensitive':
      matched = targetText.toLowerCase().includes(rule.pattern.toLowerCase());
      matchedText = matched ? rule.pattern : '';
      break;

    case 'normalized':
      matched = normalizedText.includes(rule.pattern);
      matchedText = matched ? rule.pattern : '';
      break;

    case 'regex':
      try {
        const regex = new RegExp(rule.pattern, 'gi');
        const regexMatch = targetText.match(regex);
        if (regexMatch && regexMatch.length > 0) {
          matched = true;
          matchedText = regexMatch[0];
        }
      } catch (error) {
        console.error(`Invalid regex pattern for rule ${rule.id}:`, error);
      }
      break;

    default:
      return null;
  }

  if (!matched) {
    return null;
  }

  return {
    ruleId: rule.id,
    category: rule.category,
    severity: rule.severity,
    weight: rule.weight,
    matchedText,
  };
}

/**
 * Calculate risk score from rule matches
 * Sum of weights from all matches
 */
export function calculateRiskScore(matches: RuleMatch[]): number {
  return matches.reduce((sum, match) => sum + match.weight, 0);
}

/**
 * Extract unique categories from rule matches
 */
export function extractCategories(matches: RuleMatch[]): RuleCategory[] {
  const categories = new Set<RuleCategory>();
  for (const match of matches) {
    categories.add(match.category);
  }
  return Array.from(categories);
}

/**
 * Determine if AI review is required based on rule matches
 * Policy:
 * - No rule match → no AI
 * - Low-severity match only → advisory only, no AI
 * - Medium/high-severity match → AI review candidate
 * - Multiple matches → AI review candidate
 */
export function determineAiReviewRequired(matches: RuleMatch[]): boolean {
  if (matches.length === 0) {
    return false;
  }

  // Check for medium or high severity
  const hasMediumOrHigh = matches.some(match =>
    match.severity === 'medium' || match.severity === 'high' || match.severity === 'critical'
  );

  if (hasMediumOrHigh) {
    return true;
  }

  // Multiple matches even if low severity
  if (matches.length >= 3) {
    return true;
  }

  // Single low-severity match - no AI
  return false;
}

/**
 * Get severity from rule matches
 * Returns the highest severity among matches
 */
export function getHighestSeverity(matches: RuleMatch[]): ModerationSeverity {
  if (matches.length === 0) {
    return 'low';
  }

  const severityOrder: ModerationSeverity[] = ['critical', 'high', 'medium', 'low'];

  for (const severity of severityOrder) {
    if (matches.some(match => match.severity === severity)) {
      return severity;
    }
  }

  return 'low';
}
