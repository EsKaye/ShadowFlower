# ShadowFlower Lessons Learned

## Development Lessons

### Problem: TypeScript Strict Mode Issues
**Root Cause**: Using `process.env.VAR` syntax with TypeScript's `exactOptionalPropertyTypes: true`
**Fix**: Use bracket notation `process.env['VAR']` to satisfy strict type checking
**Prevention Rule**: Always use bracket notation for environment variable access in strict TypeScript

### Problem: Import Path Resolution in Vercel Functions
**Root Cause**: Relative import paths in API route files not resolving correctly
**Fix**: Ensure proper TypeScript compilation and module resolution in tsconfig.json
**Prevention Rule**: Test imports early in development, use absolute paths when possible

### Problem: Unused Parameter Warnings
**Root Cause**: TypeScript strict mode flagging unused function parameters
**Fix**: Prefix unused parameters with underscore (`_param`) to indicate intentional non-use
**Prevention Rule**: Use underscore prefix for intentionally unused parameters

### Problem: Axios Header Type Mismatches
**Root Cause**: Custom header interface not compatible with Axios's expected header types
**Fix**: Use proper Axios header types or cast to compatible interface
**Prevention Rule**: Always check TypeScript compatibility for third-party library integrations

### Problem: API Response Type Safety
**Root Cause**: Missing type validation for external API responses
**Fix**: Implement proper type guards and response validation
**Prevention Rule**: Always validate external API responses before processing

## Architecture Lessons

### Problem: Provider Abstraction Complexity
**Root Cause**: Initial over-engineering of provider interface
**Fix**: Simplified to core methods with clear contracts
**Prevention Rule**: Start with minimal viable interfaces, expand as needed

### Problem: Error Handling Inconsistency
**Root Cause**: Different error handling patterns across modules
**Fix**: Standardized error handling with consistent error types
**Prevention Rule**: Establish error handling patterns early in development

### Problem: Configuration Management
**Root Cause**: Scattered configuration logic across multiple files
**Fix**: Centralized configuration in dedicated config module
**Prevention Rule**: Always centralize configuration management

## Security Lessons

### Problem: API Key Exposure Risks
**Root Cause**: Potential for API keys to be logged or exposed in error messages
**Fix**: Implemented proper secret filtering in logging and error responses
**Prevention Rule**: Never log or expose secrets in any circumstances

### Problem: Rate Limiting Implementation
**Root Cause**: Initial lack of rate limiting exposed service to abuse
**Fix**: Implemented in-memory rate limiting with proper headers
**Prevention Rule**: Always implement rate limiting for public-facing APIs

## Deployment Lessons

### Problem: Vercel Function Timeout
**Root Cause**: Long-running moderation jobs exceeding Vercel function limits
**Fix**: Implemented proper timeout handling and batch size limits
**Prevention Rule**: Always consider platform constraints in design

### Problem: Environment Variable Management
**Root Cause**: Missing required environment variables causing runtime failures
**Fix**: Added comprehensive environment validation on startup
**Prevention Rule**: Validate all required environment variables at startup

### Problem: Vercel Deployment Structure Incorrect
**Root Cause**: API routes placed in root `api/` directory with TypeScript files outside TypeScript include pattern, causing "Emit skipped" errors
**Fix**: Reverted API routes to `src/routes/api/` and configured vercel.json rewrites to point to source files
**Prevention Rule**: Keep all source code in TypeScript include pattern (src/), use vercel.json rewrites for routing instead of moving files outside build process

### Problem: CORS Wildcard Origin Security Vulnerability
**Root Cause**: CORS configured with wildcard origin `*` allowing unrestricted access
**Fix**: Implemented configurable ALLOWED_ORIGIN environment variable with safe default
**Prevention Rule**: Never use wildcard CORS origins in production, always restrict to specific domains

## Testing Lessons

### Problem: Missing Integration Tests
**Root Cause**: Focus on unit tests without integration testing
**Fix**: Implemented end-to-end testing for critical paths
**Prevention Rule**: Always include integration tests for external dependencies

### Problem: Mock Provider Issues
**Root Cause**: Mock providers not matching real provider behavior
**Fix**: Created realistic mock implementations
**Prevention Rule**: Ensure mocks accurately reflect real behavior

## Performance Lessons

### Problem: Inefficient Batch Processing
**Root Cause**: Sequential processing of items in batches
**Fix**: Implemented parallel processing where possible
**Prevention Rule**: Consider performance implications of sequential operations

### Problem: Memory Leaks in Long-Running Jobs
**Root Cause**: Proper cleanup not implemented for failed jobs
**Fix**: Added proper resource cleanup and error handling
**Prevention Rule**: Always implement proper cleanup for long-running operations

## Documentation Lessons

### Problem: Outdated API Documentation
**Root Cause**: Documentation not updated with code changes
**Fix**: Implemented documentation-first development approach
**Prevention Rule**: Update documentation with every code change

### Problem: Missing Environment Setup Instructions
**Root Cause**: Assumed knowledge about local development setup
**Fix**: Added comprehensive setup instructions in README
**Prevention Rule**: Never assume user knowledge, document everything

### Problem: Production-Ready Claims Without Validation
**Root Cause**: Documentation claimed production readiness when service was untested and unvalidated
**Fix**: Removed production-ready claims and added honest status section with limitations
**Prevention Rule**: Never claim production readiness without testing and validation, always document actual state

## Future Prevention Rules

1. **TypeScript First**: Always configure TypeScript strictly at project start
2. **Environment Validation**: Validate all environment variables on startup
3. **Error Standardization**: Use consistent error handling patterns
4. **Security by Default**: Implement security measures from the beginning
5. **Documentation Integration**: Update docs with every feature change
6. **Performance Testing**: Test performance characteristics early
7. **Platform Constraints**: Consider deployment platform limitations in design
8. **Mock Realism**: Ensure mocks accurately reflect real implementations
9. **Rate Limiting**: Implement rate limiting for all APIs
10. **Secret Safety**: Never expose secrets in logs or errors
