const MAX_ACTIVITY = 200; // Increased buffer for better stats

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

const getMetrics = () => {
  if (activityBuffer.length === 0) {
    return {
      latency: { avg: 0, p95: 0, p99: 0 },
      errorRate: 0,
      totalRequests: 0,
      traffic: 0
    };
  }

  const latencies = activityBuffer.map(a => a.durationMs).sort((a, b) => a - b);
  const errors = activityBuffer.filter(a => a.statusCode >= 400).length;
  
  const getPercentile = (arr, p) => {
    const idx = Math.floor((p / 100) * arr.length);
    return arr[Math.min(idx, arr.length - 1)];
  };

  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  
  // Traffic calculation (RPM based on buffer window)
  const newest = new Date(activityBuffer[0].timestamp);
  const oldest = new Date(activityBuffer[activityBuffer.length - 1].timestamp);
  const durationMin = Math.max(1, (newest - oldest) / 60000);
  const rpm = activityBuffer.length / durationMin;

  return {
    latency: {
      avg: Math.round(avgLatency * 100) / 100,
      p95: Math.round(getPercentile(latencies, 95) * 100) / 100,
      p99: Math.round(getPercentile(latencies, 99) * 100) / 100
    },
    errorRate: Math.round((errors / activityBuffer.length) * 10000) / 100,
    totalRequests: activityBuffer.length,
    traffic: Math.round(rpm * 100) / 100
  };
};

module.exports = {
  pushActivity,
  getActivity,
  getMetrics,
};
