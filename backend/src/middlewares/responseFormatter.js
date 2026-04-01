const responseFormatter = (req, res, next) => {
    // Attach a success method to the response object
    res.success = (data = null, message = 'Success', meta = null, statusCode = 200) => {
        const responseList = {
            success: true,
            message
        };

        if (data !== null) responseList.data = data;
        if (meta !== null) responseList.meta = meta;

        return res.status(statusCode).json(responseList);
    };

    // Attach an error method to the response object
    res.error = (message = 'Internal Server Error', statusCode = 500, errors = null) => {
        const responseList = {
            success: false,
            message
        };

        if (errors !== null) responseList.errors = errors;

        return res.status(statusCode).json(responseList);
    };

    next();
};

module.exports = responseFormatter;
