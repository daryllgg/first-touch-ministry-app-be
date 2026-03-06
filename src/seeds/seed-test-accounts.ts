import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/entities/role.entity';
import { RoleName } from '../users/entities/role.enum';
import { AccountStatus } from '../users/entities/account-status.enum';
import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';

config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [User, Role],
  synchronize: false,
});

const accounts = [
  { email: 'admin@ftm.com', firstName: 'Super', lastName: 'Admin', roles: [RoleName.ADMIN, RoleName.SUPER_ADMIN] },
  { email: 'pastor@ftm.com', firstName: 'John', lastName: 'Pastor', roles: [RoleName.PASTOR] },
  { email: 'worship.leader@ftm.com', firstName: 'Mary', lastName: 'Santos', roles: [RoleName.WORSHIP_LEADER] },
  { email: 'worship.head@ftm.com', firstName: 'James', lastName: 'Cruz', roles: [RoleName.WORSHIP_TEAM_HEAD] },
  { email: 'guitarist@ftm.com', firstName: 'Peter', lastName: 'Reyes', roles: [RoleName.GUITARIST] },
  { email: 'keyboardist@ftm.com', firstName: 'Anna', lastName: 'Garcia', roles: [RoleName.KEYBOARDIST] },
  { email: 'drummer@ftm.com', firstName: 'Mark', lastName: 'Lopez', roles: [RoleName.DRUMMER] },
  { email: 'bassist@ftm.com', firstName: 'Luke', lastName: 'Torres', roles: [RoleName.BASSIST] },
  { email: 'singer@ftm.com', firstName: 'Grace', lastName: 'Rivera', roles: [RoleName.SINGER] },
  { email: 'leader@ftm.com', firstName: 'David', lastName: 'Mendoza', roles: [RoleName.LEADER] },
  { email: 'outreach@ftm.com', firstName: 'Ruth', lastName: 'Flores', roles: [RoleName.OUTREACH_WORKER] },
  { email: 'user@ftm.com', firstName: 'Normal', lastName: 'User', roles: [RoleName.NORMAL_USER] },
];

async function seed() {
  await dataSource.initialize();
  const userRepo = dataSource.getRepository(User);
  const roleRepo = dataSource.getRepository(Role);

  const passwordHash = await bcrypt.hash('Test1234', 10);

  for (const account of accounts) {
    let user = await userRepo.findOne({ where: { email: account.email } });
    if (user) {
      console.log(`Already exists: ${account.email}`);
      continue;
    }

    const roles: Role[] = [];
    for (const roleName of account.roles) {
      const role = await roleRepo.findOne({ where: { name: roleName } });
      if (role) roles.push(role);
    }

    user = userRepo.create({
      email: account.email,
      passwordHash,
      firstName: account.firstName,
      lastName: account.lastName,
      accountStatus: AccountStatus.APPROVED,
      roles,
    });
    await userRepo.save(user);
    console.log(`Created: ${account.email} [${account.roles.join(', ')}]`);
  }

  await dataSource.destroy();
  console.log('\nDone! All test accounts seeded.');
}

seed().catch(console.error);
