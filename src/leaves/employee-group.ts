export const EMPLOYEE_GROUPS = [
  'COMPANY_GUIDE',
  'FREELANCE_GUIDE',
  'COMPANY_DRIVER',
  'FREELANCE_DRIVER',
  'PROVIDER_STAFF',
  'PROVIDER_ACCOUNT',
  'OFFICE',
  'ADMIN',
  'CUSTOMER',
] as const;

export type EmployeeGroup = (typeof EMPLOYEE_GROUPS)[number];
