const express = require('express');
const path = require('path');
const { analyzeUrl } = require('./src/analyzer');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/analyze', async (req, res) => {
	const url = req.query.url;
	if (!url || typeof url !== 'string') {
		return res.status(400).json({ error: 'Query param "url" is required.' });
	}
	try {
		const report = await analyzeUrl(url);
		res.json(report);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to analyze URL', details: String(err.message || err) });
	}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`SEO Analyzer running on http://localhost:${PORT}`);
});