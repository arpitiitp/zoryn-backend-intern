const errorHandler = (err, req, res, next) => {
    console.error(`[Error] ${err.message}`, err.stack);
    
    // If we've got a formatting middleware attached
    if (typeof res.error === 'function') {
        // Validation errors usually come with a generic 400
        if (err.isJoi || err.name === 'ValidationError') {
            return res.error(err.details[0].message || err.message, 400, err.details);
        }
        
        // Custom controlled errors
        if (err.statusCode) {
            return res.error(err.message, err.statusCode);
        }

        // Generic fallback error
        return res.error('Internal Server Error', 500);
    }
    
    // Fallback if the formatter wasn't loaded
    res.status(500).json({ success: false, message: 'Internal Server Error' });
};

module.exports = errorHandler;
