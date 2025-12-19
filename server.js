const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;

// Middleware
app.use(cors());
app.use(express.json());

// Fast2SMS configuration
const fast2smsApiKey = process.env.FAST2SMS_API_KEY;
const smsEnabled = !!fast2smsApiKey;

if (smsEnabled) {
  console.log('✅ Fast2SMS configured - Real SMS will be sent');
} else {
  console.log('📱 Running in DEMO mode - SMS will be simulated (no API key needed)');
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'running', 
    message: 'SuperMarket SMS Bill API',
    mode: smsEnabled ? 'production' : 'demo',
    smsProvider: 'Fast2SMS',
    configured: smsEnabled,
    publicUrl: PUBLIC_BASE_URL
  });
});

// Serve bill HTML endpoint
app.get('/bill/:invoiceId', (req, res) => {
  const { invoiceId } = req.params;
  const invoiceFile = path.join(__dirname, `invoice-${invoiceId}.html`);
  
  // Check if invoice file exists
  if (fs.existsSync(invoiceFile)) {
    res.sendFile(invoiceFile);
  } else {
    // Return a generic bill not found page
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice Not Found</title>
        <style>
          body { font-family: Arial; text-align: center; padding: 50px; }
          h1 { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1>📄 Invoice Not Found</h1>
        <p>Invoice ${invoiceId} could not be found.</p>
        <p>Please contact the store if you believe this is an error.</p>
      </body>
      </html>
    `);
  }
});

// Send bill endpoint using Fast2SMS
app.post('/api/send-bill', async (req, res) => {
  const { customerName, customerPhone, billText, items, total, invoiceNumber } = req.body;

  console.log('\n📧 New Bill SMS Request:');
  console.log('Customer:', customerName);
  console.log('Phone:', customerPhone);
  console.log('Invoice:', invoiceNumber);
  console.log('Total:', total);
  
  // Generate public bill link
  const billLink = `${PUBLIC_BASE_URL}/bill/${invoiceNumber}`;
  console.log('Bill Link:', billLink);

  // Validate input
  if (!customerName || !customerPhone || !billText) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['customerName', 'customerPhone', 'billText']
    });
  }

  // Clean phone number (remove +91 if present, Fast2SMS expects 10 digits)
  let cleanPhone = customerPhone.replace(/\D/g, '');
  if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
    cleanPhone = cleanPhone.slice(2);
  }
  
  // Create SMS message with public bill link
  const smsMessage = `
🧾 SUPERMARKET INVOICE

Invoice: ${invoiceNumber}
Customer: ${customerName}
Total: ₹${total}

View Full Bill:
${billLink}

Thank you for shopping with us!`;

  try {
    if (!smsEnabled) {
      // Demo mode - simulate success (NO API KEY NEEDED)
      console.log('📱 DEMO MODE - SMS Bill Preview:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(smsMessage);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Would be sent to: ${cleanPhone}`);
      console.log('Customer:', customerName);
      console.log('Invoice:', invoiceNumber);
      console.log('Amount: ₹' + total);
      console.log('✅ SMS simulated successfully!\n');
      
      // Simulate slight delay like real SMS
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return res.json({ 
        success: true, 
        demo: true,
        message: 'SMS sent successfully (demo mode)',
        messageId: 'DEMO-' + Date.now(),
        billLink: billLink,
        timestamp: new Date().toISOString()
      });
    }

    // Real SMS via Fast2SMS
    console.log('📱 Sending REAL SMS via Fast2SMS...');
    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      route: 'q',
      message: smsMessage,
      language: 'english',
      flash: 0,
      numbers: cleanPhone
    }, {
      headers: {
        'authorization': fast2smsApiKey
      }
    });
    
    console.log('✅ SMS sent successfully via Fast2SMS');
    console.log('Response:', response.data);
    
    res.json({ 
      success: true,
      demo: false,
      messageId: response.data.message_id || Date.now().toString(),
      status: 'sent',
      provider: 'Fast2SMS',
      billLink: billLink,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error sending SMS:', error.message);
    
    res.status(500).json({ 
      error: 'Failed to send SMS',
      details: error.message,
      provider: 'Fast2SMS'
    });
  }
});

// Image analysis endpoint (proxy to Gemini Vision) -- accepts base64 image and products list
app.post('/api/analyze-image', async (req, res) => {
  const { imageBase64, products } = req.body || {};
  const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' });
  if (!geminiKey) return res.status(500).json({ error: 'Gemini API key not configured on server (GEMINI_API_KEY)' });

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(geminiKey);

    // Try to use a vision-capable model; gemini-pro-vision is the supported public vision model
    const visionModel = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

    const productList = (products && products.length > 0) ? products.slice(0,15).map(p => p.name).join(', ') : 'General retail products';

    const prompt = `Analyze this product image carefully and identify the product.\n\nAvailable products in store: ${productList}\n\nProvide:\n1. Product name (exact match from list if possible, or describe what you see)\n2. Product category\n3. Brand name if visible\n4. Confidence level (0-100)\n5. Brief description\n\nFormat: PRODUCT: [name] | CATEGORY: [category] | BRAND: [brand] | CONFIDENCE: [number] | DESC: [description]`;

    const imagePart = {
      inlineData: {
        data: imageBase64.split(',')[1],
        mimeType: 'image/jpeg'
      }
    };

    const result = await visionModel.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Simple parsing
    const productMatch = text.match(/PRODUCT:\s*([^|]+)/i);
    const categoryMatch = text.match(/CATEGORY:\s*([^|]+)/i);
    const brandMatch = text.match(/BRAND:\s*([^|]+)/i);
    const confidenceMatch = text.match(/CONFIDENCE:\s*(\d+)/i);
    const descMatch = text.match(/DESC:\s*(.+)/i);

    const detectedProduct = productMatch ? productMatch[1].trim() : 'Unknown Product';
    const category = categoryMatch ? categoryMatch[1].trim() : '';
    const brand = brandMatch ? brandMatch[1].trim() : '';
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 70;
    const description = descMatch ? descMatch[1].trim() : text;

    return res.json({
      detectedProduct,
      category,
      brand,
      confidence,
      description,
      raw: text
    });

  } catch (error) {
    console.error('❌ Error proxying Gemini Vision:', error);
    return res.status(500).json({ error: 'Vision analysis failed', details: error.message || String(error) });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 SMS Bill Backend Server');
  console.log(`📡 Running on: http://localhost:${PORT}`);
  console.log(`🌐 Public URL: ${PUBLIC_BASE_URL}`);
  console.log(`📱 SMS Provider: Fast2SMS`);
  console.log(`📱 Mode: ${smsEnabled ? 'PRODUCTION (Real SMS)' : 'DEMO (Simulated SMS)'}`);
  
  if (smsEnabled) {
    console.log('\n✅ Fast2SMS is active - Bills will be sent via SMS');
    console.log('💡 SMS will be sent to customer phone numbers\n');
  } else {
    console.log('\n💡 Demo Mode - To enable real SMS:');
    console.log('   1. Sign up at https://www.fast2sms.com');
    console.log('   2. Add API key to .env file');
    console.log('   3. Restart server\n');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Server shutting down...');
  process.exit(0);
});
