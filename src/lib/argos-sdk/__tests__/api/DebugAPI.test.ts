import { DebugAPI } from '../../api/DebugAPI';
import { BaseAPI } from '../../api/BaseAPI';

jest.mock('../../api/BaseAPI');

describe('DebugAPI', () => {
  let api: DebugAPI;
  const baseUrl = 'http://localhost:3000';
  const apiKey = 'test-api-key';

  const mockData = {
    message: 'Debug info',
    timestamp: '2023-01-01',
    level: 'info',
    metadata: {
      key: 'value'
    }
  };

  const mockResponse = {
    success: true,
    data: mockData
  };

  beforeEach(() => {
    jest.clearAllMocks();
    api = new DebugAPI({ baseUrl, apiKey });
  });

  describe('getDebugInfo', () => {
    it('should get debug info successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockResponse);

      const response = await api.getDebugInfo();

      expect(api['fetchApi']).toHaveBeenCalledWith('/debug/info', {
        method: 'GET',
      });
      expect(response).toEqual(mockResponse);
    });

    it('should handle errors when getting debug info', async () => {
      const error = new Error('Failed to get debug info');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.getDebugInfo()).rejects.toThrow(
        'Failed to get debug info: Failed to get debug info'
      );
    });
  });
}); 