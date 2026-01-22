import { SetMetadata } from '@nestjs/common';

export const HYDRATE_USER_KEY = 'hydrateUser';
export const HydrateUser = () => SetMetadata(HYDRATE_USER_KEY, true);