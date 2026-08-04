const db = require('../config/database');

let cachedState = null;
let cacheTime = 0;
const CACHE_TTL_MS = 2000; // 2s in-memory cache to keep DB queries light

/**
 * Single authoritative lookup for global maintenance mode state.
 * Checks env var process.env.MAINTENANCE_MODE first, then DB system_settings table.
 */
async function isMaintenanceModeEnabled() {
  if (process.env.MAINTENANCE_MODE === 'true' || process.env.MAINTENANCE_MODE === '1') {
    return true;
  }

  const now = Date.now();
  if (cachedState !== null && (now - cacheTime) < CACHE_TTL_MS) {
    return cachedState;
  }

  try {
    const [rows] = await db.execute(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'maintenance_mode'"
    );
    if (rows && rows.length > 0) {
      const val = String(rows[0].setting_value).toLowerCase().trim();
      cachedState = (val === 'true' || val === '1');
    } else {
      cachedState = false;
    }
  } catch (err) {
    console.error('Error fetching maintenance_mode from DB:', err.message);
    cachedState = false;
  }

  cacheTime = now;
  return cachedState;
}

/**
 * Set maintenance mode state in database system_settings table.
 * Allows Admin to dynamically toggle maintenance mode without redeployment.
 */
async function setMaintenanceMode(enabled) {
  const val = enabled ? 'true' : 'false';
  const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const [existing] = await db.execute(
    "SELECT setting_key FROM system_settings WHERE setting_key = 'maintenance_mode'"
  );

  if (existing && existing.length > 0) {
    await db.execute(
      "UPDATE system_settings SET setting_value = ?, updated_at = ? WHERE setting_key = 'maintenance_mode'",
      [val, nowStr]
    );
  } else {
    await db.execute(
      "INSERT INTO system_settings (setting_key, setting_value, updated_at) VALUES ('maintenance_mode', ?, ?)",
      [val, nowStr]
    );
  }

  cachedState = enabled;
  cacheTime = Date.now();
  return enabled;
}

function clearMaintenanceCache() {
  cachedState = null;
  cacheTime = 0;
}

module.exports = {
  isMaintenanceModeEnabled,
  setMaintenanceMode,
  clearMaintenanceCache,
};
