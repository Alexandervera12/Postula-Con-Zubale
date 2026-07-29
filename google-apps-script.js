/*
 * ============================================================
 *  ZUBALE — Google Apps Script (API Proxy)
 * ============================================================
 *
 *  INSTRUCCIONES PARA DESPLEGAR:
 *
 *  1. Abre tu Google Sheet:
 *     https://docs.google.com/spreadsheets/d/1-5XQuZ9Knc4qKyXtlTLRr-ZuSkGQ5UPjvayoJB9K51M
 *
 *  2. Menú → Extensiones → Apps Script
 *
 *  3. Borra todo el código que aparece y pega ESTE archivo completo
 *
 *  4. Click en "Implementar" → "Nueva implementación"
 *     - Tipo: "Aplicación web"
 *     - Ejecutar como: "Yo" (tu cuenta)
 *     - Quién tiene acceso: "Cualquier persona"
 *     - Click "Implementar"
 *
 *  5. Copia la URL que te da (algo como:
 *     https://script.google.com/macros/s/AKfycbx.../exec)
 *
 *  6. Pega esa URL en postula.html donde dice:
 *     const GAS_URL = "PEGA_TU_URL_AQUI";
 *
 *  LISTO — la página cargará las salas desde tu Sheet.
 *
 *  IMPORTANTE: Cada vez que modifiques este script,
 *  debes crear una NUEVA implementación (no editar la existente).
 * ============================================================
 */

function doGet(req) {
  var sheetName = (req && req.parameter && req.parameter.sheet) || "Panel";

  var ss = SpreadsheetApp.openById("1-5XQuZ9Knc4qKyXtlTLRr-ZuSkGQ5UPjvayoJB9K51M");
  var ws = ss.getSheetByName(sheetName);

  if (!ws) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: "Hoja '" + sheetName + "' no encontrada" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var data = ws.getDataRange().getValues();
  if (data.length < 2) {
    return ContentService
      .createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Primera fila = headers
  var headers = data[0].map(function(h) {
    return String(h).trim().toLowerCase();
  });

  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      var val = row[j];

      // Google Sheets devuelve números nativos — no hay problema de coma/punto
      obj[key] = (val === null || val === undefined) ? "" : val;
    }
    rows.push(obj);
  }

  var output = ContentService
    .createTextOutput(JSON.stringify(rows))
    .setMimeType(ContentService.MimeType.JSON);

  return output;
}
