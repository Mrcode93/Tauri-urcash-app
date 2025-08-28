export const getMostSoldProducts = async (params: { limit?: number; period?: 'week' | 'month' | 'year' } = {}) => {
  const { limit = 5, period = 'month' } = params;
  const response = await api.get(`/inventory/most-sold?limit=${limit}&period=${period}`);
  return response.data;
}; 