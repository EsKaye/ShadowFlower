/**
 * Root route - serves centered logo for sf.gamedin.xyz
 * ShadowFlower is a private service, but shows logo at root for branding
 */
export default async function handler(_req, res) {
    // High-res logo from Vercel Blob Storage
    const logoUrl = 'https://a3wisuxwqkhstql9.public.blob.vercel-storage.com/logo.png';
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>ShadowFlower</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
        }
        .logo {
          max-width: 80%;
          max-height: 80%;
        }
        img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
      </style>
    </head>
    <body>
      <div class="logo">
        <img src="${logoUrl}" alt="GameDin Logo" />
      </div>
    </body>
    </html>
  `;
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(html);
}
//# sourceMappingURL=index.js.map