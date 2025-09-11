const validateContact = (req, res, next) => {
  const { name, email, subject, message } = req.body;
  const errors = [];

  // Required field validation
  if (!name || name.trim().length === 0) {
    errors.push('Name is required');
  } else if (name.trim().length > 100) {
    errors.push('Name cannot exceed 100 characters');
  }

  if (!email || email.trim().length === 0) {
    errors.push('Email is required');
  } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
    errors.push('Please enter a valid email address');
  }

  if (!message || message.trim().length === 0) {
    errors.push('Message is required');
  } else if (message.trim().length > 2000) {
    errors.push('Message cannot exceed 2000 characters');
  }

  // Optional field validation
  if (req.body.phone && req.body.phone.trim().length > 20) {
    errors.push('Phone number cannot exceed 20 characters');
  }

  if (req.body.company && req.body.company.trim().length > 100) {
    errors.push('Company name cannot exceed 100 characters');
  }

  // Service validation
  // const validServices = [
  //   'Digital Marketing',
  //   'Web Design',
  //   'SEO Services',
  //   'Social Media Marketing',
  //   'Content Marketing',
  //   'Brand Development',
  //   'PPC Advertising',
  //   'Other'
  // ];
  // if (req.body.service && !validServices.includes(req.body.service)) {
  //   errors.push('Invalid service selection');
  // }

  // Budget validation
  // const validBudgets = [
  //   'Under $5,000',
  //   '$5,000 - $10,000',
  //   '$10,000 - $25,000',
  //   '$25,000 - $50,000',
  //   'Over $50,000',
  //   'Not sure'
  // ];
  // if (req.body.budget && !validBudgets.includes(req.body.budget)) {
  //   errors.push('Invalid budget selection');
  // }

  // Timeline validation
  // const validTimelines = [
  //   'ASAP',
  //   'Within 1 month',
  //   '1-3 months',
  //   '3-6 months',
  //   '6+ months',
  //   'Just exploring'
  // ];
  // if (req.body.timeline && !validTimelines.includes(req.body.timeline)) {
  //   errors.push('Invalid timeline selection');
  // }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

module.exports = {
  validateContact
};
