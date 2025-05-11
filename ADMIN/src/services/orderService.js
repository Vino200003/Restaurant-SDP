import { API_URL } from '../config/constants';

// Get all orders with optional filters
export const getAllOrders = async (params = {}) => {
  try {
    // Build query string from params
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.status) queryParams.append('status', params.status);
    if (params.orderType) queryParams.append('type', params.orderType);
    if (params.paymentStatus) queryParams.append('paymentStatus', params.paymentStatus); // Add payment status
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    
    const queryString = queryParams.toString();
    
    // Get admin token from localStorage
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      console.error('Authentication required for fetching orders');
      return { orders: [], pagination: { page: 1, limit: params.limit || 10, total: 0, pages: 1 } };
    }
    
    const response = await fetch(`${API_URL}/api/admin/orders${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // If API endpoint doesn't exist yet (404) or other error, return empty data
    if (!response.ok) {
      console.warn(`API response not OK: ${response.status} ${response.statusText}`);
      return { orders: [], pagination: { page: 1, limit: params.limit || 10, total: 0, pages: 1 } };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Order service error:', error);
    // Return empty data structure on error
    return { orders: [], pagination: { page: 1, limit: params.limit || 10, total: 0, pages: 1 } };
  }
};

// Get order stats
export const getOrderStats = async (startDate = '', endDate = '') => {
  try {
    // Build query string
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    
    const queryString = queryParams.toString();
    
    // Get admin token from localStorage
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`${API_URL}/api/admin/orders/stats${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch order stats');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Order stats service error:', error);
    throw error;
  }
};

// Get a single order by ID
export const getOrderById = async (orderId) => {
  try {
    // Get admin token from localStorage
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`${API_URL}/api/admin/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch order details');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get order service error:', error);
    throw error;
  }
};

// Update order status
export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    // Get admin token from localStorage
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`${API_URL}/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update order status');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Update order status service error:', error);
    throw error;
  }
};

// Update payment status
export const updatePaymentStatus = async (orderId, newStatus) => {
  try {
    // Get admin token from localStorage
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`${API_URL}/api/admin/orders/${orderId}/payment-status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ payment_status: newStatus })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update payment status');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Update payment status service error:', error);
    throw error;
  }
};
