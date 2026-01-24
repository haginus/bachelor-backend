
import { User } from "src/users/entities/user.entity";

export const mockUser: User = {
  id: 1,
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  type: "admin",
} satisfies Partial<User> as any;

export const mailContexts = {
  "welcome": {
    user: mockUser,
    url: "",
  },
};