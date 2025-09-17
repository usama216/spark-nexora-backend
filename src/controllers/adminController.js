const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Contact = require('../models/Contact');

// Get all payments with pagination and filtering
const getAllPayments = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = '', 
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
        { packageName: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get payments with pagination
    const payments = await Payment.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalPayments = await Payment.countDocuments(filter);
    const totalPages = Math.ceil(totalPayments / parseInt(limit));

    // Get corresponding orders for each payment
    const paymentsWithOrders = await Promise.all(
      payments.map(async (payment) => {
        const order = await Order.findOne({ paymentId: payment._id }).lean();
        return {
          ...payment,
          order: order || null
        };
      })
    );

    res.json({
      success: true,
      data: {
        payments: paymentsWithOrders,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalPayments,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message
    });
  }
};

// Get payment statistics
const getPaymentStats = async (req, res) => {
  try {
    // Get total revenue (completed payments only)
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'succeeded' } },
      { $group: { _id: null, total: { $sum: '$packagePrice' } } }
    ]);

    // Get payment counts by status
    const statusCounts = await Payment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get recent payments (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentPayments = await Payment.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get monthly revenue for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyRevenue = await Payment.aggregate([
      { 
        $match: { 
          status: 'succeeded',
          createdAt: { $gte: sixMonthsAgo }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$packagePrice' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format status counts
    const statusStats = {
      succeeded: 0,
      pending: 0,
      failed: 0,
      canceled: 0
    };
    
    statusCounts.forEach(item => {
      statusStats[item._id] = item.count;
    });

    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue[0]?.total || 0,
        statusCounts: statusStats,
        recentPayments,
        monthlyRevenue: monthlyRevenue.map(item => ({
          month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
          revenue: item.revenue,
          count: item.count
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment statistics',
      error: error.message
    });
  }
};

// Get single payment details
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id).lean();
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Get corresponding order
    const order = await Order.findOne({ paymentId: payment._id }).lean();

    res.json({
      success: true,
      data: {
        payment,
        order: order || null
      }
    });

  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment details',
      error: error.message
    });
  }
};

// Update payment status
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const payment = await Payment.findById(id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Update payment status
    payment.status = status;
    if (notes) {
      payment.metadata = { ...payment.metadata, adminNotes: notes };
    }
    
    await payment.save();

    // Update corresponding order status
    const order = await Order.findOne({ paymentId: payment._id });
    if (order) {
      order.status = status === 'succeeded' ? 'paid' : status;
      if (notes) {
        order.adminNotes.push({
          note: notes,
          addedBy: 'Admin',
          addedAt: new Date()
        });
      }
      await order.save();
    }

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: {
        payment: {
          id: payment._id,
          status: payment.status,
          updatedAt: payment.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: error.message
    });
  }
};

// Get dashboard overview stats
const getDashboardStats = async (req, res) => {
  try {
    // Get contact stats
    const totalContacts = await Contact.countDocuments();
    const newContacts = await Contact.countDocuments({ status: 'new' });
    const repliedContacts = await Contact.countDocuments({ status: 'replied' });

    // Get payment stats
    const totalPayments = await Payment.countDocuments();
    const successfulPayments = await Payment.countDocuments({ status: 'succeeded' });
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'succeeded' } },
      { $group: { _id: null, total: { $sum: '$packagePrice' } } }
    ]);

    // Get recent activity
    const recentContacts = await Contact.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email status createdAt')
      .lean();

    const recentPayments = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('customerName customerEmail packageName packagePrice status createdAt')
      .lean();

    res.json({
      success: true,
      data: {
        overview: {
          contacts: {
            total: totalContacts,
            new: newContacts,
            replied: repliedContacts
          },
          payments: {
            total: totalPayments,
            successful: successfulPayments,
            revenue: totalRevenue[0]?.total || 0
          }
        },
        recentActivity: {
          contacts: recentContacts,
          payments: recentPayments
        }
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
    const recentContacts = await Contact.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name email status createdAt')
      .lean();

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
    // Get status counts
    const statusCounts = await Contact.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get contacts by month for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyContacts = await Contact.aggregate([
      { 
        $match: { 
          createdAt: { $gte: sixMonthsAgo }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format status counts
    const statusStats = {
      new: 0,
      read: 0,
      replied: 0,
      closed: 0
    };
    
    statusCounts.forEach(item => {
      statusStats[item._id] = item.count;
    });

    res.json({
      success: true,
      data: {
        statusCounts: statusStats,
        monthlyContacts: monthlyContacts.map(item => ({
          month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
          count: item.count
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching contact analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact analytics',
      error: error.message
    });
  }
};

// Bulk update contact status
const bulkUpdateStatus = async (req, res) => {
  try {
    const { contactIds, status } = req.body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Contact IDs are required'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const result = await Contact.updateMany(
      { _id: { $in: contactIds } },
      { status: status }
    );

    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} contacts`,
      data: {
        modifiedCount: result.modifiedCount
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
    const contacts = await Contact.find()
      .sort({ createdAt: -1 })
      .lean();

    // Convert to CSV format
    const csvHeader = 'Name,Email,Phone,Company,Service,Budget,Timeline,Subject,Message,Status,Created At\n';
    const csvData = contacts.map(contact => 
      `"${contact.name}","${contact.email}","${contact.phone || ''}","${contact.company || ''}","${contact.service}","${contact.budget}","${contact.timeline}","${contact.subject}","${contact.message.replace(/"/g, '""')}","${contact.status}","${contact.createdAt}"`
    ).join('\n');

    const csv = csvHeader + csvData;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
    res.send(csv);
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
  getAllPayments,
  getPaymentStats,
  getPaymentById,
  updatePaymentStatus,
  getDashboardStats,
  getRecentContacts,
  getContactAnalytics,
  bulkUpdateStatus,
  exportContacts
};