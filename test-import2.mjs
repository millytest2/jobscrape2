import { getLimitedRoleVariations } from './shared/roleVariations.js';
console.log('[TEST] Import works!', typeof getLimitedRoleVariations);
const result = getLimitedRoleVariations('Sales Engineer', 3);
console.log('[TEST] Result:', result);
