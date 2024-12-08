import { APIKeyAPI } from '../../api/APIKeyAPI';
import { BaseAPI } from '../../api/BaseAPI';

jest.mock('../../api/BaseAPI');

describe('APIKeyAPI', () => {
  let api: APIKeyAPI;
  const baseUrl = 'http://localhost:3000';
  const apiKey = 'test-api-key';

  const mockData = {
    id: 'test-id',
    key: 'test-key',
    name: 'test-name',
    permissions: ['permission1', 'permission2'],
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01'
  };

  const mockResponse = {
    success: true,
    data: mockData
  };

  beforeEach(() => {
    jest.clearAllMocks();
    api = new APIKeyAPI({ baseUrl, apiKey });
  });

  describe('create', () => {
    const createRequest = {
      name: 'test-name',
      permissions: ['permission1', 'permission2']
    };

    it('should create an API key successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockResponse);

      const response = await api.create(createRequest);

      expect(api['fetchApi']).toHaveBeenCalledWith('/api-key/create', {
        method: 'POST',
        body: JSON.stringify(createRequest),
      });
      expect(response).toEqual(mockResponse);
    });

    it('should handle errors when creating an API key', async () => {
      const error = new Error('Failed to create API key');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.create(createRequest)).rejects.toThrow(
        'Failed to create API key: Failed to create API key'
      );
    });
  });

  describe('get', () => {
    it('should get an API key successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockResponse);

      const response = await api.get('test-id');

      expect(api['fetchApi']).toHaveBeenCalledWith('/api-key/test-id', {
        method: 'GET',
      });
      expect(response).toEqual(mockResponse);
    });

    it('should handle errors when getting an API key', async () => {
      const error = new Error('API key not found');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.get('test-id')).rejects.toThrow(
        'Failed to get API key: API key not found'
      );
    });
  });

  describe('list', () => {
    const mockListResponse = [mockResponse];

    it('should list API keys successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockListResponse);

      const response = await api.list();

      expect(api['fetchApi']).toHaveBeenCalledWith('/api-key/list', {
        method: 'GET',
      });
      expect(response).toEqual(mockListResponse);
    });

    it('should handle errors when listing API keys', async () => {
      const error = new Error('Failed to list API keys');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.list()).rejects.toThrow(
        'Failed to list API keys: Failed to list API keys'
      );
    });
  });

  describe('update', () => {
    const updateRequest = {
      name: 'updated-name',
      permissions: ['permission3']
    };

    it('should update an API key successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockResponse);

      const response = await api.update('test-id', updateRequest);

      expect(api['fetchApi']).toHaveBeenCalledWith('/api-key/test-id', {
        method: 'PUT',
        body: JSON.stringify(updateRequest),
      });
      expect(response).toEqual(mockResponse);
    });

    it('should handle errors when updating an API key', async () => {
      const error = new Error('Failed to update API key');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.update('test-id', updateRequest)).rejects.toThrow(
        'Failed to update API key: Failed to update API key'
      );
    });
  });

  describe('delete', () => {
    it('should delete an API key successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce({ success: true });

      await api.delete('test-id');

      expect(api['fetchApi']).toHaveBeenCalledWith('/api-key/test-id', {
        method: 'DELETE',
      });
    });

    it('should handle errors when deleting an API key', async () => {
      const error = new Error('API key not found');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.delete('test-id')).rejects.toThrow(
        'Failed to delete API key: API key not found'
      );
    });
  });
}); 