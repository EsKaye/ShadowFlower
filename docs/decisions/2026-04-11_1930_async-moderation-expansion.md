# Async Moderation Expansion Implementation

## Timestamp
2026-04-11 19:30:00 EST

## Scope of the pass
Expanded ShadowFlower from AI-only moderation to a comprehensive async moderation-assistance system with rule-based scanning, incremental hourly batch processing, and selective AI escalation. Implemented file-based moderation rules, text normalization, incremental scanning filters, AI escalation policy, and new job execution surfaces (targeted rescan, full reindex).

## Why this pass was needed
ShadowFlower was previously an AI-only moderation pipeline that sent all content to AI providers, which was inefficient and costly. The goal was to build a stronger moderation-assistance system for GameDin that:
- Uses rule-based scanning as first defense to reduce AI costs
- Implements incremental scanning to avoid wasteful full-table rescans
- Respects Cloudflare/D1 limits on the GameDin side
- Keeps live submit-time moderation in GameDin for speed and reliability
- Stores scan state in GameDin's database, not in Redis
- Uses Redis only for ephemeral coordination

## Files changed
- `src/types/moderation.ts` - Added rule-based types (RuleCategory, RuleType, ModerationRule, RuleMatch, ScanState) and extended ModerationResult with rule fields
- `src/rules/moderation-rules.ts` - New file-based moderation rule engine with 50+ rules across 8 categories
- `src/lib/text-normalizer.ts` - New text normalization layer for consistent rule matching
- `src/lib/gamedin-client.ts` - Extended fetchModerationQueue to support incremental filters (unscanned, changed_since, reported_since)
- `src/jobs/moderation-pipeline.ts` - Refactored to implement rule-based scanning before AI escalation, incremental scanning logic
- `src/routes/api/jobs/moderation/rescan.ts` - New targeted rescan endpoint with incremental filters
- `src/routes/api/jobs/moderation/reindex.ts` - New protected full reindex endpoint
- `README.md` - Updated to document async moderation architecture, rule-based scanning, incremental scanning
- `.env.example` - Updated to include new API endpoints

## Architecture / logic changes

### Rule-Based Moderation Engine
- Created file-based rule engine in `src/rules/moderation-rules.ts`
- Rules defined as TypeScript constants with categories, types, patterns, severity, weight, enabled state
- Supports 8 categories: offensive_language, hate_abuse, harassment, nsfw_text, spam_promo, impersonation_signals, suspicious_links, other
- Supports 5 rule types: exact, phrase, case_insensitive, normalized, regex
- 50+ rules defined with appropriate severity levels and weights

### Text Normalization
- Created `src/lib/text-normalizer.ts` for consistent text processing
- Normalization includes: lowercase, trim, collapse whitespace, optional punctuation stripping
- Different normalization strategies for different rule types

### Incremental Scanning
- Extended GameDin client to support server-side filtering parameters
- Added filters: unscanned, changed_since, reported_since
- Default hourly scan prefers never-scanned, recently changed, or recently reported content
- Full reindex mode available as manual, protected operation
- Scan state stored in GameDin database (not Redis)

### AI Escalation Policy
- No rule match → No AI review
- Low-severity match only → Advisory only, no AI
- Medium/high-severity match → AI review candidate
- Multiple matches (3+) → AI review candidate
- This policy significantly reduces AI costs by only escalating suspicious content

### Moderation Pipeline
- Refactored `processItems` to:
  1. Normalize text
  2. Scan against rule engine
  3. Calculate risk score and categories
  4. Determine if AI review is required
  5. Escalate to AI only if required by policy
  6. Return results with both rule and AI data

### Job Execution Surfaces
- Added `/api/jobs/moderation/rescan` for targeted rescans with custom filters
- Added `/api/jobs/moderation/reindex` for protected full database reindex
- Both endpoints require authentication
- Full reindex clearly labeled as manual operation

## Runtime behavior changes

### Before
- All content sent to AI provider for analysis
- No rule-based filtering
- No incremental scanning (full queue fetched each time)
- No scan state tracking
- Higher AI costs due to processing all content

### After
- Content first scanned against rule engine
- Only suspicious content escalated to AI
- Incremental scanning reduces GameDin D1 reads
- Scan state stored in GameDin for avoiding rescans
- Significantly reduced AI costs through selective escalation

## Validation performed

- TypeScript build passes cleanly (`npm run build`)
- No TypeScript errors in new code
- Rule engine compiles successfully
- Text normalizer compiles successfully
- GameDin client extensions compile successfully
- Moderation pipeline refactoring compiles successfully
- New route endpoints compile successfully

## Immediate results

- Successfully implemented rule-based moderation engine with 50+ rules
- Successfully implemented text normalization layer
- Successfully extended GameDin client for incremental scanning
- Successfully refactored moderation pipeline for rule-based + AI scanning
- Successfully added targeted rescan and full reindex endpoints
- Build passes without errors
- Documentation updated to reflect new architecture

## Known limitations / follow-ups

- GameDin endpoints for incremental scanning (unscanned, changed_since, reported_since) need to be implemented on GameDin side
- GameDin database schema needs to include scan state fields (last_scanned_at, scan_version, rule_match_count, matched_categories, matched_rule_ids, rule_risk_score, ai_review_required)
- Integration testing against actual GameDin endpoints not yet performed
- Rule engine may need tuning based on real-world usage
- AI escalation policy may need adjustment based on effectiveness

## Risks introduced

- If GameDin does not implement the incremental scanning endpoints, the new filters will be ignored and full queue will be fetched
- If GameDin does not add scan state fields to database, scan state tracking will not work
- Rule engine may produce false positives or false negatives that require tuning
- AI escalation policy may be too aggressive or too conservative, requiring adjustment

## Decision record

### Decision 1: File-based rules instead of admin UI
- **Context**: Need to define moderation rules for first-pass scanning
- **Options considered**: Admin-managed UI, environment variables, file-based rules
- **Why file-based chosen**: 
  - Typed and easier to refactor (TypeScript)
  - Easier for SWE to maintain
  - Simpler than building full admin UI
  - Better than environment variables for complex rule definitions
- **Tradeoffs accepted**: No runtime rule changes without deployment, but this is acceptable for initial version

### Decision 2: Rule-based scanning before AI
- **Context**: Need to reduce AI costs while maintaining effectiveness
- **Options considered**: AI-only, rule-only, rule-then-AI, parallel rule+AI
- **Why rule-then-AI chosen**:
  - Rules are fast and cheap
  - AI is expensive but more nuanced
  - Selective escalation reduces costs significantly
  - Rules catch obvious violations quickly
- **Tradeoffs accepted**: Rules may miss nuanced cases that AI would catch, but escalation policy handles this

### Decision 3: Incremental scanning with server-side filtering
- **Context**: Need to avoid wasteful full-table rescans
- **Options considered**: Client-side filtering, server-side filtering, hybrid
- **Why server-side filtering chosen**:
  - Reduces GameDin D1 reads (cost optimization)
  - Reduces data transfer
  - GameDin can use indexes efficiently
  - Light client-side sanity checks as fallback
- **Tradeoffs accepted**: Requires GameDin to implement filtering endpoints, but this is the right architectural choice

### Decision 4: Scan state in GameDin database, not Redis
- **Context**: Need to track scan state to avoid rescans
- **Options considered**: Store in Redis, store in GameDin database, store in D1
- **Why GameDin database chosen**:
  - GameDin is source of truth
  - Scan state belongs with content metadata
  - Redis is for ephemeral coordination only
  - Avoids data inconsistency between systems
- **Tradeoffs accepted**: Requires GameDin schema changes, but this is the correct data ownership model

### Decision 5: AI escalation policy based on severity and count
- **Context**: Need to determine when to escalate to AI
- **Options considered**: Always escalate, never escalate, threshold-based, ML-based
- **Why threshold-based chosen**:
  - Simple and predictable
  - Balances cost and effectiveness
  - Medium/high severity warrants AI nuance
  - Multiple low-severity matches indicate suspicious pattern
- **Tradeoffs accepted**: Policy may need tuning based on real-world data, but this is a reasonable starting point

### Decision 6: No live submit-time moderation in ShadowFlower
- **Context**: User clarified that live submit-time moderation stays in GameDin
- **Options considered**: Add submit-time endpoint, keep async only, hybrid
- **Why async only chosen**:
  - Live checks need speed and reliability - better in GameDin
  - ShadowFlower focuses on async intelligence
  - Avoids latency in user-facing flows
  - Clear separation of concerns
- **Tradeoffs accepted**: ShadowFlower cannot block bad content at submit time, but this is by design

### Decision 7: Protected full reindex endpoint
- **Context**: Need ability to reindex all content when rules change
- **Options considered**: No reindex, automatic reindex, manual reindex
- **Why manual protected reindex chosen**:
  - Full reindex is expensive operation
  - Should be intentional and controlled
  - Protected with authentication
  - Clearly labeled as manual operation
- **Tradeoffs accepted**: Requires manual intervention to reindex, but this prevents accidental expensive operations

## Next recommended step

1. Coordinate with GameDin team to implement incremental scanning endpoints (unscanned, changed_since, reported_since) in GameDin API
2. Coordinate with GameDin team to add scan state fields to database schema
3. Perform integration testing against actual GameDin endpoints
4. Monitor rule engine effectiveness and tune rules based on false positives/negatives
5. Monitor AI escalation policy effectiveness and adjust thresholds as needed
