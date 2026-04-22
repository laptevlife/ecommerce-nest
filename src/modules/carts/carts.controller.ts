import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartsService } from './carts.service';

@ApiTags('carts')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('carts')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get('me')
  @ApiOkResponse()
  getMyCart(@GetUser('id') userId: string) {
    return this.cartsService.getActiveCart(userId);
  }

  @Post('items')
  @ApiOkResponse()
  addItem(@GetUser('id') userId: string, @Body() dto: AddCartItemDto) {
    return this.cartsService.addItem(userId, dto);
  }

  @Patch('items/:id')
  @ApiOkResponse()
  updateItem(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartsService.updateItem(userId, id, dto);
  }

  @Delete('items/:id')
  @ApiOkResponse()
  removeItem(@GetUser('id') userId: string, @Param('id') id: string) {
    return this.cartsService.removeItem(userId, id);
  }
}

