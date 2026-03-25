import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

import { PrismaClient, Role } from '../src/generated/prisma/client';

type SeedUserDefinition = Readonly<{
  email: string;
  password: string;
  role: Role;
}>;

const DEFAULT_PASSWORD_SALT_ROUNDS = 12;

const INITIAL_USERS: readonly SeedUserDefinition[] = [
  {
    email: 'admin@smartops.com',
    password: '12345678',
    role: Role.ADMIN,
  },
  {
    email: 'chef@smartops.com',
    password: '12345678',
    role: Role.CHEF,
  },
  {
    email: 'manager@smartops.com',
    password: '12345678',
    role: Role.MANAGER,
  },
];

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

function normalizeEmail(email: string) {
  return String(email || '').trim().toLowerCase();
}

function getPasswordSaltRounds() {
  const parsedValue = Number(process.env.PASSWORD_SALT_ROUNDS);

  if (Number.isInteger(parsedValue) && parsedValue > 0) {
    return parsedValue;
  }

  return DEFAULT_PASSWORD_SALT_ROUNDS;
}

async function ensureUser(seedUser: SeedUserDefinition) {
  const normalizedEmail = normalizeEmail(seedUser.email);
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    const isPasswordValid = await bcrypt.compare(
      seedUser.password,
      existingUser.password,
    );

    if (existingUser.role === seedUser.role && isPasswordValid) {
      return {
        email: existingUser.email,
        role: existingUser.role,
        action: 'unchanged' as const,
      };
    }

    const hashedPassword = isPasswordValid
      ? existingUser.password
      : await bcrypt.hash(seedUser.password, getPasswordSaltRounds());
    const updatedUser = await prisma.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        password: hashedPassword,
        role: seedUser.role,
      },
      select: {
        email: true,
        role: true,
      },
    });

    return {
      email: updatedUser.email,
      role: updatedUser.role,
      action: 'updated' as const,
    };
  }

  const hashedPassword = await bcrypt.hash(
    seedUser.password,
    getPasswordSaltRounds(),
  );

  const createdUser = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: hashedPassword,
      role: seedUser.role,
    },
    select: {
      email: true,
      role: true,
    },
  });

  return {
    email: createdUser.email,
    role: createdUser.role,
    action: 'created' as const,
  };
}

async function main() {
  for (const seedUser of INITIAL_USERS) {
    const result = await ensureUser(seedUser);

    console.log(`Seed user ${result.action}: ${result.email} (${result.role}).`);
  }
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Failed to run seed.';

    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
