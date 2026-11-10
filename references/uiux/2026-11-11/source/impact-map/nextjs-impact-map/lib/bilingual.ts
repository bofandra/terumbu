/** A bilingual string / value. Indonesian is the source language, English is translated from it. Safe to import from server and client code. */
export type L<V = string> = { id: V; en: V };
export const T = (id: string, en: string): L => ({ id, en });
