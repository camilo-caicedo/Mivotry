/**
 * =========================================================================
 * MIVOTRY API - Google Apps Script Backend
 * =========================================================================
 * Este script actúa como API REST segura para la aplicación móvil Mivotry.
 * Conecta en tiempo real la app con la hoja de Google Sheets.
 * 
 * Acciones soportadas vía POST:
 * 1. getDashboard: Retorna todo el estado financiero consolidado.
 * 2. registrarGasto: Descuenta de la columna de Manejo (Nómina o Bonos) y añade a Transacciones_Log.
 * 3. cargarQuincena: Realiza el rollover acumulativo de la quincena 15 o 30.
 * 4. abonoDeuda: Descuenta del saldo de préstamos de terceros (Mauro, Andrey, etc.).
 * 5. actualizarFondoOcasional: Actualiza la celda F:20 (Fondo Ocasional / Vacaciones).
 * 6. actualizarAhorroPagosAnuales: Destina fondos (ej. de primas) al ahorro de pagos anuales.
 * 7. parseSMS: Recibe texto de SMS bancario, extrae datos con IA/RegEx y sugiere o aplica el gasto.
 */

const SHEET_NAME_GASTOS = "Gastos";
const SHEET_NAME_LOGS = "Transacciones_Log";

function doGet(e) {
  try {
    const data = getDashboardData();
    return createJsonResponse({ success: true, data: data });
  } catch (error) {
    return createJsonResponse({ success: false, error: error.message });
  }
}

function doPost(e) {
  try {
    let contents = {};
    if (e && e.postData && e.postData.contents) {
      contents = JSON.parse(e.postData.contents);
    }
    
    const action = contents.action || "getDashboard";
    
    switch (action) {
      case "getDashboard":
        return createJsonResponse({ success: true, data: getDashboardData() });
        
      case "registrarGasto":
        return createJsonResponse(registrarGasto(contents));
        
      case "cargarQuincena":
        return createJsonResponse(cargarQuincena(contents));
        
      case "abonoDeuda":
        return createJsonResponse(abonoDeuda(contents));
        
      case "actualizarFondoOcasional":
        return createJsonResponse(actualizarFondoOcasional(contents));
        
      case "actualizarAhorroPagosAnuales":
        return createJsonResponse(actualizarAhorroPagosAnuales(contents));
        
      case "parseSMS":
        return createJsonResponse(parseSMSBancario(contents));
        
      default:
        return createJsonResponse({ success: false, error: "Acción no reconocida: " + action });
    }
  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString() });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * =========================================================================
 * 1. OBTENER ESTADO COMPLETO (DASHBOARD)
 * =========================================================================
 */
function getDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME_GASTOS);
  if (!sheet) throw new Error("No se encontró la hoja '" + SHEET_NAME_GASTOS + "'");
  
  ensureLogSheetExists(ss);
  
  // A. Ingresos y Nómina
  const quincenaBase = cleanNumber(sheet.getRange("A2").getValue()); // $4,950,000
  const mensualBase = cleanNumber(sheet.getRange("B2").getValue());   // $9,900,000
  
  // B. Rubros de Presupuesto Quincenal y Manejo (Filas 4 a 18)
  const rowsPresupuesto = sheet.getRange("A4:F18").getValues();
  const gastosNomina = [];
  
  for (let i = 0; i < rowsPresupuesto.length; i++) {
    const row = rowsPresupuesto[i];
    const nombre = String(row[0] || "").trim();
    if (!nombre) continue;
    
    const rowNumber = 4 + i;
    const totalPresupuestado = cleanNumber(row[1]);
    const q15 = cleanNumber(row[2]);
    const q30 = cleanNumber(row[3]);
    const manejo = cleanNumber(row[5]);
    
    gastosNomina.push({
      fila: rowNumber,
      nombre: nombre,
      presupuestoTotal: totalPresupuestado,
      q15: q15,
      q30: q30,
      manejoActual: manejo
    });
  }
  
  // C. Fondo Ocasional / Vacaciones (Celda F20)
  const fondoOcasional = cleanNumber(sheet.getRange("F20").getValue());
  
  // D. Tarjeta de Bonos (Filas 23 a 27, Columnas A a C)
  const bonosPresupuestoTotal = cleanNumber(sheet.getRange("B22").getValue()); // $1,600,000
  const rowsBonos = sheet.getRange("A23:C27").getValues();
  const gastosBonos = [];
  
  for (let i = 0; i < rowsBonos.length; i++) {
    const row = rowsBonos[i];
    const nombre = String(row[0] || "").trim();
    if (!nombre) continue;
    
    const rowNumber = 23 + i;
    const total = cleanNumber(row[1]);
    const manejo = cleanNumber(row[2]);
    
    gastosBonos.push({
      fila: rowNumber,
      nombre: nombre,
      presupuestoTotal: total,
      manejoActual: manejo
    });
  }
  
  // E. Créditos Principales (Columna H e I, filas 4 a 14)
  const creditoApto = {
    nombre: "Apto",
    saldo: cleanNumber(sheet.getRange("I4").getValue()),
    fechaPago: sheet.getRange("J4").getValue()
  };
  const creditoOccidente = {
    nombre: "Crédito Occidente",
    saldo: cleanNumber(sheet.getRange("I5").getValue()),
    fechaPago: sheet.getRange("J5").getValue()
  };
  const totalDeudaCreditos = cleanNumber(sheet.getRange("I13").getValue());
  const totalDeudaTarjetas = cleanNumber(sheet.getRange("J13").getValue());
  
  // F. Servicios Streaming (Columna L a O, filas 4 a 15)
  const rowsStreaming = sheet.getRange("L4:O15").getValues();
  const streaming = [];
  for (let i = 0; i < rowsStreaming.length; i++) {
    const row = rowsStreaming[i];
    const nombre = String(row[0] || "").trim();
    if (!nombre || nombre === "Total") continue;
    
    const valor = cleanNumber(row[1]);
    const banco = String(row[3] || "").trim();
    
    streaming.push({
      nombre: nombre,
      valor: valor,
      banco: banco
    });
  }
  const totalStreaming = cleanNumber(sheet.getRange("M16").getValue());
  
  // G. Cuentas por Cobrar / Deudas Terceros (Filas 24 a 28, Columnas E y F)
  const rowsTerceros = sheet.getRange("E24:F28").getValues();
  const deudasTerceros = [];
  for (let i = 0; i < rowsTerceros.length; i++) {
    const row = rowsTerceros[i];
    const nombre = String(row[0] || "").trim();
    if (!nombre || nombre === "Total") continue;
    
    const rowNumber = 24 + i;
    const saldo = cleanNumber(row[1]);
    
    deudasTerceros.push({
      fila: rowNumber,
      nombre: nombre,
      saldoPendiente: saldo
    });
  }
  const totalPorCobrar = cleanNumber(sheet.getRange("F29").getValue());
  
  // H. Bolsillo de Rendimientos & Ahorros (Filas 24 a 29, Columnas H e I)
  const ahorroInversiones = cleanNumber(sheet.getRange("I27").getValue()); // $6,800,000
  const ahorroPagosAnuales = cleanNumber(sheet.getRange("I28").getValue()); // $1,000,000
  const totalBolsillo = cleanNumber(sheet.getRange("I29").getValue()); // $7,800,000
  
  // I. Pagos Anuales (Filas 24 a 28, Columnas K a O)
  const rowsAnuales = sheet.getRange("K24:O28").getValues();
  const pagosAnuales = [];
  for (let i = 0; i < rowsAnuales.length; i++) {
    const row = rowsAnuales[i];
    const nombre = String(row[0] || "").trim();
    if (!nombre || nombre === "Total") continue;
    
    const rowNumber = 24 + i;
    const costoEstimado = cleanNumber(row[1]);
    const ahorrado = cleanNumber(row[2]);
    const mesPago = String(row[3] || "").trim();
    const estado = String(row[4] || "Pendiente").trim();
    
    pagosAnuales.push({
      fila: rowNumber,
      concepto: nombre,
      costoEstimado: costoEstimado,
      ahorrado: ahorrado,
      mesPago: mesPago,
      estado: estado
    });
  }
  
  return {
    nomina: {
      quincenaBase: quincenaBase,
      mensualBase: mensualBase,
      fondoOcasional: fondoOcasional,
      gastos: gastosNomina
    },
    bonos: {
      presupuestoTotal: bonosPresupuestoTotal,
      gastos: gastosBonos
    },
    deudas: {
      creditoApto: creditoApto,
      creditoOccidente: creditoOccidente,
      totalDeudaCreditos: totalDeudaCreditos,
      totalDeudaTarjetas: totalDeudaTarjetas,
      cuentasPorCobrar: deudasTerceros,
      totalPorCobrar: totalPorCobrar
    },
    streaming: {
      lista: streaming,
      totalMensual: totalStreaming
    },
    bolsillos: {
      inversiones: ahorroInversiones,
      pagosAnuales: ahorroPagosAnuales,
      totalRendimientos: totalBolsillo
    },
    pagosAnuales: pagosAnuales
  };
}

/**
 * =========================================================================
 * 2. REGISTRAR GASTO Y DESCONTAR DE MANEJO
 * =========================================================================
 */
function registrarGasto(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME_GASTOS);
  
  const cuenta = payload.cuenta || "nomina"; // "nomina" o "bonos"
  const categoria = String(payload.categoria || "").trim();
  const monto = Number(payload.monto) || 0;
  const concepto = String(payload.concepto || categoria).trim();
  const origen = String(payload.origen || "manual").trim();
  
  if (monto <= 0) return { success: false, error: "El monto debe ser mayor a cero" };
  
  let targetRow = null;
  let targetCol = null;
  let saldoActual = 0;
  
  if (cuenta === "nomina") {
    const values = sheet.getRange("A4:A18").getValues();
    for (let i = 0; i < values.length; i++) {
      if (String(values[i][0]).trim().toLowerCase() === categoria.toLowerCase()) {
        targetRow = 4 + i;
        targetCol = 6; // Columna F (Manejo)
        break;
      }
    }
  } else if (cuenta === "bonos") {
    const values = sheet.getRange("A23:A27").getValues();
    for (let i = 0; i < values.length; i++) {
      if (String(values[i][0]).trim().toLowerCase() === categoria.toLowerCase()) {
        targetRow = 23 + i;
        targetCol = 3; // Columna C (Manejo de bonos)
        break;
      }
    }
  }
  
  if (!targetRow) {
    return { success: false, error: "No se encontró la categoría '" + categoria + "' en la cuenta " + cuenta };
  }
  
  const cell = sheet.getRange(targetRow, targetCol);
  saldoActual = cleanNumber(cell.getValue());
  const nuevoSaldo = saldoActual - monto;
  
  cell.setValue(nuevoSaldo);
  
  logTransaction(ss, {
    cuenta: cuenta,
    categoria: categoria,
    concepto: concepto,
    monto: monto,
    saldoRestante: nuevoSaldo,
    origen: origen
  });
  
  return {
    success: true,
    categoria: categoria,
    montoDescontado: monto,
    saldoAnterior: saldoActual,
    nuevoSaldo: nuevoSaldo
  };
}

/**
 * =========================================================================
 * 3. CARGAR QUINCENA (ROLLOVER ACUMULATIVO)
 * =========================================================================
 */
function cargarQuincena(payload) {
  const quincena = Number(payload.quincena); // 15 o 30
  if (quincena !== 15 && quincena !== 30) {
    return { success: false, error: "Quincena debe ser 15 o 30" };
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME_GASTOS);
  const rows = sheet.getRange("A4:F18").getValues();
  
  const actualizados = [];
  const colIndexQuincena = (quincena === 15) ? 2 : 3; // Columna C (15) o D (30)
  
  for (let i = 0; i < rows.length; i++) {
    const nombre = String(rows[i][0] || "").trim();
    if (!nombre) continue;
    
    const rowNum = 4 + i;
    const valorQuincena = cleanNumber(rows[i][colIndexQuincena]);
    const manejoActual = cleanNumber(rows[i][5]); // Columna F actual
    
    const nuevoManejo = (manejoActual > 0 ? manejoActual : 0) + valorQuincena;
    sheet.getRange(rowNum, 6).setValue(nuevoManejo);
    
    actualizados.push({
      rubro: nombre,
      adicionado: valorQuincena,
      remanentePrevio: manejoActual,
      nuevoTotalManejo: nuevoManejo
    });
  }
  
  logTransaction(ss, {
    cuenta: "nomina",
    categoria: "SISTEMA",
    concepto: "Carga de Quincena " + quincena + " (Rollover)",
    monto: 0,
    saldoRestante: 0,
    origen: "sistema"
  });
  
  return {
    success: true,
    quincenaCargada: quincena,
    rubrosActualizados: actualizados
  };
}

/**
 * =========================================================================
 * 4. ABONO A DEUDAS DE TERCEROS
 * =========================================================================
 */
function abonoDeuda(payload) {
  const persona = String(payload.persona || "").trim();
  const monto = Number(payload.monto) || 0;
  
  if (monto <= 0) return { success: false, error: "Monto inválido" };
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME_GASTOS);
  const rows = sheet.getRange("E24:F28").getValues();
  
  let targetRow = null;
  let saldoActual = 0;
  
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim().toLowerCase() === persona.toLowerCase()) {
      targetRow = 24 + i;
      saldoActual = cleanNumber(rows[i][1]);
      break;
    }
  }
  
  if (!targetRow) {
    return { success: false, error: "No se encontró el deudor: " + persona };
  }
  
  const nuevoSaldo = Math.max(0, saldoActual - monto);
  sheet.getRange(targetRow, 6).setValue(nuevoSaldo);
  
  logTransaction(ss, {
    cuenta: "deudas",
    categoria: "Abono Préstamo",
    concepto: "Abono de " + persona,
    monto: monto,
    saldoRestante: nuevoSaldo,
    origen: payload.origen || "manual"
  });
  
  return {
    success: true,
    persona: persona,
    abono: monto,
    saldoAnterior: saldoActual,
    nuevoSaldo: nuevoSaldo
  };
}

/**
 * =========================================================================
 * 5. ACTUALIZAR FONDO OCASIONAL / VACACIONES (F20)
 * =========================================================================
 */
function actualizarFondoOcasional(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME_GASTOS);
  const monto = Number(payload.monto);
  
  sheet.getRange("F20").setValue(monto);
  return { success: true, nuevoFondoOcasional: monto };
}

/**
 * =========================================================================
 * 6. ACTUALIZAR AHORRO PAGOS ANUALES (FONDEO DESDE PRIMA)
 * =========================================================================
 */
function actualizarAhorroPagosAnuales(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME_GASTOS);
  const monto = Number(payload.monto) || 0;
  const modo = payload.modo || "sumar";
  
  const cell = sheet.getRange("I28");
  const actual = cleanNumber(cell.getValue());
  const nuevo = (modo === "sumar") ? actual + monto : monto;
  
  cell.setValue(nuevo);
  
  logTransaction(ss, {
    cuenta: "bolsillo",
    categoria: "Ahorro Pagos Anuales",
    concepto: payload.concepto || "Inyección desde Prima semestral",
    monto: monto,
    saldoRestante: nuevo,
    origen: payload.origen || "manual"
  });
  
  return { success: true, saldoAnterior: actual, nuevoSaldo: nuevo };
}

/**
 * =========================================================================
 * 7. PARSER DE SMS BANCARIOS (COLOMBIA)
 * =========================================================================
 */
function parseSMSBancario(payload) {
  const sms = String(payload.texto || "");
  let monto = 0;
  let comercio = "";
  let entidad = "Desconocida";
  let sugerenciaCategoria = "Salidas";
  let cuenta = "nomina";
  
  if (/bogot[aá]/i.test(sms)) entidad = "Banco de Bogotá";
  else if (/bancolombia/i.test(sms)) entidad = "Bancolombia";
  else if (/scotia|colpatria/i.test(sms)) entidad = "Scotiabank Colpatria";
  else if (/rappi/i.test(sms)) entidad = "RappiCard";
  else if (/falabella/i.test(sms)) entidad = "Falabella";
  else if (/davivienda/i.test(sms)) entidad = "Davivienda";
  
  const montoMatch = sms.match(/\$\s?([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)/);
  if (montoMatch && montoMatch[1]) {
    monto = cleanNumber(montoMatch[1]);
  }
  
  const comercioMatch = sms.match(/(?:en|de)\s+([A-Za-z0-9\s._-]{3,30}?)(?:\s+el|\s+con|\s+\*|\s+por|\.|\$)/i);
  if (comercioMatch && comercioMatch[1]) {
    comercio = comercioMatch[1].trim();
  }
  
  const cLower = comercio.toLowerCase();
  if (/texaco|primax|terpel|esso|mobil|gasol/i.test(cLower)) {
    sugerenciaCategoria = "Gasolina/Lavar";
  } else if (/pricesmart/i.test(cLower)) {
    sugerenciaCategoria = "Pricesmart";
    cuenta = "bonos";
  } else if (/olimpica|exito|carulla|d1|ara|jumbo|verdura/i.test(cLower)) {
    sugerenciaCategoria = "Verduras y demas";
    cuenta = "bonos";
  } else if (/veterin|pet|gato|laika/i.test(cLower)) {
    sugerenciaCategoria = "Gatos";
    cuenta = "bonos";
  } else if (/netflix|disney|prime|hbo|max|spotify|crunchy/i.test(cLower)) {
    sugerenciaCategoria = "Subs";
  }
  
  return {
    success: true,
    parseResult: {
      smsOriginal: sms,
      entidad: entidad,
      monto: monto,
      comercio: comercio,
      categoriaSugerida: sugerenciaCategoria,
      cuentaSugerida: cuenta
    }
  };
}

/**
 * =========================================================================
 * UTILITARIOS & LOGS
 * =========================================================================
 */
function cleanNumber(val) {
  if (typeof val === "number") return val;
  if (!val) return 0;
  const str = String(val).replace(/[^0-9.-]+/g, "");
  return parseFloat(str) || 0;
}

function ensureLogSheetExists(ss) {
  let logSheet = ss.getSheetByName(SHEET_NAME_LOGS);
  if (!logSheet) {
    logSheet = ss.insertSheet(SHEET_NAME_LOGS);
    logSheet.appendRow([
      "Timestamp",
      "Fecha",
      "Hora",
      "Cuenta",
      "Categoría",
      "Concepto",
      "Monto",
      "Saldo Restante",
      "Origen"
    ]);
    logSheet.getRange("A1:I1").setFontWeight("bold").setBackground("#0B2B33").setFontColor("#FFFFFF");
  }
  return logSheet;
}

function logTransaction(ss, data) {
  const logSheet = ensureLogSheetExists(ss);
  const now = new Date();
  const fecha = Utilities.formatDate(now, "America/Bogota", "yyyy-MM-dd");
  const hora = Utilities.formatDate(now, "America/Bogota", "HH:mm:ss");
  
  logSheet.appendRow([
    now.toISOString(),
    fecha,
    hora,
    data.cuenta || "",
    data.categoria || "",
    data.concepto || "",
    data.monto || 0,
    data.saldoRestante || 0,
    data.origen || "app"
  ]);
}
