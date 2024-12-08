import { PriceAPI } from '../../api/PriceAPI';
import { BaseAPI } from '../../api/BaseAPI';

jest.mock('../../api/BaseAPI');

describe('PriceAPI', () => {
  let api: PriceAPI;
  const baseUrl = 'http://localhost:3000';
  const apiKey = 'test-api-key';

  const mockData = {
    id: 'test-id',
    amount: 100,
    currency: 'USD',
    timestamp: '2023-01-01'
  };

  const mockResponse = {
    success: true,
    data: mockData
  };

  beforeEach(() => {
    jest.clearAllMocks();
    api = new PriceAPI({ baseUrl, apiKey });
  });

  describe('getCurrentPrice', () => {
    it('should get current price successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockResponse);

      const response = await api.getCurrentPrice();

      expect(api['fetchApi']).toHaveBeenCalledWith('/price/current', {
        method: 'GET',
      });
      expect(response).toEqual(mockResponse);
    });

    it('should handle errors when getting current price', async () => {
      const error = new Error('Failed to get current price');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.getCurrentPrice()).rejects.toThrow(
        'Failed to get current price: Failed to get current price'
      );
    });
  });

  describe('getPriceHistory', () => {
    const mockHistoryResponse = [mockResponse];

    it('should get price history successfully without dates', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockHistoryResponse);

      const response = await api.getPriceHistory();

      expect(api['fetchApi']).toHaveBeenCalledWith('/price/history', {
        method: 'GET',
      });
      expect(response).toEqual(mockHistoryResponse);
    });

    it('should get price history successfully with dates', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockHistoryResponse);

      const startDate = '2023-01-01';
      const endDate = '2023-01-02';
      const response = await api.getPriceHistory(startDate, endDate);

      expect(api['fetchApi']).toHaveBeenCalledWith('/price/history?startDate=2023-01-01&endDate=2023-01-02', {
        method: 'GET',
      });
      expect(response).toEqual(mockHistoryResponse);
    });

    it('should handle errors when getting price history', async () => {
      const error = new Error('Failed to get price history');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.getPriceHistory()).rejects.toThrow(
        'Failed to get price history: Failed to get price history'
      );
    });
  });
}); 