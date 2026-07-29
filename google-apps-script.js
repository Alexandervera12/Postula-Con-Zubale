/*
 * ============================================================
 *  ZUBALE — Google Apps Script (API Proxy + Write)
 * ============================================================
 *
 *  INSTRUCCIONES PARA DESPLEGAR:
 *
 *  1. Abre tu Google Sheet:
 *     https://docs.google.com/spreadsheets/d/1-5XQuZ9Knc4qKyXtlTLRr-ZuSkGQ5UPjvayoJB9K51M
 *
 *  2. Menu → Extensiones → Apps Script
 *
 *  3. Borra todo el codigo que aparece y pega ESTE archivo completo
 *
 *  4. Click en "Implementar" → "Nueva implementacion"
 *     - Tipo: "Aplicacion web"
 *     - Ejecutar como: "Yo" (tu cuenta)
 *     - Quien tiene acceso: "Cualquier persona"
 *     - Click "Implementar"
 *
 *  5. Copia la URL que te da (algo como:
 *     https://script.google.com/macros/s/AKfycbx.../exec)
 *
 *  6. Pega esa URL en postula.html donde dice:
 *     const GAS_URL = "PEGA_TU_URL_AQUI";
 *
 *  LISTO — la pagina cargara las salas desde tu Sheet.
 *
 *  IMPORTANTE: Cada vez que modifiques este script,
 *  debes crear una NUEVA implementacion (no editar la existente).
 *
 *  HOJAS NECESARIAS:
 *  - "Panel"      → Salas (ya existe)
 *  - "URL"        → Videos/imagenes (ya existe)
 *  - "Metricas"   → Logs del chatbot (crear con headers: fecha, tipo, valor, sesion)
 *  - "Registros"  → Datos de usuarios (crear con headers: fecha, nombre, rut, telefono, descargo_app, se_registro, sesion)
 *  - "Config"     → Configuracion editable (crear con headers: clave, valor)
 * ============================================================
 */

var SHEET_ID = "1-5XQuZ9Knc4qKyXtlTLRr-ZuSkGQ5UPjvayoJB9K51M";

function doGet(req) {
  var sheetName = (req && req.parameter && req.parameter.sheet) || "Panel";

  var ss = SpreadsheetApp.openById(SHEET_ID);
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
      obj[key] = (val === null || val === undefined) ? "" : val;
    }
    rows.push(obj);
  }

  var output = ContentService
    .createTextOutput(JSON.stringify(rows))
    .setMimeType(ContentService.MimeType.JSON);

  return output;
}

function doPost(req) {
  try {
    var body = JSON.parse(req.postData.contents);
    var action = body.action;
    var ss = SpreadsheetApp.openById(SHEET_ID);

    if (action === "metrica") {
      var ws = getOrCreateSheet(ss, "Metricas", ["fecha", "tipo", "valor", "sesion"]);
      ws.appendRow([
        new Date().toISOString(),
        body.tipo || "",
        body.valor || "",
        body.sesion || ""
      ]);
      return jsonResponse({ ok: true });
    }

    if (action === "metricas_batch") {
      var ws = getOrCreateSheet(ss, "Metricas", ["fecha", "tipo", "valor", "sesion"]);
      var items = body.items || [];
      for (var i = 0; i < items.length; i++) {
        ws.appendRow([
          items[i].fecha || new Date().toISOString(),
          items[i].tipo || "",
          items[i].valor || "",
          items[i].sesion || ""
        ]);
      }
      return jsonResponse({ ok: true, count: items.length });
    }

    if (action === "registro") {
      var ws = getOrCreateSheet(ss, "Registros", ["fecha", "nombre", "rut", "telefono", "descargo_app", "se_registro", "sesion"]);
      ws.appendRow([
        new Date().toISOString(),
        body.nombre || "",
        body.rut || "",
        body.telefono || "",
        body.descargo_app || "",
        body.se_registro || "",
        body.sesion || ""
      ]);
      return jsonResponse({ ok: true });
    }

    if (action === "guardar_config") {
      var ws = getOrCreateSheet(ss, "Config", ["clave", "valor"]);
      var clave = body.clave || "";
      var valor = body.valor || "";
      var data = ws.getDataRange().getValues();
      var found = false;
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === clave) {
          ws.getRange(i + 1, 2).setValue(valor);
          found = true;
          break;
        }
      }
      if (!found) {
        ws.appendRow([clave, valor]);
      }
      return jsonResponse({ ok: true });
    }

    if (action === "leer_config") {
      var ws = ss.getSheetByName("Config");
      if (!ws) return jsonResponse({ valor: null });
      var data = ws.getDataRange().getValues();
      var clave = body.clave || "";
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === clave) {
          return jsonResponse({ valor: data[i][1] });
        }
      }
      return jsonResponse({ valor: null });
    }

    if (action === "leer_metricas") {
      var ws = ss.getSheetByName("Metricas");
      if (!ws) return jsonResponse([]);
      var data = ws.getDataRange().getValues();
      if (data.length < 2) return jsonResponse([]);
      var headers = data[0].map(function(h) { return String(h).trim().toLowerCase(); });
      var rows = [];
      for (var i = 1; i < data.length; i++) {
        var obj = {};
        for (var j = 0; j < headers.length; j++) {
          obj[headers[j]] = data[i][j] === null || data[i][j] === undefined ? "" : data[i][j];
        }
        rows.push(obj);
      }
      return jsonResponse(rows);
    }

    if (action === "leer_registros") {
      var ws = ss.getSheetByName("Registros");
      if (!ws) return jsonResponse([]);
      var data = ws.getDataRange().getValues();
      if (data.length < 2) return jsonResponse([]);
      var headers = data[0].map(function(h) { return String(h).trim().toLowerCase(); });
      var rows = [];
      for (var i = 1; i < data.length; i++) {
        var obj = {};
        for (var j = 0; j < headers.length; j++) {
          obj[headers[j]] = data[i][j] === null || data[i][j] === undefined ? "" : data[i][j];
        }
        rows.push(obj);
      }
      return jsonResponse(rows);
    }

    return jsonResponse({ error: "Accion no reconocida: " + action });

  } catch (e) {
    return jsonResponse({ error: e.toString() });
  }
}

function getOrCreateSheet(ss, name, headers) {
  var ws = ss.getSheetByName(name);
  if (!ws) {
    ws = ss.insertSheet(name);
    ws.appendRow(headers);
    ws.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#0a1a6b")
      .setFontColor("#ffffff");
  }
  return ws;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
