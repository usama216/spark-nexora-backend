const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../../data/contacts.json');

// Ensure data directory exists
const dataDir = path.dirname(dataFile);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize empty contacts array if file doesn't exist
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify([], null, 2));
}

class ContactJSON {
  static async create(contactData) {
    try {
      const contacts = this.getAll();
      const newContact = {
        _id: Date.now().toString(),
        ...contactData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      contacts.push(newContact);
      this.saveAll(contacts);
      return newContact;
    } catch (error) {
      throw error;
    }
  }

  static getAll() {
    try {
      const data = fs.readFileSync(dataFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  static findById(id) {
    const contacts = this.getAll();
    return contacts.find(contact => contact._id === id);
  }

  static find(filter = {}) {
    let contacts = this.getAll();
    
    // Apply filters
    if (filter.status) {
      contacts = contacts.filter(contact => contact.status === filter.status);
    }
    if (filter.priority) {
      contacts = contacts.filter(contact => contact.priority === filter.priority);
    }
    if (filter.service) {
      contacts = contacts.filter(contact => contact.service === filter.service);
    }
    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      contacts = contacts.filter(contact => 
        contact.name.toLowerCase().includes(searchTerm) ||
        contact.email.toLowerCase().includes(searchTerm) ||
        contact.subject.toLowerCase().includes(searchTerm) ||
        (contact.company && contact.company.toLowerCase().includes(searchTerm))
      );
    }

    return contacts;
  }

  static findByIdAndUpdate(id, updateData) {
    const contacts = this.getAll();
    const index = contacts.findIndex(contact => contact._id === id);
    
    if (index === -1) {
      return null;
    }

    contacts[index] = {
      ...contacts[index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    this.saveAll(contacts);
    return contacts[index];
  }

  static findByIdAndDelete(id) {
    const contacts = this.getAll();
    const index = contacts.findIndex(contact => contact._id === id);
    
    if (index === -1) {
      return null;
    }

    const deletedContact = contacts.splice(index, 1)[0];
    this.saveAll(contacts);
    return deletedContact;
  }

  static countDocuments(filter = {}) {
    const contacts = this.find(filter);
    return contacts.length;
  }

  static aggregate(pipeline) {
    const contacts = this.getAll();
    
    // Simple aggregation for basic stats
    if (pipeline[0] && pipeline[0].$group) {
      const groupBy = pipeline[0].$group._id;
      const countField = pipeline[0].$group.count;
      
      const grouped = {};
      contacts.forEach(contact => {
        const key = contact[groupBy];
        if (!grouped[key]) {
          grouped[key] = 0;
        }
        grouped[key]++;
      });

      return Object.entries(grouped).map(([key, count]) => ({
        _id: key,
        count: count
      }));
    }

    return [];
  }

  static saveAll(contacts) {
    fs.writeFileSync(dataFile, JSON.stringify(contacts, null, 2));
  }
}

module.exports = ContactJSON;
