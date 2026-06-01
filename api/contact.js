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

        const transporter = nodemailer.createTransport({
            host: 'smtp.porkbun.com',
            port: 50587, // Using Porkbun's alternate cloud-friendly port
            secure: false, 
            auth: {
                user: process.env.PORKBUN_EMAIL_USER, // Will securely read 'morkyonthemap'
                pass: process.env.PORKBUN_EMAIL_PASS  // Your Porkbun account password
            },
            tls: {
                ciphers: 'SSLv3',
                rejectUnauthorized: false 
            }
        });

        const mailOptions = {
            // Hardcoding your actual mailbox address so servers accept the dispatch layout
            from: `"Sandbox Hub" <hello@verdantlogic.io>`, 
            to: 'hello@verdantlogic.io', 
            replyTo: email,                    
            subject: `📬 Support Ticket from ${cleanName}`,
            text: `Sender: ${cleanName} (${email})\n\nIssue Details:\n${cleanMessage}`
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: 'Message sent successfully.' });

    } catch (error) {
        console.error('SMTP Authentication Exception:', error);
        return res.status(500).json({ success: false, error: error.message || 'Server mail dispatch exception.' });
    }
}