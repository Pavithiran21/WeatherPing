const { z } = require('zod');
const { pageQuerySchema } = require('../../utils/pagination');
const { objectIdSchema } = require('../../utils/validation');
const { CONDITIONS, CONDITION_NAMES } = require('./conditions');

const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a time like 07:30.');

// The fields of a rule, each checked on its own.
const ruleFields = z.object({
  locationId: objectIdSchema,
  condition: z.enum(CONDITION_NAMES, 'Pick a condition.'),
  threshold: z.number('Enter a number.'),
  windowStart: timeOfDay,
  windowEnd: timeOfDay,
});

// Checks that need several fields: the threshold range depends on the condition, and
// the window must not cross midnight. "HH:mm" strings compare correctly as text.
function checkRule(rule, ctx) {
  const condition = CONDITIONS[rule.condition];
  if (condition && (rule.threshold < condition.min || rule.threshold > condition.max)) {
    ctx.addIssue({ code: 'custom', path: ['threshold'], message: condition.rangeMessage });
  }
  if (rule.windowEnd <= rule.windowStart) {
    ctx.addIssue({ code: 'custom', path: ['windowEnd'], message: 'End time must be after the start time.' });
  }
}

const ruleSchema = ruleFields.superRefine(checkRule);

// PATCH: any subset of the fields. The service merges it with the stored rule and
// validates the result with ruleSchema.
const ruleChangesSchema = ruleFields
  .partial()
  .refine((changes) => Object.keys(changes).length > 0, 'Change at least one field.');

const listRulesQuerySchema = pageQuerySchema.extend({
  locationId: objectIdSchema.optional(),
  status: z.enum(['active', 'paused']).optional(),
});

module.exports = { ruleSchema, ruleChangesSchema, listRulesQuerySchema };
