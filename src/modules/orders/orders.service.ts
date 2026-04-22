import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, CartStatus, OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async createFromActiveCart(userId: string, dto: CreateOrderDto) {
    const cart = await this.prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE },
      include: {
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Active cart is empty');
    }

    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${item.product.name}`);
      }
    }

    const subtotal = cart.items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0,
    );

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          cartId: cart.id,
          status: OrderStatus.AWAITING_PAYMENT,
          subtotalAmount: new Prisma.Decimal(subtotal),
          totalAmount: new Prisma.Decimal(subtotal),
          shippingAddress: dto.shippingAddress,
          notes: dto.notes,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              productName: item.product.name,
              sku: item.product.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: new Prisma.Decimal(Number(item.unitPrice) * item.quantity),
            })),
          },
        },
        include: {
          items: true,
          payments: true,
        },
      });

      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      await tx.cart.update({
        where: { id: cart.id },
        data: { status: CartStatus.CONVERTED },
      });

      return created;
    });

    return {
      ...order,
      subtotalAmount: Number(order.subtotalAmount),
      totalAmount: Number(order.totalAmount),
    };
  }

  async findMyOrders(userId: string, query?: QueryOrdersDto) {
    const { page = 1, limit = 20, search, status } = query ?? {};
    const where: Prisma.OrderWhereInput = { userId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { orderNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    const orders = await this.prisma.order.findMany({
      where,
      include: {
        items: true,
        payments: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.order.count({ where });

    return {
      data: orders.map((order) => this.mapOrder(order)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findMyOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.mapOrder(order);
  }

  async adminList(query?: QueryOrdersDto) {
    const { page = 1, limit = 20, search, status } = query ?? {};
    const where: Prisma.OrderWhereInput = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const orders = await this.prisma.order.findMany({
      where,
      include: {
        items: true,
        payments: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.order.count({ where });

    return {
      data: orders.map((order) => this.mapOrder(order)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateStatus(orderId: string, dto: UpdateOrderStatusDto, actorUserId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: dto.status },
    });
    await this.auditLogsService.create({
      actorUserId,
      action: AuditAction.STATUS_CHANGE,
      entityType: 'order',
      entityId: orderId,
      description: `Changed order ${order.orderNumber} status to ${dto.status}`,
    });
    return updated;
  }

  async markAsPaid(orderId: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PAID },
    });
  }

  async createPaymentRecord(orderId: string, userId: string, provider: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.prisma.payment.create({
      data: {
        orderId: order.id,
        userId,
        provider,
        amount: order.totalAmount,
        currency: order.currency,
        status: PaymentStatus.PENDING,
      },
    });
  }

  private mapOrder(order: any) {
    return {
      ...order,
      subtotalAmount: Number(order.subtotalAmount),
      discountAmount: Number(order.discountAmount),
      shippingAmount: Number(order.shippingAmount),
      totalAmount: Number(order.totalAmount),
      items: order.items?.map((item: any) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
      })),
      payments: order.payments?.map((payment: any) => ({
        ...payment,
        amount: Number(payment.amount),
      })),
    };
  }
}
