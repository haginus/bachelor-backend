import dotenv from 'dotenv';
if(!process.env.PRODUCTION) {
    dotenv.config();
}

export const config = {
    SECRET_KEY: process.env.SECRET_KEY,
    DATABASE_STRING: `mysql://${process.env.MYSQL_USER}:${process.env.MYSQL_PASSWORD}@${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT}/${process.env.MYSQL_DATABASE}`,
    MAKE_DELAY: process.env.MAKE_DELAY,
    PORT: process.env.PORT,
    WEBSITE_URL: process.env.WEBSITE_URL,
    mailer: {  
        host: process.env.MAILER_HOST,
        port: process.env.MAILER_PORT,
        auth: !process.env.MAILER_USER ? null : {
            user: process.env.MAILER_USER,
            password: process.env.MAILER_PASSWORD
        }
    }
}