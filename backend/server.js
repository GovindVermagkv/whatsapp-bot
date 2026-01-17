const express = require('express');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const net = require('net');
const BaileysBot = require('./baileysBot');
const EmailBot = require('./emailBot');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize BaileysBot instance
const baileysBot = new BaileysBot();

// Initialize EmailBot instance
const emailBot = new EmailBot();
// Attempt to initialize with environment variables
emailBot.initialize({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS
}).catch(err => console.log('⚠️ Email configuration not found or invalid. Email features may not work until configured.'));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },

  
  fileFilter: (req, file, cb) => {
    console.log(`📁 File upload attempt - Field: ${file.fieldname}, Original: ${file.originalname}, MIME: ${file.mimetype}`);
    
    // Get file extension
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Check if it's a CSV file
    if (file.fieldname === 'csvFile') {
      if (file.mimetype === 'text/csv' || 
          ext === '.csv' || 
          file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.mimetype === 'application/vnd.ms-excel' ||
          ext === '.xlsx' ||
          ext === '.xls') {
        console.log(`✅ CSV/Excel file accepted: ${file.originalname}`);
        cb(null, true);
      } else {
        console.log(`❌ CSV/Excel file rejected: ${file.originalname} (${file.mimetype})`);
        cb(new Error('Only CSV and Excel files are allowed for data upload!'), false);
      }
    }
    // Check if it's an image file
    else if (file.fieldname === 'imageFile') {
      if (file.mimetype.startsWith('image/')) {
        console.log(`✅ Image file accepted: ${file.originalname}`);
        cb(null, true);
      } else {
        console.log(`❌ Image file rejected: ${file.originalname} (${file.mimetype})`);
        cb(new Error('Only image files are allowed for image upload!'), false);
      }
    }
    // Unknown field
    else {
      console.log(`❌ Unknown field: ${file.fieldname}`);
      cb(new Error('Unknown file field!'), false);
    }
  }
});


const multiUpload = upload.fields([
  { name: 'csvFile', maxCount: 1 },
  { name: 'imageFile', maxCount: 1 }
]);
// Utility function to parse CSV or Excel file
const parseFile = (filePath, ext) => {
  return new Promise((resolve, reject) => {
    const data = [];
    if (ext === 'csv') {
      fs.createReadStream(filePath)
        .pipe(csv()) // Let csv-parser auto-detect headers
        .on('data', row => {
          // Convert all values to strings and ensure we have at least a number field
          const processedRow = {};
          Object.keys(row).forEach(key => {
            processedRow[key.toLowerCase().trim()] = String(row[key]).trim();
          });
          
          // Only add rows that have a number field (phone number)
          if (processedRow.number || processedRow.phone || processedRow.mobile) {
            // Standardize the phone number field name
            if (!processedRow.number) {
              processedRow.number = processedRow.phone || processedRow.mobile;
            }
            data.push(processedRow);
          }
        })
        .on('end', () => resolve(data))
        .on('error', reject);
    } else if (ext === 'xlsx') {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      sheet.forEach(row => {
        // Convert all values to strings and normalize keys
        const processedRow = {};
        Object.keys(row).forEach(key => {
          processedRow[key.toLowerCase().trim()] = String(row[key]).trim();
        });
        
        // Only add rows that have a number field (phone number)
        if (processedRow.number || processedRow.phone || processedRow.mobile) {
          // Standardize the phone number field name
          if (!processedRow.number) {
            processedRow.number = processedRow.phone || processedRow.mobile;
          }
          data.push(processedRow);
        }
      });
      resolve(data);
    } else {
      reject(new Error('Only CSV and Excel files are allowed!'));
    }
  });
};

// Utility function to get column names from file
const getFileColumns = (filePath, ext) => {
  return new Promise((resolve, reject) => {
    try {
      if (ext === 'csv') {
        const columns = [];
        let firstRow = true;
        const stream = fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => {
            if (firstRow) {
              // Get columns from first row
              columns.push(...Object.keys(row).map(k => k.trim()));
              stream.destroy(); // Stop reading after first row
              resolve(columns);
            }
            firstRow = false;
          })
          .on('error', reject)
          .on('end', () => {
            // If we reach end without getting columns, file might be empty
            if (columns.length === 0) {
              resolve([]);
            }
          });
      } else if (ext === 'xlsx' || ext === 'xls') {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        if (!sheet['!ref']) {
          resolve([]);
          return;
        }
        
        // Get first row as headers
        const range = XLSX.utils.decode_range(sheet['!ref']);
        const headers = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          const cell = sheet[cellAddress];
          if (cell && cell.v) {
            headers.push(String(cell.v).trim());
          } else {
            // Even if cell is empty, include it to maintain column count
            headers.push(`Column${col + 1}`);
          }
        }
        resolve(headers);
      } else {
        reject(new Error('Unsupported file type'));
      }
    } catch (error) {
      reject(error);
    }
  });
};

// Utility function to validate and suggest columns
const validateColumns = (columns) => {
  const normalizedColumns = columns.map(col => col.toLowerCase().trim());
  
  // Define expected column patterns
  const phonePatterns = ['number', 'phone', 'mobile', 'contact', 'phonenumber', 'phone_number', 'mobile_number', 'whatsapp'];
  const namePatterns = ['name', 'fullname', 'full_name', 'customer_name', 'client_name', 'person_name'];
  const firstNamePatterns = ['firstname', 'first_name', 'fname', 'first'];
  const lastNamePatterns = ['lastname', 'last_name', 'lname', 'last', 'surname'];
  const emailPatterns = ['email', 'e-mail', 'email_address', 'emailaddress'];
  /*const emailPatterns = ['email', 'e-mail', 'email_address', 'emailaddress', 'mail'];*/
  const subjectPatterns = ['subject', 'title', 'topic'];
  const messagePatterns = ['message', 'msg', 'text', 'content', 'body'];
  
  // Find matching columns
  const phoneColumn = normalizedColumns.find(col => 
    phonePatterns.some(pattern => col.includes(pattern))
  );
  
  const nameColumn = normalizedColumns.find(col => 
    namePatterns.some(pattern => col.includes(pattern))
  );
  
  const firstNameColumn = normalizedColumns.find(col => 
    firstNamePatterns.some(pattern => col.includes(pattern))
  );
  
  const lastNameColumn = normalizedColumns.find(col => 
    lastNamePatterns.some(pattern => col.includes(pattern))
  );
  
  const emailColumn = normalizedColumns.find(col => 
    emailPatterns.some(pattern => col.includes(pattern))
  );

  const subjectColumn = normalizedColumns.find(col => 
    subjectPatterns.some(pattern => col.includes(pattern))
  );
  
  const messageColumn = normalizedColumns.find(col => 
    messagePatterns.some(pattern => col.includes(pattern))
  );
  
  // Get original column name (case-sensitive)
  const getOriginalColumn = (normalized) => {
    if (!normalized) return null;
    const index = normalizedColumns.indexOf(normalized);
    return index >= 0 ? columns[index] : null;
  };
  
  const validation = {
    isValid: !!phoneColumn, // Must have phone number column
    columns: {
      phone: getOriginalColumn(phoneColumn),
      name: getOriginalColumn(nameColumn),
      firstName: getOriginalColumn(firstNameColumn),
      lastName: getOriginalColumn(lastNameColumn),
      email: getOriginalColumn(emailColumn),
      subject: getOriginalColumn(subjectColumn),
      message: getOriginalColumn(messageColumn),
    },
    allColumns: columns,
    suggestions: {
      required: phoneColumn ? 
        `✅ Found phone number column: "${getOriginalColumn(phoneColumn)}"` : 
        `❌ No phone number column found. Expected: number, phone, mobile, contact`,
      optional: []
    }
  };
  
  // Build suggestions
  if (!nameColumn && !firstNameColumn) {
    validation.suggestions.optional.push('💡 Consider adding a "name" or "firstname" column for personalization');
  }
  if (!emailColumn) {
    validation.suggestions.optional.push('💡 Consider adding an "email" column for additional contact info');
  }
  if (!messageColumn) {
    validation.suggestions.optional.push('💡 Consider adding a "message" column for per-row custom messages');
  }
  
  return validation;
};

// Utility function to delete file
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Deleted file: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error deleting file ${filePath}:`, error);
  }
};

// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'WhatsApp Bot Server is running',
    timestamp: new Date().toISOString()
  });
});

// Get WhatsApp connection status
app.get('/api/status', async (req, res) => {
  try {
    const status = await baileysBot.getConnectionStatus();
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Validate file and get column information
app.post('/api/validate-file', multiUpload, async (req, res) => {
  let filePath = null;
  try {
    const csvFile = req.files?.csvFile?.[0];
    
    if (!csvFile) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    filePath = csvFile.path;
    const ext = path.extname(csvFile.originalname).toLowerCase().slice(1);
    
    if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
      deleteFile(filePath);
      return res.status(400).json({ 
        success: false, 
        error: 'Only CSV and Excel files allowed' 
      });
    }

    // Get column names
    const columns = await getFileColumns(filePath, ext);
    
    // Validate columns and get suggestions
    const validation = validateColumns(columns);
    
    // Get a sample row count (first few rows)
    let sampleData = [];
    try {
      const allData = await parseFile(filePath, ext);
      sampleData = allData.slice(0, 3); // First 3 rows as sample
    } catch (parseError) {
      console.warn('Could not parse sample data:', parseError.message);
    }

    // Don't delete file yet - user might want to use it
    // File will be cleaned up by send-messages endpoint or after timeout

    res.json({
      success: true,
      fileName: csvFile.originalname,
      fileType: ext,
      totalColumns: columns.length,
      columns: columns,
      validation: validation,
      sampleRows: sampleData.length,
      sampleData: sampleData,
      message: validation.isValid ? 
        'File structure is valid. You can proceed with sending messages.' : 
        'File structure has issues. Please check the suggestions below.'
    });

  } catch (error) {
    if (filePath) deleteFile(filePath);
    console.error('❌ Error validating file:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate file'
    });
  }
});

// Upload CSV or Excel file and send messages
app.post('/api/send-messages', multiUpload, async (req, res) => {
  let filePath = null;
  try {
    const csvFile = req.files?.csvFile?.[0];
    const imageFile = req.files?.imageFile?.[0];
    const customMessage = req.body.customMessage || '';

    if (!csvFile) {
      return res.status(400).json({ success: false, error: 'No CSV file uploaded' });
    }

    filePath = csvFile.path;
    const ext = path.extname(csvFile.originalname).toLowerCase().slice(1);
    if (ext !== 'csv' && ext !== 'xlsx') {
      deleteFile(filePath);
      return res.status(400).json({ success: false, error: 'Only CSV and Excel files allowed' });
    }

    const status = await baileysBot.getConnectionStatus();
    if (!status.connected || !status.ready) {
      deleteFile(filePath);
      return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
    }

    // Use BaileysBot's built-in file reading and bulk messaging
    // It handles Excel/CSV parsing, personalization, and sending
    const imagePath = imageFile ? imageFile.path : null;
    
    // BaileysBot supports both Excel and CSV files
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
      deleteFile(filePath);
      return res.status(400).json({ 
        success: false, 
        error: 'Only Excel (.xlsx, .xls) and CSV (.csv) files are supported.' 
      });
    }

    const results = await baileysBot.sendBulkMessagesFromExcel(filePath, customMessage, imagePath);

    deleteFile(filePath);
    if (imagePath) deleteFile(imagePath);

    const successCount = results.filter(r => r.status === 'sent').length;
    const failureCount = results.filter(r => r.status === 'failed').length;
    const invalidCount = results.filter(r => r.status === 'invalid').length;

    return res.json({
      success: true,
      message: 'Messages processed successfully',
      statistics: {
        total: results.length,
        sent: successCount,
        failed: failureCount,
        invalid: invalidCount
      },
      results
    });

  } catch (error) {
    if (filePath) deleteFile(filePath);
    return res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
});

// Send Batch Messages (JSON payload)
app.post('/api/send-batch-messages', multiUpload, async (req, res) => {
  try {
    const contacts = req.body.contacts ? JSON.parse(req.body.contacts) : [];
    const imageFile = req.files?.imageFile?.[0];

    if (!contacts || contacts.length === 0) {
      return res.status(400).json({ success: false, error: 'No contacts provided in batch' });
    }

    const status = await baileysBot.getConnectionStatus();
    if (!status.connected || !status.ready) {
      return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
    }

    const imagePath = imageFile ? imageFile.path : null;

    // Use the JSON-based bulk sender
    const results = await baileysBot.sendBulkMessagesFromJson(contacts, imagePath);

    if (imagePath) deleteFile(imagePath);

    const successCount = results.filter(r => r.status === 'sent').length;
    const failureCount = results.filter(r => r.status === 'failed').length;
    const invalidCount = results.filter(r => r.status === 'invalid').length;

    return res.json({
      success: true,
      message: 'Batch processed successfully',
      statistics: {
        total: results.length,
        sent: successCount,
        failed: failureCount,
        invalid: invalidCount
      },
      results
    });

  } catch (error) {
    // Clean up if image was uploaded but error occurred
    if (req.files?.imageFile?.[0]?.path) deleteFile(req.files.imageFile[0].path);
    
    return res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
});


// --- EMAIL ROUTES ---

// Validate file for EMAIL
app.post('/api/email/validate-file', multiUpload, async (req, res) => {
    let filePath = null;
    try {
      const csvFile = req.files?.csvFile?.[0];
      
      if (!csvFile) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }
  
      filePath = csvFile.path;
      const ext = path.extname(csvFile.originalname).toLowerCase().slice(1);
      
      if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
        deleteFile(filePath);
        return res.status(400).json({ success: false, error: 'Only CSV and Excel files allowed' });
      }
  
      // Get column names
      const columns = await getFileColumns(filePath, ext);
      
      // Validate columns for EMAIL
      const normalizedColumns = columns.map(col => col.toLowerCase().trim());
      const emailPatterns = ['email', 'e-mail', 'mail'];
      const emailColumn = normalizedColumns.find(col => emailPatterns.some(p => col.includes(p)));
      
      // Get sample data
       let sampleData = [];
      try {
        const allData = await parseFile(filePath, ext);
        sampleData = allData.slice(0, 3);
      } catch (e) {}

      res.json({
        success: true,
        fileName: csvFile.originalname,
        columns: columns,
        hasEmailColumn: !!emailColumn,
        sampleRows: sampleData.length,
        sampleData: sampleData,
        emailColumn: emailColumn ? columns[normalizedColumns.indexOf(emailColumn)] : null
      });
  
    } catch (error) {
      if (filePath) deleteFile(filePath);
      console.error('❌ Error validating email file:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });


// Send Bulk Emails
app.post('/api/email/send-messages', multiUpload, async (req, res) => {
    let filePath = null;
    try {
      const csvFile = req.files?.csvFile?.[0];
      const { subject, htmlContent } = req.body;
  
      if (!csvFile || !subject || !htmlContent) {
        return res.status(400).json({ success: false, error: 'Missing file, subject, or content' });
      }
  
      filePath = csvFile.path;
      const ext = path.extname(csvFile.originalname).toLowerCase().slice(1);
      
      // Parse file
      const contacts = await parseFile(filePath, ext);
      
      // Send emails
      const results = await emailBot.sendBulkEmails(contacts, subject, htmlContent);
  
      deleteFile(filePath);
  
      const successCount = results.filter(r => r.status === 'sent').length;
      const failureCount = results.filter(r => r.status === 'failed').length;
  
      res.json({
        success: true,
        message: 'Emails processed',
        statistics: {
          total: results.length,
          sent: successCount,
          failed: failureCount
        },
        results
      });
  
    } catch (error) {
      if (filePath) deleteFile(filePath);
      console.error('❌ Error in bulk email:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

// Test endpoint to send a single message
app.post('/api/send-test-message', async (req, res) => {
  try {
    const { number, message } = req.body;

    if (!number || !message) {
      return res.status(400).json({
        success: false,
        error: 'Number and message are required'
      });
    }

    // Check if BaileysBot is ready
    const status = await baileysBot.getConnectionStatus();
    if (!status.connected || !status.ready) {
      return res.status(503).json({
        success: false,
        error: 'WhatsApp is not connected. Please scan the QR code and try again.',
        connectionStatus: status
      });
    }

    const result = await baileysBot.sendMessage(number, message);

    res.json({
      success: result.success,
      result: result
    });

  } catch (error) {
    console.error('❌ Error in send-test-message endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
    console.error('❌ Multer error:', error);
    return res.status(400).json({
      success: false,
      error: error.message || 'File upload error'
    });
  }
  
  // Handle file filter errors
  if (error.message && (error.message.includes('files are allowed') || error.message.includes('file field'))) {
    console.error('❌ File filter error:', error.message);
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  
  console.error('❌ Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: error.message || 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Utility function to check if a port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

// Utility function to find an available port
async function findAvailablePort(startPort, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
  }
  return null;
}

// Initialize VenomBot and start server
async function startServer() {
  try {
    console.log('🔄 Starting WhatsApp Bot Server...');
    
    // Check if the requested port is available
    let serverPort = PORT;
    const portAvailable = await isPortAvailable(PORT);
    
    if (!portAvailable) {
      console.warn(`⚠️  Port ${PORT} is already in use. Searching for an available port...`);
      const availablePort = await findAvailablePort(PORT);
      
      if (availablePort) {
        serverPort = availablePort;
        console.log(`✅ Found available port: ${serverPort}`);
      } else {
        console.error(`❌ Could not find an available port starting from ${PORT}`);
        console.error(`💡 Please either:`);
        console.error(`   1. Stop the process using port ${PORT}`);
        console.error(`   2. Set a different PORT environment variable (e.g., PORT=5001)`);
        process.exit(1);
      }
    }
    
    // Start Express server immediately to ensure health checks work
    const server = app.listen(serverPort, () => {
      console.log(`🚀 Server is running on http://localhost:${serverPort}`);
      if (serverPort !== PORT) {
        console.log(`📌 Note: Using port ${serverPort} instead of ${PORT} (original port was in use)`);
      }
      console.log('📱 WhatsApp Web should open in your browser. Please scan the QR code.');
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${serverPort} is already in use.`);
        console.error(`💡 Please either:`);
        console.error(`   1. Stop the process using port ${serverPort}`);
        console.error(`   2. Set a different PORT environment variable (e.g., PORT=5001)`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
        process.exit(1);
      }
    });

    // Initialize BaileysBot asynchronously
    try {
      await baileysBot.connectWhatsApp();
      console.log('💡 BaileysBot connection complete!');
    } catch (baileysError) {
      console.error('❌ BaileysBot Failed to Connect:', baileysError);
      // Don't exit process, allow server to stay up for diagnostics
    }

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down server...');
  await baileysBot.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Shutting down server...');
  await baileysBot.close();
  process.exit(0);
});

// Start the server
startServer();