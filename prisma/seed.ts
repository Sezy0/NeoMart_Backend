import { PrismaClient, Role, StoreStatus, OrderStatus, PaymentMethod, OtpType } from '@prisma/client';
import { passwordUtils } from '../src/utils/password';
import { otpUtils } from '../src/utils/otp';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const adminPassword = await passwordUtils.hash('Admin123!');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nekomart.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@nekomart.com',
      password: adminPassword,
      role: Role.ADMIN,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create seller user
  const sellerPassword = await passwordUtils.hash('Seller123!');
  const seller = await prisma.user.upsert({
    where: { email: 'seller@nekomart.com' },
    update: {},
    create: {
      name: 'Seller User',
      email: 'seller@nekomart.com',
      password: sellerPassword,
      role: Role.SELLER,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  console.log('✅ Seller user created:', seller.email);

  // Create regular user
  const userPassword = await passwordUtils.hash('User123!');
  const user = await prisma.user.upsert({
    where: { email: 'user@nekomart.com' },
    update: {},
    create: {
      name: 'Regular User',
      email: 'user@nekomart.com',
      password: userPassword,
      role: Role.USER,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      cart: JSON.stringify({ items: [], total: 0 }),
    },
  });
  console.log('✅ Regular user created:', user.email);

  // Create Discord user
  const discordUser = await prisma.user.upsert({
    where: { email: 'discord@nekomart.com' },
    update: {},
    create: {
      name: 'Discord User',
      email: 'discord@nekomart.com',
      password: null,
      role: Role.USER,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      discordId: '123456789012345678',
      discordUsername: 'discorduser#1234',
      discordAvatar: 'https://cdn.discordapp.com/avatars/123456789012345678/avatar.png',
      cart: JSON.stringify({ items: [], total: 0 }),
    },
  });
  console.log('✅ Discord user created:', discordUser.email);

  // Create store for seller
  const store = await prisma.store.upsert({
    where: { userId: seller.id },
    update: {},
    create: {
      userId: seller.id,
      name: 'NekoMart Electronics',
      description: 'Your one-stop shop for all electronics needs. We offer the latest gadgets, computers, smartphones, and accessories at competitive prices.',
      username: 'nekomart-electronics',
      address: 'Jl. Sudirman No. 123, Jakarta Pusat, DKI Jakarta 10220, Indonesia',
      status: StoreStatus.APPROVED,
      isActive: true,
      logo: 'https://ik.imagekit.io/nekomart/stores/nekomart-electronics-logo.png',
      banner: 'https://ik.imagekit.io/nekomart/stores/nekomart-electronics-banner.jpg',
      socialLinks: {
        instagram: 'https://instagram.com/nekomart_electronics',
        twitter: 'https://twitter.com/nekomart_elec',
        facebook: 'https://facebook.com/nekomart.electronics'
      },
    },
  });
  console.log('✅ Store created:', store.name);

  // Create products
  const products = [
    {
      name: 'iPhone 15 Pro Max',
      description: 'The latest iPhone with A17 Pro chip, titanium design, and advanced camera system. Features include 6.7-inch Super Retina XDR display, Action Button, and USB-C connectivity.',
      mrp: 20000000,
      price: 18500000,
      images: [
        'https://ik.imagekit.io/nekomart/products/iphone-15-pro-max-1.jpg',
        'https://ik.imagekit.io/nekomart/products/iphone-15-pro-max-2.jpg',
        'https://ik.imagekit.io/nekomart/products/iphone-15-pro-max-3.jpg'
      ],
      category: 'Smartphones',
      tags: ['apple', 'iphone', 'smartphone', 'premium', 'latest'],
      storeId: store.id,
    },
    {
      name: 'MacBook Air M2',
      description: 'Supercharged by the M2 chip, the redesigned MacBook Air combines incredible performance and up to 18 hours of battery life into its strikingly thin aluminum enclosure.',
      mrp: 18000000,
      price: 16500000,
      images: [
        'https://ik.imagekit.io/nekomart/products/macbook-air-m2-1.jpg',
        'https://ik.imagekit.io/nekomart/products/macbook-air-m2-2.jpg'
      ],
      category: 'Laptops',
      tags: ['apple', 'macbook', 'laptop', 'm2', 'ultrabook'],
      storeId: store.id,
    },
    {
      name: 'Samsung Galaxy S24 Ultra',
      description: 'The ultimate Android flagship with S Pen, 200MP camera, and Galaxy AI features. Built with titanium for durability and premium feel.',
      mrp: 19000000,
      price: 17500000,
      images: [
        'https://ik.imagekit.io/nekomart/products/galaxy-s24-ultra-1.jpg',
        'https://ik.imagekit.io/nekomart/products/galaxy-s24-ultra-2.jpg'
      ],
      category: 'Smartphones',
      tags: ['samsung', 'galaxy', 'android', 's-pen', 'flagship'],
      storeId: store.id,
    },
    {
      name: 'Sony WH-1000XM5',
      description: 'Industry-leading noise canceling headphones with exceptional sound quality, 30-hour battery life, and crystal-clear hands-free calling.',
      mrp: 5500000,
      price: 4800000,
      images: [
        'https://ik.imagekit.io/nekomart/products/sony-wh1000xm5-1.jpg'
      ],
      category: 'Audio',
      tags: ['sony', 'headphones', 'noise-canceling', 'wireless', 'premium'],
      storeId: store.id,
    },
    {
      name: 'iPad Pro 12.9" M2',
      description: 'The ultimate iPad experience with M2 chip, Liquid Retina XDR display, and support for Apple Pencil (2nd generation) and Magic Keyboard.',
      mrp: 16000000,
      price: 14500000,
      images: [
        'https://ik.imagekit.io/nekomart/products/ipad-pro-m2-1.jpg',
        'https://ik.imagekit.io/nekomart/products/ipad-pro-m2-2.jpg'
      ],
      category: 'Tablets',
      tags: ['apple', 'ipad', 'tablet', 'm2', 'pro'],
      storeId: store.id,
    }
  ];

  for (const productData of products) {
    const product = await prisma.product.create({
      data: {
        ...productData,
        images: JSON.stringify(productData.images),
        tags: JSON.stringify(productData.tags),
      },
    });
    console.log('✅ Product created:', product.name);
  }

  // Create coupons
  const coupons = [
    {
      code: 'WELCOME10',
      description: 'Welcome discount for new users - 10% off on first purchase',
      discount: 10,
      discountType: 'PERCENTAGE',
      forNewUser: true,
      forMember: false,
      isPublic: true,
      isActive: true,
      usageLimit: 1000,
      usageCount: 0,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    {
      code: 'MEMBER20',
      description: 'Exclusive member discount - 20% off for verified members',
      discount: 20,
      discountType: 'PERCENTAGE',
      forNewUser: false,
      forMember: true,
      isPublic: false,
      isActive: true,
      usageLimit: 500,
      usageCount: 0,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    },
    {
      code: 'SAVE500K',
      description: 'Fixed discount - Save 500,000 IDR on purchases above 5,000,000 IDR',
      discount: 500000,
      discountType: 'FIXED',
      forNewUser: false,
      forMember: false,
      isPublic: true,
      isActive: true,
      usageLimit: 100,
      usageCount: 0,
      expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
    }
  ];

  for (const couponData of coupons) {
    const coupon = await prisma.coupon.create({
      data: couponData,
    });
    console.log('✅ Coupon created:', coupon.code);
  }

  // Create sample order
  const sampleProducts = await prisma.product.findMany({
    take: 2,
    select: { id: true, price: true }
  });

  if (sampleProducts.length >= 2) {
    const orderTotal = sampleProducts[0].price + sampleProducts[1].price;
    const orderNumber = `ORD-${Date.now()}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        total: orderTotal,
        status: OrderStatus.DELIVERED,
        userId: user.id,
        storeId: store.id,
        isPaid: true,
        paymentMethod: PaymentMethod.GOPAY,
        paymentId: `pay_${Date.now()}`,
        isCouponUsed: false,
      },
    });

    // Create order items
    for (const product of sampleProducts) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          quantity: 1,
          price: product.price,
        },
      });
    }

    // Create rating for the first product
    await prisma.rating.create({
      data: {
        rating: 5,
        review: 'Excellent product! Fast delivery and great quality. Highly recommended for anyone looking for premium electronics.',
        userId: user.id,
        productId: sampleProducts[0].id,
        orderId: order.id,
      },
    });

    console.log('✅ Sample order created:', order.orderNumber);
  }

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Test Accounts:');
  console.log('Admin: admin@nekomart.com / Admin123!');
  console.log('Seller: seller@nekomart.com / Seller123!');
  console.log('User: user@nekomart.com / User123!');
  console.log('Discord User: discord@nekomart.com (OAuth only)');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });