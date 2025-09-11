const express = require('express');
const { createContact, getAllContacts, getContactById, updateContactStatus, deleteContact, addAdminNote } = require('../controllers/contactController');
const { validateContact } = require('../middleware/validation');

const router = express.Router();

// POST /api/contact - Create new contact message
router.post('/', validateContact, createContact);

// GET /api/contact - Get all contacts (for admin dashboard)
router.get('/', getAllContacts);

// GET /api/contact/:id - Get specific contact
router.get('/:id', getContactById);

// PUT /api/contact/:id/status - Update contact status
router.put('/:id/status', updateContactStatus);

// PUT /api/contact/:id/note - Add admin note
router.put('/:id/note', addAdminNote);

// DELETE /api/contact/:id - Delete contact
router.delete('/:id', deleteContact);

module.exports = router;
