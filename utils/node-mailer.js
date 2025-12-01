import { config } from "dotenv";
import nodemailer from "nodemailer";

config();

let isMailerReady = false;

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASS,
  },
});

// Verify transporter once at startup
transporter.verify((err, success) => {
  if (err) {
    console.log("❌ Nodemailer verification failed:", err.message);
    isMailerReady = false;
  } else {
    console.log("✅ Nodemailer transporter ready:", success);
    isMailerReady = true;
  }
});

// Wrapper to safely send emails
export async function safeSendMail(mailOptions) {
  if (!isMailerReady) {
    console.log("⚠️ Mailer not ready, skipping email:", mailOptions.subject);
    return { skipped: true };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, info };
  } catch (error) {
    console.error("❌ Failed to send email:", error.message);
    return { success: false, error };
  }
}

export function sendPassword(to, password) {
  const mailOption = {
    from: '"Newpal Admin" <noreply@new-pal.com>',
    to,
    subject: "Your Newpal Admin Account Login Credentials",

    text: `
Hello,

Your admin account on Newpal has been successfully created.

Below are your login credentials:

Email: ${to}
Temporary Password: ${password}

For security reasons, please log in immediately and change your password.

If you did not expect this email, please contact the system administrator.

Regards,
Newpal Team
    `,

    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #930909ff;">
        <h2 style="color:#2c3e50;">Newpal Admin Account Created</h2>

        <p>Hello,</p>

        <p>Your admin account on <strong>Newpal</strong> has been successfully created.</p>

        <h3 style="margin-bottom: 5px;">Your Login Details:</h3>
        <div style="background:#f4f4f4; padding:10px; border-radius:5px; width: fit-content;">
          <p><strong>Email:</strong> ${to}</p>
          <p><strong>Temporary Password:</strong> ${password}</p>
        </div>

        <p style="margin-top: 20px;">
          For security reasons, please <strong>log in immediately and update your password.</strong>
        </p>

        <p>If you did not request or expect this account, kindly contact the system administrator.</p>

        <p style="margin-top: 20px;">Regards,<br><strong>Newpal Team</strong></p>
      </div>
    `,
  };

  return safeSendMail(mailOption);
}


