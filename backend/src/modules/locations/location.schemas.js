const { z } = require('zod');
const { pageQuerySchema } = require('../../utils/pagination');

// Letters in any language, digits, spaces and the punctuation found in place names
// and coordinates. Anything else is refused before it reaches the weather API.
const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, 'Type at least 2 characters.')
    .max(100, 'Use at most 100 characters.')
    .regex(/^[\p{L}\p{N}\s,.'-]+$/u, "We couldn't find that place. Try a nearby city or coordinates."),
});

const optionalText = z.string().trim().max(100).nullish();

const createLocationSchema = z.object({
  name: z.string().trim().min(1, 'Pick a place.').max(100),
  region: optionalText,
  country: optionalText,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const listLocationsQuerySchema = pageQuerySchema;

module.exports = { searchQuerySchema, createLocationSchema, listLocationsQuerySchema };
