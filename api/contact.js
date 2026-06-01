// /api/contact.js
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ success: false, error: 'All fields are required.' });
        }

        const cleanName = name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const cleanMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // Switching parameters to Porkbun's alternate submission port
        const transporter = nodemailer.createTransport({
            host: 'smtp.porkbun.com',
            port: 587,
            secure: false, // false for port 587 (STARTTLS)
            auth: {
                user: process.env.PORKBUN_EMAIL_USER,
                pass: process.env.PORKBUN_EMAIL_PASS  
            },
            tls: {
                rejectUnauthorized: false // Helps prevent cloud provider connection drops
            }
        });

        const mailOptions = {
            from: `"Sandbox Support Hub" <${process.env.PORKBUN_EMAIL_USER}>`, 
            to: process.env.PORKBUN_EMAIL_USER, 
            replyTo: email,                    
            subject: `📬 New Support Request from ${cleanName}`,
            text: `Support request from: ${cleanName} (${email})\n\nMessage:\n${cleanMessage}`
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: 'Message sent successfully.' });

    } catch (error) {
        console.error('Porkbun SMTP Connection Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to dispatch email via Porkbun server.' });
    }
}