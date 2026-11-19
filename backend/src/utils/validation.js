const { z } = require('zod');

// MongoDB ids are 24 hex characters. Checking the format first turns a bad id into a
// clear 400 instead of a database cast error.
const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Not a valid id.');

const idParamsSchema = z.object({ id: objectIdSchema });

module.exports = { objectIdSchema, idParamsSchema };
