# Lector (PWA)
Lector de documentos local y offline. Sin backend, sin telemetría, sin CDN.

## Formatos
- PDF: PDF.js 5.6.205 (build legacy), incluido en `vendor/pdfjs/` con worker, fuentes, cmaps y wasm. Páginas dibujadas bajo demanda, zoom y navegación.
- TXT, HTML (código copiable + vista previa aislada sin scripts por defecto), DOCX, XLSX, PPTX (solo texto de cada diapositiva).
- XLS binario antiguo: NO soportado (SheetJS no estaba disponible aquí). La app pide guardarlo como XLSX.

## Ejecutar
`python3 -m http.server 8000` y abrir http://localhost:8000
Instalar en Android: subir la carpeta a un hosting HTTPS (p. ej. GitHub Pages), abrir en Chrome > menú ⋮ > «Instalar app». Tras la primera carga funciona sin conexión.

## Probado (Chromium headless, móvil 390x780)
TXT, HTML (código y vista previa), DOCX y PDF de 30 páginas (navegación y zoom) abren bien. El Service Worker cachea 199 archivos y el PDF se abre sin conexión.
Sin probar: PPTX y XLSX en navegador (solo el lector ZIP con un XLSX), Android real, archivos grandes, memoria.

## Límites (editables en js/app.js, `LIMITS`)
Dependen del dispositivo. XLSX: 1000 filas y 60 columnas por hoja. TXT/HTML en UTF-8.
Licencias: ver vendor/THIRD_PARTY.md.
