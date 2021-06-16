# Bachelor backend

This is my bachelor project, a web platform made specially for the Faculty of Mathematics and Computer Science of the University of Bucharest. It features a way for students to find the coordinating teachers that will help them write the end of study paper. It also allows students and teachers to upload the sign up documents, including the generation of some of these documents. Evaluation committees can then grade the papers and generate the committee catalogs.

This is the backend app, made with Node.js, written in TypeScript. It uses Express to expose an HTTP API that's used to communicate with the frontend app.

[Check out the frontend app here](https://github.com/haginus/bachelor)

## Configuration

Clone this project, then then copy the `.env.example` into `.env`:
```
cp .env.example .env
```
After this, open the `.env` file and edit the environment variables to match the database you're connecting to and the mail server. Also, change the secret key.

## Running the app

Run `npm run start:dev` to run the app in development mode.

## Build the app

Run `npm run build` to build the app. Then, you can run it in production by exporting the `NODE_ENV=production`
environment variable in your bash and running `npm run start`.

## Docker integration
This app contains a docker-compose file that allows setting up a network that includes the backend app and a MySQL database server.

Assuming you have Docker installed, you can run `docker-compose up` to build and start the network.

## Adding admins
After, you ran the app for the first time, you can use a CLI command to add new admin users.
Open a new terminal and run `npm run addAdmin` and follow the steps.
If you're using Docker, run `docker-compose exec bachelor-backend bash` in order to open a new terminal session in the backend app container.
