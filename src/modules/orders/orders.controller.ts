import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOkResponse()
  create(@GetUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.createFromActiveCart(userId, dto);
  }

  @Get()
  @ApiOkResponse()
  findMine(@GetUser('id') userId: string, @Query() query: QueryOrdersDto) {
    return this.ordersService.findMyOrders(userId, query);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOkResponse()
  findAllAdmin(@Query() query: QueryOrdersDto) {
    return this.ordersService.adminList(query);
  }

  @Get(':id')
  @ApiOkResponse()
  findMineOne(@GetUser('id') userId: string, @Param('id') id: string) {
    return this.ordersService.findMyOrder(userId, id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateStatus(
    @GetUser('id') actorUserId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto, actorUserId);
  }
}
