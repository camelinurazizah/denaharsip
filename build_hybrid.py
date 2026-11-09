import base64

with open('assets/images/blueprint-arsip-lt1.jpg', 'rb') as f:
    b64_data = base64.b64encode(f.read()).decode('utf-8')

svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 764" width="100%" height="100%">
  <defs>
    <filter id="badgeGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.18"/>
    </filter>
  </defs>

  <!-- 1. BASE BLUEPRINT ASLI (100% Presisi Geometri & Arsitektur Resmi) -->
  <image href="data:image/jpeg;base64,{b64_data}" x="0" y="0" width="1024" height="764" />

  <!-- 2. DIGITAL INTERACTIVE HIGHLIGHT OVERLAYS (Semitransparan Menyorot Ruangan) -->
  <g id="digital-overlays">
    <!-- Selasar Utara (Akuisisi & Dokumen Masuk) -->
    <polygon points="
      139,151 886,151 886,238 622,238 622,349 514,349 514,207 400,207 400,238 139,238
    " fill="#f59e0b" fill-opacity="0.08" stroke="#d97706" stroke-width="1.5" stroke-dasharray="4,3"/>
    
    <g transform="translate(514, 182)" text-anchor="middle">
      <rect x="-180" y="-12" width="360" height="24" rx="4" fill="#d97706" filter="url(#badgeGlow)"/>
      <text y="4" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="10" font-weight="800" fill="#ffffff">📋 SELASAR AKUISISI &amp; PENGOLAHAN ARSIP</text>
    </g>

    <!-- Taman Dalam Barat (Green Garden Lawn Highlight) -->
    <rect x="139" y="238" width="261" height="111" fill="#16a34a" fill-opacity="0.08" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="4,3"/>
    <g transform="translate(270, 260)" text-anchor="middle">
      <rect x="-65" y="-11" width="130" height="22" rx="4" fill="#16a34a" filter="url(#badgeGlow)"/>
      <text y="4" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="8.5" font-weight="800" fill="#ffffff">🌿 TAMAN BARAT</text>
    </g>

    <!-- Taman Dalam Timur (Green Garden Lawn Highlight) -->
    <rect x="622" y="238" width="264" height="111" fill="#16a34a" fill-opacity="0.08" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="4,3"/>
    <g transform="translate(755, 260)" text-anchor="middle">
      <rect x="-65" y="-11" width="130" height="22" rx="4" fill="#16a34a" filter="url(#badgeGlow)"/>
      <text y="4" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="8.5" font-weight="800" fill="#ffffff">🌿 TAMAN TIMUR</text>
    </g>

    <!-- Tangga Sentral ke Lantai 2 Highlight -->
    <rect x="400" y="238" width="114" height="111" fill="#0284c7" fill-opacity="0.06" stroke="#0284c7" stroke-width="1.5" stroke-dasharray="4,3"/>
    <g transform="translate(457, 335)" text-anchor="middle">
      <rect x="-55" y="-10" width="110" height="20" rx="3" fill="#0f172a" filter="url(#badgeGlow)"/>
      <text y="3.5" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="8" font-weight="800" fill="#ffffff">⬆️ TANGGA KE LT.2</text>
    </g>

    <!-- Ruang Restorasi & Konservasi Arsip Kuno (Room 6 Highlight) -->
    <rect x="622" y="349" width="264" height="69" fill="#059669" fill-opacity="0.16" stroke="#059669" stroke-width="2"/>
    <g transform="translate(755, 396)" text-anchor="middle">
      <rect x="-110" y="-12" width="220" height="24" rx="4" fill="#059669" filter="url(#badgeGlow)"/>
      <text y="4.5" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="9" font-weight="800" fill="#ffffff">🔬 RUANG RESTORASI &amp; KONSERVASI</text>
    </g>

    <!-- Ramp Akses Dokumen Highlight -->
    <rect x="705" y="418" width="181" height="61" fill="#64748b" fill-opacity="0.10" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,3"/>
    <g transform="translate(795, 452)" text-anchor="middle">
      <rect x="-55" y="-10" width="110" height="20" rx="3" fill="#334155" filter="url(#badgeGlow)"/>
      <text y="3.5" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="8" font-weight="700" fill="#ffffff">♿ RAMP DOKUMEN</text>
    </g>

    <!-- Lorong Akses Keluar (Left Hallway Highlight) -->
    <rect x="139" y="349" width="261" height="69" fill="#64748b" fill-opacity="0.06" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,3"/>
    <g transform="translate(290, 385)" text-anchor="middle">
      <text font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="9" font-weight="700" fill="#64748b">LORONG AKSES KELUAR</text>
    </g>

    <!-- Pintu Keluar Badge (Left Door) -->
    <g transform="translate(152, 388)">
      <rect x="0" y="0" width="86" height="24" rx="4" fill="#dc2626" filter="url(#badgeGlow)"/>
      <text x="43" y="16" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="9" font-weight="800" fill="#ffffff" text-anchor="middle">🚪 PINTU KELUAR</text>
    </g>

    <!-- Ruang Konsultasi & Layanan Arsip (Room 7 Stepped Southern Wing Highlight) -->
    <polygon points="
      139,418 139,442 290,442 290,530 398,530 398,610 590,610 590,530 705,530 705,479 705,418 622,418 622,349 400,349 400,418
    " fill="#0284c7" fill-opacity="0.14" stroke="#0284c7" stroke-width="2"/>

    <g transform="translate(465, 545)" text-anchor="middle">
      <rect x="-125" y="-14" width="250" height="28" rx="5" fill="#0284c7" filter="url(#badgeGlow)"/>
      <text y="4.5" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="10" font-weight="800" fill="#ffffff">🏛️ RUANG KONSULTASI &amp; LAYANAN ARSIP</text>
    </g>

    <!-- Pintu Masuk Utama Badge (Bottom Door) -->
    <g transform="translate(414, 618)">
      <rect x="0" y="0" width="140" height="26" rx="5" fill="#0f172a" filter="url(#badgeGlow)"/>
      <text x="70" y="17.5" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="9.5" font-weight="800" fill="#ffffff" text-anchor="middle">🚪 PINTU MASUK UTAMA</text>
    </g>
  </g>

  <!-- 3. TOP BANNER & BOTTOM LEGEND -->
  <g transform="translate(35, 30)">
    <rect x="0" y="-15" width="460" height="34" rx="6" fill="#ffffff" opacity="0.95" stroke="#cbd5e1" stroke-width="1.2" filter="url(#badgeGlow)"/>
    <circle cx="16" cy="2" r="5" fill="#0284c7"/>
    <text x="30" y="6" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="11" font-weight="800" fill="#0f172a">DENAH RESMI KANTOR ARSIP — LANTAI 1</text>
    <text x="340" y="6" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="9.5" font-weight="600" fill="#64748b">SKALA 1:150</text>
  </g>

  <g transform="translate(45, 735)" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="8.5" font-weight="600" fill="#475569">
    <circle cx="10" cy="0" r="5" fill="#dc2626"/>
    <text x="22" y="3.5">Titik Lokasi Ruangan Pelayanan</text>
    <circle cx="210" cy="0" r="5" fill="#16a34a"/>
    <text x="222" y="3.5">Area Taman Terbuka</text>
    <rect x="360" y="-6" width="14" height="14" rx="3" fill="#0f172a"/>
    <text x="380" y="3.5">Pintu Masuk Utama</text>
    <rect x="500" y="-6" width="14" height="14" rx="3" fill="#dc2626"/>
    <text x="520" y="3.5">Pintu Keluar</text>
    <text x="960" y="3.5" font-weight="700" fill="#0284c7" text-anchor="end">Dinas Kearsipan &amp; Perpustakaan Kab. Cirebon</text>
  </g>
</svg>'''

with open('assets/images/gedung-kearsipan-lantai-1.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)
print('Updated gedung-kearsipan-lantai-1.svg successfully with base blueprint')
