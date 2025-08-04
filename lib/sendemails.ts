import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendApprovalEmail(toEmail: string, studentName: string, passwordResetLink: string) {
  try {
    await resend.emails.send({
      from: 'Kimtronix Onboarding <onboarding@kimtronix.com>',
      to: [toEmail],
      subject: 'Your SkillsG Account has been Approved!',
      replyTo: 'support@kimtronix.com',
      html: `
        <div>
          <h1>Welcome to SkillsG, ${studentName}!</h1>
          <p>Your application has been approved by Kimtronix Global.</p>
          <p>The final step is to set your password. Please click the link below:</p>
          <a href="${passwordResetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Set Your Password</a>
        </div>
      `,
      text: `Welcome to SkillsG! Please set your password: ${passwordResetLink}`
    });
  } catch (error) {
    console.error("Error sending approval email:", error);
    throw error;
  }
}

export async function sendRejectionEmail(toEmail: string, studentName: string) {
  try {
    await resend.emails.send({
      from: 'Kimtronix Onboarding <onboarding@kimtronix.com>',
      to: [toEmail],
      subject: 'Your Application Status',
      replyTo: 'support@kimtronix.com',
      html: `
        <div>
          <h1>Thank You for Applying, ${studentName}</h1>
          <p>We regret to inform you that your application has not been successful.</p>
          <p>We encourage you to apply with us again next recruiting season.</p>
        </div>
      `,
      text: `Thank you for applying. Unfortunately, your application was not successful.`
    });
  } catch (error) {
    console.error("Error sending rejection email:", error);
    throw error;
  }
}