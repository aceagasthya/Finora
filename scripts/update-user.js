import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 10);
  const updated = await prisma.user.updateMany({
    where: { email: 'ace.agasthya@gmail.com' },
    data: {
      password: hash,
      name: 'Agasthya',
      virtualUsdcBalance: '1240.50',
      virtualInrBalance: '12850.00',
      usdcDepositAddress: '0x3A7F4e9D2b8C6f1E0a9D5c3B7e8F2A1d4C6E9B0F',
      inrUpiId: 'agasthya@finora',
      kycStatus: 'verified',
    },
  });
  console.log('Updated user records count:', updated.count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
