const { pageQuerySchema } = require('../../utils/pagination');
const { objectIdSchema } = require('../../utils/validation');

const listAlertsQuerySchema = pageQuerySchema.extend({
  locationId: objectIdSchema.optional(),
});

module.exports = { listAlertsQuerySchema };
