import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { User, Customer, Order } from '../src/models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    const hasCredentialsInUri = mongoUri.includes('@') || mongoUri.startsWith('mongodb+srv://');
    
    const connectionOptions = {};
    
    // Only add auth if separate credentials are provided and not in URI
    if (process.env.MONGO_USER && process.env.MONGO_PASSWORD && !hasCredentialsInUri) {
      connectionOptions.auth = {
        username: process.env.MONGO_USER,
        password: process.env.MONGO_PASSWORD
      };
    }
    
    await mongoose.connect(mongoUri, connectionOptions);
    console.log('✓ MongoDB connected');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Sample data
const users = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin'
  },
  {
    name: 'John Analyst',
    email: 'analyst@example.com',
    password: 'analyst123',
    role: 'analyst'
  },
  {
    name: 'Jane Viewer',
    email: 'viewer@example.com',
    password: 'viewer123',
    role: 'viewer'
  }
];

const customers = [
  {
    name: 'Alice Johnson',
    email: 'alice@example.com',
    city: 'New York',
    joined_at: new Date('2024-01-15'),
    lifetime_value: 8500,
    status: 'active',
    phone: '+1-555-0101'
  },
  {
    name: 'Bob Smith',
    email: 'bob@example.com',
    city: 'Los Angeles',
    joined_at: new Date('2024-02-20'),
    lifetime_value: 5200,
    status: 'active',
    phone: '+1-555-0102'
  },
  {
    name: 'Carol Williams',
    email: 'carol@example.com',
    city: 'Chicago',
    joined_at: new Date('2024-03-10'),
    lifetime_value: 12000,
    status: 'active',
    phone: '+1-555-0103'
  },
  {
    name: 'David Brown',
    email: 'david@example.com',
    city: 'New York',
    joined_at: new Date('2024-04-05'),
    lifetime_value: 3400,
    status: 'active',
    phone: '+1-555-0104'
  },
  {
    name: 'Emma Davis',
    email: 'emma@example.com',
    city: 'San Francisco',
    joined_at: new Date('2024-05-12'),
    lifetime_value: 9800,
    status: 'active',
    phone: '+1-555-0105'
  },
  {
    name: 'Frank Miller',
    email: 'frank@example.com',
    city: 'Boston',
    joined_at: new Date('2024-06-18'),
    lifetime_value: 6700,
    status: 'active',
    phone: '+1-555-0106'
  },
  {
    name: 'Grace Wilson',
    email: 'grace@example.com',
    city: 'Seattle',
    joined_at: new Date('2024-07-22'),
    lifetime_value: 4300,
    status: 'active',
    phone: '+1-555-0107'
  },
  {
    name: 'Henry Moore',
    email: 'henry@example.com',
    city: 'Austin',
    joined_at: new Date('2024-08-14'),
    lifetime_value: 7100,
    status: 'active',
    phone: '+1-555-0108'
  },
  {
    name: 'Iris Taylor',
    email: 'iris@example.com',
    city: 'Denver',
    joined_at: new Date('2024-09-03'),
    lifetime_value: 5900,
    status: 'active',
    phone: '+1-555-0109'
  },
  {
    name: 'Jack Anderson',
    email: 'jack@example.com',
    city: 'Miami',
    joined_at: new Date('2024-10-08'),
    lifetime_value: 3100,
    status: 'active',
    phone: '+1-555-0110'
  },
  {
    name: 'Karen Thomas',
    email: 'karen@example.com',
    city: 'Portland',
    joined_at: new Date('2024-11-01'),
    lifetime_value: 2800,
    status: 'active',
    phone: '+1-555-0111'
  },
  {
    name: 'Leo Jackson',
    email: 'leo@example.com',
    city: 'New York',
    joined_at: new Date('2025-01-10'),
    lifetime_value: 10500,
    status: 'active',
    phone: '+1-555-0112'
  }
];

// Seed database
const seedDatabase = async () => {
  try {
    console.log('Starting database seed...\n');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Customer.deleteMany({});
    await Order.deleteMany({});
    console.log('✓ Existing data cleared\n');

    // Create users
    console.log('Creating users...');
    const createdUsers = await User.create(users);
    console.log(`✓ Created ${createdUsers.length} users\n`);

    // Create customers
    console.log('Creating customers...');
    const createdCustomers = await Customer.create(customers);
    console.log(`✓ Created ${createdCustomers.length} customers\n`);

    // Create orders
    console.log('Creating orders...');
    const orders = [];
    const regions = ['North', 'South', 'East', 'West', 'Central'];
    const statuses = ['delivered', 'shipped', 'processing', 'pending'];
    const productNames = ['Laptop', 'Mouse', 'Keyboard', 'Monitor', 'Headphones', 'Webcam', 'Desk Chair'];

    for (let i = 0; i < 50; i++) {
      const customer = createdCustomers[Math.floor(Math.random() * createdCustomers.length)];
      const itemCount = Math.floor(Math.random() * 3) + 1;
      const items = [];
      let total = 0;

      for (let j = 0; j < itemCount; j++) {
        const qty = Math.floor(Math.random() * 3) + 1;
        const price = Math.floor(Math.random() * 500) + 50;
        const productName = productNames[Math.floor(Math.random() * productNames.length)];
        
        items.push({
          product_id: new mongoose.Types.ObjectId(),
          product_name: productName,
          qty,
          price
        });
        
        total += qty * price;
      }

      // Create orders from the past 6 months
      const daysAgo = Math.floor(Math.random() * 180);
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - daysAgo);

      orders.push({
        order_id: `ORD-${String(i + 1).padStart(5, '0')}`,
        customer_id: customer._id,
        total,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        items,
        created_at: orderDate,
        region: regions[Math.floor(Math.random() * regions.length)],
        payment_method: ['credit_card', 'paypal', 'debit_card'][Math.floor(Math.random() * 3)]
      });
    }

    const createdOrders = await Order.create(orders);
    console.log(`✓ Created ${createdOrders.length} orders\n`);

    // Display summary
    console.log('═══════════════════════════════════════');
    console.log('Database seeded successfully!');
    console.log('═══════════════════════════════════════');
    console.log('\nTest users created:');
    console.log('  Admin:   admin@example.com / admin123');
    console.log('  Analyst: analyst@example.com / analyst123');
    console.log('  Viewer:  viewer@example.com / viewer123');
    console.log('\nData summary:');
    console.log(`  Users:     ${createdUsers.length}`);
    console.log(`  Customers: ${createdCustomers.length}`);
    console.log(`  Orders:    ${createdOrders.length}`);
    console.log('\n═══════════════════════════════════════\n');

  } catch (error) {
    console.error('✗ Seed failed:', error.message);
    process.exit(1);
  }
};

// Run seeder
const run = async () => {
  await connectDB();
  await seedDatabase();
  await mongoose.connection.close();
  console.log('✓ MongoDB connection closed');
  process.exit(0);
};

run();
