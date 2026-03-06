import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/entities/role.entity';
import { RoleName } from '../users/entities/role.enum';
import { AccountStatus } from '../users/entities/account-status.enum';
import * as bcrypt from 'bcrypt';

const dataSource = new DataSource({
  type: 'postgres',
  host: 'ep-nameless-darkness-ai4j582e-pooler.c-4.us-east-1.aws.neon.tech',
  port: 5432,
  username: 'neondb_owner',
  password: process.env.NEON_DB_PASSWORD,
  database: 'neondb',
  ssl: { rejectUnauthorized: false },
  entities: [User, Role],
  synchronize: false,
});

async function seed() {
  await dataSource.initialize();
  const userRepo = dataSource.getRepository(User);
  const roleRepo = dataSource.getRepository(Role);

  // Step 1: Seed all roles
  for (const roleName of Object.values(RoleName)) {
    const exists = await roleRepo.findOne({ where: { name: roleName } });
    if (!exists) {
      await roleRepo.save(roleRepo.create({ name: roleName }));
      console.log(`Created role: ${roleName}`);
    }
  }

  // Step 2: Create/update bypass account with all roles
  const email = 'test@test';

  const allRoles: Role[] = [];
  for (const roleName of Object.values(RoleName)) {
    const role = await roleRepo.findOne({ where: { name: roleName } });
    if (role) allRoles.push(role);
  }
  console.log(`Found ${allRoles.length} roles`);

  let user = await userRepo.findOne({ where: { email }, relations: ['roles'] });

  if (user) {
    user.roles = allRoles;
    user.accountStatus = AccountStatus.APPROVED;
    await userRepo.save(user);
    console.log(`Updated: ${email} — now has all ${allRoles.length} roles`);
  } else {
    const passwordHash = await bcrypt.hash('123', 10);
    user = userRepo.create({
      email,
      passwordHash,
      firstName: 'Master',
      lastName: 'Account',
      accountStatus: AccountStatus.APPROVED,
      roles: allRoles,
    });
    await userRepo.save(user);
    console.log(`Created: ${email} with all ${allRoles.length} roles`);
  }

  await dataSource.destroy();
  console.log('Done!');
}

seed().catch(console.error);
