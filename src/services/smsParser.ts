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
  quincenaSugerida?: 15 | 30;
  fechaTexto?: string;
  confianza: 'alta' | 'media';
  mensajeAccion?: string;
}

export interface SMSTemplate {
  titulo: string;
  banco: string;
  texto: string;
  categoriaEsperada: string;
  cuentaEsperada: 'nomina' | 'bonos';
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
    titulo: 'Dollarcity con TC (*2068)',
    banco: 'Bancolombia',
    texto: 'Bancolombia: Compraste COP72.000,00 en DOLLARCITY BOCHALEMA con tu T.Cred *2068, el 10/09/2026 a las 17:43. Si tienes dudas, encuentranos aqui: 6045109095 o 018000931987. Estamos cerca.',
    categoriaEsperada: 'Salidas',
    cuentaEsperada: 'nomina'
  },
  {
    titulo: 'Celular Claro (COMCEL)',
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
    titulo: 'Davibank Google WOW',
    banco: 'DAVIbank',
    texto: 'DAVIbank : Compra recurrente en GOOGLE *WOW Presents P por 29,900 con tu tarjeta Visa Oro 2026/09/02 17:25:52',
    categoriaEsperada: 'Subs',
    cuentaEsperada: 'nomina'
  },
  {
    titulo: 'Transferencia Bre-b',
    banco: 'Bancolombia',
    texto: 'Bancolombia: JUAN, transferiste $64,200.00 a la llave 3004412805 desde tu cuenta *1493 a DIANA MARCELA VARGAS MENDEZ el 18/09/26 a las 14:40. Con Bre-b es de una y gratis. Dudas al 018000912345.',
    categoriaEsperada: 'Salidas',
    cuentaEsperada: 'nomina'
  },
  {
    titulo: 'Pago a Tarjeta Crédito (*2068)',
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
  if (!text || text.length < 8) return null;

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

  // 4. DETECCIÓN DE TARJETA DE CRÉDITO
  const isTarjetaCredito = /t\.cred|tarjeta de credito|visa oro|rappicard/i.test(text);
  let tarjetaRef: string | undefined = undefined;
  let tarjetaNombre = 'Tarjeta de Crédito';
  const cardMatch = text.match(/(?:t\.cred|t\.deb|tarjeta|producto|cuenta|tarjeta de credito|visa oro)\s*[*xX\s]*([0-9]{4})/i);
  if (cardMatch && cardMatch[1]) {
    tarjetaRef = `*${cardMatch[1]}`;
    if (cardMatch[1] === '2068') {
      tarjetaNombre = 'Infinity';
    }
  } else if (/visa oro/i.test(text)) {
    tarjetaRef = 'Visa Oro';
  }

  if (/infinity/i.test(text)) tarjetaNombre = 'Infinity';
  else if (/rappi/i.test(text)) tarjetaNombre = 'Rappi';
  else if (/scotia|colpatria/i.test(text)) tarjetaNombre = 'Scotia';
  else if (/falabella/i.test(text)) tarjetaNombre = 'Falabella';
  else if (isTarjetaCredito && /bancolombia/i.test(text)) tarjetaNombre = 'Infinity';

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
    mensajeAccion = `💳 Compra con Tarjeta de Crédito ${tarjetaNombre} (${tarjetaRef || 'TC'}): Suma a tu deuda en la celda I8 (Fila 8) y NO se descuenta de tu cuenta de ahorros de Manejo.`;
  } else if (tipoTransaccion === 'pago_credito') {
    mensajeAccion = `💳 Pago a Tarjeta de Crédito ${tarjetaNombre} (${tarjetaRef || 'TC'}): Se descuenta de tu saldo de Manejo y disminuye la deuda de tu tarjeta.`;
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
    confianza,
    mensajeAccion
  };
}
