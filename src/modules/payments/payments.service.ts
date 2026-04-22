import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  async create(userId: string, dto: CreatePaymentDto) {
    const payment = await this.ordersService.createPaymentRecord(
      dto.orderId,
      userId,
      dto.provider,
    );

    return {
      ...payment,
      amount: Number(payment.amount),
    };
  }

  async confirm(paymentId: string, dto: ConfirmPaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.COMPLETED,
        providerRef: dto.providerRef,
        metadataJson: dto.metadataJson,
      },
    });

    await this.ordersService.markAsPaid(payment.orderId);

    return {
      ...updated,
      amount: Number(updated.amount),
    };
  }

  async findMine(userId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((payment) => ({
      ...payment,
      amount: Number(payment.amount),
    }));
  }
}

