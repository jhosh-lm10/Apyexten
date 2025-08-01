/**
 * Utilidades avanzadas para validación de números de teléfono
 */

// Códigos de país más comunes
export const COUNTRY_CODES = {
  // América
  '1': { country: 'Estados Unidos/Canadá', flag: '🇺🇸', minLength: 10, maxLength: 10 },
  '52': { country: 'México', flag: '🇲🇽', minLength: 10, maxLength: 10 },
  '54': { country: 'Argentina', flag: '🇦🇷', minLength: 10, maxLength: 11 },
  '55': { country: 'Brasil', flag: '🇧🇷', minLength: 10, maxLength: 11 },
  '51': { country: 'Perú', flag: '🇵🇪', minLength: 9, maxLength: 9 },
  '56': { country: 'Chile', flag: '🇨🇱', minLength: 9, maxLength: 9 },
  '57': { country: 'Colombia', flag: '🇨🇴', minLength: 10, maxLength: 10 },
  '58': { country: 'Venezuela', flag: '🇻🇪', minLength: 10, maxLength: 10 },
  '593': { country: 'Ecuador', flag: '🇪🇨', minLength: 9, maxLength: 9 },
  
  // Europa
  '34': { country: 'España', flag: '🇪🇸', minLength: 9, maxLength: 9 },
  '33': { country: 'Francia', flag: '🇫🇷', minLength: 10, maxLength: 10 },
  '49': { country: 'Alemania', flag: '🇩🇪', minLength: 10, maxLength: 12 },
  '44': { country: 'Reino Unido', flag: '🇬🇧', minLength: 10, maxLength: 10 },
  '39': { country: 'Italia', flag: '🇮🇹', minLength: 9, maxLength: 10 },
  
  // Asia
  '86': { country: 'China', flag: '🇨🇳', minLength: 11, maxLength: 11 },
  '91': { country: 'India', flag: '🇮🇳', minLength: 10, maxLength: 10 },
  '81': { country: 'Japón', flag: '🇯🇵', minLength: 10, maxLength: 11 },
  '82': { country: 'Corea del Sur', flag: '🇰🇷', minLength: 10, maxLength: 11 },
  
  // Otros
  '61': { country: 'Australia', flag: '🇦🇺', minLength: 9, maxLength: 9 },
  '27': { country: 'Sudáfrica', flag: '🇿🇦', minLength: 9, maxLength: 9 }
};

/**
 * Limpia un número de teléfono removiendo caracteres no numéricos
 */
export function cleanPhoneNumber(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Formatea un número de teléfono para mostrar
 */
export function formatPhoneNumber(phone) {
  const cleaned = cleanPhoneNumber(phone);
  if (!cleaned) return '';
  
  // Asegurar que tenga el signo +
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

/**
 * Detecta el código de país de un número
 */
export function detectCountryCode(phone) {
  const cleaned = cleanPhoneNumber(phone);
  if (!cleaned || cleaned.length < 6) return null;
  
  // Intentar códigos de país por longitud (del más largo al más corto)
  const codes = Object.keys(COUNTRY_CODES).sort((a, b) => b.length - a.length);
  
  for (const code of codes) {
    if (cleaned.startsWith(code)) {
      const nationalNumber = cleaned.substring(code.length);
      const countryInfo = COUNTRY_CODES[code];
      
      // Verificar que el número nacional tenga la longitud correcta
      if (nationalNumber.length >= countryInfo.minLength && 
          nationalNumber.length <= countryInfo.maxLength) {
        return {
          code,
          country: countryInfo.country,
          flag: countryInfo.flag,
          nationalNumber,
          fullNumber: cleaned,
          formatted: `+${code} ${nationalNumber}`
        };
      }
    }
  }
  
  return null;
}

/**
 * Valida un número de teléfono
 */
export function validatePhoneNumber(phone) {
  const cleaned = cleanPhoneNumber(phone);
  
  // Validaciones básicas
  if (!cleaned || cleaned.length < 6 || cleaned.length > 15) {
    return {
      isValid: false,
      error: 'El número debe tener entre 6 y 15 dígitos',
      cleaned
    };
  }
  
  // Intentar detectar el código de país
  const countryInfo = detectCountryCode(cleaned);
  
  if (!countryInfo) {
    // Si no se detecta un código de país conocido, validar formato básico
    if (cleaned.length >= 8 && cleaned.length <= 15) {
      return {
        isValid: true,
        cleaned,
        formatted: `+${cleaned}`,
        warning: 'Código de país no reconocido, pero formato válido'
      };
    } else {
      return {
        isValid: false,
        error: 'Formato de número no válido',
        cleaned
      };
    }
  }
  
  return {
    isValid: true,
    cleaned,
    formatted: countryInfo.formatted,
    country: countryInfo.country,
    flag: countryInfo.flag,
    countryCode: countryInfo.code,
    nationalNumber: countryInfo.nationalNumber
  };
}

/**
 * Valida múltiples números de teléfono
 */
export function validatePhoneNumbers(phoneText) {
  if (!phoneText || !phoneText.trim()) {
    return {
      isValid: false,
      numbers: [],
      errors: ['No se proporcionaron números de teléfono']
    };
  }
  
  // Separar números por comas, saltos de línea o espacios
  const rawNumbers = phoneText
    .split(/[\n,\s]+/)
    .map(n => n.trim())
    .filter(n => n.length > 0);
  
  if (rawNumbers.length === 0) {
    return {
      isValid: false,
      numbers: [],
      errors: ['No se encontraron números válidos']
    };
  }
  
  const results = rawNumbers.map((phone, index) => {
    const validation = validatePhoneNumber(phone);
    return {
      index: index + 1,
      original: phone,
      ...validation
    };
  });
  
  const validNumbers = results.filter(r => r.isValid);
  const invalidNumbers = results.filter(r => !r.isValid);
  const duplicates = [];
  
  // Detectar duplicados
  const seen = new Set();
  validNumbers.forEach(num => {
    if (seen.has(num.cleaned)) {
      duplicates.push(num);
    } else {
      seen.add(num.cleaned);
    }
  });
  
  const uniqueValidNumbers = validNumbers.filter(num => 
    !duplicates.some(dup => dup.cleaned === num.cleaned && dup.index > num.index)
  );
  
  const errors = [
    ...invalidNumbers.map(n => `Línea ${n.index}: ${n.error} (${n.original})`),
    ...duplicates.map(n => `Línea ${n.index}: Número duplicado (${n.original})`)
  ];
  
  const warnings = validNumbers
    .filter(n => n.warning)
    .map(n => `Línea ${n.index}: ${n.warning} (${n.original})`);
  
  return {
    isValid: uniqueValidNumbers.length > 0,
    numbers: uniqueValidNumbers,
    totalCount: rawNumbers.length,
    validCount: uniqueValidNumbers.length,
    invalidCount: invalidNumbers.length,
    duplicateCount: duplicates.length,
    errors,
    warnings,
    countries: [...new Set(uniqueValidNumbers.map(n => n.country).filter(Boolean))]
  };
}

/**
 * Genera sugerencias para números inválidos
 */
export function getPhoneNumberSuggestions(phone) {
  const cleaned = cleanPhoneNumber(phone);
  const suggestions = [];
  
  if (!cleaned) {
    suggestions.push('Ingresa solo números');
    return suggestions;
  }
  
  if (cleaned.length < 6) {
    suggestions.push('El número es muy corto (mínimo 6 dígitos)');
    suggestions.push('Asegúrate de incluir el código de país');
  } else if (cleaned.length > 15) {
    suggestions.push('El número es muy largo (máximo 15 dígitos)');
    suggestions.push('Verifica que no tengas dígitos extra');
  }
  
  // Sugerir códigos de país comunes si no se detectó uno
  if (!detectCountryCode(cleaned)) {
    suggestions.push('Ejemplos de formato correcto:');
    suggestions.push('• Perú: +51987654321');
    suggestions.push('• México: +52155123456');
    suggestions.push('• España: +34612345678');
    suggestions.push('• Estados Unidos: +1234567890');
  }
  
  return suggestions;
}

/**
 * Convierte números de formato local a internacional
 */
export function convertToInternational(phone, defaultCountryCode = '51') {
  const cleaned = cleanPhoneNumber(phone);
  if (!cleaned) return '';
  
  // Si ya tiene código de país, devolverlo como está
  if (detectCountryCode(cleaned)) {
    return `+${cleaned}`;
  }
  
  // Si parece ser un número local, agregar el código de país por defecto
  const countryInfo = COUNTRY_CODES[defaultCountryCode];
  if (countryInfo && 
      cleaned.length >= countryInfo.minLength && 
      cleaned.length <= countryInfo.maxLength) {
    return `+${defaultCountryCode}${cleaned}`;
  }
  
  // Si no coincide con el formato esperado, devolver con código por defecto
  return `+${defaultCountryCode}${cleaned}`;
}

/**
 * Obtiene estadísticas de una lista de números
 */
export function getPhoneNumberStats(phoneText) {
  const validation = validatePhoneNumbers(phoneText);
  
  if (!validation.isValid) {
    return {
      total: 0,
      valid: 0,
      invalid: 0,
      countries: [],
      duplicates: 0
    };
  }
  
  const countryStats = {};
  validation.numbers.forEach(num => {
    if (num.country) {
      countryStats[num.country] = (countryStats[num.country] || 0) + 1;
    }
  });
  
  return {
    total: validation.totalCount,
    valid: validation.validCount,
    invalid: validation.invalidCount,
    duplicates: validation.duplicateCount,
    countries: Object.entries(countryStats).map(([country, count]) => ({
      country,
      count,
      flag: validation.numbers.find(n => n.country === country)?.flag || '🌐'
    }))
  };
}