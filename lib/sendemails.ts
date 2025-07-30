import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendApprovalEmail(toEmail: string, studentName: string, passwordResetLink: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Kimtronix Onboarding <onboarding@kimtronix.com>',
      to: [toEmail],
      subject: 'Your SkillsG Account has been Approved!',
      html: `
        <div>
          <h1>Welcome to SkillsG, ${studentName}!</h1>
          <p>Your application has been approved by Kimtronix Global.</p>
          <p>The final step is to set your password. Please click the link below to secure your account:</p>
          <a href="${passwordResetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Set Your Password</a>
          <p>If you have any questions, please contact our support team.</p>
        </div>
      `,
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log("Approval email sent successfully:", data);
    return data;

  } catch (error) {
    console.error("Error sending approval email:", error);
    throw error; // Re-throw the error to be caught by the API route
  }
}
