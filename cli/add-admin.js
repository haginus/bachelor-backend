const prompt = require('prompt');
const { User } = require('../build/models/models');

const properties = [
    {
        name: 'firstName',
        validator: /^[a-zA-Z\s\-]+$/,
        warning: 'First name must be only letters, spaces, or dashes',
    },
    {
        name: 'lastName',
        validator: /^[a-zA-Z\s\-]+$/,
        warning: 'Last name must be only letters, spaces, or dashes',
    },
    {
        name: 'email',
        validator: /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/,
        warning: 'Email format is incorrect.',
    },
    {
        name: 'password',
        hidden: true
    },
    {
        name: 'passwordConfirm',
        hidden: true
    }
];

prompt.start();

prompt.get(properties, async function (err, result) {
    if (err) { return onErr(err); }
    if(result.password != result.passwordConfirm) {
        return console.log("Passwords don't match.");
    }
    const { firstName, lastName, email, password } = result;
    let user = { type: 'admin', firstName, lastName, email, password };
    console.log('Inserting...');
    await User.create(user);
    console.log('Done.');
});

const onErr = (err) => {
    if(err.message == 'canceled') {
        console.log('Admin add was canceled.');
    } else {
        console.log('An error occured.');
    }
}