const { sendResponse } = require('../utils/response');

function authorize(roles = []) {
  return (req, res, next) => {
    if (!req.user || (roles.length && !roles.includes(req.user.role))) {
      return sendResponse(res, 403, null, 'Forbidden: insufficient permissions');
    }
    next();
  };
}

module.exports = authorize; 