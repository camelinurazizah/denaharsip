/**
 * Generator QR Code Offline Murni (ISO/IEC 18004 - Byte Mode, ECC Level M)
 * Tanpa ketergantungan API eksternal maupun library pihak ketiga.
 * Mendukung Versi 1 s/d 14 (hingga 362 byte UTF-8).
 */
(function (root) {
  'use strict';

  // Tabel ECC Level M: [totalDataCodewords, eccPerBlock, g1Blocks, g1DataCw, g2Blocks, g2DataCw]
  const ECC_M_TABLE = {
    1:  [16,  10, 1, 16, 0, 0],
    2:  [28,  16, 1, 28, 0, 0],
    3:  [44,  26, 1, 44, 0, 0],
    4:  [64,  18, 2, 32, 0, 0],
    5:  [86,  24, 2, 43, 0, 0],
    6:  [108, 16, 4, 27, 0, 0],
    7:  [124, 18, 4, 31, 0, 0],
    8:  [154, 22, 2, 38, 2, 39],
    9:  [182, 22, 3, 36, 2, 37],
    10: [216, 26, 4, 43, 1, 44],
    11: [254, 30, 1, 50, 4, 51],
    12: [290, 22, 6, 36, 2, 37],
    13: [334, 22, 8, 37, 1, 38],
    14: [365, 24, 4, 40, 5, 41]
  };

  function toUtf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') {
      return Array.from(new TextEncoder().encode(str));
    }
    const utf8 = unescape(encodeURIComponent(str));
    const bytes = [];
    for (let i = 0; i < utf8.length; i++) {
      bytes.push(utf8.charCodeAt(i));
    }
    return bytes;
  }

  function gfMul(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }

  function rsComputeDivisor(degree) {
    const result = new Array(degree).fill(0);
    result[degree - 1] = 1;
    let rootVal = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < degree; j++) {
        result[j] = gfMul(result[j], rootVal);
        if (j + 1 < degree) result[j] ^= result[j + 1];
      }
      rootVal = gfMul(rootVal, 0x02);
    }
    return result;
  }

  function rsComputeRemainder(data, divisor) {
    const result = new Array(divisor.length).fill(0);
    for (let i = 0; i < data.length; i++) {
      const factor = data[i] ^ result.shift();
      result.push(0);
      for (let j = 0; j < divisor.length; j++) {
        result[j] ^= gfMul(divisor[j], factor);
      }
    }
    return result;
  }

  function getAlignmentPositions(version) {
    if (version === 1) return [];
    const numAlign = Math.floor(version / 7) + 2;
    const step = Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
    const result = [6];
    let pos = version * 4 + 10;
    while (result.length < numAlign) {
      result.splice(1, 0, pos);
      pos -= step;
    }
    return result;
  }

  function chooseVersion(byteLen) {
    for (let v = 1; v <= 14; v++) {
      const dataCw = ECC_M_TABLE[v][0];
      const countBits = v <= 9 ? 8 : 16;
      const neededBits = 4 + countBits + byteLen * 8;
      if (neededBits <= dataCw * 8) return v;
    }
    throw new Error('URL terlalu panjang untuk QR Code (maks 362 byte).');
  }

  function encodeDataBytes(bytes, version) {
    const [dataCw, eccPerBlock, g1Blocks, g1Cw, g2Blocks, g2Cw] = ECC_M_TABLE[version];
    const bits = [];
    const pushBits = (val, len) => {
      for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
    };

    // Mode Byte = 0100
    pushBits(0b0100, 4);
    pushBits(bytes.length, version <= 9 ? 8 : 16);
    for (let i = 0; i < bytes.length; i++) pushBits(bytes[i], 8);

    // Terminator + padding hingga kelipatan 8
    const capacityBits = dataCw * 8;
    const termLen = Math.min(4, capacityBits - bits.length);
    pushBits(0, termLen);
    while (bits.length % 8 !== 0) bits.push(0);

    const dataCodewords = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      dataCodewords.push(b);
    }

    const padBytes = [0xec, 0x11];
    let padIdx = 0;
    while (dataCodewords.length < dataCw) {
      dataCodewords.push(padBytes[padIdx % 2]);
      padIdx++;
    }

    // Bagi menjadi blok data & hitung Reed-Solomon ECC per blok
    const divisor = rsComputeDivisor(eccPerBlock);
    const blocks = [];
    let offset = 0;
    const totalBlocks = g1Blocks + g2Blocks;
    for (let i = 0; i < totalBlocks; i++) {
      const cwLen = i < g1Blocks ? g1Cw : g2Cw;
      const dataSlice = dataCodewords.slice(offset, offset + cwLen);
      offset += cwLen;
      const eccSlice = rsComputeRemainder(dataSlice, divisor);
      blocks.push({ data: dataSlice, ecc: eccSlice });
    }

    // Interleave data codewords lalu ecc codewords
    const result = [];
    const maxDataLen = Math.max(g1Cw, g2Cw);
    for (let i = 0; i < maxDataLen; i++) {
      for (let b = 0; b < blocks.length; b++) {
        if (i < blocks[b].data.length) result.push(blocks[b].data[i]);
      }
    }
    for (let i = 0; i < eccPerBlock; i++) {
      for (let b = 0; b < blocks.length; b++) {
        result.push(blocks[b].ecc[i]);
      }
    }
    return result;
  }

  function createMatrix(version) {
    const size = version * 4 + 17;
    const modules = Array.from({ length: size }, () => new Array(size).fill(false));
    const isFunction = Array.from({ length: size }, () => new Array(size).fill(false));

    const setFunc = (r, c, dark) => {
      if (r >= 0 && r < size && c >= 0 && c < size) {
        modules[r][c] = dark;
        isFunction[r][c] = true;
      }
    };

    const drawFinder = (r0, c0) => {
      for (let dr = -1; dr <= 7; dr++) {
        for (let dc = -1; dc <= 7; dc++) {
          const r = r0 + dr;
          const c = c0 + dc;
          if (r < 0 || r >= size || c < 0 || c >= size) continue;
          const dist = Math.max(Math.abs(dr - 3), Math.abs(dc - 3));
          setFunc(r, c, dist !== 2 && dist !== 4);
        }
      }
    };

    const drawAlignment = (rc, cc) => {
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc));
          setFunc(rc + dr, cc + dc, dist !== 1);
        }
      }
    };

    // Timing pattern
    for (let i = 0; i < size; i++) {
      setFunc(6, i, i % 2 === 0);
      setFunc(i, 6, i % 2 === 0);
    }

    // 3 Finder pattern
    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    // Alignment pattern
    const alignPos = getAlignmentPositions(version);
    for (let i = 0; i < alignPos.length; i++) {
      for (let j = 0; j < alignPos.length; j++) {
        const isFinderCorner =
          (i === 0 && j === 0) ||
          (i === 0 && j === alignPos.length - 1) ||
          (i === alignPos.length - 1 && j === 0);
        if (!isFinderCorner) drawAlignment(alignPos[i], alignPos[j]);
      }
    }

    // Dark module & reserve format/version bits
    for (let i = 0; i < 9; i++) {
      if (i !== 6) {
        setFunc(8, i, false);
        setFunc(i, 8, false);
      }
    }
    for (let i = size - 8; i < size; i++) {
      setFunc(8, i, false);
      setFunc(i, 8, false);
    }
    setFunc(size - 8, 8, true);

    if (version >= 7) {
      let rem = version;
      for (let i = 0; i < 12; i++) {
        rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      }
      const verBits = (version << 12) | rem;
      for (let i = 0; i < 18; i++) {
        const bit = ((verBits >>> i) & 1) !== 0;
        const a = size - 11 + (i % 3);
        const b = Math.floor(i / 3);
        setFunc(a, b, bit);
        setFunc(b, a, bit);
      }
    }

    return { size, modules, isFunction, setFunc };
  }

  function placeCodewords(state, codewords) {
    const { size, modules, isFunction } = state;
    let bitIdx = 0;
    const totalBits = codewords.length * 8;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vert : vert;
          if (!isFunction[y][x] && bitIdx < totalBits) {
            modules[y][x] = ((codewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1) !== 0;
            bitIdx++;
          }
        }
      }
    }
  }

  function drawFormatBits(state, mask) {
    const { size, setFunc } = state;
    // ECC Level M indicator = 00
    const data = (0b00 << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) {
      rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    }
    const bits = ((data << 10) | rem) ^ 0x5412;

    for (let i = 0; i <= 5; i++) setFunc(8, i, ((bits >>> i) & 1) !== 0);
    setFunc(8, 7, ((bits >>> 6) & 1) !== 0);
    setFunc(8, 8, ((bits >>> 7) & 1) !== 0);
    setFunc(7, 8, ((bits >>> 8) & 1) !== 0);
    for (let i = 9; i < 15; i++) setFunc(14 - i, 8, ((bits >>> i) & 1) !== 0);

    for (let i = 0; i < 7; i++) setFunc(size - 1 - i, 8, ((bits >>> i) & 1) !== 0);
    for (let i = 7; i < 15; i++) setFunc(8, size - 15 + i, ((bits >>> i) & 1) !== 0);
  }

  function applyMask(state, mask) {
    const { size, modules, isFunction } = state;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (isFunction[y][x]) continue;
        let invert = false;
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break;
          case 1: invert = y % 2 === 0; break;
          case 2: invert = x % 3 === 0; break;
          case 3: invert = (x + y) % 3 === 0; break;
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
          case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          case 7: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
        }
        if (invert) modules[y][x] = !modules[y][x];
      }
    }
  }

  function computePenalty(state) {
    const { size, modules } = state;
    let penalty = 0;

    const countFinderHistory = (hist) => {
      const match1 = hist[0] >= 1 && hist[1] === 1 && hist[2] === 1 && hist[3] === 3 && hist[4] === 1 && hist[5] === 1 && hist[6] >= 4;
      const match2 = hist[0] >= 4 && hist[1] === 1 && hist[2] === 1 && hist[3] === 3 && hist[4] === 1 && hist[5] === 1 && hist[6] >= 1;
      return (match1 ? 40 : 0) + (match2 ? 40 : 0);
    };

    const addRunHist = (hist, len) => {
      hist.pop();
      hist.unshift(len);
    };

    // N1 & N3 horizontal
    for (let y = 0; y < size; y++) {
      let runColor = false;
      let runX = 0;
      const hist = [0, 0, 0, 0, 0, 0, 0];
      for (let x = 0; x < size; x++) {
        if (modules[y][x] === runColor) {
          runX++;
          if (runX === 5) penalty += 3;
          else if (runX > 5) penalty++;
        } else {
          addRunHist(hist, runX);
          if (!runColor) penalty += countFinderHistory(hist);
          runColor = modules[y][x];
          runX = 1;
        }
      }
      addRunHist(hist, runX);
      if (!runColor) penalty += countFinderHistory(hist);
    }

    // N1 & N3 vertical
    for (let x = 0; x < size; x++) {
      let runColor = false;
      let runY = 0;
      const hist = [0, 0, 0, 0, 0, 0, 0];
      for (let y = 0; y < size; y++) {
        if (modules[y][x] === runColor) {
          runY++;
          if (runY === 5) penalty += 3;
          else if (runY > 5) penalty++;
        } else {
          addRunHist(hist, runY);
          if (!runColor) penalty += countFinderHistory(hist);
          runColor = modules[y][x];
          runY = 1;
        }
      }
      addRunHist(hist, runY);
      if (!runColor) penalty += countFinderHistory(hist);
    }

    // N2: 2x2 blocks
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const c = modules[y][x];
        if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) {
          penalty += 3;
        }
      }
    }

    // N4: Dark module balance
    let dark = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (modules[y][x]) dark++;
      }
    }
    const total = size * size;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    penalty += Math.max(0, k) * 10;
    return penalty;
  }

  function encode(text) {
    const cleanText = String(text || '').trim();
    if (!cleanText) throw new Error('Teks/URL QR Code tidak boleh kosong.');
    const bytes = toUtf8Bytes(cleanText);
    const version = chooseVersion(bytes.length);
    const codewords = encodeDataBytes(bytes, version);
    const state = createMatrix(version);
    placeCodewords(state, codewords);

    let bestMask = 0;
    let minPenalty = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      applyMask(state, mask);
      drawFormatBits(state, mask);
      const p = computePenalty(state);
      if (p < minPenalty) {
        minPenalty = p;
        bestMask = mask;
      }
      applyMask(state, mask);
    }

    applyMask(state, bestMask);
    drawFormatBits(state, bestMask);
    return {
      version,
      mask: bestMask,
      size: state.size,
      modules: state.modules
    };
  }

  function toSvgString(text, options = {}) {
    const { quietZone = 4, darkColor = '#0f172a', lightColor = '#ffffff', displaySize = 192 } = options;
    const qr = encode(text);
    const totalSize = qr.size + quietZone * 2;
    const paths = [];
    for (let y = 0; y < qr.size; y++) {
      let x = 0;
      while (x < qr.size) {
        if (!qr.modules[y][x]) {
          x++;
          continue;
        }
        let run = 1;
        while (x + run < qr.size && qr.modules[y][x + run]) run++;
        paths.push(`M${x + quietZone},${y + quietZone}h${run}v1h-${run}z`);
        x += run;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${displaySize}" height="${displaySize}" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges" role="img" aria-label="QR Code Akses Gedung Kearsipan">`
      + `<rect width="100%" height="100%" fill="${lightColor}"/>`
      + `<path d="${paths.join('')}" fill="${darkColor}"/>`
      + `</svg>`;
  }

  function renderToCanvas(canvas, text, options = {}) {
    const { quietZone = 4, darkColor = '#0f172a', lightColor = '#ffffff', pixelSize = 600 } = options;
    const qr = encode(text);
    const totalModules = qr.size + quietZone * 2;
    const scale = Math.max(4, Math.floor(pixelSize / totalModules));
    const dim = totalModules * scale;
    canvas.width = dim;
    canvas.height = dim;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = lightColor;
    ctx.fillRect(0, 0, dim, dim);
    ctx.fillStyle = darkColor;
    for (let y = 0; y < qr.size; y++) {
      for (let x = 0; x < qr.size; x++) {
        if (qr.modules[y][x]) {
          ctx.fillRect((x + quietZone) * scale, (y + quietZone) * scale, scale, scale);
        }
      }
    }
    return canvas;
  }

  root.QRCodeGenerator = {
    encode,
    toSvgString,
    renderToCanvas
  };
})(typeof window !== 'undefined' ? window : globalThis);
