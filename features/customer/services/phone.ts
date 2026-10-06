// Numéro tunisien réel : 8 chiffres, premier chiffre 2, 3, 4, 5, 7 ou 9 (mobiles Ooredoo, Orange, Tunisie Telecom, Lyca et fixes).
export const TUNISIAN_PHONE_PATTERN='[234579][0-9]{7}';
const TUNISIAN_PHONE=new RegExp('^'+TUNISIAN_PHONE_PATTERN+'$');
export const TUNISIAN_PHONE_ERROR='Indiquez un numéro tunisien valide : 8 chiffres commençant par 2, 3, 4, 5, 7 ou 9.';
export function normalizeTunisianPhone(phone:string){return (phone||'').replace(/[\s.-]/g,'').replace(/^(\+|00)?216(?=[0-9]{8}$)/,'')}
export function isTunisianPhone(phone:string){return TUNISIAN_PHONE.test(normalizeTunisianPhone(phone))}
