import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NEW_PERMISSIONS = [
  { code: 'coordinate.create', name: 'Tạo coordinate', group: 'Coordinate' },
  { code: 'coordinate.update', name: 'Sửa coordinate', group: 'Coordinate' },
  { code: 'coordinate.delete', name: 'Xoá coordinate', group: 'Coordinate' },
  { code: 'route-price.create', name: 'Tạo route price', group: 'Route Price' },
  { code: 'route-price.update', name: 'Sửa route price', group: 'Route Price' },
  { code: 'route-price.delete', name: 'Xoá route price', group: 'Route Price' },
  { code: 'vehicle.create', name: 'Tạo xe (provider)', group: 'Vehicle' },
  { code: 'vehicle.update', name: 'Sửa xe (provider)', group: 'Vehicle' },
  { code: 'vehicle.delete', name: 'Xoá xe (provider)', group: 'Vehicle' },
  { code: 'provider.create', name: 'Tạo transportation provider', group: 'Provider' },
  { code: 'driver.create', name: 'Tạo tài xế', group: 'Provider Driver' },
  { code: 'driver.update', name: 'Sửa tài xế', group: 'Provider Driver' },
  { code: 'provider-driver.assign', name: 'Gán tài xế vào provider', group: 'Provider Driver' },
  { code: 'provider-driver.unassign', name: 'Gỡ tài xế khỏi provider', group: 'Provider Driver' },
];

async function main() {
  const permissionIds: string[] = [];
  for (const p of NEW_PERMISSIONS) {
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
    console.log(`✅ Granted ${permissionIds.length} permissions to ADMIN`);
  } else {
    console.log('⚠️ ADMIN role not found');
  }
}

main().finally(() => prisma.$disconnect());
