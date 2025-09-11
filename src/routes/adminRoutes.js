const express = require('express');
const { 
  getDashboardStats, 
  getRecentContacts, 
  getContactAnalytics,
  bulkUpdateStatus,
  exportContacts
} = require('../controllers/adminController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and admin authorization to all admin routes
router.use(authenticate);
router.use(authorizeAdmin);

// GET /api/admin/dashboard - Get dashboard statistics
router.get('/dashboard', getDashboardStats);

// GET /api/admin/recent - Get recent contacts
router.get('/recent', getRecentContacts);

// GET /api/admin/analytics - Get contact analytics
router.get('/analytics', getContactAnalytics);

// PUT /api/admin/bulk-update - Bulk update contact status
router.put('/bulk-update', bulkUpdateStatus);

// GET /api/admin/export - Export contacts
router.get('/export', exportContacts);

module.exports = router;
