import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  product_name: {
    type: String,
    required: true
  },
  qty: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  order_id: {
    type: String,
    required: [true, 'Order ID is required'],
    unique: true,
    index: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer ID is required'],
    index: true
  },
  total: {
    type: Number,
    required: [true, 'Total is required'],
    min: [0, 'Total cannot be negative']
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      message: 'Invalid order status'
    },
    default: 'pending',
    index: true
  },
  items: {
    type: [orderItemSchema],
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'Order must have at least one item'
    }
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  region: {
    type: String,
    required: [true, 'Region is required'],
    trim: true,
    index: true
  },
  shipping_address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  payment_method: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash'],
    default: 'credit_card'
  },
  notes: String,
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
orderSchema.index({ created_at: -1, status: 1 });
orderSchema.index({ customer_id: 1, created_at: -1 });
orderSchema.index({ region: 1, created_at: -1 });
orderSchema.index({ 'items.product_id': 1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;
