import { FingerprintAPI } from '../../api/FingerprintAPI';
import { BaseAPI } from '../../api/BaseAPI';

jest.mock('../../api/BaseAPI');

describe('FingerprintAPI', () => {
  let api: FingerprintAPI;
  const baseUrl = 'http://localhost:3000';
  const apiKey = 'test-api-key';

  const mockData = {
    id: 'test-id',
    userAgent: 'test-user-agent',
    ip: '127.0.0.1',
    metadata: {},
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01'
  };

  const mockResponse = {
    success: true,
    data: mockData
  };

  beforeEach(() => {
    jest.clearAllMocks();
    api = new FingerprintAPI({ baseUrl, apiKey });
  });

  describe('create', () => {
    const createRequest = {
      userAgent: 'test-user-agent',
      ip: '127.0.0.1',
      metadata: {}
    };

    it('should create a fingerprint successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockResponse);

      const response = await api.create(createRequest);

      expect(api['fetchApi']).toHaveBeenCalledWith('/fingerprint/create', {
        method: 'POST',
        body: JSON.stringify(createRequest),
      });
      expect(response).toEqual(mockResponse);
    });

    it('should handle errors when creating a fingerprint', async () => {
      const error = new Error('Failed to create fingerprint');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.create(createRequest)).rejects.toThrow(
        'Failed to create fingerprint: Failed to create fingerprint'
      );
    });
  });

  describe('get', () => {
    it('should get a fingerprint successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockResponse);

      const response = await api.get('test-id');

      expect(api['fetchApi']).toHaveBeenCalledWith('/fingerprint/test-id', {
        method: 'GET',
      });
      expect(response).toEqual(mockResponse);
    });

    it('should handle errors when getting a fingerprint', async () => {
      const error = new Error('Fingerprint not found');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.get('test-id')).rejects.toThrow(
        'Failed to get fingerprint: Fingerprint not found'
      );
    });
  });

  describe('update', () => {
    const updateRequest = {
      metadata: { updated: true }
    };

    it('should update a fingerprint successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockResponse);

      const response = await api.update('test-id', updateRequest);

      expect(api['fetchApi']).toHaveBeenCalledWith('/fingerprint/test-id', {
        method: 'PUT',
        body: JSON.stringify(updateRequest),
      });
      expect(response).toEqual(mockResponse);
    });

    it('should handle errors when updating a fingerprint', async () => {
      const error = new Error('Failed to update fingerprint');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.update('test-id', updateRequest)).rejects.toThrow(
        'Failed to update fingerprint: Failed to update fingerprint'
      );
    });
  });

  describe('delete', () => {
    it('should delete a fingerprint successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce({ success: true });

      await api.delete('test-id');

      expect(api['fetchApi']).toHaveBeenCalledWith('/fingerprint/test-id', {
        method: 'DELETE',
      });
    });

    it('should handle errors when deleting a fingerprint', async () => {
      const error = new Error('Fingerprint not found');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.delete('test-id')).rejects.toThrow(
        'Failed to delete fingerprint: Fingerprint not found'
      );
    });
  });
}); 