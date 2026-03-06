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

async function seed() {
  await dataSource.initialize();
  const userRepo = dataSource.getRepository(User);
  const roleRepo = dataSource.getRepository(Role);

  let admin = await userRepo.findOne({ where: { email: 'admin@church.com' } });
  if (!admin) {
    const passwordHash = await bcrypt.hash('Admin123', 10);
    const adminRole = await roleRepo.findOne({ where: { name: RoleName.ADMIN } });
    const superAdminRole = await roleRepo.findOne({ where: { name: RoleName.SUPER_ADMIN } });

    admin = userRepo.create({
      email: 'admin@church.com',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      accountStatus: AccountStatus.APPROVED,
      roles: [adminRole!, superAdminRole!],
    });
    await userRepo.save(admin);
    console.log('Admin user created:', admin.id);
  } else {
    console.log('Admin user already exists:', admin.id);
  }

  await dataSource.destroy();
}

seed().catch(console.error);
