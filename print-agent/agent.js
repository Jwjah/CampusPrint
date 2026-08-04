const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');
const os = require('os');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const TEMP_DIR = path.join(__dirname, 'temp_prints');
const POLL_INTERVAL_MS = 3000;

let API_BASE_URL = process.env.API_BASE_URL || 'https://container-ruby.vercel.app/api';
let SHOP_ID = '';
let AUTH_TOKEN = '';

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

// Load local configuration
function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      API_BASE_URL = config.API_BASE_URL || API_BASE_URL;
      SHOP_ID = config.SHOP_ID || SHOP_ID;
      AUTH_TOKEN = config.AUTH_TOKEN || AUTH_TOKEN;
      return true;
    } catch (e) {
      console.error('⚠️ Could not parse config.json');
    }
  }
  return false;
}

// Auto-register background task on macOS startup
function registerMacAutostart() {
  if (process.platform !== 'darwin') return; // Only run on macOS

  const homeDir = os.homedir();
  const launchAgentsDir = path.join(homeDir, 'Library', 'LaunchAgents');

  if (!fs.existsSync(launchAgentsDir)) {
    fs.mkdirSync(launchAgentsDir, { recursive: true });
  }

  const plistPath = path.join(launchAgentsDir, 'com.pfm.printagent.plist');
  const logPath = path.join(__dirname, 'agent.log');

  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.pfm.printagent</string>
    <key>ProgramArguments</key>
    <array>
        <string>${process.execPath}</string>
        <string>${path.join(__dirname, 'agent.js')}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>${__dirname}</string>
    <key>StandardOutPath</key>
    <string>${logPath}</string>
    <key>StandardErrorPath</key>
    <string>${logPath}</string>
</dict>
</plist>`;

  try {
    fs.writeFileSync(plistPath, plistContent);
    // Tell macOS system launcher to boot the plist file
    exec(`launchctl load "${plistPath}"`, () => {
      console.log('🎉 [AUTO-START] Print Agent registered to run silently in the background on startup!');
    });
  } catch (err) {
    console.error('⚠️ Failed to register system startup task:', err.message);
  }
}

// First-time setup using direct login
function runInteractiveSetup() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n==========================================');
  console.log('   🏪 PFM PRINT AGENT: FIRST TIME SETUP   ');
  console.log('==========================================');
  console.log('Enter your shop manager credentials and server URL to connect this printer.\n');

  rl.question(`📡 API Server URL [default: ${API_BASE_URL}]: `, (apiUrlInput) => {
    const resolvedApiUrl = apiUrlInput.trim() || API_BASE_URL;

    rl.question('📧 Shop Email: ', (email) => {
      rl.question('🔑 Password: ', async (password) => {
        rl.close();
        console.log('\n⏳ Authenticating with PFM Server...');

        try {
          // Step 1: Login to get token
          const loginRes = await axios.post(`${resolvedApiUrl}/auth/login`, {
            email: email.trim(),
            password: password.trim()
          });

          const token = loginRes.data.token;

          // Step 2: Fetch profile to discover Shop ID automatically
          console.log('🏪 Fetching Shop profile details...');
          const profileRes = await axios.get(`${resolvedApiUrl}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          const user = profileRes.data?.user;
          const shop = profileRes.data?.shop;

          if (!user || user.role !== 'shop' || !shop) {
            console.error('❌ Authentication failed: This account does not own a registered shop or details are invalid.');
            return;
          }

          // Save config
          const config = {
            API_BASE_URL: resolvedApiUrl,
            SHOP_ID: String(shop.id),
            AUTH_TOKEN: token
          };

          fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
          console.log('✅ Configuration successfully saved!');

          API_BASE_URL = config.API_BASE_URL;
          SHOP_ID = config.SHOP_ID;
          AUTH_TOKEN = config.AUTH_TOKEN;

          // Auto-Register startup service on Mac
          registerMacAutostart();

          startPolling();
        } catch (error) {
          console.error('❌ Setup failed!');
          if (error.response) {
            const status = error.response.status;
            if (status === 404) {
              console.error(`Reason (404 Not Found): The URL "${resolvedApiUrl}" did not resolve to a running PFM backend API.`);
              console.error('👉 If you are testing locally, make sure your backend is running and enter: http://localhost:5050/api');
            } else if (status === 401) {
              console.error('Reason (401 Unauthorized): Invalid email or password. Please verify your shop account credentials.');
            } else {
              console.error(`Reason: ${error.response.data.error || 'Server responded with an error.'} (Status ${status})`);
            }
          } else {
            console.error(`Error details: ${error.message}`);
            console.error('👉 Check if your internet connection is active or if your local server is offline.');
          }
        }
      });
    });
  });
}

// Function to download a file
async function downloadFile(url, dest) {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(dest);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

// Function to trigger OS print directly to default physical printer with options
function printFile(filePath, copies = 1, printType = 'bw', layout = 'single', orientation = 'portrait') {
  const logMsg = `🖨️  [PRINTER AGENT] Triggering print (Copies: ${copies}, Type: ${printType}, Layout: ${layout}, Orientation: ${orientation}) for: ${filePath}`;
  console.log(logMsg);

  // Write to internal agent log for background verification
  fs.appendFileSync(path.join(__dirname, 'agent.log'), `${new Date().toISOString()} - ${logMsg}\n`);

  const isWindows = process.platform === 'win32';
  let printCmd;

  if (isWindows) {
    const exePath = path.join(__dirname, 'SumatraPDF.exe');
    const settingsStr = `${printType === 'bw' ? 'monochrome' : 'color'},${layout === 'double' ? 'duplex' : 'simplex'},${copies}x,${orientation}`;

    if (fs.existsSync(exePath)) {
      printCmd = `powershell -Command "` +
        `$targetPrinter = (Get-CimInstance Win32_Printer | Where-Object { $_.Name -like '*${printType === 'bw' ? 'bw' : 'color'}*' -or $_.Name -like '*${printType === 'bw' ? 'mono' : 'colour'}*' -or $_.Name -like '*${printType === 'bw' ? 'gray' : 'chroma'}*' } | Select-Object -First 1).Name; ` +
        `if (-not $targetPrinter) { $targetPrinter = (Get-CimInstance Win32_Printer -Filter 'Default = true').Name }; ` +
        `& '${exePath}' -print-to \\"$targetPrinter\\" -print-settings '${settingsStr}' -silent '${filePath}'` +
        `"`;
    } else {
      printCmd = `powershell -Command "` +
        `$targetPrinter = (Get-CimInstance Win32_Printer | Where-Object { $_.Name -like '*${printType === 'bw' ? 'bw' : 'color'}*' -or $_.Name -like '*${printType === 'bw' ? 'mono' : 'colour'}*' -or $_.Name -like '*${printType === 'bw' ? 'gray' : 'chroma'}*' } | Select-Object -First 1).Name; ` +
        `if (-not $targetPrinter) { $targetPrinter = (Get-CimInstance Win32_Printer -Filter 'Default = true').Name }; ` +
        `$val = Start-Process -FilePath '${filePath}' -Verb PrintTo -ArgumentList $targetPrinter -PassThru -WindowStyle Hidden; ` +
        `Start-Sleep -Seconds 5; ` +
        `If ($val) { Stop-Process -Id $val.Id -Force }` +
        `"`;
    }
  } else {
    // macOS / Linux: Use lp command with native command-line options and robust fallbacks
    const colorOpt = printType === 'bw' 
      ? '-o ColorModel=Gray -o ColorModel=Monochrome -o ColorModel=BlackWhite -o ColorModel=K' 
      : '-o ColorModel=Color';
    const duplexOpt = layout === 'double' ? '-o sides=two-sided-long-edge' : '-o sides=one-sided';
    const orientationOpt = orientation === 'landscape' ? '-o landscape' : '-o portrait';
    printCmd = `lp -n ${copies} ${colorOpt} ${duplexOpt} ${orientationOpt} "${filePath}"`;
  }

  exec(printCmd, (err) => {
    if (err) {
      console.warn('❌ Direct physical printing failed:', err.message.trim());
      fs.appendFileSync(path.join(__dirname, 'agent.log'), `${new Date().toISOString()} - ❌ Direct print failed: ${err.message}\n`);

      // Fallback: Open the file in the default OS viewer so they can print manually
      console.log('📂 Opening file in default PDF viewer as fallback...');
      const openCommand = isWindows ? 'start ""' : 'open';
      exec(`${openCommand} "${filePath}"`, (openErr) => {
        if (openErr) {
          console.error('❌ Fallback failed to open file:', openErr.message);
        }
      });
    } else {
      console.log('✅ Print job sent to default physical printer successfully.');
      fs.appendFileSync(path.join(__dirname, 'agent.log'), `${new Date().toISOString()} - ✅ Print job sent to printer.\n`);
    }
  });
}

const POLL_INTERVAL_MS = 15000;

async function handleIncomingJobs(jobs) {
  if (!jobs || jobs.length === 0) return;
  const agentReceivedAt = Date.now();
  console.log(`\n⚡ [REAL-TIME STREAM] Received ${jobs.length} new print job(s)!`);

  for (const job of jobs) {
    console.log(`⏳ Downloading Order #${job.orderId} - ${job.fileName}...`);
    const filePath = path.join(TEMP_DIR, `${job.orderId}_${job.fileName}`);

    const downloadStart = Date.now();
    try {
      await downloadFile(job.fileUrl, filePath);
      const downloadCompletedAt = Date.now();
      console.log(`💾 Saved to local disk: ${filePath}`);

      const printerStart = Date.now();
      printFile(filePath, job.copies, job.printType, job.layout, job.orientation);
      const printerStartedAt = Date.now();

      // Print Pipeline Latency Tracing Audit Log
      if (job.printTrace) {
        const { studentClickAt, apiReceivedAt, sseDispatchedAt } = job.printTrace;
        const totalMs = printerStartedAt - studentClickAt;
        const logTrace = [
          `\n⏱️ [PRINT PIPELINE TRACE - Order #${job.orderId}]`,
          `  1. Student Click -> API Recv : ${Math.max(0, apiReceivedAt - studentClickAt)}ms`,
          `  2. API -> SSE Dispatch      : ${Math.max(0, sseDispatchedAt - apiReceivedAt)}ms`,
          `  3. SSE -> Agent Recv        : ${Math.max(0, agentReceivedAt - sseDispatchedAt)}ms`,
          `  4. PDF Download Time        : ${Math.max(0, downloadCompletedAt - downloadStart)}ms`,
          `  5. OS Printer Trigger       : ${Math.max(0, printerStartedAt - printerStart)}ms`,
          `  ---------------------------------------------------`,
          `  ⚡ TOTAL PIPELINE LATENCY    : ${Math.max(0, totalMs)}ms (${(Math.max(0, totalMs) / 1000).toFixed(2)}s)\n`
        ].join('\n');
        console.log(logTrace);
        try {
          fs.appendFileSync(path.join(__dirname, 'agent.log'), `${new Date().toISOString()} - ${logTrace}\n`);
        } catch (e) {}
      }
    } catch (err) {
      console.error(`❌ Failed to process print job #${job.orderId}:`, err.message);
    }
  }
}

function startSseStream() {
  const streamUrl = `${API_BASE_URL}/shops/${SHOP_ID}/stream-print`;
  console.log(`⚡ Connecting real-time print stream: ${streamUrl}`);

  try {
    const isHttps = streamUrl.startsWith('https');
    const httpLib = isHttps ? require('https') : require('http');

    const req = httpLib.get(streamUrl, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Accept': 'text/event-stream'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        console.warn(`⚠️ Real-time stream status ${res.statusCode}. Fallback polling active.`);
        return;
      }

      console.log('✅ Real-time SSE print stream connected! Instant (<1.5s) printing active.');

      let buffer = '';
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            try {
              const jsonStr = trimmed.replace(/^data:\s*/, '');
              const payload = JSON.parse(jsonStr);
              if (payload.type === 'NEW_JOBS' && payload.jobs) {
                handleIncomingJobs(payload.jobs);
              }
            } catch (e) {
              // Parse error ignored
            }
          }
        }
      });

      res.on('end', () => {
        console.warn('⚠️ Real-time stream closed. Reconnecting stream in 5s...');
        setTimeout(startSseStream, 5000);
      });
    });

    req.on('error', (err) => {
      console.warn('⚠️ SSE stream connection error:', err.message);
      setTimeout(startSseStream, 10000);
    });
  } catch (err) {
    console.warn('⚠️ SSE stream init exception:', err.message);
  }
}

// Polling loop
async function pollForJobs() {
  try {
    const response = await axios.get(`${API_BASE_URL}/shops/${SHOP_ID}/poll-print`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
    });

    const jobs = response.data.jobs || [];
    if (jobs.length > 0) {
      console.log(`\n📥 [FALLBACK POLL] Received ${jobs.length} print jobs!`);
      await handleIncomingJobs(jobs);
    }
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.error('❌ Authentication failed! Config token expired or shop was disconnected.');
    } else {
      console.error('⚠️ Polling error:', error.message);
    }
  }

  setTimeout(pollForJobs, POLL_INTERVAL_MS);
}

// Ensure SumatraPDF.exe is downloaded on Windows for silent printing
async function ensureSumatraPDF() {
  const exePath = path.join(__dirname, 'SumatraPDF.exe');
  if (fs.existsSync(exePath)) return true;

  console.log('📦 Windows detected: Downloading silent physical printing helper (SumatraPDF)...');
  const url = 'https://www.sumatrapdfreader.org/dl/rel/3.5.2/SumatraPDF-3.5.2-install.exe';
  
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(exePath);
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    console.log('✅ SumatraPDF successfully downloaded!');
    return true;
  } catch (err) {
    console.error('❌ Failed to download SumatraPDF:', err.message);
    return false;
  }
}

async function startPolling() {
  console.log('\n🚀 CampusPrint Local Agent Started!');
  console.log(`📡 Listening for print jobs for Shop ID: ${SHOP_ID}...`);
  
  if (process.platform === 'win32') {
    await ensureSumatraPDF();
  }
  
  startSseStream();
  pollForJobs();
}

// Execution Flow
const hasConfig = loadConfig();
if (hasConfig && SHOP_ID && AUTH_TOKEN) {
  startPolling();
} else {
  runInteractiveSetup();
}
