import "reflect-metadata";
import prompt from "prompt";
import bcrypt from "bcrypt";
import { AppDataSource } from "../data-source";
import { User } from "../users/entities/user.entity";

let lastEnteredPassword = '';

const properties: prompt.Schema = {
  properties: {
    firstName: {
      required: true,
      pattern: /^[\w\s\-]+$/u,
      message: "First name must be only letters, spaces, or dashes",
    },
    lastName: {
      required: true,
      pattern: /^[\w\s\-]+$/u,
      message: "Last name must be only letters, spaces, or dashes",
    },
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "Email format is incorrect.",
    },
    password: {
      hidden: true,
      required: true,
      conform: (value: string) => {
        lastEnteredPassword = value;
        return value.length >= 8;
      },
      message: "Password must be at least 8 characters long.",
    },
    passwordConfirm: {
      hidden: true,
      required: true,
      conform: (value: string) => value === lastEnteredPassword,
      message: "Passwords don't match.",
    },
  },
}

async function createAdmin() {
  try {
    await AppDataSource.initialize();
    console.log("Connected to the database.");

    prompt.start();

    prompt.get(properties, async (err, result) => {
      if (err) {
        console.log("\nAdmin creation canceled.");
        process.exit(0);
      }

      const { firstName, lastName, email, password } = result as any;

      const userRepository = AppDataSource.getRepository(User);

      // Check if user exists
      const existing = await userRepository.findOne({
        where: { email },
      });

      if (existing) {
        console.log("A user with this email already exists.");
        process.exit(1);
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const admin = userRepository.create({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        validated: true,
        type: "admin",
      });

      await userRepository.save(admin);

      console.log("Admin added successfully.");
      process.exit(0);
    });
  } catch (error: any) {
    console.error("An error occurred:", error.message);
    process.exit(1);
  }
}

createAdmin();