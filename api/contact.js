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

        // Target Porkbun's alternate custom port to bypass cloud hosting restrictions
        const transporter = nodemailer.createTransport({
            host: 'smtp.porkbun.com',
            port: 50587,
            secure: false, // Must be false for STARTTLS / STARTTLS Alt.
            auth: {
                user: process.env.PORKBUN_EMAIL_USER,
                pass: process.env.PORKBUN_EMAIL_PASS  
            },
            tls: {
                // Ensure the connection doesn't drop due to certificate hostname mismatches
                ciphers: 'SSLv3',
                rejectUnauthorized: false 
            }
        });

        const mailOptions = {
            from: `"Sandbox Hub" <${process.env.PORKBUN_EMAIL_USER}>`, 
            to: process.env.PORKBUN_EMAIL_USER, 
            replyTo: email,                    
            subject: `📬 Support Ticket: ${cleanName}`,
            text: `Sender: ${cleanName} (${email})\n\nIssue Details:\n${cleanMessage}`
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: 'Message sent successfully.' });

    } catch (error) {
        console.error('Alternate Port Connection Exception:', error);
        return res.status(500).json({ success: false, error: error.message || 'Server mail dispatch exception.' });
    }
}