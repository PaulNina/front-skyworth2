/**
 * Validates Bolivian mobile phone numbers
 * Requirements:
 * - Must be exactly 8 digits
 * - Must start with 6 or 7
 *
 * @param phone - Phone number string to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export const validateBolivianPhone = (
  phone: string,
): { isValid: boolean; error?: string } => {
  // Remove any spaces or dashes
  const cleaned = phone.replace(/[\s-]/g, "");

  // Check if it's exactly 8 digits
  if (!/^\d{8}$/.test(cleaned)) {
    return {
      isValid: false,
      error: "El número debe tener exactamente 8 dígitos",
    };
  }

  // Check if it starts with 6 or 7
  if (!/^[67]/.test(cleaned)) {
    return {
      isValid: false,
      error: "El número debe comenzar con 6 o 7",
    };
  }

  return { isValid: true };
};

/**
 * Formats the error message for phone validation
 * @param phone - Phone number that failed validation
 * @returns Formatted error message
 */
export const getPhoneValidationMessage = (phone: string): string => {
  const validation = validateBolivianPhone(phone);
  if (validation.isValid) return "";
  return validation.error || "Número de teléfono inválido";
};
