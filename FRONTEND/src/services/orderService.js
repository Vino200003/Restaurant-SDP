import { API_URL } from '../config';

// ...existing code...

// Update the createOrder function to ensure payment_type is included
export const createOrder = async (orderData) => {
  try {
    const token = localStorage.getItem('token');
    
    // Make sure orderData includes payment_type
    console.log("Creating order with payment type:", orderData.payment_type);
    
    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...orderData,
        // Explicitly ensure payment_type is included
        payment_type: orderData.payment_type || 'cash'
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create order');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

// ...existing code...