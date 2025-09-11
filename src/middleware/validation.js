const validateContact = (req, res, next) => {
  // No validation - allow all requests through
  // API is completely open without any restrictions
  next();
};

module.exports = {
  validateContact
};
