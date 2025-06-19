require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Инициализация
const app = express();

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blackfireshop', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB подключена'))
  .catch(err => console.error('Ошибка подключения MongoDB:', err));

// Модель пользователя
const User = mongoose.model('User', new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}));

// Middleware
app.use(bodyParser.json());

// Роут регистрации
app.post('/api/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Проверка дубликата
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Email уже зарегистрирован' });
      }

      // Хеширование пароля
      const hashedPassword = await bcrypt.hash(password, 12);

      // Создание пользователя
      const user = new User({ email, password: hashedPassword });
      await user.save();

      // Генерация JWT-токена
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '1h' });

      res.status(201).json({ token, userId: user._id });
    } catch (err) {
      console.error('Ошибка регистрации:', err);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
);

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});