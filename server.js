require('dotenv').config();
const express = require('express');

const app = express();

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Import routes (IMPORTANT FIX)
const ussdRoutes = require('./src/routes/ussdRoutes');

// Routes
app.use('/ussd', ussdRoutes);
app.use('/ussd/receive', ussdRoutes);

app.use('/subscription', ussdRoutes);
app.use('/subscription/receive', ussdRoutes);

// Root
app.get('/', (req, res) => {
  res.send('🚀 SportzFX Server Running');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
