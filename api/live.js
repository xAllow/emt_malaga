const { liveEmt, liveAbierto } = require('./_lib');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    res.status(200).json(await liveEmt());
  } catch {
    try { res.status(200).json(await liveAbierto()); }   // si EMT falla, datos abiertos
    catch (e) { res.status(502).json({ error: String(e.message || e) }); }
  }
};
