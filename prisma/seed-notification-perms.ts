import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NOTIFICATION_PERMISSIONS = [
  { code: 'notification.send', name: 'Gửi thông báo (nhóm role / cá nhân)', group: 'Notification' },
];

async function main() {
  const permissionIds: string[] = [];
  for (const p of NOTIFICATION_PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, group: p.group },
      create: p,
    });
    permissionIds.push(created.id);
  }

  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  if (adminRole) {
    await prisma.rolePermission.deleteMany({
      where: { roleId: adminRole.id, permissionId: { in: permissionIds } },
    });
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId: adminRole.id, permissionId })),
    });
    console.log(`✅ Granted ${NOTIFICATION_PERMISSIONS.map((p) => p.code).join(', ')} to ADMIN`);
  } else {
    console.log('⚠️ ADMIN role not found');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());