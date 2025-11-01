# Website SEO Analyzer

A simple Node.js-based tool to analyze on-page SEO signals for any website. It fetches the page, parses the HTML, and provides detailed reports on SEO elements like title tags, meta descriptions, headings, images, links, social tags, and more. It also computes an SEO score and offers actionable recommendations.

## Features

- **On-Page SEO Analysis**: Checks title, meta description, H1 tags, images, canonical URLs, viewport, lang attributes, etc.
- **Link Analysis**: Classifies internal vs. external links and checks for broken links.
- **Social Media Tags**: Analyzes Open Graph and Twitter Card tags.
- **Structured Data**: Detects JSON-LD structured data.
- **Robots.txt & Sitemap**: Fetches and displays robots.txt content and sitemap URLs.
- **SEO Score**: Computes a score out of 100 based on best practices.
- **Keyword Suggestions**: Extracts top keywords from content and suggests improvements.
- **Content Recommendations**: Provides tips for expanding content and optimizing meta tags.
- **Responsive UI**: Modern, animated web interface for easy analysis.

## Requirements

- **Node.js**: Version 14 or higher (tested on Node 16+).
- **npm**: Comes with Node.js.
- **Dependencies**: Listed in `package.json` (install via `npm install`).

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Sachin1817/SEo-Optimization.git
   cd seo-optimization
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. Open your browser and go to `http://localhost:3000`.

## Usage

1. Enter a URL in the input field (e.g., `https://example.com`).
2. Click "Analyze".
3. View the detailed report including SEO score, page info, links, social tags, and recommendations.

## Project Structure

- `server.js`: Main Express server that serves the static files and handles the `/api/analyze` endpoint.
- `src/analyzer.js`: Core analysis logic using Cheerio for HTML parsing and TLDTS for domain handling.
- `src/fetchPage.js`: Utility functions for fetching pages, text, and checking link statuses using Undici.
- `public/index.html`: Frontend interface with CSS and JavaScript for user interaction and report display.
- `package.json`: Project metadata and dependencies.

## API Endpoint

- `GET /api/analyze?url=<URL>`: Analyzes the given URL and returns a JSON report.

Example response structure:
```json
{
  "request": { "inputUrl": "...", "finalUrl": "...", "status": 200, "contentType": "..." },
  "page": { "url": "...", "title": "...", "metaDescription": "...", ... },
  "links": { "total": 10, "internal": 8, "external": 2, "sample": [...] },
  "social": { "og": {...}, "twitter": {...} },
  "structuredData": { "ldJsonCount": 1 },
  "robots": { "robotsUrl": "...", "robotsTxt": "...", "sitemapUrl": "..." },
  "linkStatuses": { "checked": 50, "brokenCount": 0, "sample": [...] },
  "recommendations": ["...", "..."],
  "score": { "score": 85, "total": 100, "breakdown": [...], "tips": [...] },
  "keywordSuggestions": { "topKeywords": [...], "suggestedContent": [...], "keywordGaps": [...] }
}
```
![Sample of Output](https://github.com/Sachin1817/SEo-Optimization/blob/00f6fefc4dfb03d78a54edc66501cc7fce2fb479/seo.png)
## Dependencies

- `express`: Web server framework.
- `cheerio`: jQuery-like library for server-side HTML parsing.
- `tldts`: For parsing top-level domains and extracting domain info.
- `undici`: Modern HTTP client for fetching pages.
- `nodemon`: For development (auto-restart on file changes).

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Test thoroughly.
5. Submit a pull request.

## License

This project is open-source. Feel free to use and modify as needed.

## Disclaimer

This tool is for educational and informational purposes. SEO analysis is subjective and should be used as a guide, not definitive advice. Always verify results manually.
