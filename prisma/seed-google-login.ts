import { PrismaClient, AuthProvider, RoleType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed users the same way auth.service.ts googleLogin() creates them:
 * authProvider=GOOGLE, role=CUSTOMER, userType=customer, no RBAC permissions
 * (providerId stays null — it is a TransportationProvider FK, not a Google id).
 *
 * Use to verify: Users table Provider column = Google, Role = CUSTOMER,
 * and the customer only sees public/fundamental pages after login.
 */
async function main() {
  // Real Google account first — sign in with it and the row already exists.
  const users = [
    { email: 'nquocnhu95it@gmail.com', name: 'Nhu (Google Customer)' },
    { email: 'google.customer@demo.local', name: 'Google Demo Customer' },
    { email: 'google.customer2@demo.local', name: 'Google Demo Customer 2' },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        authProvider: AuthProvider.GOOGLE,
        role: RoleType.CUSTOMER,
        userType: 'customer',
        isActive: true,
      },
      create: {
        email: u.email,
        name: u.name,
        authProvider: AuthProvider.GOOGLE,
        role: RoleType.CUSTOMER,
        userType: 'customer',
      },
    });
    console.log(`✅ ${user.email} · role=${user.role} · provider=${user.authProvider}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
