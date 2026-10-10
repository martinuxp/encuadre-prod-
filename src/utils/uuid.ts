// ═══════════════════════════════════════════════════════
// Encuadre Prod. — UUID Utility
// Generador simple de UUID v4 compatible con Web/Nativo
// ═══════════════════════════════════════════════════════

export function uuidv4(): string {
  // En navegadores web podemos usar crypto.randomUUID()
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }

  // Fallback rápido y robusto compatible con React Native
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
