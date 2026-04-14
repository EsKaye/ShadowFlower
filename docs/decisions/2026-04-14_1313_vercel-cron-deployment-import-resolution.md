# ShadowFlower Vercel Cron Deployment - Import Resolution Issues

## Timestamp
2026-04-14 13:13:00 EST

## Scope of the Pass
Validate and deploy the ShadowFlower scheduled moderation cron route with Vercel's native CRON_SECRET authentication mechanism. Address deployment issues including import resolution errors and Vercel Hobby plan limitations.

## Why This Pass Was Needed
The scheduled moderation route `/api/jobs/moderation/schedule` needed to be deployed and validated to enable automated content moderation via Vercel cron jobs. The route was experiencing deployment failures and runtime errors that prevented successful execution.

## Files Changed
- `api/jobs/moderation/schedule.js` - Created and iteratively modified to resolve deployment issues
- `vercel.json` - Updated cron schedule from hourly to daily for Hobby plan compatibility
- `.env.example` - Updated to document CRON_SECRET usage
- `README.md` - Updated to reflect Vercel native CRON_SECRET authentication

## Architecture / Logic Changes

### Initial Implementation
Created `api/jobs/moderation/schedule.js` as a Vercel API route in the root `api/` directory with:
- ES6 imports from `../../jobs/moderation-pipeline`, `../../lib/gamedin-client`, `../../config`, `../../security/auth`
- `requireCronAuth` middleware for authentication
- Full moderation pipeline integration

### Issue 1: 404 Not Found
**Problem:** Route returned 404 on initial deployment.
**Root Cause:** The `api/jobs/moderation/schedule.js` file was not tracked in git, so it was not deployed.
**Fix:** Added the file to git and pushed the changes.

### Issue 2: Vercel Hobby Plan Limitation
**Problem:** Deployment failed with error: "Hobby accounts are limited to daily cron jobs. This cron expression (0 * * * *) would run more than once per day."
**Root Cause:** Cron schedule `0 * * * *` (hourly) exceeds Vercel Hobby plan limits.
**Fix:** Updated `vercel.json` cron schedule to `0 0 * * *` (daily at midnight).

### Issue 3: CRON_SECRET Secret Reference
**Problem:** Deployment failed with error: "Environment Variable CRON_SECRET references Secret cron_secret, which does not exist."
**Root Cause:** `vercel.json` contained `"CRON_SECRET": "@cron_secret"` referencing a non-existent Vercel secret.
**Fix:** Removed the secret reference from `vercel.json`. CRON_SECRET is set as an environment variable directly in Vercel.

### Issue 4: FUNCTION_INVOCATION_FAILED Runtime Error
**Problem:** Route deployed successfully but returned 500 "FUNCTION_INVOCATION_FAILED" at runtime.
**Root Cause:** Import resolution issues with ES6 imports in the `api/` directory structure. Vercel's Node.js runtime for root `api/` files could not resolve imports from the `src/` directory.

**Attempted Fixes:**
1. Changed ES6 imports to CommonJS `require()` - Still failed
2. Changed import paths from `../../lib/...` to `../../jobs/...` - Still failed
3. Changed import paths to `../../src/...` - Still failed
4. Inlined the `requireCronAuth` middleware to avoid import - Still failed when other imports added

**Final Resolution:**
Reverted to a minimal authentication test endpoint without any imports from the `src/` directory. The route now validates authentication successfully but does not include the full moderation pipeline logic.

## Runtime Behavior Changes

### Current State
The route `/api/jobs/moderation/schedule` is deployed and functional as a minimal authentication test endpoint:

**Authentication Model:**
- **GET requests (cron):** Validates `CRON_SECRET` from `Authorization: Bearer` header (Vercel native mechanism)
- **POST requests (manual testing):** Validates `SHADOWFLOWER_API_KEY` from `x-shadowflower-api-key` header
- Both methods require authentication and reject invalid credentials with 401 Unauthorized

**Response:**
```json
{
  "success": true,
  "message": "Cron authentication validated successfully",
  "method": "GET",
  "authenticated": true,
  "timestamp": "2026-04-14T17:13:49.135Z",
  "note": "Full moderation pipeline pending import resolution fix"
}
```

## Validation Performed

### Authentication Tests
1. **GET without auth:** 401 Unauthorized ✅
2. **GET with wrong bearer token:** 401 Unauthorized ✅
3. **GET with correct bearer token:** 200 OK ✅
4. **POST without API key:** 401 Unauthorized ✅
5. **POST with correct API key:** 200 OK ✅

### Deployment Tests
- Verified CRON_SECRET is set in Vercel Production environment ✅
- Verified route is deployed and accessible ✅
- Verified cron schedule is set to daily (0 0 * * *) ✅

### Commands Run
```bash
# Deployment
vercel --prod

# Authentication tests
curl https://sf.gamedin.xyz/api/jobs/moderation/schedule
curl -H "Authorization: Bearer wrong-secret" https://sf.gamedin.xyz/api/jobs/moderation/schedule
curl -H "Authorization: Bearer j9ldXKnIVFyiyqReHPp32ARdZm33ngFxdYs1hGsrYL2MeGN2F+l2BFUc3wfjJDyC" https://sf.gamedin.xyz/api/jobs/moderation/schedule
curl -X POST https://sf.gamedin.xyz/api/jobs/moderation/schedule
curl -H "x-shadowflower-api-key: 0c3843d80d2b9a8be0e889f35eda81713f1c2226dfc8cd85cbc28d330e72e6fe" -X POST https://sf.gamedin.xyz/api/jobs/moderation/schedule
```

## Immediate Results

**Successes:**
- Authentication mechanism works correctly for both GET (Bearer token) and POST (API key)
- Route is deployed and accessible at the correct path
- CRON_SECRET environment variable is properly configured in Vercel
- Cron schedule is compatible with Vercel Hobby plan (daily)
- All authentication test cases pass

**Failures:**
- Full moderation pipeline integration blocked by import resolution issues
- Cannot execute actual moderation jobs through the cron route
- Route only serves as authentication validation endpoint

## Known Limitations / Follow-ups

### Critical Blocker
**Import Resolution in api/ Directory:** Vercel's Node.js runtime for files in the root `api/` directory cannot resolve imports from the `src/` directory. This prevents the cron route from importing `ModerationPipeline`, `GameDinClient`, and `getConfig`.

### Potential Solutions
1. **Move route to src/routes/ directory:** Create the cron route in `src/routes/api/jobs/moderation/schedule.ts` and rely on Vercel's TypeScript compilation for the entire project.
2. **Use dist/ imports:** Import from the compiled `dist/` directory instead of `src/`.
3. **Inline all dependencies:** Copy necessary code directly into the route file (not recommended for maintenance).
4. **Use a different deployment structure:** Restructure the project to avoid the api/ vs src/ directory conflict.

### Follow-up Tasks
- Implement one of the import resolution solutions above
- Integrate full moderation pipeline logic
- Test dry-run behavior with actual GameDin API calls
- Validate end-to-end moderation job execution
- Remove the temporary authentication test endpoint note

## Risks Introduced

### Current Risks
- **Cron job does not execute moderation:** The scheduled cron job will only validate authentication but will not perform actual content moderation.
- **Production impact:** Users expecting automated moderation will not receive it until the import issue is resolved.
- **Technical debt:** The current minimal endpoint is a workaround that needs to be replaced with the full implementation.

### Mitigation
- The route is protected by proper authentication, preventing unauthorized access
- The authentication mechanism is validated and working correctly
- The issue is clearly documented in the code and this decision log
- No live moderation data is being processed (dry-run by default)

## Decision Record

### Decision 1: Use Vercel Native CRON_SECRET Authentication
**Context:** Initial requirement was to implement cron authentication.
**Options Considered:**
1. Custom header-based authentication (x-cron-secret)
2. Query parameter-based authentication
3. Vercel native CRON_SECRET with Authorization: Bearer header

**Why Chosen:** Vercel native CRON_SECRET with Authorization: Bearer header
- Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` to cron requests
- Eliminates query parameter exposure in logs/monitoring
- Aligns with Vercel's recommended security model for cron jobs
- Cleaner, more secure implementation

**Tradeoffs:** None - this is the recommended Vercel approach.

### Decision 2: Inline requireCronAuth Middleware
**Context:** Import of `requireCronAuth` from `../../security/auth` caused FUNCTION_INVOCATION_FAILED.
**Options Considered:**
1. Fix import path to resolve correctly
2. Inline the middleware in the route file
3. Remove authentication temporarily

**Why Chosen:** Inline the middleware in the route file
- Allows route to function while import issues are investigated
- Maintains security with proper authentication
- Minimal code duplication (small middleware function)

**Tradeoffs:** Code duplication, but acceptable as temporary workaround.

### Decision 3: Revert to Minimal Authentication Test Endpoint
**Context:** Full moderation pipeline integration blocked by import resolution issues.
**Options Considered:**
1. Continue debugging import resolution indefinitely
2. Deploy minimal endpoint and document the issue
3. Abandon the cron route entirely

**Why Chosen:** Deploy minimal endpoint and document the issue
- Validates that authentication works correctly
- Provides a working endpoint for Vercel cron
- Clearly documents the limitation for future resolution
- Does not block other development work

**Tradeoffs:** Cron job does not execute moderation, but this is documented and can be fixed later.

## Next Recommended Step

**Priority: Critical**

Restructure the cron route to resolve import issues. Recommended approach:

1. Create the cron route in `src/routes/api/jobs/moderation/schedule.ts` instead of `api/jobs/moderation/schedule.js`
2. Update `vercel.json` to point to the new route path if needed
3. Test that imports resolve correctly from the src/ directory
4. Integrate full moderation pipeline logic
5. Test dry-run behavior with actual GameDin API calls
6. Validate end-to-end moderation job execution

This approach leverages Vercel's TypeScript compilation for the entire project and should resolve the import resolution issues that are blocking the current implementation.
