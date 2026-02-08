import { Controller, Get } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { UserTypes } from '../auth/decorators/user-types.decorator';
import { UserType } from '../lib/enums/user-type.enum';

@Controller('statistics')
@UserTypes([UserType.Admin, UserType.Secretary])
export class StatisticsController {

  constructor(
    private readonly statisticsService: StatisticsService,
  ) {}

  @Get()
  find() {
    return this.statisticsService.find();
  }
}
