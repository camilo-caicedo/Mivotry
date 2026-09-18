export interface ParsedBankSMS {
  smsOriginal: string;
  entidad: string;
  monto: number;
  comercio: string;
  tipoTransaccion: 'compra' | 'transferencia' | 'recarga' | 'retiro' | 'pago_credito' | 'nomina_perficient' | 'compra_tc';
  categoriaSugerida: string;
  cuentaSugerida: 'nomina' | 'bonos' | 'tarjeta_credito';
  isTarjetaCredito: boolean;
  tarjetaRef?: string;
  tarjetaNombre?: string;
  tarjetaFila?: 8 | 9 | 10 | 11;
  quincenaSugerida?: 15 | 30;
  fechaTexto?: string;
  confianza: 'alta' | 'media';
  mensajeAccion?: string;
}

export interface CardMappingInfo {
  nombre: string;
  fila: 8 | 9 | 10 | 11;
  tipo: 'credito' | 'debito';
  descripcion: string;
}

export const USER_CARD_MAPPINGS: Record<string, CardMappingInfo> = {
  '2068': { nombre: 'Infinity', fila: 8, tipo: 'credito', descripcion: 'Bancolombia Infinity (Fila 8, celda I8)' },
  '0899': { nombre: 'Rappi', fila: 9, tipo: 'credito', descripcion: 'RappiCard (Fila 9, celda I9)' },
  '5248': { nombre: 'Scotia', fila: 10, tipo: 'credito', descripcion: 'Scotiabank Colpatria / Davibank (Fila 10, celda I10)' },
  '2545': { nombre: 'Falabella', fila: 11, tipo: 'credito', descripcion: 'Banco Falabella (Fila 11, celda I11)' },
  '3839': { nombre: 'Débito Bancolombia', fila: 8, tipo: 'debito', descripcion: 'Tarjeta Débito Cuenta de Ahorros' },
  '1493': { nombre: 'Ahorros Bancolombia', fila: 8, tipo: 'debito', descripcion: 'Cuenta de Ahorros Principal' },
};

export interface SMSTemplate {
  titulo: string;
  banco: string;
  texto: string;
  categoriaEsperada: string;
  cuentaEsperada: 'nomina' | 'bonos' | 'tarjeta_credito';
}

export const SMS_TEST_TEMPLATES: SMSTemplate[] = [
  {
    titulo: 'Nómina Perficient (Carga Q15)',
    banco: 'Bancolombia',
    texto: 'Bancolombia: Recibiste un pago por $5,049,748.00 de PERFICIENT COLO a tu cuenta AHORROS, el 13:06 a las 15/09/2026. ¿Tienes dudas? Encuentranos aqui:018000931987. Estamos cerca.',
    categoriaEsperada: 'Nómina Base',
    cuentaEsperada: 'nomina'
  },
  {
    titulo: 'Peoplepass Starbucks',
    banco: 'Peoplepass Paycash',
    texto: 'hora 09:06:05 lugar STARBUCKS JARDIN PLAZA CALI CO 9:06... Peoplepass: COMPRA NACIONAL Aprobada $ 24.265,00 producto 4525160*****7222 fecha 2026-09-18',
    categoriaEsperada: 'Salidas 1',
    cuentaEsperada: 'bonos'
  },
  {
    titulo: 'Peoplepass Pyco CC',
    banco: 'Peoplepass Paycash',
    texto: 'hora 13:25:06 lugar PYCO CC JARDIN PLAZA CALI CO 1:27 PM Peoplepass: COMPRA NACIONAL Aprobada $ 16.200,00 producto 4525160*****7222 fecha 2026-09-18',
    categoriaEsperada: 'Salidas 1',
    cuentaEsperada: 'bonos'
  },
  {
    titulo: 'MacroDroid TC Infinity (*2068)',
    banco: 'Bancolombia',
    texto: 'Bancolombia: Compraste COP18.000,00 en GOOGLE *MacroDroid D con tu T.Cred *2068, el 18/09/2026 a las 18:07. Si tienes dudas, encuentranos aqui: 6045109095 o 018000931987. Estamos cerca.',
    categoriaEsperada: 'Deudas tarjetas',
    cuentaEsperada: 'tarjeta_credito'
  },
  {
    titulo: 'RappiCard Burger King (*0899)',
    banco: 'RappiCard',
    texto: 'RappiCard: Compraste $45.000 en BURGER KING con tu tarjeta *0899 el 18/09/2026. Transacción aprobada.',
    categoriaEsperada: 'Deudas tarjetas',
    cuentaEsperada: 'tarjeta_credito'
  },
  {
    titulo: 'Scotia / Davibank Home Art (*5248)',
    banco: 'Scotiabank Colpatria',
    texto: 'Scotiabank Colpatria: Compra por $89.900 en HOME ART con tu T.Cred *5248 el 18/09/2026.',
    categoriaEsperada: 'Deudas tarjetas',
    cuentaEsperada: 'tarjeta_credito'
  },
  {
    titulo: 'Falabella Titan (*2545)',
    banco: 'Banco Falabella',
    texto: 'Banco Falabella: Compra aprobada por $120.000 en FALABELLA TITAN con tu CMR *2545 el 18/09/2026.',
    categoriaEsperada: 'Deudas tarjetas',
    cuentaEsperada: 'tarjeta_credito'
  },
  {
    titulo: 'Celular Claro Débito (*3839)',
    banco: 'Bancolombia',
    texto: 'Bancolombia: Compraste $61.899,00 en COMCEL PAGOS DE FACT con tu T.Deb *3839, el 15/09/2026 a las 13:44. Si tienes dudas, encuentranos aqui: 6045109095 o 018000931987. Estamos cerca.',
    categoriaEsperada: 'Celular',
    cuentaEsperada: 'nomina'
  },
  {
    titulo: 'Davibank Netflix (Visa Oro)',
    banco: 'DAVIbank',
    texto: 'DAVIbank : Compra recurrente en NETFLIX por 29,900 con tu tarjeta Visa Oro 2026/09/11 3:04:30',
    categoriaEsperada: 'Subs',
    cuentaEsperada: 'nomina'
  },
  {
    titulo: 'Transferencia Bre-b (*1493)',
    banco: 'Bancolombia',
    texto: 'Bancolombia: JUAN, transferiste $64,200.00 a la llave 3004412805 desde tu cuenta *1493 a DIANA MARCELA VARGAS MENDEZ el 18/09/26 a las 14:40. Con Bre-b es de una y gratis. Dudas al 018000912345.',
    categoriaEsperada: 'Salidas',
    cuentaEsperada: 'nomina'
  },
  {
    titulo: 'Pago a TC Infinity (*2068)',
    banco: 'Bancolombia',
    texto: 'Bancolombia: Pagaste $94,304 en la tarjeta de credito *2068 desde la cuenta *1493, el 17/09/2026 21:30. ¿Dudas? Llamanos al 018000912345. Estamos cerca.',
    categoriaEsperada: 'Deudas tarjetas',
    cuentaEsperada: 'nomina'
  },
  {
    titulo: 'Retiro Fiducuenta',
    banco: 'Bancolombia',
    texto: 'Bancolombia: Retiraste $930,000.00 de tu cuenta *9194 Fiducuenta el 2026/09/15 13:37:25, hacia la cuenta *82523741493. ¿Dudas? 6045109009',
    categoriaEsperada: 'Fiduciaria',
    cuentaEsperada: 'nomina'
  }
];

function cleanMoneyValue(rawText: string): number {
  if (!rawText) return 0;
  let s = rawText.trim();
  // Si termina en 2 decimales (ej .00 o ,00)
  if (/[.,][0-9]{2}$/.test(s)) {
    s = s.slice(0, -3);
  }
  return parseFloat(s.replace(/[^0-9]/g, '')) || 0;
}

export function parseBankSMS(rawText: string): ParsedBankSMS | null {
  const text = String(rawText || '').trim();
  if (!text || text.length < 10) return null;

  // 0. FILTRO DE EXCLUSIÓN: Mensajes no financieros (OTP, Clave Dinámica, Spam, etc.)
  const isSecurity = /clave din[aá]mica|c[oó]digo de seguridad|c[oó]digo de verificaci[oó]n|token|otp|iniciaste sesi[oó]n|alerta de inicio|cambio de clave|actualiza tus datos|feliz cumplea[ñn]os|conoce nuestras|oferta comercial|cr[eé]dito preaprobado/i.test(text);
  const hasMoneyOrAction = /(?:\$|COP)\s*[0-9]/i.test(text) || /compr|pag|transfer|recib|abono|retir/i.test(text);
  if (isSecurity && !hasMoneyOrAction) {
    return null;
  }

  // 1. CASO ESPECIAL: PAGO DE NÓMINA EMPRESA (PERFICIENT)
  if (/perficient/i.test(text) && /recibiste|pago|abono/i.test(text)) {
    const montoMatch = text.match(/(?:\$|COP)\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)/i);
    let monto = 5049748;
    if (montoMatch && montoMatch[1]) {
      monto = cleanMoneyValue(montoMatch[1]);
    }

    let quincena: 15 | 30 = 15;
    const dateMatch = text.match(/([0-3]?[0-9])\/([0-1]?[0-9])\/(?:20)?[0-9]{2}/);
    if (dateMatch && dateMatch[1]) {
      const dia = parseInt(dateMatch[1], 10);
      quincena = dia > 22 ? 30 : 15;
    }

    return {
      smsOriginal: text,
      entidad: 'Perficient Colombia (Nómina)',
      monto,
      comercio: 'Perficient Nómina',
      tipoTransaccion: 'nomina_perficient',
      categoriaSugerida: 'Nómina Base',
      cuentaSugerida: 'nomina',
      isTarjetaCredito: false,
      quincenaSugerida: quincena,
      confianza: 'alta',
      mensajeAccion: `Pago de Nómina de Perficient ($${monto.toLocaleString('es-CO')}). Presiona para cargar la Quincena ${quincena}.`
    };
  }

  // 2. IDENTIFICACIÓN DE ENTIDAD FINANCIERA
  let entidad = 'Entidad Bancaria';
  let cuenta: 'nomina' | 'bonos' | 'tarjeta_credito' = 'nomina';

  if (/peoplepass|paycash/i.test(text)) {
    entidad = 'Peoplepass Paycash';
    cuenta = 'bonos';
  } else if (/davibank|davivienda/i.test(text)) {
    entidad = 'DAVIbank (Davivienda)';
  } else if (/bancolombia/i.test(text)) {
    entidad = 'Bancolombia';
  } else if (/banco\s+de\s+occidente|occidente/i.test(text)) {
    entidad = 'Banco de Occidente';
  } else if (/scotia|colpatria/i.test(text)) {
    entidad = 'Scotiabank Colpatria';
  } else if (/rappi/i.test(text)) {
    entidad = 'RappiCard';
  }

  // 3. EXTRACCIÓN DEL MONTO
  let monto = 0;
  // Busca: $ 16.200,00 | $64,200.00 | COP72.000,00 | $94,304
  const montoMatch = text.match(/(?:\$|COP)\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)/i);
  if (montoMatch && montoMatch[1]) {
    monto = cleanMoneyValue(montoMatch[1]);
  }

  if (monto <= 0) {
    // Buscar "por 29,900" (formato común de Davibank)
    const porMatch = text.match(/por\s+([0-9]{1,3}(?:[.,][0-9]{3})+)/i);
    if (porMatch && porMatch[1]) {
      monto = cleanMoneyValue(porMatch[1]);
    }
  }

  if (monto <= 0) return null;

  // 4. DETECCIÓN DE TARJETA DE CRÉDITO Y CUENTA
  // Mapeo exacto de las tarjetas del usuario:
  // *2068: Bancolombia Infinity (Fila 8, celda I8)
  // *0899: RappiCard (Fila 9, celda I9)
  // *5248: Scotia o Davibank (Fila 10, celda I10)
  // *2545: Falabella CMR (Fila 11, celda I11)
  // *3839: Tarjeta de débito cuenta de ahorros (Manejo regular)
  // *1493: Cuenta de ahorros principal Bancolombia (Manejo regular)

  const cardMatch = text.match(/(?:t\.cred|t\.deb|tarjeta|producto|cuenta|tarjeta de credito|visa oro|cmr)\s*[*xX\s]*([0-9]{4})/i)
    || text.match(/[*xX]([0-9]{4})\b/);

  const last4 = cardMatch ? cardMatch[1] : undefined;
  let tarjetaRef: string | undefined = last4 ? `*${last4}` : undefined;
  let tarjetaNombre = 'Tarjeta de Crédito';
  let tarjetaFila: 8 | 9 | 10 | 11 = 8;
  let isTarjetaCredito = false;

  if (last4 && USER_CARD_MAPPINGS[last4]) {
    const cardInfo = USER_CARD_MAPPINGS[last4];
    tarjetaNombre = cardInfo.nombre;
    tarjetaFila = cardInfo.fila;
    isTarjetaCredito = (cardInfo.tipo === 'credito');
  } else if (/t\.deb/i.test(text)) {
    isTarjetaCredito = false;
    tarjetaNombre = 'Débito Ahorros';
  } else if (/infinity/i.test(text)) {
    isTarjetaCredito = true;
    tarjetaNombre = 'Infinity';
    tarjetaFila = 8;
  } else if (/rappi/i.test(text)) {
    isTarjetaCredito = true;
    tarjetaNombre = 'Rappi';
    tarjetaFila = 9;
  } else if (/scotia|colpatria/i.test(text) || (/davibank|davivienda/i.test(text) && /cred|tarjeta/i.test(text))) {
    isTarjetaCredito = true;
    tarjetaNombre = 'Scotia';
    tarjetaFila = 10;
  } else if (/falabella|cmr/i.test(text)) {
    isTarjetaCredito = true;
    tarjetaNombre = 'Falabella';
    tarjetaFila = 11;
  } else if (/t\.cred|tarjeta de credito|rappicard/i.test(text)) {
    isTarjetaCredito = true;
    tarjetaNombre = 'Infinity';
    tarjetaFila = 8;
  }

  // 5. TIPO DE ACCIÓN BANCARIA
  let tipoTransaccion: 'compra' | 'transferencia' | 'recarga' | 'retiro' | 'pago_credito' | 'compra_tc' = 'compra';
  if (/pagaste.*tarjeta de credito/i.test(text)) {
    tipoTransaccion = 'pago_credito';
  } else if (/transferiste/i.test(text)) {
    tipoTransaccion = 'transferencia';
  } else if (/retiraste.*fiducuenta/i.test(text)) {
    tipoTransaccion = 'retiro';
  } else if (/recarga/i.test(text)) {
    tipoTransaccion = 'recarga';
  } else if (isTarjetaCredito) {
    tipoTransaccion = 'compra_tc';
  }

  // 6. EXTRACCIÓN DEL COMERCIO / ESTABLECIMIENTO / DESTINO
  let comercio = 'Comercio General';

  // A) Formato Peoplepass: "lugar STARBUCKS JARDIN PLAZA CALI CO" o "lugar PYCO CC JARDIN PLAZA"
  const lugarMatch = text.match(/lugar\s+([A-Za-z0-9\s._\-&]{3,35}?)(?:\s+CALI|\s+BOGOTA|\s+[0-9]{1,2}:[0-9]{2}|$)/i);
  if (lugarMatch && lugarMatch[1]) {
    comercio = lugarMatch[1].trim();
  } else if (/transferiste/i.test(text)) {
    // B) Transferencia Bre-b: "a DIANA MARCELA VARGAS MENDEZ el" o "a Juan Camilo Pantoja Diaz el"
    const transMatch = text.match(/a\s+([A-Za-z\s]{4,35}?)(?:\s+el|\s+a\s+las|\.|\$)/i);
    if (transMatch && transMatch[1] && !/la\s+llave/i.test(transMatch[1])) {
      comercio = transMatch[1].trim();
    }
  } else if (text.match(/\ben\s+([A-Za-z0-9*._\-&\s]{3,45}?)(?:\s+con\s+(?:tu|su|t\.|\*)|(?:\s+el\s+[0-9])|\s+desde|\s+a\s+las|\.|\$|,)/i)) {
    // C) Compra estándar "en COMERCIO":
    const enMatch = text.match(/\ben\s+([A-Za-z0-9*._\-&\s]{3,45}?)(?:\s+con\s+(?:tu|su|t\.|\*)|(?:\s+el\s+[0-9])|\s+desde|\s+a\s+las|\.|\$|,)/i);
    if (enMatch && enMatch[1]) {
      const candidate = enMatch[1].trim();
      if (!/^(la\s+tarjeta|su\s+t|tu\s+tarjeta)/i.test(candidate)) {
        comercio = candidate;
      }
    }
  } else if (text.match(/a\s+(BANCO\s+[A-Za-z0-9\s]+?)(?:\s+desde|\s+el)/i)) {
    const bancoMatch = text.match(/a\s+(BANCO\s+[A-Za-z0-9\s]+?)(?:\s+desde|\s+el)/i);
    if (bancoMatch && bancoMatch[1]) {
      comercio = bancoMatch[1].trim();
    }
  }

  // 7. INFERENCIA INTELIGENTE DE CATEGORÍA DE LA HOJA
  const cLower = `${comercio} ${text}`.toLowerCase();
  let categoriaSugerida = 'Salidas';
  let confianza: 'alta' | 'media' = 'media';

  // Si es COMPRA CON TARJETA DE CRÉDITO:
  if (tipoTransaccion === 'compra_tc') {
    categoriaSugerida = 'Deudas tarjetas';
    cuenta = 'tarjeta_credito';
    confianza = 'alta';
  } else if (tipoTransaccion === 'retiro' && /fiducuenta/i.test(cLower)) {
    categoriaSugerida = 'Fiduciaria';
    confianza = 'alta';
  } else if (tipoTransaccion === 'pago_credito') {
    categoriaSugerida = 'Deudas tarjetas';
    confianza = 'alta';
  } else if (/comcel|claro/i.test(cLower)) {
    categoriaSugerida = 'Celular';
    confianza = 'alta';
  } else if (/netflix|wow\s*presents|spotify|disney|prime|youtube|crunchy|apple/i.test(cLower)) {
    categoriaSugerida = 'Subs';
    confianza = 'alta';
  } else if (/pricesmart/i.test(cLower)) {
    categoriaSugerida = 'Pricesmart';
    cuenta = 'bonos';
    confianza = 'alta';
  } else if (/fruver|verdura|exito|éxito|carulla|d1|ara|jumbo|supermercado/i.test(cLower)) {
    categoriaSugerida = 'Verduras y demas';
    cuenta = 'bonos';
    confianza = 'alta';
  } else if (/laika|pet|gato|veterin|purina|agrocampo/i.test(cLower)) {
    categoriaSugerida = 'Gatos';
    cuenta = 'bonos';
    confianza = 'alta';
  } else if (cuenta === 'bonos') {
    categoriaSugerida = 'Salidas 1';
    confianza = 'alta';
  } else if (/texaco|primax|terpel|esso|mobil|gasol|lavadero/i.test(cLower)) {
    categoriaSugerida = 'Gasolina/Lavar';
    confianza = 'alta';
  } else if (/enel|codensa|vanti|acueducto|epm|energia|servicios/i.test(cLower)) {
    categoriaSugerida = 'Servicios';
    confianza = 'alta';
  } else if (/dollarcity|h60|starbucks|pyco|cine|crepes|restaurante|uber|didi|bar/i.test(cLower)) {
    categoriaSugerida = 'Salidas';
    confianza = 'alta';
  }

  let mensajeAccion = undefined;
  if (tipoTransaccion === 'compra_tc') {
    mensajeAccion = `💳 Compra con Tarjeta de Crédito ${tarjetaNombre} (${tarjetaRef || 'TC'}): Suma a tu deuda en la celda I${tarjetaFila} (Fila ${tarjetaFila}) y NO se descuenta de tu cuenta de ahorros de Manejo.`;
  } else if (tipoTransaccion === 'pago_credito') {
    mensajeAccion = `💳 Pago a Tarjeta de Crédito ${tarjetaNombre} (${tarjetaRef || 'TC'}): Se descuenta de tu saldo de Manejo (Deudas tarjetas) y disminuye la deuda de tu tarjeta en celda I${tarjetaFila}.`;
  }

  return {
    smsOriginal: text,
    entidad,
    monto,
    comercio,
    tipoTransaccion,
    categoriaSugerida,
    cuentaSugerida: cuenta,
    isTarjetaCredito,
    tarjetaRef,
    tarjetaNombre,
    tarjetaFila,
    confianza,
    mensajeAccion
  };
}
