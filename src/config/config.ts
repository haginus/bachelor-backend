import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
export const config = {
    SECRET_KEY: process.env.SECRET_KEY,
    DATABASE_STRING: `mysql://${process.env.MYSQL_USER}:${process.env.MYSQL_PASSWORD}@${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT}/${process.env.MYSQL_DATABASE}`,
    MAKE_DELAY: process.env.MAKE_DELAY,
    PORT: process.env.PORT || "3000",
    WEBSITE_URL: process.env.WEBSITE_URL,
    COMPRESSION_LEVEL: Number(process.env.COMPRESSION_LEVEL) || 0,
    DISABLE_SEQUELIZE_LOGGING: process.env.DISABLE_SEQUELIZE_LOGGING === 'true',
    mailerConfig: {  
        host: process.env.MAILER_HOST,
        port: process.env.MAILER_PORT,
        auth: !process.env.MAILER_USER ? null : {
            user: process.env.MAILER_USER,
            pass: process.env.MAILER_PASSWORD
        }
    },
    mailerOptions: {
        from: process.env.MAILER_FROM_ADDRESS
    },
    PROJECT_ROOT: path.join(__dirname, '..', '..')
}