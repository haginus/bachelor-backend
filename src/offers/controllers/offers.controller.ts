import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from "@nestjs/common";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { UserTypes } from "src/auth/decorators/user-types.decorator";
import { UserType } from "src/lib/enums/user-type.enum";
import { OffersService } from "../services/offers.service";
import { OfferDto } from "../dto/offer.dto";

@Controller('offers')
export class OffersController {

  constructor(private readonly offersService: OffersService) {}

  @UserTypes(UserType.Teacher)
  @Get('me')
  findTeacherOffers(@CurrentUser() user: any) {
    return this.offersService.findAllByTeacher(user.id);
  }

  @UserTypes(UserType.Teacher)
  @Post()
  createOffer(
    @Body() dto: OfferDto,
    @CurrentUser() user: any,
  ) {
    dto.teacherId = user.id;
    return this.offersService.create(dto);
  }

  @UserTypes(UserType.Teacher)
  @Put(':id')
  updateOffer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: OfferDto,
    @CurrentUser() user: any,
  ) {
    dto.teacherId = user.id;
    return this.offersService.update(id, dto);
  }

  @UserTypes(UserType.Teacher)
  @Delete(':id')
  deleteOffer(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.offersService.delete(id, user.id);
  }
}