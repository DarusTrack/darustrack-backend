const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // Bisa juga pakai "smtp.ethereal.email", "mailgun", dll
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendResetPasswordEmail = async (email, token) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: `"DarusTrack" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Permintaan Reset Password',
    html: `
      <h3>Reset Password</h3>
      <p>Anda menerima email ini karena ada permintaan reset password untuk akun Anda.</p>
      <p><a href="${resetLink}">Klik di sini untuk reset password</a></p>
      <p>Link ini berlaku selama 1 jam.</p>
    `,
  });
};

module.exports = sendResetPasswordEmail;
