// Always use MongoDB for simplicity
const Contact = require('../models/Contact');

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const totalContacts = Contact.countDocuments();
    const newContacts = Contact.countDocuments({ status: 'new' });
    const readContacts = Contact.countDocuments({ status: 'read' });
    const repliedContacts = Contact.countDocuments({ status: 'replied' });
    const closedContacts = Contact.countDocuments({ status: 'closed' });

    // Get contacts from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentContacts = Contact.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // Get contacts from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyContacts = Contact.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get priority breakdown
    const priorityStats = Contact.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get service breakdown
    const serviceStats = Contact.aggregate([
      {
        $group: {
          _id: '$service',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Get daily contact counts for last 7 days
    const dailyStats = Contact.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalContacts,
          newContacts,
          readContacts,
          repliedContacts,
          closedContacts,
          recentContacts,
          monthlyContacts
        },
        priorityStats,
        serviceStats,
        dailyStats
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

// Get recent contacts
const getRecentContacts = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    let recentContacts = Contact.find();
    recentContacts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    recentContacts = recentContacts.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: recentContacts
    });
  } catch (error) {
    console.error('Error fetching recent contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent contacts',
      error: error.message
    });
  }
};

// Get contact analytics
const getContactAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Status distribution
    const statusDistribution = await Contact.aggregate([
      {
        $match: { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Service distribution
    const serviceDistribution = await Contact.aggregate([
      {
        $match: { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: '$service',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Budget distribution
    const budgetDistribution = await Contact.aggregate([
      {
        $match: { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: '$budget',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Timeline distribution
    const timelineDistribution = await Contact.aggregate([
      {
        $match: { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: '$timeline',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Hourly distribution (when contacts are submitted)
    const hourlyDistribution = await Contact.aggregate([
      {
        $match: { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        statusDistribution,
        serviceDistribution,
        budgetDistribution,
        timelineDistribution,
        hourlyDistribution
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
};

// Bulk update contact status
const bulkUpdateStatus = async (req, res) => {
  try {
    const { contactIds, status, priority } = req.body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Contact IDs are required'
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;

    const result = await Contact.updateMany(
      { _id: { $in: contactIds } },
      updateData
    );

    res.json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} contacts`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      }
    });
  } catch (error) {
    console.error('Error bulk updating contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update contacts',
      error: error.message
    });
  }
};

// Export contacts
const exportContacts = async (req, res) => {
  try {
    const { format = 'json', status, startDate, endDate } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const contacts = await Contact.find(filter)
      .sort({ createdAt: -1 })
      .select('-__v -adminNotes')
      .lean();

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeader = 'Name,Email,Phone,Company,Subject,Service,Budget,Timeline,Status,Priority,Created At\n';
      const csvData = contacts.map(contact => {
        return [
          contact.name,
          contact.email,
          contact.phone || '',
          contact.company || '',
          contact.subject,
          contact.service,
          contact.budget,
          contact.timeline,
          contact.status,
          contact.priority,
          contact.createdAt.toISOString()
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
      }).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
      res.send(csvHeader + csvData);
    } else {
      // Return JSON
      res.json({
        success: true,
        data: contacts,
        count: contacts.length,
        exportedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error exporting contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export contacts',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  getRecentContacts,
  getContactAnalytics,
  bulkUpdateStatus,
  exportContacts
};
