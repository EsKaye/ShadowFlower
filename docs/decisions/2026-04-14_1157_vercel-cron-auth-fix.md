# ShadowFlower Vercel Cron Authentication Fix

## Timestamp
2026-04-14 11:57:00 EST (Updated: 2026-04-14 12:28:00 EST)

## Scope of the Pass
Fix the ShadowFlower Vercel cron authentication path safely so scheduled moderation can actually run in production without exposing the route publicly. Updated to use Vercel's native CRON_SECRET Authorization: Bearer authentication.

## Problem Statement

**Critical Auth Issue:**
- The scheduled moderation route at `api/jobs/moderation/schedule.js` was using the standard `requireAuth` middleware
- This middleware validates the `x-shadowflower-api-key` header for ALL requests (both GET and POST)
- Vercel cron calls the production deployment URL using HTTP GET
- Vercel cron may not provide custom headers like `x-shadowflower-api-key`
- This would cause the cron job to fail authentication, blocking scheduled moderation

**Evidence:**
- `api/jobs/moderation/schedule.js` used `requireAuth(handler)` for both GET and POST
- `requireAuth` validates `x-shadowflower-api-key` header
- Vercel cron uses HTTP GET without custom headers
- Cron would fail with 401 Unauthorized

## Root Cause Analysis

**Why the Original Auth Model Could Block Vercel Cron:**
1. **Header-Based Auth**: The standard `requireAuth` middleware requires an API key in the `x-shadowflower-api-key` header
2. **Vercel Cron Limitation**: Vercel cron jobs make simple HTTP GET requests and do not support custom headers
3. **Method-Agnostic Protection**: The original implementation applied the same auth to both GET (cron) and POST (manual testing)
4. **No Cron-Specific Path**: There was no dedicated authentication mechanism for cron execution

## Solution Implemented

**Created Cron-Safe Authentication (Vercel Native):**
- Added `validateCronSecret()` function in `src/security/auth.ts`
- Added `requireCronAuth()` middleware in `src/security/auth.ts`
- Updated `api/jobs/moderation/schedule.js` to use `requireCronAuth` instead of `requireAuth`
- Added `CRON_SECRET` environment variable to `.env.example`
- Added `CRON_SECRET` to `vercel.json` environment variables
- Updated `vercel.json` cron path to use plain path: `/api/jobs/moderation/schedule`

**Authentication Model (Vercel Native):**
- **GET requests (cron)**: Validates `CRON_SECRET` from `Authorization: Bearer` header (Vercel native mechanism)
- **POST requests (manual testing)**: Validates `x-shadowflower-api-key` header
- **Same safety**: Both methods require authentication, just different mechanisms

**Why Vercel Native CRON_SECRET:**
- Vercel sends `Authorization: Bearer <CRON_SECRET>` to cron requests when `CRON_SECRET` is configured
- This is the recommended Vercel security model for cron jobs
- Eliminates query parameter exposure in logs/monitoring
- Cleaner, more secure implementation aligned with platform best practices

## Files Changed

### Modified:
- `src/security/auth.ts` - Added `validateCronSecret()` and `requireCronAuth()` functions
- `api/jobs/moderation/schedule.js` - Changed from `requireAuth` to `requireCronAuth`
- `.env.example` - Added `CRON_SECRET` configuration
- `vercel.json` - Added `CRON_SECRET` environment variable and updated cron path

### Verified Unchanged:
- `src/routes/api/jobs/moderation/schedule.ts` - Source file unchanged (uses `requireAuth`)
- `src/routes/api/jobs/moderation/dry-run.ts` - Uses `requireAuth` (unchanged)
- `src/routes/api/jobs/moderation/rescan.ts` - Uses `requireAuth` (unchanged)
- `src/routes/api/jobs/moderation/reindex.ts` - Uses `requireAuth` (unchanged)
- `src/routes/api/jobs/moderation/run.ts` - Uses `requireAuth` (unchanged)

## Implementation Details

**validateCronSecret Function:**
```typescript
export function validateCronSecret(request: VercelRequest): boolean {
  const cronSecret = process.env['CRON_SECRET'];
  if (!cronSecret) {
    return false;
  }

  const authHeader = request.headers['authorization'] as string;
  if (!authHeader) {
    return false;
  }

  // Vercel cron sends: Authorization: Bearer <CRON_SECRET>
  const expectedAuth = `Bearer ${cronSecret}`;
  return authHeader === expectedAuth;
}
```

**requireCronAuth Middleware:**
```typescript
export function requireCronAuth(
  handler: (req: AuthenticatedRequest, res: VercelResponse) => Promise<void> | void
) {
  return async (req: AuthenticatedRequest, res: VercelResponse): Promise<void> => {
    // ... request ID and client ID setup ...

    // Validate auth based on method
    if (req.method === 'GET') {
      // GET requests: validate CRON_SECRET from Authorization: Bearer header (Vercel native)
      if (!validateCronSecret(req)) {
        logAuthFailure({ requestId, clientId, reason: 'Invalid cron secret' });
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Valid cron secret required',
          timestamp: new Date().toISOString(),
          requestId,
        });
        return;
      }
    } else if (req.method === 'POST') {
      // POST requests: validate API key from header
      if (!validateApiKey(req)) {
        logAuthFailure({ requestId, clientId, reason: 'Invalid API key' });
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Valid API key required',
          timestamp: new Date().toISOString(),
          requestId,
        });
        return;
      }
    }

    await handler(req, res);
  };
}
```

**Vercel Cron Configuration:**
```json
"crons": [
  {
    "path": "/api/jobs/moderation/schedule",
    "schedule": "0 * * * *"
  }
]
```

**Environment Variables:**
```bash
# .env.example
CRON_SECRET=your_cron_secret_here_minimum_32_characters

# vercel.json
"env": {
  "CRON_SECRET": "@cron_secret"
}
```

## Route Behavior

**GET Requests (Cron):**
- Validates `CRON_SECRET` from `Authorization: Bearer` header (Vercel native)
- Uses config defaults (dryRun=true, batchSize=5)
- No body overrides allowed
- Auth failure: 401 Unauthorized

**POST Requests (Manual Testing):**
- Validates `x-shadowflower-api-key` header
- Allows body overrides (dryRun, batchSize, provider, model)
- Same behavior as before
- Auth failure: 401 Unauthorized

**Both Methods:**
- Require authentication (no public access)
- Log auth success/failure
- Generate request IDs
- Skip CORS for GET (cron has no origin)

## Tradeoffs and Limitations

**Vercel Native CRON_SECRET:**
- **Advantage**: Vercel sends `Authorization: Bearer <CRON_SECRET>` to cron requests
- **Advantage**: Eliminates query parameter exposure in logs/monitoring
- **Advantage**: Aligns with Vercel's recommended security model for cron jobs
- **Tradeoff**: None - this is the recommended Vercel approach

**CORS Handling:**
- **Tradeoff**: CORS skipped for GET requests (cron has no origin header)
- **Mitigation**: POST requests still enforce CORS
- **Risk**: Minimal - cron is server-to-server, not browser-based

## Deployment Status

**Current Status:**
- Files created/modified locally
- Changes not yet deployed to Vercel
- Endpoint still returns 404 until deployment (from previous fix)

**Required Action:**
1. Set `CRON_SECRET` in Vercel environment variables
2. Deploy changes to Vercel (git push or Vercel CLI)
3. Verify cron execution succeeds

## Validation Plan

After deployment, verify:
1. GET with correct cron secret succeeds (HTTP 200)
2. GET without cron secret fails (HTTP 401)
3. GET with wrong cron secret fails (HTTP 401)
4. POST with correct API key succeeds (HTTP 200)
5. POST without API key fails (HTTP 401)
6. Dry-run mode still works (config default: true)
7. Batch-size config still works (config default: 5)
8. Unrelated routes still use `requireAuth` (no regression)

## Source of Truth

**Shared Moderation Pipeline:**
- Location: `src/jobs/moderation-pipeline.ts`
- Contains: ModerationPipeline class with runJob method
- This remains the single source of truth for moderation logic
- The auth changes are only in the deployment entrypoint

**Why This Architecture:**
- Keeps logic centralized in `src/` directory
- Avoids code duplication
- Allows the same pipeline to be called from multiple entrypoints
- Maintains separation between auth concerns and business logic

## Constraints Adhered To

- No dist-copy hacks
- No fake rewrites to compiled API routes
- No broad redesign
- Used the thinnest correct deployment fix
- Kept shared moderation pipeline code in `src/`
- Kept the root `api/` function as a thin deployment entrypoint
- Did not weaken auth on unrelated routes
- Did not expose a public UI
- Did not touch the moderation pipeline logic

## Next Steps

1. Set `CRON_SECRET` in Vercel environment variables
2. Deploy changes to Vercel
3. Validate GET with cron secret works
4. Validate GET without cron secret fails
5. Validate POST with API key works
6. Validate POST without API key fails
7. Monitor first cron execution
8. If dry-run passes, consider enabling live mode (DRY_RUN_DEFAULT=false)

## Risks

**Vercel Cron Limitation:**
- Vercel cron does not support custom headers (except x-cron-secret)
- Mitigation: Vercel native CRON_SECRET is the recommended approach
- Impact: Low - this is the standard Vercel security model for cron jobs

**CORS Bypass for GET:**
- CORS checks skipped for GET requests
- Mitigation: GET is server-to-server (cron), not browser-based
- Impact: Low - cron has no origin header anyway

**Import Resolution Risk:**
- The import pattern `../../lib/...` matches `api/health.js` but may have different resolution in production
- Mitigation: Monitor deployment logs for import errors
- Impact: Low - same pattern as working health endpoint

## Production Readiness

**Current Status:**
- Code changes complete and compiled
- Documentation updated
- Environment variable documented
- Not yet deployed to production

**Before First Cron Run:**
1. Set `CRON_SECRET` in Vercel environment variables
2. Deploy changes to Vercel
3. Validate authentication works correctly
4. Verify dry-run mode works
5. Monitor first cron execution

**Remaining Work:**
- Set `CRON_SECRET` in Vercel environment variables
- Deploy to Vercel
- Validate authentication
- Monitor cron execution
- Consider enabling live mode after dry-run validation
