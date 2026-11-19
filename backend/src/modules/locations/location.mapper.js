function toLocationResponse(location) {
  return {
    id: location.id,
    name: location.name,
    region: location.region,
    country: location.country,
    latitude: location.latitude,
    longitude: location.longitude,
    createdAt: location.createdAt,
  };
}

module.exports = { toLocationResponse };
