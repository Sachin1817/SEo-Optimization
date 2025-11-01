const { fetch } = require('undici');

async function fetchPage(url) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 20000);

	try {
		const res = await fetch(url, {
			redirect: 'follow',
			signal: controller.signal,
			headers: {
				'User-Agent': 'SEO-Analyzer/1.0 (+https://example.com)'
			}
		});

		const finalUrl = res.url || url;
		const status = res.status;
		const contentType = res.headers.get('content-type') || '';
		const text = contentType.includes('text/html') ? await res.text() : '';

		return { html: text, status, contentType, finalUrl };
	} finally {
		clearTimeout(timeout);
	}
}

async function fetchText(url, timeoutMs = 15000) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(url, { redirect: 'follow', signal: controller.signal });
		return await res.text();
	} finally {
		clearTimeout(timeout);
	}
}

async function headStatus(url, timeoutMs = 8000) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
		return res.status;
	} catch {
		return 0;
	} finally {
		clearTimeout(timeout);
	}
}

module.exports = { fetchPage, fetchText, headStatus };


