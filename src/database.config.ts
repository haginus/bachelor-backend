import './load-env';
export const databaseConfig = {
  type: 'mysql' as const,
  host: process.env.DATABASE_HOST!,
  port: process.env.DATABASE_PORT ? parseInt(process.env.DATABASE_PORT) : 3306,
  username: process.env.DATABASE_USERNAME!,
  password: process.env.DATABASE_PASSWORD!,
  database: process.env.DATABASE_NAME!,
};