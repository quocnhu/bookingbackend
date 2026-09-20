import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PROVIDER_ROLE_PERMISSIONS = [
  'assignment.read',
  'assignment.create',
  'vehicle.create',
  'vehicle.update',
  'vehicle.delete',
  'driver.create',
  'driver.update',
  'route-price.create',
  'route-price.update',
];

async function main() {
  const role = await prisma.role.upsert({
    where: { name: 'TRANSPORT_PROVIDER' },
    update: { description: 'Đối tác vận chuyển — quản lý xe & tài xế của chính nhà xe' },
    create: {
      name: 'TRANSPORT_PROVIDER',
      description: 'Đối tác vận chuyển — quản lý xe & tài xế của chính nhà xe',
      isSystem: false,
    },
  });

  const permissions = await prisma.permission.findMany({
    where: { code: { in: PROVIDER_ROLE_PERMISSIONS } },
  });
  const ids = new Map(permissions.map((p) => [p.code, p.id]));
  const missing = PROVIDER_ROLE_PERMISSIONS.filter((c) => !ids.has(c));
  if (missing.length) {
    console.log(`⚠️ Missing permissions (run seed-service-perms first): ${missing.join(', ')}`);
  }

  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
  await prisma.rolePermission.createMany({
    data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
  });

  const providerUsers = await prisma.user.findMany({
    where: { role: 'TRANSPORT_PROVIDER', providerId: { not: null } },
    select: { id: true },
  });
  await prisma.userRole.createMany({
    data: providerUsers.map((u) => ({ userId: u.id, roleId: role.id })),
    skipDuplicates: true,
  });

  console.log(
    `✅ TRANSPORT_PROVIDER role: ${permissions.length} permissions, bound to ${providerUsers.length} provider accounts (permissions: ${permissions.map((p) => p.code).join(', ')})`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());