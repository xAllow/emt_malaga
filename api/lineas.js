const { lineas } = require('./_lib');

module.exports = async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
    res.status(200).json(await lineas());
  } catch (e) { res.status(502).json({ error: String(e.message || e) }); }
};
