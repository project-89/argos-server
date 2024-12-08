import { RoleAPI } from '../../api/RoleAPI';
import { BaseAPI } from '../../api/BaseAPI';

jest.mock('../../api/BaseAPI');

describe('RoleAPI', () => {
  let api: RoleAPI;
  const baseUrl = 'http://localhost:3000';
  const apiKey = 'test-api-key';

  const mockRoleData = {
    fingerprintId: 'test-fingerprint-id',
    roles: ['role1', 'role2'],
    timestamp: '2023-01-01'
  };

  const mockRoleResponse = {
    success: true,
    data: mockRoleData
  };

  beforeEach(() => {
    jest.clearAllMocks();
    api = new RoleAPI({ baseUrl, apiKey });
  });

  describe('create', () => {
    const createRequest = {
      name: 'test-role',
      permissions: ['permission1', 'permission2']
    };

    it('should create a role successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockRoleResponse);

      const response = await api.create(createRequest);

      expect(api['fetchApi']).toHaveBeenCalledWith('/role/create', {
        method: 'POST',
        body: JSON.stringify(createRequest),
      });
      expect(response).toEqual(mockRoleResponse);
    });

    it('should handle errors when creating a role', async () => {
      const error = new Error('Failed to create role');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.create(createRequest)).rejects.toThrow(
        'Failed to create role: Failed to create role'
      );
    });
  });

  describe('get', () => {
    it('should get a role successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockRoleResponse);

      const response = await api.get('test-id');

      expect(api['fetchApi']).toHaveBeenCalledWith('/role/test-id', {
        method: 'GET',
      });
      expect(response).toEqual(mockRoleResponse);
    });

    it('should handle errors when getting a role', async () => {
      const error = new Error('Role not found');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.get('test-id')).rejects.toThrow(
        'Failed to get role: Role not found'
      );
    });
  });

  describe('list', () => {
    const mockListResponse = [mockRoleResponse];

    it('should list roles successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockListResponse);

      const response = await api.list();

      expect(api['fetchApi']).toHaveBeenCalledWith('/role/list', {
        method: 'GET',
      });
      expect(response).toEqual(mockListResponse);
    });

    it('should handle errors when listing roles', async () => {
      const error = new Error('Failed to list roles');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.list()).rejects.toThrow(
        'Failed to list roles: Failed to list roles'
      );
    });
  });

  describe('update', () => {
    const updateRequest = {
      name: 'updated-role',
      permissions: ['permission3']
    };

    it('should update a role successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockRoleResponse);

      const response = await api.update('test-id', updateRequest);

      expect(api['fetchApi']).toHaveBeenCalledWith('/role/test-id', {
        method: 'PUT',
        body: JSON.stringify(updateRequest),
      });
      expect(response).toEqual(mockRoleResponse);
    });

    it('should handle errors when updating a role', async () => {
      const error = new Error('Failed to update role');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.update('test-id', updateRequest)).rejects.toThrow(
        'Failed to update role: Failed to update role'
      );
    });
  });

  describe('delete', () => {
    it('should delete a role successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce({ success: true });

      await api.delete('test-id');

      expect(api['fetchApi']).toHaveBeenCalledWith('/role/test-id', {
        method: 'DELETE',
      });
    });

    it('should handle errors when deleting a role', async () => {
      const error = new Error('Role not found');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.delete('test-id')).rejects.toThrow(
        'Failed to delete role: Role not found'
      );
    });
  });

  describe('assign', () => {
    const roleId = 'role-id';
    const fingerprintId = 'fingerprint-id';

    it('should assign a role successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce({ success: true });

      await api.assign(roleId, fingerprintId);

      expect(api['fetchApi']).toHaveBeenCalledWith('/role/assign', {
        method: 'POST',
        body: JSON.stringify({ roleId, fingerprintId }),
      });
    });

    it('should handle errors when assigning a role', async () => {
      const error = new Error('Failed to assign role');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.assign(roleId, fingerprintId)).rejects.toThrow(
        'Failed to assign role: Failed to assign role'
      );
    });
  });

  describe('unassign', () => {
    const roleId = 'role-id';
    const fingerprintId = 'fingerprint-id';

    it('should unassign a role successfully', async () => {
      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce({ success: true });

      await api.unassign(roleId, fingerprintId);

      expect(api['fetchApi']).toHaveBeenCalledWith('/role/unassign', {
        method: 'POST',
        body: JSON.stringify({ roleId, fingerprintId }),
      });
    });

    it('should handle errors when unassigning a role', async () => {
      const error = new Error('Failed to unassign role');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.unassign(roleId, fingerprintId)).rejects.toThrow(
        'Failed to unassign role: Failed to unassign role'
      );
    });
  });

  describe('listFingerprints', () => {
    it('should list fingerprints successfully', async () => {
      const mockFingerprintResponse = {
        success: true,
        data: ['fingerprint-1', 'fingerprint-2']
      };

      jest.spyOn(api as any, 'fetchApi').mockResolvedValueOnce(mockFingerprintResponse);

      const response = await api.listFingerprints('role-id');

      expect(api['fetchApi']).toHaveBeenCalledWith(
        '/role/role-id/fingerprints',
        {
          method: 'GET',
        }
      );
      expect(response).toEqual(mockFingerprintResponse.data);
    });

    it('should handle errors when listing fingerprints', async () => {
      const error = new Error('Role not found');

      jest.spyOn(api as any, 'fetchApi').mockRejectedValueOnce(error);

      await expect(api.listFingerprints('role-id')).rejects.toThrow(
        'Failed to list fingerprints: Role not found'
      );
    });
  });
}); 