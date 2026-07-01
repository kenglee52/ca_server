const express = require('express');
require('dotenv').config();   

const morgan = require('morgan');
const { readdirSync } = require('fs');
const cors = require('cors');
const { getAdminDashboardData } = require('./services/Dashboard.service');
const path = require('path');
const app = express();

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(cors());

app.use(
  "/upload/signatures",
  express.static(path.join(__dirname, "upload/signatures"))
);




// Route middleware
readdirSync('./routes').map((routeFile) => app.use('/api', require(`./routes/${routeFile}`)));
app.get('/api/admin/dashboard', async (req, res) => {
  const data = await getAdminDashboardData();
  res.json(data);
});
app.get("/api/health", (req, res) => res.json({ ok: true }));
const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
