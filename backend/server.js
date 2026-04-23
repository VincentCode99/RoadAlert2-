const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve frontend static files (index.html, app.js, style.css, admin.*)
app.use(express.static(__dirname));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT,
      severity TEXT,
      district TEXT,
      location TEXT,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      description TEXT,
      photo TEXT,
      status TEXT,
      upvotes INTEGER DEFAULT 0,
      fixed_votes INTEGER DEFAULT 0,
      sync_status TEXT,
      privacy_regions JSONB,
      date TEXT,
      resolved_date TEXT
    );
  `);
  console.log("✅ Database ready");
}
initDB();

// GET all reports
app.get('/api/reports', async (req, res) => {
  const result = await pool.query('SELECT * FROM reports ORDER BY date DESC');
  res.json(result.rows);
});

// ADMIN: Update a report's severity, type, and status
app.put('/api/reports/:id', async (req, res) => {
  const { id } = req.params;
  const { severity, type, status } = req.body;
  try {
    await pool.query(
      `UPDATE reports SET severity = $1, type = $2, status = $3 WHERE id = $4`,
      [severity, type, status, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: Delete a report
app.delete('/api/reports/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM reports WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST / upsert a report
app.post('/api/reports', async (req, res) => {
  const r = req.body;
  const query = `
    INSERT INTO reports (
      id, name, type, severity, district, location, lat, lng,
      description, photo, status, upvotes, fixed_votes, sync_status,
      privacy_regions, date, resolved_date
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      upvotes = EXCLUDED.upvotes,
      fixed_votes = EXCLUDED.fixed_votes,
      photo = EXCLUDED.photo,
      description = EXCLUDED.description;
  `;
  await pool.query(query, [
    r.id, r.name, r.type, r.severity, r.district,
    r.location, r.lat, r.lng, r.desc, r.photo,
    r.status, r.upvotes || 0, r.fixed_votes || 0,
    r.syncStatus, JSON.stringify(r.privacyRegions || []),
    r.date, r.resolvedDate || null
  ]);
  res.json({ success: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
