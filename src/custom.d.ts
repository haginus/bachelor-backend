import { User } from './models/models'

declare global {
   namespace Express {
      interface Request {
         _user: User;
         _impersonatedBy?: number;
         _sudo?: boolean;
      }
   }
}