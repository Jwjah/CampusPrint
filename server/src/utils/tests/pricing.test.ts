/**
 * Unit tests for Pages-per-Sheet Pricing Calculation
 *
 * Runs with:
 *   npx ts-node src/utils/tests/pricing.test.ts
 */

const { calculatePrice } = require('../helpers');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ ${name}\n     ${err.stack || err.message}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

console.log('Running Pages-per-Sheet Pricing Unit Tests...\n');

const mockShop = {
  price_bw: 0.50,
  price_color: 2.00,
  price_binding: 30.00,
  price_stick_file: 10.00,
};

test('1 page/sheet with 4 PDF pages (1 copy) -> ₹2.00', () => {
  const result = calculatePrice({
    pages: 4,
    copies: 1,
    printType: 'bw',
    pages_per_sheet: 1,
    shop: mockShop,
  });
  assertEqual(result.printedSheets, 4, 'printedSheets');
  assertEqual(result.printCost, 2.00, 'printCost');
  assertEqual(result.total, 2.00, 'totalCost');
});

test('2 pages/sheet with 4 PDF pages (1 copy) -> ₹1.00', () => {
  const result = calculatePrice({
    pages: 4,
    copies: 1,
    printType: 'bw',
    pages_per_sheet: 2,
    shop: mockShop,
  });
  assertEqual(result.printedSheets, 2, 'printedSheets');
  assertEqual(result.printCost, 1.00, 'printCost');
  assertEqual(result.total, 1.00, 'totalCost');
});

test('4 pages/sheet with 4 PDF pages (1 copy) -> ₹0.50', () => {
  const result = calculatePrice({
    pages: 4,
    copies: 1,
    printType: 'bw',
    pages_per_sheet: 4,
    shop: mockShop,
  });
  assertEqual(result.printedSheets, 1, 'printedSheets');
  assertEqual(result.printCost, 0.50, 'printCost');
  assertEqual(result.total, 0.50, 'totalCost');
});

test('Odd page count (5 PDF pages, 2 pages/sheet, 1 copy) -> ceil(5/2)=3 -> ₹1.50', () => {
  const result = calculatePrice({
    pages: 5,
    copies: 1,
    printType: 'bw',
    pages_per_sheet: 2,
    shop: mockShop,
  });
  assertEqual(result.printedSheets, 3, 'printedSheets');
  assertEqual(result.printCost, 1.50, 'printCost');
  assertEqual(result.total, 1.50, 'totalCost');
});

test('Multiple copies (5 PDF pages, 2 pages/sheet, 3 copies) -> 3 sheets * 3 copies * 0.5 = ₹4.50', () => {
  const result = calculatePrice({
    pages: 5,
    copies: 3,
    printType: 'bw',
    pages_per_sheet: 2,
    shop: mockShop,
  });
  assertEqual(result.printedSheets, 3, 'printedSheets');
  assertEqual(result.printCost, 4.50, 'printCost');
  assertEqual(result.total, 4.50, 'totalCost');
});

test('Structured pages_per_sheet takes priority and notes string is ignored for pricing', () => {
  const result = calculatePrice({
    pages: 4,
    copies: 1,
    printType: 'bw',
    pages_per_sheet: 2,
    notes: '[Format: A4, portrait, 4 pg/sheet, Binding: none]',
    shop: mockShop,
  });
  assertEqual(result.printedSheets, 2, 'structured pages_per_sheet priority');
  assertEqual(result.printCost, 1.00, 'printCost using structured parameter');
});

test('Legacy order missing pages_per_sheet defaults to 1 sheet per page safely', () => {
  const result = calculatePrice({
    pages: 4,
    copies: 1,
    printType: 'bw',
    shop: mockShop,
  });
  assertEqual(result.printedSheets, 4, 'legacy default printedSheets');
  assertEqual(result.printCost, 2.00, 'legacy default printCost');
});

test('Finishing spiral binding cost added once', () => {
  const result = calculatePrice({
    pages: 4,
    copies: 2,
    printType: 'bw',
    pages_per_sheet: 2,
    binding_type: 'spiral',
    shop: mockShop,
  });
  // 2 effective pages * 2 copies * 0.5 = 2.00 printCost, + 30.00 bindingCost = 32.00
  assertEqual(result.printCost, 2.00, 'printCost');
  assertEqual(result.bindingCost, 30.00, 'bindingCost');
  assertEqual(result.total, 32.00, 'totalCost');
});

const duplexShop = {
  price_bw: 2.00,
  price_color: 10.00,
  price_bw_duplex: 1.50,
  price_color_duplex: 8.00,
};

test('Duplex B&W pricing: 10 pages (5 physical sheets) @ ₹1.50 = ₹7.50', () => {
  const result = calculatePrice({
    pages: 10,
    copies: 1,
    printType: 'bw',
    print_sides: 'duplex',
    shop: duplexShop,
  });
  assertEqual(result.printedSheets, 5, 'printedSheets');
  assertEqual(result.printCost, 7.50, 'printCost');
  assertEqual(result.price_printing_mode_used, 1.50, 'price_printing_mode_used');
});

test('Duplex B&W odd pages: 5 pages (3 physical sheets) @ ₹1.50 = ₹4.50', () => {
  const result = calculatePrice({
    pages: 5,
    copies: 1,
    printType: 'bw',
    print_sides: 'duplex',
    shop: duplexShop,
  });
  assertEqual(result.printedSheets, 3, 'printedSheets');
  assertEqual(result.printCost, 4.50, 'printCost');
});

test('Duplex Color pricing: 10 pages (5 physical sheets) @ ₹8.00 = ₹40.00', () => {
  const result = calculatePrice({
    pages: 10,
    copies: 1,
    printType: 'color',
    print_sides: 'duplex',
    shop: duplexShop,
  });
  assertEqual(result.printedSheets, 5, 'printedSheets');
  assertEqual(result.printCost, 40.00, 'printCost');
});

test('Odd duplex page sheet counts: 5->3, 7->4, 99->50 physical sheets', () => {
  const p5 = calculatePrice({ pages: 5, copies: 1, printType: 'bw', print_sides: 'duplex', shop: duplexShop });
  assertEqual(p5.printedSheets, 3, '5 pages duplex = 3 sheets');

  const p7 = calculatePrice({ pages: 7, copies: 1, printType: 'bw', print_sides: 'duplex', shop: duplexShop });
  assertEqual(p7.printedSheets, 4, '7 pages duplex = 4 sheets');

  const p99 = calculatePrice({ pages: 99, copies: 1, printType: 'bw', print_sides: 'duplex', shop: duplexShop });
  assertEqual(p99.printedSheets, 50, '99 pages duplex = 50 sheets');
});

test('Finishing options pricing matrix: Staple=₹0, Spiral=₹30, Stick File=₹10', () => {
  const staple = calculatePrice({ pages: 10, copies: 1, printType: 'bw', binding_type: 'staple', shop: duplexShop });
  assertEqual(staple.bindingCost, 0.00, 'staple binding cost');

  const spiral = calculatePrice({ pages: 10, copies: 1, printType: 'bw', binding_type: 'spiral', shop: duplexShop });
  assertEqual(spiral.bindingCost, 30.00, 'spiral binding cost');

  const stick = calculatePrice({ pages: 10, copies: 1, printType: 'bw', binding_type: 'stick', shop: duplexShop });
  assertEqual(stick.bindingCost, 10.00, 'stick file binding cost');
});

test('Multiple attachments total page pricing (10 pg + 4 pg = 14 total pages, 7 duplex sheets)', () => {
  const attachmentAPages = 10;
  const attachmentBPages = 4;
  const totalPages = attachmentAPages + attachmentBPages; // 14 pages

  const single = calculatePrice({ pages: totalPages, copies: 1, printType: 'bw', print_sides: 'single', shop: duplexShop });
  assertEqual(single.printedSheets, 14, '14 pages single = 14 sheets');
  assertEqual(single.printCost, 28.00, '14 pages @ ₹2.00 = ₹28.00');

  const duplex = calculatePrice({ pages: totalPages, copies: 1, printType: 'bw', print_sides: 'duplex', shop: duplexShop });
  assertEqual(duplex.printedSheets, 7, '14 pages duplex = 7 sheets');
  assertEqual(duplex.printCost, 10.50, '7 sheets @ ₹1.50 = ₹10.50');
});

test('Multiple copies multiplier (100 pages, 5 copies duplex B&W @ ₹1.50)', () => {
  const result = calculatePrice({
    pages: 100,
    copies: 5,
    printType: 'bw',
    print_sides: 'duplex',
    shop: duplexShop,
  });
  // 50 sheets * 5 copies = 250 sheets @ 1.50 = ₹375.00
  assertEqual(result.printedSheets, 50, 'printedSheets per copy');
  assertEqual(result.printCost, 375.00, 'printCost for 5 copies');
});

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
