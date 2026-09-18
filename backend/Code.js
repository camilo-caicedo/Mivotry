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
const SHEET_NAME_PENDIENTES = "Notificaciones_Pendientes";

function doGet(e) {
  try {
    if (e && e.parameter && (e.parameter.action === "recibirNotificacionExterna" || e.parameter.texto || e.parameter.sms)) {
      const res = recibirNotificacionExterna({
        texto: e.parameter.texto || e.parameter.sms || "",
        origen: e.parameter.origen || "get_webhook"
      });
      return createJsonResponse(res);
    }
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
    
    const action = contents.action || (contents.texto ? "recibirNotificacionExterna" : "getDashboard");
    
    switch (action) {
      case "getDashboard":
        return createJsonResponse({ success: true, data: getDashboardData() });
        
      case "registrarGasto":
        return createJsonResponse(registrarGasto(contents));
        
      case "cargarQuincena":
        return createJsonResponse(cargarQuincena(contents));
        
      case "recargarBonos":
        return createJsonResponse(recargarBonos(contents));
        
      case "abonoDeuda":
        return createJsonResponse(abonoDeuda(contents));
        
      case "actualizarFondoOcasional":
        return createJsonResponse(actualizarFondoOcasional(contents));
        
      case "actualizarAhorroPagosAnuales":
        return createJsonResponse(actualizarAhorroPagosAnuales(contents));
        
      case "actualizarEstadoPagoAnual":
        return createJsonResponse(actualizarEstadoPagoAnual(contents));
        
      case "parseSMS":
        return createJsonResponse(parseSMSBancario(contents));
        
      case "recibirNotificacionExterna":
        return createJsonResponse(recibirNotificacionExterna(contents));
        
      case "encolarNotificacionesMultiples":
        return createJsonResponse(encolarNotificacionesMultiples(contents));
        
      case "getNotificacionesPendientes":
        return createJsonResponse(getNotificacionesPendientes());
        
      case "procesarNotificacionPendiente":
        return createJsonResponse(procesarNotificacionPendiente(contents));
        
      case "aprobarLoteNotificaciones":
        return createJsonResponse(aprobarLoteNotificaciones(contents));
        
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
  const rowsPresupuesto = sheet.getRange("A4:F19").getValues();
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
  const totalManejoCalculadoSheet = cleanNumber(sheet.getRange("F21").getValue()); // $585,000
  
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
  
  // H. Bolsillo de Rendimientos, Ahorros y Deudas (Columnas H e I, filas 25 a 32)
  const rowsBolsillo = sheet.getRange("H25:I32").getValues();
  const cuotasOccidente = cleanNumber(rowsBolsillo[0][1]); // H25: Cuotas Occidente, I25
  const cuotaAdicionalOcc = cleanNumber(rowsBolsillo[1][1]); // H26: Cuota adicional occ, I26
  const bolsillo = cleanNumber(rowsBolsillo[2][1]); // H27: Bolsillo, I27
  const ahorroInversiones = cleanNumber(rowsBolsillo[3][1]); // H28: Bolsillo inversiones, I28 ($6,800,000)
  const ahorroPagosAnuales = cleanNumber(rowsBolsillo[4][1]); // H29: Ahorro pagos anuales, I29 ($1,000,000)
  const totalCompleto = cleanNumber(rowsBolsillo[5][1]); // H30: Total, I30 ($7,800,000)
  const totalDeudasBolsillo = cleanNumber(rowsBolsillo[6][1]); // H31: Deudas, I31 ($0)
  const totalAhorrosBolsillo = cleanNumber(rowsBolsillo[7][1]); // H32: Ahorros, I32 ($7,800,000)

  const detalleBolsillos = [
    { nombre: "Cuotas Occidente", valor: cuotasOccidente, tipo: "deuda", fila: 25 },
    { nombre: "Cuota adicional occ", valor: cuotaAdicionalOcc, tipo: "deuda", fila: 26 },
    { nombre: "Bolsillo", valor: bolsillo, tipo: "ahorro", fila: 27 },
    { nombre: "Bolsillo inversiones", valor: ahorroInversiones, tipo: "ahorro", fila: 28 },
    { nombre: "Ahorro pagos anuales", valor: ahorroPagosAnuales, tipo: "ahorro", fila: 29 }
  ];
  
  // I. Pagos Anuales (Filas 24 a 28, Columnas K a O)
  const rowsAnuales = sheet.getRange("K25:O29").getValues();
  const pagosAnuales = [];
  for (let i = 0; i < rowsAnuales.length; i++) {
    const row = rowsAnuales[i];
    const nombre = String(row[0] || "").trim();
    if (!nombre || nombre === "Total") continue;
    
    const rowNumber = 25 + i;
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
      totalManejoF21: totalManejoCalculadoSheet,
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
      totalCompleto: totalCompleto,
      totalDeudas: totalDeudasBolsillo,
      totalAhorros: totalAhorrosBolsillo,
      cuotasOccidente: cuotasOccidente,
      cuotaAdicionalOcc: cuotaAdicionalOcc,
      bolsillo: bolsillo,
      inversiones: ahorroInversiones,
      pagosAnuales: ahorroPagosAnuales,
      totalRendimientos: totalCompleto,
      items: detalleBolsillos
    },
    pagosAnuales: pagosAnuales,
    totalNotificacionesPendientes: (function() {
      const pSheet = ss.getSheetByName(SHEET_NAME_PENDIENTES);
      if (!pSheet || pSheet.getLastRow() <= 1) return 0;
      const estados = pSheet.getRange(2, 9, pSheet.getLastRow() - 1, 1).getValues();
      let count = 0;
      for (let i = 0; i < estados.length; i++) {
        if (String(estados[i][0]).toLowerCase().trim() === "pendiente") count++;
      }
      return count;
    })()
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
    const values = sheet.getRange("A4:A19").getValues();
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
  const rows = sheet.getRange("A4:F19").getValues();
  
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

/**
 * =========================================================================
 * 3.B RECARGAR BONOS PEOPLEPASS PAYCASH ($1.600.000 cada día 15)
 * =========================================================================
 */
function recargarBonos(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME_GASTOS);
  const rows = sheet.getRange("A23:C27").getValues();
  
  const actualizados = [];
  
  for (let i = 0; i < rows.length; i++) {
    const nombre = String(rows[i][0] || "").trim();
    if (!nombre) continue;
    
    const rowNum = 23 + i;
    const presupuestoBase = cleanNumber(rows[i][1]); // Columna B
    const manejoActual = cleanNumber(rows[i][2]);    // Columna C actual
    
    // Regla de acumulación: lo que quedó + nuevo presupuesto
    const nuevoManejo = (manejoActual > 0 ? manejoActual : 0) + presupuestoBase;
    sheet.getRange(rowNum, 3).setValue(nuevoManejo);
    
    actualizados.push({
      rubro: nombre,
      presupuestoBase: presupuestoBase,
      remanentePrevio: manejoActual,
      nuevoTotalManejo: nuevoManejo
    });
  }
  
  logTransaction(ss, {
    cuenta: "bonos",
    categoria: "SISTEMA",
    concepto: "Recarga Mensual Bonos Peoplepass Paycash ($1.600.000)",
    monto: 1600000,
    saldoRestante: 0,
    origen: "sistema"
  });
  
  return {
    success: true,
    mensaje: "Bonos Peoplepass Paycash recargados exitosamente",
    rubrosActualizados: actualizados
  };
}

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
  
  const cell = sheet.getRange("I29");
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
 * 6B. ACTUALIZAR ESTADO DE PAGO ANUAL (PAGADO / PENDIENTE)
 * =========================================================================
 */
function actualizarEstadoPagoAnual(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME_GASTOS);
  const fila = Number(payload.fila);
  const nuevoEstado = String(payload.estado || "Pagado").trim();
  
  if (fila < 25 || fila > 29) {
    return { success: false, error: "Fila inválida para pago anual (debe ser entre 25 y 29)" };
  }
  
  sheet.getRange("O" + fila).setValue(nuevoEstado);
  
  const concepto = sheet.getRange("K" + fila).getValue();
  const costo = sheet.getRange("L" + fila).getValue();
  
  logTransaction(ss, {
    cuenta: "pagos_anuales",
    categoria: "Pagos Anuales",
    concepto: `Pago anual: ${concepto} (${costo}) marcado como ${nuevoEstado}`,
    monto: cleanNumber(costo),
    saldoRestante: 0,
    origen: payload.origen || "app"
  });
  
  return { success: true, fila: fila, concepto: concepto, nuevoEstado: nuevoEstado };
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
  
  if (/peoplepass|paycash/i.test(sms)) {
    entidad = "Peoplepass Paycash";
    cuenta = "bonos";
  } else if (/bogot[aá]/i.test(sms)) entidad = "Banco de Bogotá";
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

/**
 * =========================================================================
 * 8. BANDEJA DE NOTIFICACIONES PENDIENTES (INBOX WEBHOOK / LOTE)
 * =========================================================================
 */
function ensurePendientesSheetExists(ss) {
  let pSheet = ss.getSheetByName(SHEET_NAME_PENDIENTES);
  if (!pSheet) {
    pSheet = ss.insertSheet(SHEET_NAME_PENDIENTES);
    pSheet.appendRow([
      "ID",
      "FechaHora",
      "Entidad",
      "TextoOriginal",
      "Monto",
      "Comercio",
      "CategoriaSugerida",
      "CuentaSugerida",
      "Estado",
      "FechaProcesado"
    ]);
    pSheet.getRange("A1:J1").setFontWeight("bold").setBackground("#0B2B33").setFontColor("#FFFFFF");
  }
  return pSheet;
}

function recibirNotificacionExterna(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const pSheet = ensurePendientesSheetExists(ss);
  
  const texto = String(payload.texto || payload.sms || "").trim();
  if (!texto) return { success: false, error: "Texto de notificación vacío" };
  
  const parsed = parseSMSBancario({ sms: texto }).parseResult;
  const now = new Date();
  const id = "NOTIF_" + now.getTime() + "_" + Math.floor(Math.random() * 1000);
  const fechaHora = Utilities.formatDate(now, "America/Bogota", "yyyy-MM-dd HH:mm:ss");
  
  pSheet.appendRow([
    id,
    fechaHora,
    parsed.entidad || "Desconocido",
    texto,
    parsed.monto || 0,
    parsed.comercio || "",
    parsed.categoriaSugerida || "Salidas 1",
    parsed.cuentaSugerida || "nomina",
    "Pendiente",
    ""
  ]);
  
  return {
    success: true,
    notificacion: {
      id: id,
      fechaHora: fechaHora,
      entidad: parsed.entidad,
      textoOriginal: texto,
      monto: parsed.monto,
      comercio: parsed.comercio,
      categoriaSugerida: parsed.categoriaSugerida,
      cuentaSugerida: parsed.cuentaSugerida,
      estado: "Pendiente"
    }
  };
}

function encolarNotificacionesMultiples(payload) {
  const textos = payload.textos || [];
  const resultados = [];
  for (let i = 0; i < textos.length; i++) {
    const txt = String(textos[i]).trim();
    if (txt) {
      resultados.push(recibirNotificacionExterna({ texto: txt, origen: payload.origen || "lote_app" }));
    }
  }
  return { success: true, totalEncoladas: resultados.length, items: resultados };
}

function getNotificacionesPendientes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const pSheet = ensurePendientesSheetExists(ss);
  const lastRow = pSheet.getLastRow();
  if (lastRow <= 1) return { success: true, total: 0, pendientes: [] };
  
  const values = pSheet.getRange(2, 1, lastRow - 1, 10).getValues();
  const pendientes = [];
  
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const estado = String(row[8] || "").trim();
    if (estado.toLowerCase() === "pendiente") {
      pendientes.push({
        filaHoja: i + 2,
        id: String(row[0]),
        fechaHora: String(row[1]),
        entidad: String(row[2]),
        textoOriginal: String(row[3]),
        monto: cleanNumber(row[4]),
        comercio: String(row[5]),
        categoriaSugerida: String(row[6]),
        cuentaSugerida: String(row[7]),
        estado: estado
      });
    }
  }
  
  return { success: true, total: pendientes.length, pendientes: pendientes };
}

function procesarNotificacionPendiente(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const pSheet = ensurePendientesSheetExists(ss);
  const id = String(payload.id || "").trim();
  const accion = String(payload.accion || "aprobar").toLowerCase(); // "aprobar" o "descartar"
  
  const lastRow = pSheet.getLastRow();
  if (lastRow <= 1) return { success: false, error: "No hay notificaciones registradas" };
  
  const ids = pSheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let targetRow = null;
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === id) {
      targetRow = i + 2;
      break;
    }
  }
  
  if (!targetRow) {
    return { success: false, error: "Notificación no encontrada con id: " + id };
  }
  
  const now = new Date();
  const fechaProcesado = Utilities.formatDate(now, "America/Bogota", "yyyy-MM-dd HH:mm:ss");
  
  if (accion === "descartar") {
    pSheet.getRange(targetRow, 9).setValue("Descartado");
    pSheet.getRange(targetRow, 10).setValue(fechaProcesado);
    return { success: true, id: id, accion: "descartado" };
  }
  
  // Si es aprobar:
  const categoria = payload.categoria || pSheet.getRange(targetRow, 7).getValue();
  const cuenta = payload.cuenta || pSheet.getRange(targetRow, 8).getValue();
  const monto = payload.monto || cleanNumber(pSheet.getRange(targetRow, 5).getValue());
  const comercio = payload.concepto || pSheet.getRange(targetRow, 6).getValue();
  
  const resGasto = registrarGasto({
    cuenta: cuenta,
    categoria: categoria,
    monto: monto,
    concepto: comercio || ("Notificación SMS (" + categoria + ")"),
    origen: "notificacion_aprobada"
  });
  
  if (!resGasto.success) {
    return { success: false, error: "Error al aplicar gasto en hoja: " + resGasto.error };
  }
  
  pSheet.getRange(targetRow, 9).setValue("Aprobado");
  pSheet.getRange(targetRow, 10).setValue(fechaProcesado);
  
  return {
    success: true,
    id: id,
    accion: "aprobado",
    gasto: resGasto
  };
}

function aprobarLoteNotificaciones(payload) {
  const ids = payload.ids || [];
  const resultados = [];
  for (let i = 0; i < ids.length; i++) {
    resultados.push(procesarNotificacionPendiente({ id: ids[i], accion: "aprobar" }));
  }
  return { success: true, total: resultados.length, resultados: resultados };
}

