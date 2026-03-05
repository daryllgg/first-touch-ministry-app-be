import { DataSource } from 'typeorm';
import { InstrumentRole } from '../worship-lineups/entities/instrument-role.entity';
import { config } from 'dotenv';

config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [InstrumentRole],
  synchronize: false,
});

const defaults = [
  { name: 'Singer', orderIndex: 0 },
  { name: 'Drummer', orderIndex: 1 },
  { name: 'Bassist', orderIndex: 2 },
  { name: 'Acoustic Guitarist', orderIndex: 3 },
  { name: 'Electric Guitarist', orderIndex: 4 },
  { name: 'Rhythm Guitarist', orderIndex: 5 },
  { name: 'Keyboardist', orderIndex: 6 },
  { name: 'Sustain Piano', orderIndex: 7 },
  { name: 'Others', orderIndex: 8 },
];

async function seed() {
  await dataSource.initialize();
  const repo = dataSource.getRepository(InstrumentRole);

  for (const role of defaults) {
    const exists = await repo.findOne({ where: { name: role.name } });
    if (exists) {
      console.log(`Already exists: ${role.name}`);
      continue;
    }
    const entity = repo.create({ ...role, isDefault: true });
    await repo.save(entity);
    console.log(`Created: ${role.name}`);
  }

  await dataSource.destroy();
  console.log('\nDone! Instrument roles seeded.');
}

seed().catch(console.error);
