# Infrastructure Decision and Implementation Pass

## Timestamp
2026-04-11 (Infrastructure Pass)

## Scope of the pass
Implemented comprehensive infrastructure hardening and coordination layer for ShadowFlower to run cleanly on Vercel with secure GameDin integration.

## Why this pass was needed
- Production-grade distributed coordination was missing (only in-memory rate limiting)
- No replay protection for signed requests
- No job locking or idempotency for moderation jobs
- Scheduler support was limited to Vercel Hobby cron (once per day only)
- GameDin integration lacked HMAC signing for privileged requests
- Infrastructure decisions needed to be documented for future reference

## Files changed
- `src/infrastructure/redis.ts` - Created new Upstash Redis wrapper/service module
- `src/security/signing.ts` - Updated to integrate Redis nonce tracking for replay protection
- `src/security/auth.ts` - Added distributedRateLimit middleware, updated verifySignature to async
- `src/jobs/moderation-pipeline.ts` - Added Redis job locking and idempotency
- `src/routes/api/jobs/moderation/schedule.ts` - Created new scheduler-agnostic job execution endpoint
- `src/lib/gamedin-client.ts` - Added optional HMAC signing for GameDin requests
- `src/types/config.ts` - Added Upstash Redis and GAMEDIN_SIGNING_SECRET fields
- `src/config/index.ts` - Added environment variable reading and validation for new fields
- `package.json` - Added @upstash/redis dependency
- `.env.example` - Added Upstash Redis and HMAC signing environment variables
- `README.md` - Updated architecture, security, and scheduler documentation

## Architecture / logic changes

### Upstash Redis Integration
Created `src/infrastructure/redis.ts` with `RedisService` class providing:
- **Distributed rate limiting**: Token bucket algorithm using Redis sorted sets
- **Replay protection**: Nonce tracking with TTL for HMAC-signed requests
- **Job locking**: Distributed locks with TTL to prevent concurrent job execution
- **Idempotency**: Cache job results to prevent duplicate processing

All Redis operations fail gracefully if Redis is unavailable, with documented degradation behavior.

### HMAC + Replay Protection
Updated `src/security/signing.ts`:
- Made `verifySignature` async to support Redis nonce checking
- Integrated Redis nonce tracking before signature validation
- Nonces stored with 5-minute TTL
- Falls back to timestamp-only validation if Redis unavailable

### Distributed Rate Limiting
Added `distributedRateLimit` middleware in `src/security/auth.ts`:
- Uses Redis for cross-instance rate limiting
- Configurable window size and request limits
- Falls back to in-memory rate limiting if Redis unavailable
- Applied to scheduler endpoint for protection

### Job Locking and Idempotency
Updated `src/jobs/moderation-pipeline.ts`:
- Added `idempotencyKey` and `skipLock` options to job execution
- Acquires distributed lock before job execution (5-minute TTL)
- Checks idempotency key to return cached results
- Lock released in finally block
- Falls back to allowing concurrent execution if Redis unavailable

### Scheduler-Agnostic Job Execution
Created `src/routes/api/jobs/moderation/schedule.ts`:
- New endpoint `/api/jobs/moderation/schedule` for scheduler triggers
- Supports Vercel cron (daily), external schedulers like QStash (hourly), or manual execution
- Accepts optional idempotency key and scheduler ID
- Protected by API key authentication

### GameDin Integration Contract
Updated `src/lib/gamedin-client.ts`:
- Added optional `signingSecret` to GameDinClientConfig
- Added `signRequest` method to generate HMAC signatures
- Integrated HMAC signing into `sendAdvisoryResults` method
- Headers: `x-shadowflower-timestamp`, `x-shadowflower-nonce`, `x-shadowflower-signature`

## Runtime behavior changes

### With Upstash Redis Configured
- Rate limiting works across all function instances
- Replay attacks are detected and rejected via nonce tracking
- Only one moderation job can run at a time (distributed lock)
- Repeated requests with same idempotency key return cached results
- GameDin requests include HMAC signatures if signing secret configured

### Without Upstash Redis (Degraded)
- Rate limiting falls back to in-memory (per-instance only)
- Replay protection uses timestamp validation only (no nonce tracking)
- Multiple concurrent jobs can run (no distributed lock)
- No idempotency (repeated requests execute fully)
- GameDin requests still work (without HMAC signing if not configured)

## Validation performed

### TypeScript Build
- Ran `npm install` to add @upstash/redis dependency
- Ran `npm run build` - passed cleanly after fixing type errors
- Fixed type issues: unknown type casting, eval API usage, unused parameters

### Code Review
- Verified HMAC signing integration in signing.ts
- Verified Redis integration in infrastructure/redis.ts
- Verified job locking in moderation-pipeline.ts
- Verified scheduler endpoint in schedule.ts
- Verified GameDin client HMAC integration
- Verified Discord notifications already integrated from previous pass

## Immediate results

### Successes
- TypeScript build passes cleanly
- All infrastructure components integrated
- Graceful degradation documented and implemented
- Scheduler-agnostic posture achieved
- Documentation updated with new architecture

### Failures
- None (build passed)

### Observations
- Upstash Redis integration is explicit and centralized
- All Redis operations fail safely with console warnings
- HMAC signing is optional and degrades gracefully
- Scheduler endpoint supports multiple trigger sources

## Known limitations / follow-ups

### Current Limitations
- Upstash Redis not yet configured in production (environment variables added)
- HMAC signing secrets not yet configured (environment variables added)
- Scheduler endpoint not yet connected to actual Vercel cron or QStash
- No integration tests for Redis operations
- No integration tests for HMAC signing flow

### Follow-up Work
- Configure Upstash Redis in Vercel environment
- Generate and configure HMAC signing secrets
- Set up Vercel cron job for daily moderation
- Set up QStash (or similar) for hourly moderation if needed
- Add integration tests for Redis operations
- Add integration tests for HMAC signing flow
- Add end-to-end test for scheduler trigger

## Risks introduced

### Low Risk
- Redis operations fail gracefully with documented degradation
- HMAC signing is optional and doesn't break existing auth
- Scheduler endpoint is protected by existing API key auth
- Type safety maintained with TypeScript strict mode

### Medium Risk
- If Redis is misconfigured, distributed protections won't work
- If HMAC secrets are weak, replay protection is less effective
- Scheduler endpoint needs proper rate limiting (currently uses in-memory)
- No automated tests for new Redis/HMAC functionality

### Mitigations
- All failures logged with clear error messages
- Documentation clearly states degradation behavior
- Secret strength validation at startup (enforced in production)
- Manual testing required before production deployment

## Decision record

### Decision 1: Use Upstash Redis for distributed coordination
**Context**: Need production-grade rate limiting, replay protection, and job locking across Vercel function instances.

**Options considered**:
1. Use Vercel KV (simpler but less feature-rich)
2. Use Upstash Redis (more features, REST API, good free tier)
3. Use external Redis (more complex, additional infrastructure)
4. Stay with in-memory only (not production-grade)

**Chosen option**: Upstash Redis

**Why chosen**:
- REST API works well with Vercel serverless functions
- Good free tier for development
- Rich feature set (sorted sets, Lua scripts, TTL)
- Minimal infrastructure overhead
- Explicit integration keeps codebase clean

**Tradeoffs accepted**:
- Additional dependency (@upstash/redis)
- Additional environment variables to configure
- Slight latency for network calls
- Need to handle Redis unavailability gracefully

### Decision 2: Make HMAC signing optional with graceful degradation
**Context**: Need stronger inter-service security but don't want to break existing integrations.

**Options considered**:
1. Require HMAC signing for all privileged requests (breaks existing)
2. Make HMAC signing optional (safer migration path)
3. Use HMAC only for GameDin, not for inbound requests (inconsistent)

**Chosen option**: Optional HMAC signing with graceful degradation

**Why chosen**:
- Allows gradual migration to HMAC
- Doesn't break existing API key auth
- Can enable per-endpoint as needed
- Clear upgrade path for production

**Tradeoffs accepted**:
- Security not immediately improved until secrets configured
- Need to document which endpoints use HMAC
- More complex authentication logic to maintain

### Decision 3: Scheduler-agnostic job execution surface
**Context**: Vercel Hobby cron limited to once per day, but may need hourly execution.

**Options considered**:
1. Build separate hourly endpoint (duplication)
2. Use external scheduler exclusively (loses daily cron)
3. Make scheduler-agnostic endpoint (flexible)
4. Assume Vercel Pro plan (not realistic for MVP)

**Chosen option**: Scheduler-agnostic endpoint with idempotency

**Why chosen**:
- Supports both Vercel cron and external schedulers
- Single endpoint to maintain
- Idempotency prevents duplicate executions
- Clear separation of scheduling from execution

**Tradeoffs accepted**:
- Need to configure scheduler separately
- No built-in scheduling in code
- Need to document scheduler setup

### Decision 4: Fail-safe Redis operations with degradation
**Context**: Redis may be unavailable or misconfigured, but service should remain functional.

**Options considered**:
1. Fail hard if Redis unavailable (service down)
2. Fail silently with no logging (security risk)
3. Fail safely with logging and degradation (chosen)
4. Retry Redis operations indefinitely (bad UX)

**Chosen option**: Fail safely with documented degradation

**Why chosen**:
- Service remains functional even if Redis down
- Clear logging for debugging
- Documented degradation behavior
- Production-ready approach

**Tradeoffs accepted**:
- Reduced security when Redis unavailable
- Need to monitor Redis health
- Documentation burden to explain degradation

## Next recommended step
1. Configure Upstash Redis in Vercel environment variables
2. Generate strong HMAC signing secrets
3. Set up Vercel cron job to hit `/api/jobs/moderation/schedule` daily
4. If hourly moderation needed, set up QStash or similar external scheduler
5. Add integration tests for Redis and HMAC functionality
6. Monitor Redis health and rate limiting effectiveness in production
7. Document actual scheduler setup in deployment documentation
