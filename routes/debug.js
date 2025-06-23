const express = require('express');
const os = require('os');
const router = express.Router();

router.get('/specs', (req, res) => {
  const specs = {
    platform: os.platform(),
    arch: os.arch(),
    cpu: os.cpus(),
    totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
    freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
    uptimeSeconds: os.uptime(),
  };
  res.json(specs);
});

module.exports = router;
