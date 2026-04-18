const MAX_ACTIVITY = 120;

const activityBuffer = [];

const pushActivity = (entry) => {
  activityBuffer.unshift(entry);
  if (activityBuffer.length > MAX_ACTIVITY) {
    activityBuffer.length = MAX_ACTIVITY;
  }
};

const getActivity = (limit = 25) => {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, Number(limit))) : 25;
  return activityBuffer.slice(0, safeLimit);
};

module.exports = {
  pushActivity,
  getActivity,
};
