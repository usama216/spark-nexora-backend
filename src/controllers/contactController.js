// Always use MongoDB for simplicity
const Contact = require('../models/Contact');

// Create new contact message
const createContact = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      subject,
      message,
      service,
      budget,
      timeline
    } = req.body;

    // Get client IP and user agent
    const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent');

    const contactData = {
      name,
      email,
      phone,
      company,
      subject,
      message,
      service,
      budget,
      timeline,
      ipAddress,
      userAgent
    };

    const contact = await Contact.create(contactData);

    res.status(201).json({
      success: true,
      message: 'Thank you for your message! We will get back to you within 24 hours.',
      data: {
        id: contact._id || contact.id,
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        status: contact.status,
        createdAt: contact.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again.',
      error: error.message
    });
  }
};

// Get all contacts with filtering and pagination
const getAllContacts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      service,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (service) filter.service = service;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Simple MongoDB implementation
    const contacts = await Contact.find(filter)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Contact.countDocuments(filter);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        contacts,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalContacts: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contacts',
      error: error.message
    });
  }
};

// Get contact by ID
const getContactById = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findById(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact',
      error: error.message
    });
  }
};

// Update contact status
const updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;

    const contact = await Contact.findByIdAndUpdate(id, updateData, { new: true });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: contact
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact',
      error: error.message
    });
  }
};

// Add admin note to contact
const addAdminNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note, addedBy = 'Admin' } = req.body;

    if (!note || note.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Note is required'
      });
    }

    const contact = await Contact.findById(id);
      
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Add note to existing contact
    if (!contact.adminNotes) {
      contact.adminNotes = [];
    }
    contact.adminNotes.push({
      note: note.trim(),
      addedBy,
      addedAt: new Date().toISOString()
    });

    const updatedContact = await Contact.findByIdAndUpdate(id, { adminNotes: contact.adminNotes }, { new: true });

    if (!updatedContact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.json({
      success: true,
      message: 'Note added successfully',
      data: updatedContact
    });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add note',
      error: error.message
    });
  }
};

// Delete contact
const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findByIdAndDelete(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete contact',
      error: error.message
    });
  }
};

module.exports = {
  createContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  addAdminNote,
  deleteContact
};
