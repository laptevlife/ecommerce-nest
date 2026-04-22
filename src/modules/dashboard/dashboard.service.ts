import { Injectable } from '@nestjs/common';
import { OrderStatus, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      totalUsers,
      totalProducts,
      activeProducts,
      totalOrders,
      paidOrders,
      completedPayments,
      lowStockProducts,
      recentOrders,
      revenueAgg,
      ordersByStatus,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.product.count(),
      this.prisma.product.count({
        where: { status: ProductStatus.ACTIVE, isPublished: true },
      }),
      this.prisma.order.count(),
      this.prisma.order.count({
        where: { status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] } },
      }),
      this.prisma.payment.count({
        where: { status: 'COMPLETED' },
      }),
      this.prisma.product.findMany({
        where: { stock: { lte: 5 } },
        take: 10,
        orderBy: { stock: 'asc' },
        select: { id: true, name: true, sku: true, stock: true },
      }),
      this.prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED' },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    return {
      kpis: {
        totalUsers,
        totalProducts,
        activeProducts,
        totalOrders,
        paidOrders,
        completedPayments,
        totalRevenue: Number(revenueAgg._sum.amount ?? 0),
      },
      lowStockProducts,
      recentOrders: recentOrders.map((order) => ({
        ...order,
        subtotalAmount: Number(order.subtotalAmount),
        discountAmount: Number(order.discountAmount),
        shippingAmount: Number(order.shippingAmount),
        totalAmount: Number(order.totalAmount),
      })),
      ordersByStatus: ordersByStatus.map((item) => ({
        status: item.status,
        count: item._count._all,
      })),
    };
  }
}

