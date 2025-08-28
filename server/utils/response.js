const sendResponse = (res, statusCode, data = null, message = null, errors = null) => {
  const response = {
    success: statusCode >= 200 && statusCode < 300,
    message: message || (statusCode >= 200 && statusCode < 300 ? 'Success' : 'Error'),
    data: data || {}
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

module.exports = { sendResponse }; 