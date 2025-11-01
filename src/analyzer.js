const cheerio = require('cheerio');
const { parse } = require('tldts');
const { fetchPage, fetchText, headStatus } = require('./fetchPage');

function normalizeUrl(input) {
	try {
		const u = new URL(input);
		return u.toString();
	} catch {
		try {
			const u2 = new URL('https://' + input);
			return u2.toString();
		} catch {
			return null;
		}
	}
}

function getText(el) {
	return (el || '').toString().trim().replace(/\s+/g, ' ');
}

function classifyLinks($, baseUrl) {
	const base = new URL(baseUrl);
	const domain = base.hostname;
	const res = parse(domain);
	const sld = res.domain || domain;

	const links = [];
	$('a[href]').each((_, a) => {
		const href = $(a).attr('href');
		if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('#')) return;
		let absolute;
		try {
			absolute = new URL(href, base).toString();
		} catch {
			return;
		}
		const host = new URL(absolute).hostname;
		const hostParse = parse(host);
		const hostSld = hostParse.domain || host;
		const type = hostSld === sld ? 'internal' : 'external';
		links.push({ href: absolute, type });
	});
	return links;
}

function analyzeHtml(html, finalUrl) {
	const $ = cheerio.load(html || '', { decodeEntities: true });

	const title = getText($('head > title').first().text());
	const metaDescription = getText($('meta[name="description"]').attr('content') || '');
	const metaRobots = getText($('meta[name="robots"]').attr('content') || '');
	const canonical = $('link[rel="canonical"]').attr('href') || '';
	const viewport = $('meta[name="viewport"]').attr('content') || '';
	const lang = $('html').attr('lang') || '';

	const h1s = $('h1').map((_, el) => getText($(el).text())).get();
	const images = $('img');
	const imgsNoAlt = images.filter((_, el) => !$(el).attr('alt') || $(el).attr('alt').trim() === '').length;

	const og = {
		title: $('meta[property="og:title"]').attr('content') || '',
		description: $('meta[property="og:description"]').attr('content') || '',
		image: $('meta[property="og:image"]').attr('content') || '',
		type: $('meta[property="og:type"]').attr('content') || ''
	};

	const twitter = {
		card: $('meta[name="twitter:card"]').attr('content') || '',
		title: $('meta[name="twitter:title"]').attr('content') || '',
		description: $('meta[name="twitter:description"]').attr('content') || '',
		image: $('meta[name="twitter:image"]').attr('content') || ''
	};

	const ldJsonCount = $('script[type="application/ld+json"]').length;
	const favicon = $('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').attr('href') || '';

	const textContent = getText($('body').text() || '');
	const wordCount = textContent ? textContent.split(/\s+/).filter(Boolean).length : 0;

	const links = classifyLinks($, finalUrl);

	return {
		page: {
			url: finalUrl,
			title,
			titleLength: title.length,
			metaDescription,
			metaDescriptionLength: metaDescription.length,
			metaRobots,
			canonical,
			viewportPresent: !!viewport,
			lang,
			h1Count: h1s.length,
			h1Samples: h1s.slice(0, 5),
			images: {
				total: images.length,
				withoutAlt: imgsNoAlt
			},
			wordCount
		},
		social: { og, twitter },
		structuredData: { ldJsonCount },
		assets: { favicon },
		links: {
			total: links.length,
			internal: links.filter(l => l.type === 'internal').length,
			external: links.filter(l => l.type === 'external').length,
			sample: links.slice(0, 20)
		},
		qualityHints: [
			!title ? 'Missing <title> tag.' : (title.length < 10 || title.length > 60) ? 'Title length should be ~10-60 chars.' : null,
			!metaDescription ? 'Missing meta description.' : (metaDescription.length < 50 || metaDescription.length > 160) ? 'Meta description should be ~50-160 chars.' : null,
			h1s.length === 0 ? 'Missing H1.' : h1s.length > 1 ? 'Multiple H1s found.' : null,
			imgsNoAlt > 0 ? `${imgsNoAlt} images without alt.` : null,
			!viewport ? 'Missing viewport meta (mobile friendliness).' : null,
			!canonical ? 'Missing canonical link.' : null,
			!og.title && !twitter.title ? 'Missing Open Graph/Twitter tags.' : null,
			ldJsonCount === 0 ? 'No structured data (ld+json) detected.' : null,
			!lang ? 'Missing lang attribute on <html>.' : null
		].filter(Boolean)
	};
}

async function tryRobotsAndSitemap(finalUrl) {
	try {
		const u = new URL(finalUrl);
		const robotsUrl = `${u.origin}/robots.txt`;
		const robotsTxt = await fetchText(robotsUrl).catch(() => '');
		let sitemapUrl = '';
		if (robotsTxt) {
			const match = robotsTxt.match(/^sitemap:\s*(.+)$/gim);
			if (match && match[0]) {
				const line = match[0];
				sitemapUrl = line.split(':')[1]?.trim() || '';
			}
		}
		return { robotsUrl, robotsTxt: robotsTxt.slice(0, 2000), sitemapUrl };
	} catch {
		return { robotsUrl: '', robotsTxt: '', sitemapUrl: '' };
	}
}

async function checkLinkStatuses(links, limit = 50) {
	const sample = links.slice(0, limit);
	const results = await Promise.all(sample.map(async l => {
		const status = await headStatus(l.href);
		return { href: l.href, type: l.type, status };
	}));
	const broken = results.filter(r => !(r.status >= 200 && r.status < 400));
	return { checked: results.length, brokenCount: broken.length, sample: results.slice(0, 20) };
}

async function analyzeUrl(inputUrl) {
	const normalized = normalizeUrl(inputUrl);
	if (!normalized) throw new Error('Invalid URL');

	const { html, status, contentType, finalUrl } = await fetchPage(normalized);

	const base = {
		request: { inputUrl, finalUrl, status, contentType }
	};

	if (!html || !contentType.includes('text/html')) {
		return {
			...base,
			error: 'Content is not HTML or could not be fetched.'
		};
	}

	const core = analyzeHtml(html, finalUrl);
	const robots = await tryRobotsAndSitemap(finalUrl);

	let linkStatuses = { checked: 0, brokenCount: 0, sample: [] };
	try {
		linkStatuses = await checkLinkStatuses(core.links.sample.map(x => x), 50);
	} catch {
		// ignore link check errors
	}

	// Compute SEO score
	function computeSeoScore(coreData, robotsInfo, linkStatusesInfo) {
		let score = 0;
		let total = 100;
		const breakdown = [];
		const tips = [];

		function add(condition, points, successMsg, tipMsg) {
			if (condition) {
				score += points;
				breakdown.push({ item: successMsg, points });
			} else {
				breakdown.push({ item: tipMsg, points: 0 });
				tips.push(tipMsg);
			}
		}

		const p = coreData.page || {};
		const s = coreData.social || { og: {}, twitter: {} };

		add(!!p.title && p.title.length >= 10 && p.title.length <= 60, 10, 'Good title length', 'Set a concise, descriptive title (~10–60 chars).');
		add(!!p.metaDescription && p.metaDescription.length >= 50 && p.metaDescription.length <= 160, 10, 'Meta description present', 'Add a compelling meta description (~50–160 chars).');
		add(p.h1Count === 1, 8, 'Single H1 present', 'Use exactly one H1 that reflects page topic.');
		add(p.viewportPresent, 6, 'Mobile viewport set', 'Add a responsive viewport meta tag.');
		add(!!p.canonical, 6, 'Canonical set', 'Add a canonical URL to avoid duplicates.');
		add(!!p.lang, 4, 'Lang attribute set', 'Set the lang attribute on <html>.');
		add((p.images?.withoutAlt || 0) === 0, 8, 'Images have alt text', 'Add descriptive alt text to images.');
		add((p.wordCount || 0) >= 200, 6, 'Sufficient on-page text', 'Increase helpful textual content (aim 200+ words).');
		add(!!s.og?.title || !!s.twitter?.title, 6, 'Social tags present', 'Add Open Graph/Twitter card tags for rich sharing.');
		add((coreData.structuredData?.ldJsonCount || 0) > 0, 10, 'Structured data present', 'Add relevant schema.org JSON-LD.');

		const robotsOk = !!robotsInfo.robotsUrl && robotsInfo.robotsTxt;
		add(robotsOk, 6, 'robots.txt accessible', 'Expose a valid robots.txt at /robots.txt.');

		const linkOk = (linkStatusesInfo.brokenCount || 0) === 0;
		add(linkOk, 10, 'No broken links detected (sample)', 'Fix broken internal/external links.');

		// Minor bonus if internal links exist
		const hasInternal = (coreData.links?.internal || 0) > 0;
		if (hasInternal) { score += 4; breakdown.push({ item: 'Internal links present', points: 4 }); } else { tips.push('Add internal links to distribute PageRank and context.'); }

		return { score: Math.max(0, Math.min(100, Math.round(score))), total, breakdown, tips };
	}

	const score = computeSeoScore(core, robots, linkStatuses);

	// Keyword and content suggestions
	function suggestKeywordsAndContent(html, title, description) {
		const $ = cheerio.load(html || '');
		const text = getText($('body').text() || '');
		const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
		const wordFreq = {};
		words.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
		const sortedWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 10);
		
		const currentKeywords = [];
		if (title) currentKeywords.push(...title.toLowerCase().match(/\b[a-z]{3,}\b/g) || []);
		if (description) currentKeywords.push(...description.toLowerCase().match(/\b[a-z]{3,}\b/g) || []);
		
		const suggestions = {
			topKeywords: sortedWords.map(([word, count]) => ({ word, count })),
			suggestedContent: [],
			keywordGaps: []
		};

		// Suggest content improvements
		if ((core.page?.wordCount || 0) < 200) {
			suggestions.suggestedContent.push({
				action: 'Expand content',
				reason: `Current word count is ${core.page?.wordCount || 0}. Aim for 200+ words for better SEO.`,
				suggestions: ['Add detailed descriptions', 'Include FAQ section', 'Add more context about the topic']
			});
		}

		if (!description || description.length < 50) {
			suggestions.suggestedContent.push({
				action: 'Improve meta description',
				reason: 'Meta description is missing or too short.',
				suggestions: ['Write a compelling 50-160 character description', 'Include primary keywords', 'Add a call-to-action']
			});
		}

		// Keyword gaps (keywords in content but not in title/description)
		const topContentWords = sortedWords.slice(0, 5).map(([w]) => w);
		const missingInMeta = topContentWords.filter(w => !currentKeywords.includes(w));
		if (missingInMeta.length > 0) {
			suggestions.keywordGaps = missingInMeta.slice(0, 3);
		}

		return suggestions;
	}

	const keywordSuggestions = html ? suggestKeywordsAndContent(html, core.page?.title || '', core.page?.metaDescription || '') : { topKeywords: [], suggestedContent: [], keywordGaps: [] };

	return {
		...base,
		...core,
		robots,
		linkStatuses,
		recommendations: Array.from(new Set([...(core.qualityHints || []), ...(score.tips || [])])),
		score,
		keywordSuggestions
	};
}

module.exports = { analyzeUrl };


