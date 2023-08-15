const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const mongoose = require('mongoose');
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

mongoose.connect((process.env.MONGO_URL), {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
console.log("db is connected")

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  resetToken: String,
  resetTokenExpiry: Date,
});

const User = mongoose.model('User', userSchema);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'shubhamsharma2334@gmail.com',
    pass: process.env.Email_password,
  },
});

app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).send({ message: 'User not found' });
  }

  const token = crypto.randomBytes(20).toString('hex');
  const tokenExpiry = Date.now() + 3600000;

  user.resetToken = token;
  user.resetTokenExpiry = tokenExpiry;
  await user.save();

  const resetLink = `http://localhost:3000/reset-password/${token}`;

  const mailOptions = {
    from: 'shubhamsharma2334@gmail.com',
    to: user.email,
    subject: 'Password Reset',
    text: `Click the following link to reset your password: ${resetLink}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });

  res.send({ message: 'Password reset email sent' });
});

app.get('/reset-password/:token', async (req, res) => {
  const { token } = req.params;

  const user = await User.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).send({ message: 'Invalid or expired token' });
  }

  res.send({ message: 'Token is valid' });
});

app.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  const user = await User.findOneAndUpdate(
    {
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    },
    {
      password: newPassword,
      resetToken: null,
      resetTokenExpiry: null,
    }
  );

  if (!user) {
    return res.status(400).send({ message: 'Invalid or expired token' });
  }

  res.send({ message: 'Password updated successfully' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});