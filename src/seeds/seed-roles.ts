import { DataSource } from 'typeorm';
import { Role } from '../users/entities/role.entity';
import { RoleName } from '../users/entities/role.enum';
import { config } from 'dotenv';

config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Role],
  synchronize: false,
});

async function seed() {
  await dataSource.initialize();
  const roleRepo = dataSource.getRepository(Role);

  for (const roleName of Object.values(RoleName)) {
    const exists = await roleRepo.findOne({ where: { name: roleName } });
    if (!exists) {
      await roleRepo.save(roleRepo.create({ name: roleName }));
      console.log(`Created role: ${roleName}`);
    }
  }

  console.log('Seeding complete');
  await dataSource.destroy();
}

seed().catch(console.error);
