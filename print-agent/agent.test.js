/**
 * Unit Tests for Print Agent Command Construction & Option Flags
 *
 * Runs with:
 *   node agent.test.js
 */

const path = require('path');
const fs = require('fs');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}\n     ${err.stack || err.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// Function logic mirrors print-agent/agent.js command builder
function buildPrintCommand(platform, filePath, copies = 1, printType = 'bw', layout = 'single', orientation = 'portrait', exeExists = true) {
  const isWindows = platform === 'win32';
  const isDuplex = layout === 'double' || layout === 'duplex';
  let printCmd;

  if (isWindows) {
    const settingsStr = `${printType === 'bw' ? 'monochrome' : 'color'},${isDuplex ? 'duplex' : 'simplex'},${copies}x,${orientation}`;

    if (exeExists) {
      printCmd = `"SumatraPDF.exe" -print-to-default -print-settings "${settingsStr}" -silent "${filePath}"`;
    } else {
      printCmd = `powershell -Command "Start-Process -FilePath '${filePath}' -Verb Print"`;
    }
  } else {
    const colorOpt = printType === 'bw' 
      ? '-o ColorModel=Gray -o ColorModel=Monochrome -o ColorModel=BlackWhite -o ColorModel=K' 
      : '-o ColorModel=Color';
    const duplexOpt = isDuplex ? '-o sides=two-sided-long-edge' : '-o sides=one-sided';
    const orientationOpt = orientation === 'landscape' ? '-o landscape' : '-o portrait';
    printCmd = `lp -n ${copies} ${colorOpt} ${duplexOpt} ${orientationOpt} "${filePath}"`;
  }

  return printCmd;
}

console.log('Running Print Agent Command Builder Tests...\n');

test('Windows SumatraPDF: Duplex, B&W, 2 copies, portrait', () => {
  const cmd = buildPrintCommand('win32', 'doc.pdf', 2, 'bw', 'duplex', 'portrait', true);
  assertEqual(cmd, '"SumatraPDF.exe" -print-to-default -print-settings "monochrome,duplex,2x,portrait" -silent "doc.pdf"', 'Windows SumatraPDF command');
});

test('Windows SumatraPDF: Single-sided, Color, 1 copy, landscape', () => {
  const cmd = buildPrintCommand('win32', 'doc.pdf', 1, 'color', 'single', 'landscape', true);
  assertEqual(cmd, '"SumatraPDF.exe" -print-to-default -print-settings "color,simplex,1x,landscape" -silent "doc.pdf"', 'Windows SumatraPDF command');
});

test('macOS lp: Duplex, Color, 5 copies, landscape', () => {
  const cmd = buildPrintCommand('darwin', 'doc.pdf', 5, 'color', 'duplex', 'landscape');
  assertEqual(cmd, 'lp -n 5 -o ColorModel=Color -o sides=two-sided-long-edge -o landscape "doc.pdf"', 'macOS lp command');
});

test('macOS lp: Single-sided, B&W, 1 copy, portrait', () => {
  const cmd = buildPrintCommand('darwin', 'doc.pdf', 1, 'bw', 'single', 'portrait');
  assertEqual(cmd, 'lp -n 1 -o ColorModel=Gray -o ColorModel=Monochrome -o ColorModel=BlackWhite -o ColorModel=K -o sides=one-sided -o portrait "doc.pdf"', 'macOS lp command');
});

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
