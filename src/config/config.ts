export const config = {
    SECRET_KEY: 'licenta2021',
    DATABASE_STRING: 'mysql://root:12345678@localhost:3306/bachelor',
    MAKE_DELAY: true,
    PORT: 3000,
    WEBSITE_URL: "http://localhost:4200",
    mailer: {  
        host: '0.0.0.0', // mailhog
        port: 1025
    }
}