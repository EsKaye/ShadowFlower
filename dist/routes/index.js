/**
 * Root route - returns minimal non-informative response
 * ShadowFlower is a private service, not a public website
 */
export default async function handler(_req, res) {
    // Return 404 to indicate this is not a public-facing website
    res.status(404).json({
        message: 'Not Found',
    });
}
//# sourceMappingURL=index.js.map