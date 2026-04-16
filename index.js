require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path'); 
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Allow requests from your React frontend
app.use(express.json()); // Parse incoming JSON requests

app.use(express.static(path.join(__dirname, 'dist')));

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { 
    success: false, 
    message: "Too many requests from this IP, please try again after 15 minutes." 
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Route to handle Contact Form submission
app.post('/api/contact',contactLimiter, async (req, res) => {
  const { name, email, phone, message } = req.body;

  // 1. Basic Validation
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: "Please fill in all required fields." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Please enter a valid email address." });
  }

    // 3. Phone Validation (PNG + International)
  if (phone) {
    const digitsOnly = phone.replace(/\D/g, ''); 
    if (digitsOnly.length<8 || digitsOnly.length>15) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid phone number. Please enter a valid 8-digit PNG number or full international number." 
      });
    }
  }

  const cleanMessage = message.replace(/<\/?[^>]+(>|$)/g, "");

  // 2. Configure Nodemailer Transporter
  const transporter = nodemailer.createTransport({
  host: 'mail.privateemail.com',
  port: 465, // Use 465 for SSL or 587 for TLS
  secure: true, // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
    }
  });

  // 3. Construct Email
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: process.env.EMAIL_TO,
    replyTo: `${email}`,
    subject: `New Contact Inquiry from ${name}`,
    html: `
      <h2>Contact Form Submission</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <hr style="margin: 10px 0;" />
      <p><strong>Message:</strong></p>
      <p>${cleanMessage}</p>
    `,
    text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nMessage: ${message}`
  };

   // 3. Send Email
  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
    return res.status(200).json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    return res.status(500).json({ success: false, message: "Server failed to send email." });
  }
});

// Any request not caught above (like /services, /forms) returns index.html
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});