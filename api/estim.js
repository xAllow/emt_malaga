const { estimaciones } = require('./_lib');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const cod = String(req.query.cod || '');
  if (!/^\d+(,\d+)*$/.test(cod)) return res.status(400).json({ error: 'cod inválido' });
  try { res.status(200).json(await estimaciones(cod)); }
  catch (e) { res.status(502).json({ error: String(e.message || e) }); }
};
