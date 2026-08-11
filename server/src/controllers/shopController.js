const db = require('../config/database');
const { sendPushToUser } = require('../services/pushService');

// Simple in-memory queue & SSE client registry for print jobs. 
// Keys are shop_ids, values are arrays of print jobs or active SSE client streams.
const printQueue = {};
const sseClients = {};

// POST /api/shops — Register a new shop
exports.createShop = async (req, res) => {
  try {
    const { shop_name, description, location, price_bw, price_color, price_binding, price_stick_file, supports_duplex_printing, price_bw_duplex, price_color_duplex } = req.body;

    if (!shop_name) {
      return res.status(400).json({ error: 'Shop name is required' });
    }

    const pbw = parseFloat(price_bw);
    const pco = parseFloat(price_color);
    const pbi = parseFloat(price_binding);
    const pst = parseFloat(price_stick_file);
    const pbwDup = parseFloat(price_bw_duplex);
    const pcoDup = parseFloat(price_color_duplex);

    if (price_bw !== undefined && !isNaN(pbw) && (pbw < 0 || pbw > 50)) {
      return res.status(400).json({ error: 'B&W print price must be between ₹0 and ₹50' });
    }
    if (price_color !== undefined && !isNaN(pco) && (pco < 0 || pco > 200)) {
      return res.status(400).json({ error: 'Color print price must be between ₹0 and ₹200' });
    }
    if (price_binding !== undefined && !isNaN(pbi) && (pbi < 0 || pbi > 500)) {
      return res.status(400).json({ error: 'Spiral binding price must be between ₹0 and ₹500' });
    }
    if (price_stick_file !== undefined && !isNaN(pst) && (pst < 0 || pst > 500)) {
      return res.status(400).json({ error: 'Stick file price must be between ₹0 and ₹500' });
    }
    if (price_bw_duplex !== undefined && !isNaN(pbwDup) && (pbwDup < 0 || pbwDup > 50)) {
      return res.status(400).json({ error: 'B&W duplex price must be between ₹0 and ₹50' });
    }
    if (price_color_duplex !== undefined && !isNaN(pcoDup) && (pcoDup < 0 || pcoDup > 200)) {
      return res.status(400).json({ error: 'Color duplex price must be between ₹0 and ₹200' });
    }

    const [existing] = await db.execute('SELECT id FROM shops WHERE user_id = ?', [req.user.id]);
    if (existing.length) {
      return res.status(409).json({ error: 'You already have a registered shop' });
    }

    const dupSupported = (supports_duplex_printing === true || supports_duplex_printing === 'true' || supports_duplex_printing === 1 || supports_duplex_printing === '1') ? 1 : 0;

    const [result] = await db.execute(
      'INSERT INTO shops (user_id, shop_name, description, location, price_bw, price_color, price_binding, price_stick_file, supports_duplex_printing, price_bw_duplex, price_color_duplex) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        req.user.id, shop_name, description || null, location || null,
        price_bw || 2.00, price_color || 5.00, price_binding || 30.00, price_stick_file || 10.00,
        dupSupported, price_bw_duplex || 1.50, price_color_duplex || 4.00
      ]
    );

    // Notify admins
    const [admins] = await db.execute("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins) {
      await db.execute(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [admin.id, '🏪 New Shop Registration', `"${shop_name}" is awaiting approval`, 'system']
      );
      await sendPushToUser(admin.id, {
        title: '🏪 New Shop Registration',
        message: `"${shop_name}" is awaiting approval`,
        url: '/admin/shops',
        tag: `shop-registration-${result.insertId}`,
      });
    }

    res.status(201).json({ message: 'Shop registered. Awaiting admin approval.', shopId: result.insertId });
  } catch (err) {
    console.error('Create shop error:', err);
    res.status(500).json({ error: 'Failed to register shop' });
  }
};

// GET /api/shops — List approved shops
exports.getShops = async (req, res) => {
  try {
    // Fetch all approved shops but group by name to avoid duplicates if users created multiple
    const [shops] = await db.execute(
      `SELECT s1.*, u.name as owner_name 
       FROM shops s1 
       JOIN users u ON s1.user_id = u.id 
       WHERE s1.is_approved = 1 
       AND s1.id = (
         SELECT MAX(id) FROM shops s2 WHERE s2.shop_name = s1.shop_name AND s2.is_approved = 1
       )
       ORDER BY s1.rating DESC`
    );
    res.json({ shops });
  } catch (err) {
    console.error('Get shops error:', err);
    res.status(500).json({ error: 'Failed to fetch shops' });
  }
};

// GET /api/shops/my — Get current user's shop
exports.getMyShop = async (req, res) => {
  try {
    const [shops] = await db.execute('SELECT * FROM shops WHERE user_id = ?', [req.user.id]);
    if (!shops.length) {
      return res.status(404).json({ error: 'No shop found' });
    }
    res.json({ shop: shops[0] });
  } catch (err) {
    console.error('Get my shop error:', err);
    res.status(500).json({ error: 'Failed to fetch shop' });
  }
};

// PATCH /api/shops/toggle — Toggle shop open/closed
exports.toggleShop = async (req, res) => {
  try {
    const [shops] = await db.execute('SELECT * FROM shops WHERE user_id = ?', [req.user.id]);
    if (!shops.length) {
      return res.status(404).json({ error: 'No shop found' });
    }

    const newStatus = shops[0].is_open ? 0 : 1;
    await db.execute('UPDATE shops SET is_open = ? WHERE id = ?', [newStatus, shops[0].id]);

    res.json({ message: `Shop is now ${newStatus ? 'OPEN' : 'CLOSED'}`, is_open: !!newStatus });
  } catch (err) {
    console.error('Toggle shop error:', err);
    res.status(500).json({ error: 'Failed to toggle shop' });
  }
};

// GET /api/shops/:id/stats — Shop statistics
exports.getShopStats = async (req, res) => {
  try {
    const shopId = req.params.id;

    // Auth verification & ownership check:
    if (req.user.role === 'shop') {
      const [shops] = await db.execute('SELECT id FROM shops WHERE user_id = ?', [req.user.id]);
      if (!shops.length || String(shops[0].id) !== String(shopId)) {
        return res.status(403).json({ error: 'Unauthorized to access this shop stats' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to access this shop stats' });
    }

    const [[{ total }]] = await db.execute('SELECT COUNT(*) as total FROM orders WHERE shop_id = ?', [shopId]);
    const [[{ pending }]] = await db.execute("SELECT COUNT(*) as pending FROM orders WHERE shop_id = ? AND status = 'pending'", [shopId]);
    const [[{ printing }]] = await db.execute("SELECT COUNT(*) as printing FROM orders WHERE shop_id = ? AND status = 'printing'", [shopId]);
    const [[{ ready }]] = await db.execute("SELECT COUNT(*) as ready FROM orders WHERE shop_id = ? AND status = 'ready'", [shopId]);
    const [[{ delivered }]] = await db.execute("SELECT COUNT(*) as delivered FROM orders WHERE shop_id = ? AND status = 'delivered'", [shopId]);
    const [[{ revenue }]] = await db.execute("SELECT COALESCE(SUM(total_price), 0) as revenue FROM orders WHERE shop_id = ? AND status = 'delivered'", [shopId]);

    // Revenue by day (last 7 days)
    const [dailyRevenue] = await db.execute(
      `SELECT DATE(delivered_at) as date, SUM(total_price) as amount, COUNT(*) as count 
       FROM orders WHERE shop_id = ? AND status = 'delivered' AND delivered_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(delivered_at) ORDER BY date`,
      [shopId]
    );

    res.json({
      stats: { total, pending, printing, ready, delivered, revenue: parseFloat(revenue) },
      dailyRevenue,
    });
  } catch (err) {
    console.error('Shop stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// PATCH /api/shops/pricing — Update shop pricing
exports.updatePricing = async (req, res) => {
  try {
    const { price_bw, price_color, price_binding, price_stick_file, supports_duplex_printing, price_bw_duplex, price_color_duplex } = req.body;
    const pbw = parseFloat(price_bw);
    const pco = parseFloat(price_color);
    const pbi = parseFloat(price_binding);
    const pst = parseFloat(price_stick_file);
    const pbwDup = parseFloat(price_bw_duplex);
    const pcoDup = parseFloat(price_color_duplex);

    if (price_bw !== undefined && !isNaN(pbw) && (pbw < 0 || pbw > 50)) {
      return res.status(400).json({ error: 'B&W print price must be between ₹0 and ₹50' });
    }
    if (price_color !== undefined && !isNaN(pco) && (pco < 0 || pco > 200)) {
      return res.status(400).json({ error: 'Color print price must be between ₹0 and ₹200' });
    }
    if (price_binding !== undefined && !isNaN(pbi) && (pbi < 0 || pbi > 500)) {
      return res.status(400).json({ error: 'Spiral binding price must be between ₹0 and ₹500' });
    }
    if (price_stick_file !== undefined && !isNaN(pst) && (pst < 0 || pst > 500)) {
      return res.status(400).json({ error: 'Stick file price must be between ₹0 and ₹500' });
    }
    if (price_bw_duplex !== undefined && !isNaN(pbwDup) && (pbwDup < 0 || pbwDup > 50)) {
      return res.status(400).json({ error: 'B&W duplex price must be between ₹0 and ₹50' });
    }
    if (price_color_duplex !== undefined && !isNaN(pcoDup) && (pcoDup < 0 || pcoDup > 200)) {
      return res.status(400).json({ error: 'Color duplex price must be between ₹0 and ₹200' });
    }

    const [shops] = await db.execute('SELECT * FROM shops WHERE user_id = ?', [req.user.id]);
    if (!shops.length) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    const currentShop = shops[0];

    const dupSupported = supports_duplex_printing !== undefined
      ? ((supports_duplex_printing === true || supports_duplex_printing === 'true' || supports_duplex_printing === 1 || supports_duplex_printing === '1') ? 1 : 0)
      : (currentShop.supports_duplex_printing ? 1 : 0);

    await db.execute(
      'UPDATE shops SET price_bw = ?, price_color = ?, price_binding = ?, price_stick_file = ?, supports_duplex_printing = ?, price_bw_duplex = ?, price_color_duplex = ? WHERE user_id = ?',
      [
        price_bw !== undefined ? price_bw : currentShop.price_bw,
        price_color !== undefined ? price_color : currentShop.price_color,
        price_binding !== undefined ? price_binding : currentShop.price_binding,
        price_stick_file !== undefined ? price_stick_file : currentShop.price_stick_file,
        dupSupported,
        price_bw_duplex !== undefined ? price_bw_duplex : currentShop.price_bw_duplex,
        price_color_duplex !== undefined ? price_color_duplex : currentShop.price_color_duplex,
        req.user.id
      ]
    );
    res.json({ message: 'Pricing updated' });
  } catch (err) {
    console.error('Update pricing error:', err);
    res.status(500).json({ error: 'Failed to update pricing' });
  }
};

// PUT /api/shops/:id — Update shop details
exports.updateShop = async (req, res) => {
  try {
    const { shop_name, description, location, price_bw, price_color, price_binding, price_stick_file, supports_duplex_printing, price_bw_duplex, price_color_duplex } = req.body;
    const pbw = parseFloat(price_bw);
    const pco = parseFloat(price_color);
    const pbi = parseFloat(price_binding);
    const pst = parseFloat(price_stick_file);
    const pbwDup = parseFloat(price_bw_duplex);
    const pcoDup = parseFloat(price_color_duplex);

    if (price_bw !== undefined && !isNaN(pbw) && (pbw < 0 || pbw > 50)) {
      return res.status(400).json({ error: 'B&W print price must be between ₹0 and ₹50' });
    }
    if (price_color !== undefined && !isNaN(pco) && (pco < 0 || pco > 200)) {
      return res.status(400).json({ error: 'Color print price must be between ₹0 and ₹200' });
    }
    if (price_binding !== undefined && !isNaN(pbi) && (pbi < 0 || pbi > 500)) {
      return res.status(400).json({ error: 'Spiral binding price must be between ₹0 and ₹500' });
    }
    if (price_stick_file !== undefined && !isNaN(pst) && (pst < 0 || pst > 500)) {
      return res.status(400).json({ error: 'Stick file price must be between ₹0 and ₹500' });
    }
    if (price_bw_duplex !== undefined && !isNaN(pbwDup) && (pbwDup < 0 || pbwDup > 50)) {
      return res.status(400).json({ error: 'B&W duplex price must be between ₹0 and ₹50' });
    }
    if (price_color_duplex !== undefined && !isNaN(pcoDup) && (pcoDup < 0 || pcoDup > 200)) {
      return res.status(400).json({ error: 'Color duplex price must be between ₹0 and ₹200' });
    }

    const [shops] = await db.execute('SELECT * FROM shops WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!shops.length) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    const currentShop = shops[0];

    const dupSupported = supports_duplex_printing !== undefined
      ? ((supports_duplex_printing === true || supports_duplex_printing === 'true' || supports_duplex_printing === 1 || supports_duplex_printing === '1') ? 1 : 0)
      : (currentShop.supports_duplex_printing ? 1 : 0);

    await db.execute(
      'UPDATE shops SET shop_name = ?, description = ?, location = ?, price_bw = ?, price_color = ?, price_binding = ?, price_stick_file = ?, supports_duplex_printing = ?, price_bw_duplex = ?, price_color_duplex = ? WHERE id = ? AND user_id = ?',
      [
        shop_name || currentShop.shop_name,
        description !== undefined ? description : currentShop.description,
        location !== undefined ? location : currentShop.location,
        price_bw !== undefined ? price_bw : currentShop.price_bw,
        price_color !== undefined ? price_color : currentShop.price_color,
        price_binding !== undefined ? price_binding : currentShop.price_binding,
        price_stick_file !== undefined ? price_stick_file : currentShop.price_stick_file,
        dupSupported,
        price_bw_duplex !== undefined ? price_bw_duplex : currentShop.price_bw_duplex,
        price_color_duplex !== undefined ? price_color_duplex : currentShop.price_color_duplex,
        req.params.id,
        req.user.id
      ]
    );
    res.json({ message: 'Shop settings updated successfully' });
  } catch (err) {
    console.error('Update shop error:', err);
    res.status(500).json({ error: 'Failed to update shop' });
  }
};

// POST /api/shops/:id/trigger-print — Add order to print queue
exports.triggerPrint = async (req, res) => {
  try {
    const shopId = req.params.id;
    const { orderId } = req.body;

    // Verify shop belongs to user
    const [shops] = await db.execute('SELECT * FROM shops WHERE id = ? AND user_id = ?', [shopId, req.user.id]);
    if (!shops.length) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get order details for print options
    const [orders] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!orders.length) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orders[0];

    // Verify the order belongs to this shop and is PAID before allowing print trigger
    if (order.shop_id !== shops[0].id) {
      return res.status(403).json({ error: 'This order does not belong to your shop' });
    }
    if (order.payment_status !== 'PAID') {
      return res.status(400).json({ error: 'Cannot print an unpaid order' });
    }
    const [files] = await db.execute('SELECT * FROM order_files WHERE order_id = ?', [orderId]);
    if (!files.length) {
      return res.status(404).json({ error: 'No files found for this order' });
    }

    if (!printQueue[shopId]) {
      printQueue[shopId] = [];
    }

    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token || '';
    
    // Resolve base URL dynamically from request to support multi-environment without config
    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const baseUrl = `${protocol}://${host}/api`;

    const apiReceivedAt = Date.now();
    const studentClickAt = req.body.clientTimestamp || apiReceivedAt - 15;

    // Add each file to the queue with dynamic print settings & tracing metadata
    const newJobs = [];
    for (const file of files) {
      let orientation = 'portrait';
      if (order.notes) {
        const match = order.notes.match(/\[Format:.*?, (portrait|landscape),/i);
        if (match) orientation = match[1].toLowerCase();
      }

      // Resolve duplex layout flag: pass 'double' ONLY when order requires duplex AND shop supports duplex
      const isOrderDuplex = (order.print_sides === 'duplex' || order.layout === 'double' || order.layout === 'duplex');
      const shopSupportsDuplex = shops[0].supports_duplex_printing ? true : false;
      const resolvedJobLayout = (isOrderDuplex && shopSupportsDuplex) ? 'double' : (order.layout || 'single');

      const sseDispatchedAt = Date.now();
      const job = {
        orderId,
        fileId: file.id,
        fileName: file.original_name,
        fileUrl: `${baseUrl}/orders/files/${file.id}/print-pdf`,
        copies: order.copies || 1,
        printType: order.print_type || 'bw',
        layout: resolvedJobLayout,
        orientation,
        printTrace: {
          studentClickAt,
          apiReceivedAt,
          sseDispatchedAt,
        },
      };

      printQueue[shopId].push(job);
      newJobs.push(job);
    }

    // Real-time instant delivery via SSE stream if Print Agent is connected
    if (sseClients[shopId] && sseClients[shopId].length > 0 && newJobs.length > 0) {
      const payload = `data: ${JSON.stringify({ type: 'NEW_JOBS', jobs: newJobs })}\n\n`;
      sseClients[shopId].forEach((client) => {
        try {
          client.write(payload);
        } catch (streamErr) {
          console.warn('⚠️ SSE client write failed:', streamErr.message);
        }
      });
      printQueue[shopId] = []; // Instant delivery confirmed
    }

    // Also update order status to ready directly so the student can scan and pickup immediately
    await db.execute("UPDATE orders SET status = 'ready' WHERE id = ?", [orderId]);

    res.json({ message: 'Print job sent to local agent!' });
  } catch (err) {
    console.error('Trigger print error:', err);
    res.status(500).json({ error: 'Failed to trigger print' });
  }
};

// GET /api/shops/:id/stream-print — Real-time SSE stream connection for Print Agent
exports.streamPrintJobs = async (req, res) => {
  try {
    const shopId = req.params.id;
    const [shops] = await db.execute('SELECT * FROM shops WHERE id = ? AND user_id = ?', [shopId, req.user.id]);
    if (!shops.length) {
      return res.status(403).json({ error: 'Unauthorized agent' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', shopId })}\n\n`);

    if (!sseClients[shopId]) {
      sseClients[shopId] = [];
    }
    sseClients[shopId].push(res);

    // Flushes any pending jobs immediately upon SSE connection
    if (printQueue[shopId] && printQueue[shopId].length > 0) {
      const pendingJobs = [...printQueue[shopId]];
      printQueue[shopId] = [];
      res.write(`data: ${JSON.stringify({ type: 'NEW_JOBS', jobs: pendingJobs })}\n\n`);
    }

    // Heartbeat ping every 20s to prevent reverse proxy (Render/Nginx) idle connection drops
    const heartbeat = setInterval(() => {
      try {
        res.write(`: ping\n\n`);
      } catch (e) {
        clearInterval(heartbeat);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(heartbeat);
      if (sseClients[shopId]) {
        sseClients[shopId] = sseClients[shopId].filter((client) => client !== res);
      }
    });
  } catch (err) {
    console.error('SSE print stream error:', err);
    res.status(500).json({ error: 'Failed to establish print stream' });
  }
};

// GET /api/shops/:id/poll-print — Local agent polls this as fallback
exports.pollPrintJobs = async (req, res) => {
  try {
    const shopId = req.params.id;
    
    const [shops] = await db.execute('SELECT * FROM shops WHERE id = ? AND user_id = ?', [shopId, req.user.id]);
    if (!shops.length) {
      return res.status(403).json({ error: 'Unauthorized agent' });
    }

    const jobs = printQueue[shopId] || [];
    printQueue[shopId] = []; // Clear queue after fetching

    res.json({ jobs });
  } catch (err) {
    console.error('Poll print error:', err);
    res.status(500).json({ error: 'Failed to poll print jobs' });
  }
};

// GET /api/shops/download-agent — Download pre-configured print-agent.zip
exports.downloadPrintAgent = async (req, res) => {
  try {
    const token = req.query.token || '';
    if (!token) {
      return res.status(401).json({ error: 'Authentication token is required to download agent' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Retrieve shop details for this user
    const [shops] = await db.execute('SELECT * FROM shops WHERE user_id = ?', [decoded.id]);
    if (!shops.length) {
      return res.status(404).json({ error: 'Shop profile not found for this user account' });
    }
    const shop = shops[0];

    const path = require('path');
    const AdmZip = require('adm-zip');
    
    const filePath = path.join(__dirname, '../assets/print-agent.zip');
    const zip = new AdmZip(filePath);

    // Resolve API URL dynamically based on host header
    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const apiBaseUrl = `${protocol}://${host}/api`;

    // Construct pre-configured config.json content
    const configContent = JSON.stringify({
      API_BASE_URL: apiBaseUrl,
      SHOP_ID: String(shop.id),
      AUTH_TOKEN: token
    }, null, 2);

    // Inject config.json inside print-agent/ folder in the ZIP
    zip.addFile('print-agent/config.json', Buffer.from(configContent, 'utf8'));

    const zipBuffer = zip.toBuffer();
    
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="print-agent.zip"',
      'Content-Length': zipBuffer.length
    });
    res.send(zipBuffer);
  } catch (err) {
    console.error('Download print agent error:', err);
    res.status(500).json({ error: 'Failed to download print agent. Invalid token or server error.' });
  }
};

