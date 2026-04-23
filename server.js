require('dotenv').config();
const express = require('express');

const app = express();

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
const ussdRoutes = require('./src/routes/ussdRoutes');

// ✅ ALL ROUTES FIXED
app.use('/', ussdRoutes);

// Root check
app.get('/', (req, res) => {
  res.send('🚀 SportzFX Server Running');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
