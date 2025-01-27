import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import 'dotenv/config';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT && parseInt(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [process.cwd() + '/dist/**/*.entity{.ts,.js}'],
  synchronize: false,
};
console.log('All env vars:', process.env);
console.log('Database user:', process.env.DATABASE_USER);
console.log('Env file path:', process.cwd());
