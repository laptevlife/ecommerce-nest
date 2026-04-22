import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, PaymentStatus } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(userId: string, dto: CreatePaymentDto) {
    const payment = await this.ordersService.createPaymentRecord(
      dto.orderId,
      userId,
      dto.provider,
    );

    await this.auditLogsService.create({
      actorUserId: userId,
      action: AuditAction.CREATE,
      entityType: 'payment',
      entityId: payment.id,
      description: `Created payment for order ${dto.orderId}`,
      metadata: { provider: dto.provider },
    });

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
    await this.auditLogsService.create({
      actorUserId: payment.userId,
      action: AuditAction.STATUS_CHANGE,
      entityType: 'payment',
      entityId: payment.id,
      description: `Confirmed payment ${payment.id}`,
      metadata: { providerRef: dto.providerRef },
    });

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
