// /api/contact.js
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    // Restrict requests exclusively to incoming POST data
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    try {
        const { name, email, message } = req.body;

        // Input presence validation check
        if (!name || !email || !message) {
            return res.status(400).json({ success: false, error: 'All form fields are required.' });
        }

        // Basic character stripping to escape basic markup injection attempts
        const cleanName = name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const cleanMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // Open a direct channel to Porkbun's secure transactional mail servers
        const transporter = nodemailer.createTransport({
            host: 'smtp.porkbun.com',
            port: 465,
            secure: true, 
            auth: {
                user: process.env.PORKBUN_EMAIL_USER, // Kept safe behind your Vercel Dashboard settings
                pass: process.env.PORKBUN_EMAIL_PASS  
            }
        });

        // Map the physical transmission metrics
        const mailOptions = {
            from: `"Sandbox Hub" <${process.env.PORKBUN_EMAIL_USER}>`, 
            to: process.env.PORKBUN_EMAIL_USER, // Forwards the notification right back to your inbox
            replyTo: email,                    // Directs a client "Reply" click straight back to the student's email address
            subject: `📬 Support Ticket: ${cleanName}`,
            text: `Sender: ${cleanName} (${email})\n\nIssue Details:\n${cleanMessage}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; background-color: #171717; color: #e5e5e5; border-radius: 12px; max-width: 600px;">
                    <h2 style="color: #f59e0b; border-bottom: 1px solid #2a2a2a; padding-bottom: 10px; font-size: 16px; text-transform: uppercase;">New Support Request</h2>
                    <p style="font-size: 13px;"><strong>Student Name:</strong> ${cleanName}</p>
                    <p style="font-size: 13px;"><strong>Student Email:</strong> <a href="mailto:${email}" style="color: #f59e0b; text-decoration: none;">${email}</a></p>
                    <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 15px 0;">
                    <p style="font-size: 12px; uppercase; color: #a3a3a3; font-weight: bold; margin-bottom: 4px;">Message Details:</p>
                    <blockquote style="background-color: #212121; padding: 12px; border-left: 4px solid #b45309; border-radius: 4px; margin: 0; font-size: 13px; font-style: italic; color: #d4d4d4; white-space: pre-wrap;">${cleanMessage}</blockquote>
                </div>
            `
        };

        // Command your email host to pass the message along
        await transporter.sendMail(mailOptions);

        return res.status(200).json({ success: true, message: 'Message sent successfully.' });

    } catch (error) {
        console.error('Porkbun Engine Error Exception:', error);
        return res.status(500).json({ success: false, error: 'Failed to dispatch notification via mail server.' });
    }
}