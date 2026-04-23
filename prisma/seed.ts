import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  AuditAction,
  PrismaClient,
  ProductStatus,
  UserRole,
} from '@prisma/client';

async function bootstrapAdmin() {
  const databaseUrl = process.env.DATABASE_URL;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminFirstName = process.env.ADMIN_FIRST_NAME ?? 'E-commerce';
  const adminLastName = process.env.ADMIN_LAST_NAME ?? 'Admin';
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for seeding');
  }

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required for seeding');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: databaseUrl,
    }),
  });

  try {
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    const admin = await prisma.user.upsert({
      where: { email: adminEmail.toLowerCase() },
      update: {
        role: UserRole.ADMIN,
        isActive: true,
        firstName: adminFirstName,
        lastName: adminLastName,
        passwordHash,
      },
      create: {
        email: adminEmail.toLowerCase(),
        passwordHash,
        firstName: adminFirstName,
        lastName: adminLastName,
        role: UserRole.ADMIN,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    console.log('Admin user is ready:', admin);

    const categories = [
      {
        name: 'Аккумуляторный инструмент',
        slug: 'akkumulyatornyj-instrument',
        description: 'Шуруповерты, гайковерты, пилы и другой аккумуляторный инструмент',
      },
      {
        name: 'Электроинструмент',
        slug: 'elektroinstrument',
        description: 'Дрели, перфораторы, шлифмашины, фрезеры',
      },
      {
        name: 'Ручной инструмент',
        slug: 'ruchnoj-instrument',
        description: 'Наборы ключей, отвертки, пассатижи, молотки',
      },
      {
        name: 'Оснастка и расходники',
        slug: 'osnastka-i-rashodniki',
        description: 'Диски, биты, сверла, коронки и другая оснастка',
      },
    ];

    for (const category of categories) {
      await prisma.category.upsert({
        where: { slug: category.slug },
        update: category,
        create: category,
      });
    }

    const cordlessCategory = await prisma.category.findUniqueOrThrow({
      where: { slug: 'akkumulyatornyj-instrument' },
    });
    const electricCategory = await prisma.category.findUniqueOrThrow({
      where: { slug: 'elektroinstrument' },
    });
    const handToolsCategory = await prisma.category.findUniqueOrThrow({
      where: { slug: 'ruchnoj-instrument' },
    });

    const products = [
      {
        name: 'Шуруповерт ударный 18В Pro Drill X18',
        slug: 'shurupovert-udarnyj-18v-pro-drill-x18',
        sku: 'PD-X18-BASE',
        brand: 'Pro Drill',
        description: 'Универсальный ударный шуруповерт для монтажа и сборки.',
        price: 12990,
        stock: 12,
        status: ProductStatus.ACTIVE,
        isPublished: true,
        imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1200&q=80',
        seoTitle: 'Шуруповерт 18В Pro Drill X18',
        seoDescription: 'Ударный шуруповерт для дома и стройки.',
        categoryId: cordlessCategory.id,
        media: [
          {
            url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1200&q=80',
            alt: 'Шуруповерт Pro Drill X18',
            sortOrder: 0,
            isPrimary: true,
          },
        ],
        variants: [
          {
            name: 'Тушка',
            sku: 'PD-X18-BODY',
            attributesJson: JSON.stringify({ комплект: 'без АКБ и ЗУ', напряжение: '18В' }),
            price: 10990,
            stock: 6,
            isDefault: true,
            isActive: true,
          },
          {
            name: 'Комплект 2x4Ач',
            sku: 'PD-X18-KIT-2X4',
            attributesJson: JSON.stringify({ комплект: '2 АКБ 4Ач + ЗУ', напряжение: '18В' }),
            price: 14990,
            stock: 6,
            isDefault: false,
            isActive: true,
          },
        ],
      },
      {
        name: 'Перфоратор SDS-Plus Hammer Force 800',
        slug: 'perforator-sds-plus-hammer-force-800',
        sku: 'HF-800-SET',
        brand: 'Hammer Force',
        description: 'Перфоратор для бетона, кирпича и демонтажных работ.',
        price: 8990,
        stock: 8,
        status: ProductStatus.ACTIVE,
        isPublished: true,
        imageUrl: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=1200&q=80',
        seoTitle: 'Перфоратор SDS-Plus Hammer Force 800',
        seoDescription: 'Надежный перфоратор для строительных и монтажных работ.',
        categoryId: electricCategory.id,
        media: [
          {
            url: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=1200&q=80',
            alt: 'Перфоратор Hammer Force 800',
            sortOrder: 0,
            isPrimary: true,
          },
        ],
        variants: [],
      },
      {
        name: 'Набор торцевых головок MasterWrench 108 предметов',
        slug: 'nabor-tortsevyh-golovok-masterwrench-108',
        sku: 'MW-108-SET',
        brand: 'MasterWrench',
        description: 'Расширенный набор для автосервиса и гаража.',
        price: 6990,
        stock: 15,
        status: ProductStatus.ACTIVE,
        isPublished: true,
        imageUrl: 'https://images.unsplash.com/photo-1581147036324-c1c7f7f4457b?auto=format&fit=crop&w=1200&q=80',
        seoTitle: 'Набор головок MasterWrench 108 предметов',
        seoDescription: 'Профессиональный набор торцевых головок и бит.',
        categoryId: handToolsCategory.id,
        media: [
          {
            url: 'https://images.unsplash.com/photo-1581147036324-c1c7f7f4457b?auto=format&fit=crop&w=1200&q=80',
            alt: 'Набор инструментов MasterWrench',
            sortOrder: 0,
            isPrimary: true,
          },
        ],
        variants: [],
      },
    ];

    for (const item of products) {
      const product = await prisma.product.upsert({
        where: { sku: item.sku },
        update: {
          name: item.name,
          slug: item.slug,
          brand: item.brand,
          description: item.description,
          price: item.price,
          stock: item.stock,
          status: item.status,
          isPublished: item.isPublished,
          imageUrl: item.imageUrl,
          seoTitle: item.seoTitle,
          seoDescription: item.seoDescription,
          categoryId: item.categoryId,
        },
        create: {
          name: item.name,
          slug: item.slug,
          sku: item.sku,
          brand: item.brand,
          description: item.description,
          price: item.price,
          stock: item.stock,
          status: item.status,
          isPublished: item.isPublished,
          imageUrl: item.imageUrl,
          seoTitle: item.seoTitle,
          seoDescription: item.seoDescription,
          categoryId: item.categoryId,
        },
      });

      await prisma.productMedia.deleteMany({ where: { productId: product.id } });
      await prisma.productVariant.deleteMany({ where: { productId: product.id } });

      for (const media of item.media) {
        await prisma.productMedia.create({
          data: {
            productId: product.id,
            ...media,
          },
        });
      }

      for (const variant of item.variants) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            ...variant,
          },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: admin.id,
        action: AuditAction.SEED,
        entityType: 'seed',
        entityId: admin.id,
        description: 'Seeded admin user and demo tool-store catalog',
      },
    });

    console.log('Demo categories, products, media and variants are ready.');
  } finally {
    await prisma.$disconnect();
  }
}

bootstrapAdmin().catch((error) => {
  console.error('Failed to seed admin user:', error);
  process.exit(1);
});
