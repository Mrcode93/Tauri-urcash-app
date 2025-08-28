import api from '@/lib/api';
import { licenseService } from './licenseService';

const REMOTE_SERVER_URL = 'https://urcash.up.railway.app';

interface CreateUserData {
  username: string;
  name: string;
  password: string;
  role: string;
}

class RemoteServerService {
  private async getUserIdFromLicense(): Promise<string | null> {
    try {
      // Check localStorage first
      const cachedUserId = localStorage.getItem('urcash_user_id');
      if (cachedUserId) {
        
        return cachedUserId;
      }

      // If not in localStorage, get from server and cache it
      const response = await api.get('/mobile-live-data/user-id');
      if (response.data.success && response.data.data.userId) {
        const userId = response.data.data.userId;
        localStorage.setItem('urcash_user_id', userId);
        
        return userId;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting userId from license:', error);
      return null;
    }
  }

  async createMobileUser(userData: CreateUserData, isUpdate: boolean = false, targetUserId?: string): Promise<any> {
    try {
      const userId = await this.getUserIdFromLicense();
      if (!userId) {
        throw new Error('Unable to retrieve user ID from license');
      }

      // Use the same endpoint for both create and update
      const endpoint = isUpdate && targetUserId 
        ? `${REMOTE_SERVER_URL}/api/update-user/${userId}`
        : `${REMOTE_SERVER_URL}/api/update-user/${userId}`;

      const method = isUpdate ? 'PUT' : 'PUT';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const action = isUpdate ? 'update' : 'create';
        throw new Error(`Failed to ${action} user: ${response.status} ${response.statusText} - ${errorData.message || ''}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error ${isUpdate ? 'updating' : 'creating'} mobile user:`, error);
      throw error;
    }
  }

  async getMobileUsers(): Promise<any[]> {
    try {
      const userId = await this.getUserIdFromLicense();
      if (!userId) {
        throw new Error('Unable to retrieve user ID from license');
      }

      const response = await fetch(`${REMOTE_SERVER_URL}/api/users/get-manager-user/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to fetch users: ${response.status} ${response.statusText} - ${errorData.message || ''}`);
      }
     
      const data = await response.json();
      
      
      // Handle different response structures
      if (Array.isArray(data.data)) {
        return data.data;
      } else if (data.data && !Array.isArray(data.data)) {
        // If data.data is a single object with users array, return it as is
        // The object represents the main user with sub-users
        return [data.data];
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error fetching mobile users:', error);
      throw error;
    }
  }

  // Clear cached userId (useful when license changes)
  clearCachedUserId(): void {
    localStorage.removeItem('urcash_user_id');
    
  }

  // Force refresh userId from server
  async refreshUserId(): Promise<string | null> {
    this.clearCachedUserId();
    return await this.getUserIdFromLicense();
  }
}

export const remoteServerService = new RemoteServerService();
export default remoteServerService; 