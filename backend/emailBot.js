const nodemailer = require('nodemailer');

class EmailBot {
  constructor() {
    this.transporter = null;
    this.isReady = false;
    console.log('📧 EmailBot Class Initialized');
  }

  /**
   * Initialize the transporter with SMTP settings
   * @param {Object} config - SMTP configuration
   */
  async initialize(config) {
    try {
      console.log('🚀 Initializing Email Transporter...');
      
      // Create transporter
      this.transporter = nodemailer.createTransport({
        host: config.host || process.env.SMTP_HOST,
        port: config.port || process.env.SMTP_PORT || 587,
        secure: config.secure || false, // true for 465, false for other ports
        auth: {
          user: config.user || process.env.SMTP_USER,
          pass: config.pass || process.env.SMTP_PASS,
        },
      });

      // Verify connection configuration
      await this.transporter.verify();
      console.log('✅ Email Transporter is ready!');
      this.isReady = true;
      return true;
    } catch (error) {
      console.error('❌ Email Transporter connection failed:', error);
      this.isReady = false;
      throw error;
    }
  }

  /**
   * Send a single email
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} html - Email HTML content
   * @param {Array} attachments - Optional attachments
   */
  async sendEmail(to, subject, html, attachments = []) {
    if (!this.transporter) { // Allow attempt if not fully "ready" but transporter exists (lazy init might fail verification but still work)
        throw new Error('Email transporter not initialized');
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Schoolenco Support" <support@schoolenco.com>', // sender address
        to,
        subject,
        html,
        attachments
      });

      console.log(`✅ Email sent to ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`❌ Error sending email to ${to}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send bulk emails with rate limiting
   * @param {Array} contacts - Array of objects { email, name, ... }
   * @param {string} subject - Email subject
   * @param {string} contentTemplate - HTML content with variables
   * @param {number} delayMs - Delay between emails
   */
  async sendBulkEmails(contacts, subject, contentTemplate, delayMs = 3000) {
    const results = [];
    console.log(`📤 Starting bulk email send to ${contacts.length} recipients`);

    for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        const email = contact.email || contact.to; // flexible key
        
        if (!email || !email.includes('@')) {
            console.warn(`⚠️ Skipping invalid email at row ${i + 1}: ${email}`);
            results.push({ email, status: 'invalid', error: 'Invalid email address' });
            continue;
        }

        // Personalize content
        let personalizedContent = contentTemplate;
        // Standard replacements
        personalizedContent = personalizedContent.replace(/\{\{name\}\}/gi, contact.name || 'there');
        personalizedContent = personalizedContent.replace(/\{\{email\}\}/gi, email);
        
        // Dynamic replacements for other keys
        Object.keys(contact).forEach(key => {
             const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
             personalizedContent = personalizedContent.replace(regex, contact[key] || '');
        });

        console.log(`📧 Sending ${i + 1}/${contacts.length} to ${email}`);
        
        const result = await this.sendEmail(email, subject, personalizedContent);
        
        results.push({
            email,
            status: result.success ? 'sent' : 'failed',
            error: result.error,
            messageId: result.messageId,
            timestamp: new Date().toISOString()
        });

        // Rate limiting delay
        if (i < contacts.length - 1) {
             console.log(`⏳ Waiting ${delayMs}ms...`);
             await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    
    return results;
  }
}

module.exports = EmailBot;
