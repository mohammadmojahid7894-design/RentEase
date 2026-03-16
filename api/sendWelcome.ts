import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, phone, email, role } = req.body;

  if (!name || !phone || !role) {
    return res.status(400).json({ error: 'Missing required fields: name, phone, role' });
  }

  let smsSent = false;
  let emailSent = false;
  let smsError: any = null;
  let emailError: any = null;

  // 1. Send SMS via Twilio
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
    try {
      const basicAuth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
      const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);
      const smsBody = `Welcome to RentEase! Your ${roleCapitalized} account has been created successfully. You can now log in and manage your rental activities.`;
      
      const formData = new URLSearchParams();
      formData.append('To', phone);
      formData.append('From', TWILIO_PHONE_NUMBER);
      formData.append('Body', smsBody);

      const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      });

      if (twilioRes.ok) {
        smsSent = true;
      } else {
        const errorData = await twilioRes.json();
        smsError = errorData.message || 'Twilio API error';
      }
    } catch (e: any) {
      smsError = e.message;
    }
  } else {
    smsError = 'Missing Twilio environment variables';
  }

  // 2. Send Email via Resend
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  // If no sender email is configured in env, Resend allows using onboarding@resend.dev but only to your own verified email.
  // In production, this should be "noreply@yourdomain.com". We default to RentEase <onboarding@resend.dev> for testing.
  const SENDER_EMAIL = process.env.RESEND_SENDER_EMAIL || 'onboarding@resend.dev';

  if (email && RESEND_API_KEY) {
    try {
      const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);
      
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `RentEase <${SENDER_EMAIL}>`,
          to: [email],
          subject: 'Welcome to RentEase',
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
              <h2>Hello ${name},</h2>
              <p>Your <strong>${roleCapitalized}</strong> account has been created successfully on RentEase.</p>
              <p>You can now log in and start using the platform to manage your rental activities.</p>
              <br/>
              <p>Thank you for joining RentEase!</p>
              <p>Best regards,<br/><strong>The RentEase Team</strong></p>
            </div>
          `
        })
      });

      if (emailRes.ok) {
        emailSent = true;
      } else {
        const errorData = await emailRes.json();
        emailError = errorData.message || 'Resend API error';
      }
    } catch (e: any) {
      emailError = e.message;
    }
  } else if (!email) {
    emailError = 'No email provided by user';
  } else {
    emailError = 'Missing Resend environment variables';
  }

  return res.status(200).json({
    success: true,
    smsSent,
    emailSent,
    smsError,
    emailError
  });
}
