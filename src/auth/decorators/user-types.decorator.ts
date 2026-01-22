import { SetMetadata } from '@nestjs/common';
import { UserType } from 'src/lib/enums/user-type.enum';

export const USER_TYPES_KEY = 'user_types';
export const UserTypes = (userTypes: UserType | UserType[]) => SetMetadata(USER_TYPES_KEY, userTypes instanceof Array ? userTypes : [userTypes]);