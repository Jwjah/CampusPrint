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
  // 2 sheets * 2 copies * 0.5 = 2.00 printCost, + 30.00 bindingCost = 32.00
  assertEqual(result.printCost, 2.00, 'printCost');
  assertEqual(result.bindingCost, 30.00, 'bindingCost');
  assertEqual(result.total, 32.00, 'totalCost');
});

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
