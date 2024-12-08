import { RealityStabilityAPI } from '../../api/RealityStabilityAPI';
import { BaseAPI } from '../../api/BaseAPI';

jest.mock('../../api/BaseAPI');

describe('RealityStabilityAPI', () => {
  let api: RealityStabilityAPI;
  const baseUrl = 'http://localhost:3000';
  const apiKey = 'test-api-key';

  const mockData = {
    stabilityIndex: 0.85,
    currentPrice: 100,
    priceChange: 5,
    timestamp: '2023-01-01'
  };

  const mockResponse = {
    success: true,
    data: mockData
  };

  beforeEach(() => {
    jest.clearAllMocks();
    api = new RealityStabilityAPI({ baseUrl, apiKey });
  });

  describe('getStability', () => {
    it('should get reality stability successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockResponse);

      const response = await api.getStability();

      expect(api['fetchApi']).toHaveBeenCalledWith('/reality-stability', {
        method: 'GET',
      });
      expect(response).toEqual(mockResponse);
    });

    it('should handle errors when getting reality stability', async () => {
      const error = new Error('Failed to get reality stability');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.getStability()).rejects.toThrow(
        'Failed to get reality stability: Failed to get reality stability'
      );
    });
  });
}); 