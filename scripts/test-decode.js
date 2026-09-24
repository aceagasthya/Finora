// Provide Node-environment DOM Rect polyfill for testing in Node.js
if (typeof globalThis.DOMRectReadOnly === 'undefined') {
  globalThis.DOMRectReadOnly = class DOMRectReadOnly {
    constructor(x = 0, y = 0, width = 0, height = 0) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.top = y;
      this.left = x;
      this.right = x + width;
      this.bottom = y + height;
    }
    static fromRect(other) {
      return new DOMRectReadOnly(other?.x, other?.y, other?.width, other?.height);
    }
  };
}
if (typeof globalThis.DOMPointReadOnly === 'undefined') {
  globalThis.DOMPointReadOnly = class DOMPointReadOnly {
    constructor(x = 0, y = 0, z = 0, w = 1) {
      this.x = x;
      this.y = y;
      this.z = z;
      this.w = w;
    }
  };
}

import { BarcodeDetector } from 'barcode-detector/ponyfill';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import sharp from 'sharp';

async function testBarcodeDetector() {
  console.log('--- TEST 1: Standard QR Code (Black on White) ---');
  const upiPayload = 'upi://pay?pa=starbucks@axisbank&pn=Starbucks&am=380';
  
  // 1. Generate standard SVG
  const normalSvg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(QRCodeSVG, {
      value: upiPayload,
      size: 300,
      bgColor: '#ffffff',
      fgColor: '#000000',
    })
  );

  // Render to PNG buffer
  const normalPngBuffer = await sharp(Buffer.from(normalSvg)).png().toBuffer();
  
  // Create Blob
  const normalBlob = new Blob([normalPngBuffer], { type: 'image/png' });
  
  const detector = new BarcodeDetector({ formats: ['qr_code'] });
  const normalResults = await detector.detect(normalBlob);
  console.log('Normal QR Detected count:', normalResults.length);
  if (normalResults.length > 0) {
    console.log('✓ Normal QR Decoded Value:', normalResults[0].rawValue);
  } else {
    throw new Error('Failed to decode normal QR code');
  }

  console.log('\n--- TEST 2: Inverted / Dark-Themed QR Code (White on Solid Black) ---');
  // 2. Generate Inverted SVG (White modules, black background - exactly what html5-qrcode fails on!)
  const invertedSvg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(QRCodeSVG, {
      value: 'upi://pay?pa=merchant@finora&pn=DarkThemeStore&am=999',
      size: 300,
      bgColor: '#000000',
      fgColor: '#ffffff',
    })
  );

  const invertedPngBuffer = await sharp(Buffer.from(invertedSvg)).png().toBuffer();
  const invertedBlob = new Blob([invertedPngBuffer], { type: 'image/png' });

  const invertedResults = await detector.detect(invertedBlob);
  console.log('Inverted QR Detected count:', invertedResults.length);
  if (invertedResults.length > 0) {
    console.log('✓ Inverted/Dark-Theme QR Decoded Value:', invertedResults[0].rawValue);
  } else {
    throw new Error('Failed to decode inverted QR code');
  }

  console.log('\nALL TESTS PASSED! BarcodeDetector with ZXing engine successfully decoded both standard and inverted QR codes!');
}

testBarcodeDetector().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
