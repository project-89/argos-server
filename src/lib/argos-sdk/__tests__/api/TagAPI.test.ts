import { TagAPI } from '../../api/TagAPI';
import { BaseAPI } from '../../api/BaseAPI';

jest.mock('../../api/BaseAPI');

describe('TagAPI', () => {
  let api: TagAPI;
  const baseUrl = 'http://localhost:3000';
  const apiKey = 'test-api-key';

  const mockData = {
    fingerprintId: 'test-fingerprint-id',
    tags: ['tag1', 'tag2'],
    timestamp: '2023-01-01'
  };

  const mockResponse = {
    success: true,
    data: mockData
  };

  beforeEach(() => {
    jest.clearAllMocks();
    api = new TagAPI({ baseUrl, apiKey });
  });

  describe('updateTags', () => {
    const fingerprintId = 'test-fingerprint-id';
    const request = {
      tags: ['tag1', 'tag2']
    };

    it('should update tags successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockResponse);

      const result = await api.updateTags(fingerprintId, request);

      expect(api['fetchApi']).toHaveBeenCalledWith(`/tag/${fingerprintId}`, {
        method: 'PUT',
        body: JSON.stringify(request),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors when updating tags', async () => {
      const error = new Error('Failed to update tags');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.updateTags(fingerprintId, request)).rejects.toThrow(
        'Failed to update tags: Failed to update tags'
      );
    });
  });

  describe('getTags', () => {
    const fingerprintId = 'test-fingerprint-id';

    it('should get tags successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockResponse);

      const result = await api.getTags(fingerprintId);

      expect(api['fetchApi']).toHaveBeenCalledWith(`/tag/${fingerprintId}`, {
        method: 'GET',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors when getting tags', async () => {
      const error = new Error('Failed to get tags');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.getTags(fingerprintId)).rejects.toThrow(
        'Failed to get tags: Failed to get tags'
      );
    });
  });

  describe('deleteTags', () => {
    const fingerprintId = 'test-fingerprint-id';

    it('should delete tags successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce({ success: true });

      await api.deleteTags(fingerprintId);

      expect(api['fetchApi']).toHaveBeenCalledWith(`/tag/${fingerprintId}`, {
        method: 'DELETE',
      });
    });

    it('should handle errors when deleting tags', async () => {
      const error = new Error('Failed to delete tags');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.deleteTags(fingerprintId)).rejects.toThrow(
        'Failed to delete tags: Failed to delete tags'
      );
    });
  });
}); 