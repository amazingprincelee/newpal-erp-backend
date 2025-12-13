import { config } from "dotenv";
import nodemailer from "nodemailer";
import CompanyInfo from "../models/companyInformation.js";

config();

let isMailerReady = false;

export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
   tls: {
       // do not fail on invalid certs
       rejectUnauthorized: false
     }
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

export async function sendPassword(to, password, username, ) {
  // Fetch company info (logo, etc.)
  let company = await CompanyInfo.findOne();
  const logo = company?.logo || "https://via.placeholder.com/150?text=Logo";

  const primaryColor = "#800000";

  const mailOption = {
    from: '"Newpal Admin" <noreply@newpalfoods.com>',
    to,
    subject: "Your Newpal ERP Account Login Credentials",

    html: `
      <div style="font-family: Arial, sans-serif; background:#ffffff; padding:20px;">

        <!-- Logo Section -->
        <div style="text-align:center; border-bottom: 3px solid ${primaryColor}; padding-bottom:15px; margin-bottom:20px;">
          <img src="${logo}" alt="Company Logo" style="height:70px; object-fit:contain;" />
        </div>

        <h2 style="color:${primaryColor}; margin-top:0;">Newpal Admin Account Created</h2>

        <p>Hello,</p>

        <p>Your ERP account on <strong>Newpal</strong> has been successfully created.</p>

        <h3 style="margin-bottom: 8px; color:${primaryColor};">Your Login Details:</h3>

        <div style="
            background:#f8f8f8;
            padding:12px;
            border-left:4px solid ${primaryColor};
            border-radius:5px;
            width:max-content;
        ">
          <p><strong>username:</strong> ${username}</p>
          <p><strong>Temporary Password:</strong> ${password}</p>
        </div>

        <p style="margin-top:20px;">
          For security reasons, please <strong>log in immediately and change your password.</strong>
        </p>

        <p>If you did not request this account, kindly contact the system administrator.</p>

        <br>

        <p style="color:${primaryColor}; font-weight:bold;">Newpal Team</p>
      </div>
    `,
  };

  return safeSendMail(mailOption);
}


export const sendNotificationEmail = async ({ to, subject, message, link }) => {
  let company = await CompanyInfo.findOne();
  const logo = company?.logo || "https://via.placeholder.com/150?text=Newpal";
  const primaryColor = "#800000";
  const appUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background:#f4f4f4; padding:30px;">
      <div style="max-width:600px; margin:0 auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, ${primaryColor}, #a00000); padding:25px; text-align:center;">
          <img src="${logo}" alt="Newpal" style="height:55px; filter: brightness(0) invert(1);" />
        </div>

        <!-- Body -->
        <div style="padding:30px;">
          <h2 style="color:${primaryColor}; margin-top:0; font-size:24px;">New Notification</h2>
          
          <div style="background:#f8f9fa; padding:20px; border-radius:10px; border-left:5px solid ${primaryColor}; margin:20px 0;">
            <h3 style="margin:0 0 10px 0; color:#333;">${subject}</h3>
            <p style="margin:0; color:#555; line-height:1.6;">${message}</p>
          </div>

          ${link ? `
            <div style="text-align:center; margin:30px 0;">
              <a href="${appUrl}${link}" 
                 style="background:${primaryColor}; color:white; padding:14px 32px; text-decoration:none; border-radius:50px; font-weight:bold; font-size:16px; display:inline-block;">
                View in Newpal ERP
              </a>
            </div>
          ` : ''}

          <hr style="border:0; border-top:1px dashed #ddd; margin:40px 0;">

          <p style="font-size:13px; color:#888; text-align:center;">
            This is an automated message from <strong>Newpal ERP System</strong><br>
            © ${new Date().getFullYear()} Newpal Foods. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;

  return safeSendMail({
    from: '"Newpal ERP" <noreply@newpalfoods.com>',
    to,
    subject: `Newpal Alert: ${subject}`,
    html
  });
};

