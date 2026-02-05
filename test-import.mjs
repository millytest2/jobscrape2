import { getLimitedRoleVariations } from '@shared/roleVariations';
console.log('Import works!', typeof getLimitedRoleVariations);
console.log('Result:', getLimitedRoleVariations('Sales Engineer', 3));
