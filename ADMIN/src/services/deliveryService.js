import axios from 'axios';
import { API_URL } from './menuService'; // Reuse the API_URL from menuService

// Create axios instance with base settings
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Get all deliveries with optional filters
export const getAllDeliveries = async (filters = {}) => {
  try {
    const { status, dateRange, deliveryPerson, page = 1, limit = 10 } = filters;
    
    let queryParams = `?page=${page}&limit=${limit}`;
    if (status) queryParams += `&status=${status}`;
    if (deliveryPerson) queryParams += `&delivery_person_id=${deliveryPerson}`;
    if (dateRange?.startDate) queryParams += `&startDate=${dateRange.startDate}`;
    if (dateRange?.endDate) queryParams += `&endDate=${dateRange.endDate}`;
    
    const response = await apiClient.get(`/deliveries${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    // Return mock data for demonstration if server is not available
    return generateMockDeliveries();
  }
};

// Get delivery statistics
export const getDeliveryStats = async () => {
  try {
    const response = await apiClient.get('/deliveries/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching delivery stats:', error);
    // Return mock stats for demonstration
    return {
      total: 156,
      inTransit: 12,
      delivered: 138,
      canceled: 6,
    };
  }
};

// Get a specific delivery by ID
export const getDeliveryById = async (id) => {
  try {
    const response = await apiClient.get(`/deliveries/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching delivery ${id}:`, error);
    throw error;
  }
};

// Update delivery status
export const updateDeliveryStatus = async (id, status) => {
  try {
    const response = await apiClient.patch(`/deliveries/${id}/status`, { status });
    return response.data;
  } catch (error) {
    console.error(`Error updating delivery status for ${id}:`, error);
    throw error;
  }
};

// Assign delivery person to a delivery
export const assignDeliveryPerson = async (deliveryId, deliveryPersonId) => {
  try {
    const response = await apiClient.patch(`/deliveries/${deliveryId}/assign`, { 
      delivery_person_id: deliveryPersonId 
    });
    return response.data;
  } catch (error) {
    console.error(`Error assigning delivery person to delivery ${deliveryId}:`, error);
    throw error;
  }
};

// Get all delivery personnel (staff with role='delivery')
export const getDeliveryPersonnel = async () => {
  try {
    const response = await apiClient.get('/staff?role=delivery');
    
    // Map staff data to the format expected by the frontend, without vehicle details and rating
    return response.data.map(person => ({
      id: person.staff_id,
      name: `${person.first_name} ${person.last_name}`,
      contact: person.phone_number,
      status: person.active ? 'Available' : 'Off Duty'
    }));
  } catch (error) {
    console.error('Error fetching delivery personnel:', error);
    // Return mock data for demonstration, without vehicle details and rating
    return generateMockDeliveryPersonnel();
  }
};

// Create a new delivery
export const createDelivery = async (deliveryData) => {
  try {
    const response = await apiClient.post('/deliveries', deliveryData);
    return response.data;
  } catch (error) {
    console.error('Error creating delivery:', error);
    throw error;
  }
};

// Helper functions for mock data
function generateMockDeliveries() {
  const mockData = [
    {
      delivery_id: 1,
      order_id: 1082,
      customer_name: 'John Smith',
      delivery_address: '123 Main St, Colombo 05',
      delivery_status: 'In Transit',
      estimated_delivery_time: '2023-07-10T14:30:00',
      actual_delivery_time: null,
      delivery_person_id: 2,
      delivery_person_name: 'Saman Perera',
      contact_number: '0771234567',
      created_at: '2023-07-10T13:00:00',
      updated_at: '2023-07-10T13:15:00',
      distance: 3.5,
      delivery_fee: 200.00,
      special_instructions: 'Leave at the door',
    },
    {
      delivery_id: 2,
      order_id: 1081,
      customer_name: 'Emily Johnson',
      delivery_address: '456 Park Avenue, Colombo 07',
      delivery_status: 'Delivered',
      estimated_delivery_time: '2023-07-09T18:00:00',
      actual_delivery_time: '2023-07-09T17:50:00',
      delivery_person_id: 1,
      delivery_person_name: 'Nimal Silva',
      contact_number: '0777654321',
      created_at: '2023-07-09T17:00:00',
      updated_at: '2023-07-09T17:50:00',
      distance: 2.1,
      delivery_fee: 150.00,
      special_instructions: null,
    },
    {
      delivery_id: 3,
      order_id: 1080,
      customer_name: 'Michael Brown',
      delivery_address: '789 Ocean Drive, Dehiwala',
      delivery_status: 'Pending',
      estimated_delivery_time: '2023-07-10T19:30:00',
      actual_delivery_time: null,
      delivery_person_id: null,
      delivery_person_name: null,
      contact_number: null,
      created_at: '2023-07-10T18:45:00',
      updated_at: '2023-07-10T18:45:00',
      distance: 5.2,
      delivery_fee: 300.00,
      special_instructions: 'Call upon arrival',
    }
  ];
  
  return mockData;
}

function generateMockDeliveryPersonnel() {
  return [
    {
      id: 1,
      name: 'Nimal Silva',
      contact: '0777654321',
      status: 'Available'
    },
    {
      id: 2,
      name: 'Saman Perera',
      contact: '0771234567',
      status: 'On Delivery'
    },
    {
      id: 3,
      name: 'Kumari Fernando',
      contact: '0761234567',
      status: 'Available'
    },
    {
      id: 4,
      name: 'Rajitha Gunawardena',
      contact: '0729876543',
      status: 'Off Duty'
    },
  ];
}
