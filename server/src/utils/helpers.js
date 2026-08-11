const crypto = require('crypto');
const QRCode = require('qrcode');

/**
 * Generate a secure hash for QR payloads
 */
const generateOrderHash = (orderId, userId) => {
  const payload = `${orderId}-${userId}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  return crypto.createHash('sha256').update(payload).digest('hex').substring(0, 16);
};

/**
 * Generate a unique human-readable chronological sequential Order ID
 */
const generateOrderIdStr = async (connection) => {
  const db = require('../config/database');
  const executor = connection || db;
  const [result] = await executor.execute("REPLACE INTO order_number_sequence (stub) VALUES ('a')");
  const nextSeq = result.insertId || result.lastID;
  const suffix = String(nextSeq).padStart(6, '0');
  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `CP-${year}${month}${day}-${hours}${minutes}${seconds}-${suffix}`;
};

/**
 * Generate QR code as data URL
 */
const generateQRCode = async (payload) => {
  const data = JSON.stringify(payload);
  return QRCode.toDataURL(data, {
    width: 300,
    margin: 2,
    color: { dark: '#1a1a3e', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  });
};

/**
 * Generate a 6-digit cryptographically secure OTP
 */
const generateOTP = () => {
  // Use CSPRNG — Math.random() is NOT safe for security tokens
  return require('crypto').randomInt(100000, 999999).toString();
};

/**
 * Generate a cryptographically secure 4-digit numeric verification code (0000-9999)
 */
const generate4DigitCode = () => {
  return crypto.randomInt(0, 10000).toString().padStart(4, '0');
};

// Centralized pricing configuration
const PRICING_CONFIG = {
  finishing: {
    none: 0.00,
    staple: 0.00,
    spiral: null, // Dynamic: derived from shop.price_binding
    stick: null  // Dynamic: derived from shop.price_stick_file
  }
};

const getFinishingPrice = (type, shop) => {
  const normalizedType = (type || 'none').toLowerCase();
  if (normalizedType === 'spiral') {
    return shop && shop.price_binding !== undefined ? parseFloat(shop.price_binding) : 30.00;
  }
  if (normalizedType === 'stick') {
    return shop && shop.price_stick_file !== undefined ? parseFloat(shop.price_stick_file) : 10.00;
  }
  return PRICING_CONFIG.finishing[normalizedType] || 0.00;
};

/**
 * Calculate print pricing
 */
const calculatePrice = ({ pages, copies, printType, layout, print_sides, printSides, binding, binding_type, notes, shop, pages_per_sheet, pagesPerSheet }) => {
  // Resolve print sides: 'single' or 'duplex'
  let resolvedSides = 'single';
  if (print_sides) {
    resolvedSides = String(print_sides).toLowerCase() === 'duplex' ? 'duplex' : 'single';
  } else if (printSides) {
    resolvedSides = String(printSides).toLowerCase() === 'duplex' ? 'duplex' : 'single';
  } else if (layout === 'double' || layout === 'duplex') {
    resolvedSides = 'duplex';
  }

  // Price snapshots
  const price_bw_used = shop && shop.price_bw !== undefined ? parseFloat(shop.price_bw) : 2.00;
  const price_color_used = shop && shop.price_color !== undefined ? parseFloat(shop.price_color) : 5.00;
  const price_bw_duplex_used = shop && shop.price_bw_duplex !== undefined ? parseFloat(shop.price_bw_duplex) : 1.50;
  const price_color_duplex_used = shop && shop.price_color_duplex !== undefined ? parseFloat(shop.price_color_duplex) : 4.00;
  const price_binding_used = shop && shop.price_binding !== undefined ? parseFloat(shop.price_binding) : 30.00;
  const price_stick_file_used = shop && shop.price_stick_file !== undefined ? parseFloat(shop.price_stick_file) : 10.00;

  // Determine rate per page for requested mode
  let price_printing_mode_used;
  if (resolvedSides === 'duplex') {
    price_printing_mode_used = printType === 'color' ? price_color_duplex_used : price_bw_duplex_used;
  } else {
    price_printing_mode_used = printType === 'color' ? price_color_used : price_bw_used;
  }

  // Resolve pages-per-sheet (pps)
  let pps = parseInt(pages_per_sheet !== undefined && pages_per_sheet !== null ? pages_per_sheet : pagesPerSheet);
  if (!pps || isNaN(pps) || pps < 1) {
    pps = 1;
  }

  const numPages = parseInt(pages) || 0;
  const effectivePages = Math.ceil(numPages / pps);
  const printedSheets = resolvedSides === 'duplex' ? Math.ceil(effectivePages / 2) : effectivePages;
  const numCopies = parseInt(copies) || 1;

  const printCost = effectivePages * numCopies * price_printing_mode_used;

  // Resolve binding/finishing option type
  let resolvedBindingType = (binding_type || 'none').toLowerCase();
  if (resolvedBindingType === 'none' && (binding === 'true' || binding === true)) {
    if (notes) {
      const match = notes.match(/Binding:\s*(\w+)/i);
      if (match) {
        resolvedBindingType = match[1].toLowerCase();
      } else {
        resolvedBindingType = 'spiral';
      }
    } else {
      resolvedBindingType = 'spiral';
    }
  }

  const finishingPrice = getFinishingPrice(resolvedBindingType, shop);
  const bindingCost = finishingPrice;

  return {
    print_sides: resolvedSides,
    printedSheets,
    pages_per_sheet: pps,
    printCost: parseFloat(printCost.toFixed(2)),
    bindingCost: parseFloat(bindingCost.toFixed(2)),
    total: parseFloat((printCost + bindingCost).toFixed(2)),
    price_bw_used,
    price_color_used,
    price_bw_duplex_used,
    price_color_duplex_used,
    price_printing_mode_used,
    price_binding_used,
    price_stick_file_used
  };
};

module.exports = { generateOrderHash, generateOrderIdStr, generateQRCode, generateOTP, generate4DigitCode, calculatePrice, PRICING_CONFIG, getFinishingPrice };
