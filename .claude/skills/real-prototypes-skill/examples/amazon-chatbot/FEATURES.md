# Amazon Chatbot - Functional Features

## Overview
The Amazon Shopping Assistant chatbot now has full functionality for product search, cart management, order tracking, and checkout.

---

## ✨ Features Implemented

### 1. **Smart Product Search**
- **11 products** across 4 categories (Headphones, Laptops, Phones, Smartwatches)
- **Intelligent category detection** from search queries:
  - "laptop" → shows laptop products
  - "wireless headphones" → shows headphone products
  - "5G phone" → shows phone products
  - "smartwatch" → shows watch products
- **Brand search** - search by specific brands (Sony, Samsung, boAt, etc.)
- **Price filtering** - search "laptop under 50000" to filter by price
- **Relevance ranking** - products sorted by rating × review count

### 2. **Shopping Cart Management**
- **Add to Cart** functionality
- **Cart counter** updates in chatbot header and main navbar
- **View Cart** command shows all items with quantities and total
- **Cart persistence** throughout the session
- **Clear Cart** option
- **Interactive cart actions**:
  - "view cart" or "cart" → shows cart summary
  - Quick action buttons after adding items

### 3. **Order Tracking System**
- **Order placement** with unique order IDs (e.g., ORD12345678)
- **Order status** tracking (confirmed → shipped → delivered)
- **Estimated delivery dates** (3 days from order)
- **Order history** view with all past orders
- **Quick order tracking**:
  - Click "Track Order" button
  - Type "track my order" or "orders"

### 4. **Checkout Flow**
- **Buy Now** button for instant purchase
- **Delivery address** display (Bengaluru 562130)
- **Payment method selection**:
  - Cash on Delivery
  - UPI
  - Credit/Debit Card
  - Net Banking
- **Order confirmation** with all details
- **Confirm/Cancel** action buttons

### 5. **Interactive Action Buttons**
All bot responses include contextual action buttons:
- **After adding to cart**: "View Cart" | "Continue Shopping"
- **Empty cart**: "Browse Laptops" | "Browse Phones" | "Browse Headphones"
- **Checkout**: "Confirm Order" | "Cancel"
- **Cart management**: "Proceed to Checkout" | "Clear Cart"

### 6. **Quick Action Shortcuts**
Two persistent buttons in the chatbot header:
- **🔍 Find Products** - Shows search suggestions
- **📦 Track Order** - Displays order history

---

## 🎯 Example Conversations

### Product Search
```
User: wireless headphones
Bot: I found 3 great options for "wireless headphones"
     [Shows boAt, Sony, JBL headphones]
```

### Price Filter
```
User: laptop under 50000
Bot: I found 3 great options for "laptop under 50000"
     [Shows HP, Dell, Lenovo laptops under ₹50,000]
```

### Add to Cart
```
User: [Clicks "Add to Cart" on Sony headphones]
Bot: ✓ Added "Sony WH-1000XM4..." to your cart! You now have 1 items.
     [View Cart] [Continue Shopping]
```

### View Cart
```
User: view cart
Bot: 🛒 Your Cart (2 items)
     • Sony WH-1000XM4... (₹19,990 × 1)
     • boAt Rockerz 450... (₹1,299 × 1)
     Total: ₹21,289
     [Proceed to Checkout] [Clear Cart]
```

### Place Order
```
User: [Clicks "Buy Now" on HP laptop]
Bot: Processing checkout for "HP 15s Ryzen 5..." at ₹42,990

     📍 Delivery Address
     Bengaluru 562130

     💳 Payment Method
     Cash on Delivery / UPI / Card

     Expected delivery: 2-3 days
     Total: ₹42,990
     [Confirm Order] [Cancel]

User: [Clicks "Confirm Order"]
Bot: 🎉 Order confirmed!
     Order ID: ORD12345678
     Product: HP 15s Ryzen 5...
     Amount: ₹42,990
     Expected Delivery: 1/31/2026
```

### Track Orders
```
User: track my order
Bot: 📦 Your Orders

     ✓ ORD12345678
        HP 15s Ryzen 5 5500U 15.6 inch FHD...
        Status: CONFIRMED
        Delivery: 1/31/2026
```

---

## 📊 Product Database

### Categories & Counts
- **Headphones**: 3 products (₹1,299 - ₹19,990)
- **Laptops**: 3 products (₹38,490 - ₹49,990)
- **Phones**: 3 products (₹12,990 - ₹17,999)
- **Smartwatches**: 2 products (₹2,499 - ₹2,999)

### Brands Available
- boAt, Sony, JBL
- HP, Dell, Lenovo
- Samsung, OnePlus, Redmi
- Fire-Boltt, Noise

---

## 🛠️ Technical Implementation

### State Management
- **Cart**: `CartItem[]` with product and quantity
- **Orders**: `Order[]` with status and delivery tracking
- **Messages**: `Message[]` with products and action buttons
- **Price Filter**: Optional min/max price range

### Search Algorithm
1. **Keyword Matching**: Searches title, brand, category
2. **Category Detection**: Maps keywords to product categories
3. **Price Filtering**: Applies min/max price constraints
4. **Relevance Ranking**: Sorts by `rating × log(reviewCount + 1)`
5. **Limit Results**: Returns top 5 matches

### Cart Updates
- Updates chatbot header badge
- Syncs with main navbar cart counter
- Persists across searches
- Supports quantity increment for duplicate products

---

## 🎨 UI Features

### Cart Badge
- Red notification badge on chatbot header
- Shows total item count
- Updates in real-time

### Action Buttons
- Yellow Amazon-style buttons
- Contextual actions based on conversation
- Hover effects matching Amazon design

### Message Formatting
- **User messages**: Dark navy background (right-aligned)
- **Bot messages**: White background (left-aligned)
- **Emojis**: ✓ (success), 🛒 (cart), 📦 (orders), 🎉 (celebration)
- **Bold text**: Order IDs, totals, headers
- **Multi-line formatting**: Preserved with `whiteSpace: 'pre-line'`

---

## 🚀 Usage

```bash
# Run the prototype
cd projects/amazon-chatbot/prototype
npm run dev
```

Visit http://localhost:3000 and click the orange chat button!

### Try These Commands:
- `wireless headphones`
- `laptop under 50000`
- `5G phone`
- `view cart`
- `track my order`

---

## 📈 Future Enhancements (Not Yet Implemented)
- Product comparison
- Save for later
- Wishlist management
- Product reviews in chat
- Voice search
- Image search
- Live chat with support agent handoff
- Personalized recommendations based on history
- Multi-language support
