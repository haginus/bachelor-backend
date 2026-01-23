import { SetMetadata } from '@nestjs/common';

export const SUDO_KEY = 'sudo';
export const Sudo = () => SetMetadata(SUDO_KEY, true);