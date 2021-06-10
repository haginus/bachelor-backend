const prompt = require('prompt');
const bcrypt = require('bcrypt');
const util = require('./util');

var lastEnteredPassowrd = '';

const properties = [
    {
        name: 'firstName',
        validator: /^[a-zA-Z\s\-]+$/,
        required: true,
        warning: 'First name must be only letters, spaces, or dashes',
    },
    {
        name: 'lastName',
        validator: /^[a-zA-Z\s\-]+$/,
        required: true,
        warning: 'Last name must be only letters, spaces, or dashes',
    },
    {
        name: 'email',
        validator: /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/,
        required: true,
        warning: 'Email format is incorrect.',
    },
    {
        name: 'password',
        hidden: true,
        required: true,
        conform: function (value) {
            lastEnteredPassowrd = value;
            return value.length >= 8;
        },
        warning: 'Password must be at least 8 characters long.',
        before: function(value) {
            const salt = bcrypt.genSaltSync();
            return bcrypt.hashSync(value, salt);
        }
    },
    {
        name: 'passwordConfirm',
        hidden: true,
        conform: function (value) {
            return value === lastEnteredPassowrd;
        },
        warning: "Passwords don't match.",
    }
];

util.connection.on('error', () => {
    console.log('Unable to connect to database.');
});    

util.connection.on('connect', () => {
    prompt.start();
    prompt.get(properties, async function (err, result) {
        if (err) { return onErr(err); }
        const { firstName, lastName, email, password } = result;

        util.connection
            .execute("INSERT INTO users (firstName, lastName, email, password, validated, type) VALUES (?, ?, ?, ?, 1, 'admin');",
                [firstName, lastName, email, password])
                .on('result', () => {
                    console.log('Admin added successfully.')
                    util.connection.end();
                })
                .on('error', (err) => {
                    if(err.code === 'ER_DUP_ENTRY') {
                        console.log('A user with this email aready exists.');
                    } else if(err.code === 'ER_NO_SUCH_TABLE') {
                        console.log('Users table does not exist. Make sure you ran the server for the first time!');
                    } else {
                        console.log('An unknown error occured: ', err);
                    }
                    util.connection.end();
                });
    });
});

const onErr = (err) => {
    if (err.message == 'canceled') {
        console.log('\nAdmin add was canceled.');
    } else {
        console.log('\nAn error occured.');
    }
    util.connection.end();
}