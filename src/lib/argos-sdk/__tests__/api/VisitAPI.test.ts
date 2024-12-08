import { VisitAPI } from '../../api/VisitAPI';
import { BaseAPI } from '../../api/BaseAPI';

jest.mock('../../api/BaseAPI');

describe('VisitAPI', () => {
  let api: VisitAPI;
  const baseUrl = 'http://localhost:3000';
  const apiKey = 'test-api-key';

  const mockVisitData = {
    id: 'test-id',
    fingerprintId: 'test-fingerprint-id',
    url: 'http://example.com',
    referrer: 'http://referrer.com',
    timestamp: '2023-01-01'
  };

  const mockVisitResponse = {
    success: true,
    data: mockVisitData
  };

  const mockStatsData = {
    total: 100,
    unique: 50,
    byDate: {
      '2023-01-01': 10,
      '2023-01-02': 20
    }
  };

  const mockStatsResponse = {
    success: true,
    data: mockStatsData
  };

  beforeEach(() => {
    jest.clearAllMocks();
    api = new VisitAPI({ baseUrl, apiKey });
  });

  describe('create', () => {
    const createRequest = {
      fingerprintId: 'test-fingerprint-id',
      url: 'http://example.com',
      referrer: 'http://referrer.com'
    };

    it('should create a visit successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockVisitResponse);

      const response = await api.create(createRequest);

      expect(api['fetchApi']).toHaveBeenCalledWith('/visit/create', {
        method: 'POST',
        body: JSON.stringify(createRequest),
      });
      expect(response).toEqual(mockVisitResponse);
    });

    it('should handle errors when creating a visit', async () => {
      const error = new Error('Failed to create visit');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.create(createRequest)).rejects.toThrow(
        'Failed to create visit: Failed to create visit'
      );
    });
  });

  describe('get', () => {
    it('should get a visit successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockVisitResponse);

      const response = await api.get('test-id');

      expect(api['fetchApi']).toHaveBeenCalledWith('/visit/test-id', {
        method: 'GET',
      });
      expect(response).toEqual(mockVisitResponse);
    });

    it('should handle errors when getting a visit', async () => {
      const error = new Error('Visit not found');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.get('test-id')).rejects.toThrow(
        'Failed to get visit: Visit not found'
      );
    });
  });

  describe('getByFingerprint', () => {
    const mockVisitsResponse = [mockVisitResponse];

    it('should get visits by fingerprint successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockVisitsResponse);

      const response = await api.getByFingerprint('fp-id');

      expect(api['fetchApi']).toHaveBeenCalledWith('/visit/fingerprint/fp-id', {
        method: 'GET',
      });
      expect(response).toEqual(mockVisitsResponse);
    });

    it('should handle errors when getting visits by fingerprint', async () => {
      const error = new Error('Fingerprint not found');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.getByFingerprint('fp-id')).rejects.toThrow(
        'Failed to get visits by fingerprint: Fingerprint not found'
      );
    });
  });

  describe('getStats', () => {
    it('should get visit stats successfully without params', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockStatsResponse);

      const response = await api.getStats();

      expect(api['fetchApi']).toHaveBeenCalledWith('/visit/stats', {
        method: 'GET',
      });
      expect(response).toEqual(mockStatsResponse);
    });

    it('should get visit stats successfully with params', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockStatsResponse);

      const params = {
        startDate: '2023-01-01',
        endDate: '2023-01-02'
      };

      const response = await api.getStats(params);

      expect(api['fetchApi']).toHaveBeenCalledWith('/visit/stats?startDate=2023-01-01&endDate=2023-01-02', {
        method: 'GET',
      });
      expect(response).toEqual(mockStatsResponse);
    });

    it('should handle errors when getting visit stats', async () => {
      const error = new Error('Failed to get stats');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.getStats()).rejects.toThrow(
        'Failed to get visit stats: Failed to get stats'
      );
    });
  });

  describe('delete', () => {
    it('should delete a visit successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce({ success: true });

      await api.delete('test-id');

      expect(api['fetchApi']).toHaveBeenCalledWith('/visit/test-id', {
        method: 'DELETE',
      });
    });

    it('should handle errors when deleting a visit', async () => {
      const error = new Error('Visit not found');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.delete('test-id')).rejects.toThrow(
        'Failed to delete visit: Visit not found'
      );
    });
  });
}); 