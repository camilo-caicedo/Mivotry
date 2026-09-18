export interface ParsedBankSMS {
  smsOriginal: string;
  entidad: string;
  monto: number;
  comercio: string;
  tipoTransaccion: 'compra' | 'transferencia' | 'recarga' | 'retiro' | 'pago';
  categoriaSugerida: string;
  cuentaSugerida: 'nomina' | 'bonos';
  tarjetaRef?: string;
  fechaTexto?: string;
  confianza: 'alta' | 'media';
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
    titulo: 'Peoplepass en PriceSmart',
    banco: 'Peoplepass Paycash',
    texto: 'Compra aprobada en PRICESMART por $385.000 con Tarjeta Paycash ****8890 el 18/09/2026.',
    categoriaEsperada: 'Pricesmart',
    cuentaEsperada: 'bonos'
  },
  {
    titulo: 'Peoplepass Supermercado',
    banco: 'Peoplepass Paycash',
    texto: 'Peoplepass: Compra exitosa en FRUVER Y VERDURAS LA 80 por $65.000 con tu tarjeta Paycash.',
    categoriaEsperada: 'Verduras y demas',
    cuentaEsperada: 'bonos'
  },
  {
    titulo: 'Peoplepass en Veterinaria / Gatos',
    banco: 'Peoplepass Paycash',
    texto: 'Transaccion aprobada en PET SHOP LAIKA por $95.000 con tarjeta Paycash *1122.',
    categoriaEsperada: 'Gatos',
    cuentaEsperada: 'bonos'
  },
  {
    titulo: 'Gasolina Texaco (Bancolombia)',
    banco: 'Bancolombia',
    texto: 'Bancolombia le informa compra por $90.000 en EDS TEXACO CALLE 26 con su t.deb *4532, 18/09/2026 08:30.',
    categoriaEsperada: 'Gasolina/Lavar',
    cuentaEsperada: 'nomina'
  },
  {
    titulo: 'Salida a Restaurante (Bancolombia)',
    banco: 'Bancolombia',
    texto: 'Bancolombia le informa compra por $54.000 en CREPES Y WAFFLES con su t.cred *8901, 18/09/2026 14:15.',
    categoriaEsperada: 'Salidas',
    cuentaEsperada: 'nomina'
  },
  {
    titulo: 'Compra con Banco de Occidente',
    banco: 'Banco de Occidente',
    texto: 'Banco de Occidente informa compra con T.Credito *4567 por $120.000 en CINE COLOMBIA el 18/09/2026.',
    categoriaEsperada: 'Salidas',
    cuentaEsperada: 'nomina'
  },
  {
    titulo: 'Compra Rappi / RappiCard',
    banco: 'RappiCard',
    texto: 'Aprobamos tu compra en UBER TRIP por $22.500 con tu RappiCard terminada en 4455.',
    categoriaEsperada: 'Salidas',
    cuentaEsperada: 'nomina'
  },
  {
    titulo: 'Pago de Servicios (Davivienda)',
    banco: 'Davivienda',
    texto: 'Davivienda: Pago por $115.000 en ENEL CODENSA desde cta *7890 el 18/09/2026 11:20.',
    categoriaEsperada: 'Servicios',
    cuentaEsperada: 'nomina'
  }
];

export function parseBankSMS(rawText: string): ParsedBankSMS | null {
  const text = String(rawText || '').trim();
  if (!text || text.length < 10) return null;

  // 1. Identificación de la Entidad Financiera
  let entidad = 'Entidad Bancaria';
  let cuenta: 'nomina' | 'bonos' = 'nomina';

  if (/peoplepass|paycash/i.test(text)) {
    entidad = 'Peoplepass Paycash';
    cuenta = 'bonos';
  } else if (/bancolombia/i.test(text)) {
    entidad = 'Bancolombia';
  } else if (/banco\s+de\s+occidente|occidente/i.test(text)) {
    entidad = 'Banco de Occidente';
  } else if (/davivienda/i.test(text)) {
    entidad = 'Davivienda';
  } else if (/scotia|colpatria/i.test(text)) {
    entidad = 'Scotiabank Colpatria';
  } else if (/rappi/i.test(text)) {
    entidad = 'RappiCard';
  } else if (/falabella/i.test(text)) {
    entidad = 'Banco Falabella';
  } else if (/nequi/i.test(text)) {
    entidad = 'Nequi';
  } else if (/daviplata/i.test(text)) {
    entidad = 'Daviplata';
  }

  // 2. Extracción del Monto
  // Patrones: "$ 45.000", "$45,000.00", "por $120.000"
  let monto = 0;
  const montoMatch = text.match(/\$\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)/);
  if (montoMatch && montoMatch[1]) {
    const cleanStr = montoMatch[1].replace(/[^0-9]/g, '');
    monto = parseFloat(cleanStr) || 0;
  }

  if (monto <= 0) {
    // Buscar números precedidos de "por " o "de " seguidos de pesos o miles
    const altMatch = text.match(/(?:por|de|valor)\s+([0-9]{2,3}(?:[.,][0-9]{3})+)/i);
    if (altMatch && altMatch[1]) {
      const cleanStr = altMatch[1].replace(/[^0-9]/g, '');
      monto = parseFloat(cleanStr) || 0;
    }
  }

  if (monto <= 0) return null;

  // 3. Extracción de Comercio / Establecimiento
  let comercio = 'Comercio General';
  // Buscar primero "en <COMERCIO>" que es el estándar de compras en Colombia
  let comercioMatch = text.match(/\ben\s+([A-Za-z0-9\s._\-&]{3,35}?)(?:\s+(?:por|con|el|desde|a\s+las|\*|\.|\$|,))/i);
  if (!comercioMatch) {
    // Si no tiene "en", buscar después de "de " evitando nombres de bancos
    comercioMatch = text.match(/\bde\s+(?!banc|occidente|bogot|davivienda)([A-Za-z0-9\s._\-&]{3,35}?)(?:\s+(?:por|con|el|desde|\*|\.|\$))/i);
  }
  if (comercioMatch && comercioMatch[1]) {
    const candidate = comercioMatch[1].trim();
    // Evitar falsos positivos como "su cuenta" o palabras de control
    if (!/^(su\s+t|tu\s+tarjeta|cta|cuenta|tarjeta)/i.test(candidate)) {
      comercio = candidate;
    }
  }

  // 4. Extracción de Referencia de Tarjeta (opcional)
  let tarjetaRef: string | undefined = undefined;
  const cardMatch = text.match(/(?:t\.deb|t\.cred|tarjeta|tc|paycash|cta|terminada\s+en)\s*[*xX\s]*([0-9]{4})/i);
  if (cardMatch && cardMatch[1]) {
    tarjetaRef = `*${cardMatch[1]}`;
  }

  // 5. Tipo de Transacción
  let tipoTransaccion: 'compra' | 'transferencia' | 'recarga' | 'retiro' | 'pago' = 'compra';
  if (/recarga/i.test(text)) tipoTransaccion = 'recarga';
  else if (/transferencia|enviaste|env[ií]o/i.test(text)) tipoTransaccion = 'transferencia';
  else if (/retiro/i.test(text)) tipoTransaccion = 'retiro';
  else if (/pago\s+de\s+cuota|pago\s+por/i.test(text)) tipoTransaccion = 'pago';

  // 6. Inferencia Inteligente de Categoría de la Hoja
  const cLower = `${comercio} ${text}`.toLowerCase();
  let categoriaSugerida = 'Salidas'; // Categoría por defecto para compras variables
  let confianza: 'alta' | 'media' = 'media';

  // Reglas específicas para Bonos Peoplepass
  if (cuenta === 'bonos') {
    if (/pricesmart/i.test(cLower)) {
      categoriaSugerida = 'Pricesmart';
      confianza = 'alta';
    } else if (/olimpica|exito|éxito|carulla|d1|ara|jumbo|fruver|verdura|mercado|supermercado/i.test(cLower)) {
      categoriaSugerida = 'Verduras y demas';
      confianza = 'alta';
    } else if (/veterin|pet|gato|laika|agrocampo|purina|cat/i.test(cLower)) {
      categoriaSugerida = 'Gatos';
      confianza = 'alta';
    } else {
      categoriaSugerida = 'Salidas 1';
    }
  } else {
    // Reglas para Nómina
    if (/texaco|primax|terpel|esso|mobil|biomax|gasolin|combustible|lavadero|lavar|estacion/i.test(cLower)) {
      categoriaSugerida = 'Gasolina/Lavar';
      confianza = 'alta';
    } else if (/pricesmart/i.test(cLower)) {
      // Si fue con tarjeta de crédito/débito pero es PriceSmart
      categoriaSugerida = 'Pricesmart';
      cuenta = 'bonos'; // Sugerir bonos si fue ahí
      confianza = 'media';
    } else if (/enel|codensa|vanti|gas\s+natural|acueducto|epm|energia|servicios\s+publicos/i.test(cLower)) {
      categoriaSugerida = 'Servicios';
      confianza = 'alta';
    } else if (/claro|movistar|tigo|wom|celular/i.test(cLower)) {
      categoriaSugerida = 'Celular';
      confianza = 'alta';
    } else if (/etb|internet/i.test(cLower)) {
      categoriaSugerida = 'Internet';
      confianza = 'alta';
    } else if (/netflix|spotify|youtube|disney|prime\s*video|hbo|max|crunchy|apple\s*sub/i.test(cLower)) {
      categoriaSugerida = 'Subs';
      confianza = 'alta';
    } else if (/rappi/i.test(cLower) && !/rappicard/i.test(comercio.toLowerCase())) {
      categoriaSugerida = 'Rappi';
      confianza = 'alta';
    } else if (/allianz|sura|seguro|soat/i.test(cLower)) {
      categoriaSugerida = 'Seguro carro';
      confianza = 'media';
    } else if (/restaurante|cafe|cafeteria|bar|cine|crepes|waffles|mcdonalds|burguer|starbucks|domicilio|uber|didi|cabify/i.test(cLower)) {
      categoriaSugerida = 'Salidas';
      confianza = 'alta';
    }
  }

  return {
    smsOriginal: text,
    entidad,
    monto,
    comercio,
    tipoTransaccion,
    categoriaSugerida,
    cuentaSugerida: cuenta,
    tarjetaRef,
    confianza
  };
}
