import { useState, useEffect } from 'react';
import Footer from '../components/Footer';
import { getUserProfile } from '../utils/api';
import '../styles/CheckoutPage.css';

const CheckoutPage = () => {
  // State for checkout data
  const [formData, setFormData] = useState({
    address: '',
    city: '',
    zipCode: '',
    deliveryNotes: '',
    paymentMethod: 'credit-card',
    cardName: '',
    cardNumber: '',
    cardExpiry: '',
    cardCVV: '',
    pickupDate: '',
    pickupTime: ''
  });

  // State for cart and order
  const [cart, setCart] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [serviceFee, setServiceFee] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(5.00);
  const [total, setTotal] = useState(0);
  const [deliveryMethod, setDeliveryMethod] = useState('delivery');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  
  // New state to store user profile data and control address editing
  const [userProfile, setUserProfile] = useState(null);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  // Update the state to include payment_type
  const [checkoutData, setCheckoutData] = useState({
    // ...existing checkout data properties
    payment_type: 'card', // Default to card payment
  });

  // Find where the payment method state is initialized
  // ...existing code...
  // IMPORTANT: Check the initial value - it might be defaulting to 'card'
  const [paymentMethod, setPaymentMethod] = useState('card'); // Is this defaulting to 'card'?

  // Fetch user profile and cart from localStorage
  useEffect(() => {
    const fetchUserProfileAndCart = async () => {
      setIsLoading(true);
      
      // Fetch cart data
      const storedCart = JSON.parse(localStorage.getItem('cart')) || [];
      
      // If cart is empty, redirect back to cart page
      if (storedCart.length === 0) {
        if (window.navigateTo) {
          window.navigateTo('/cart');
        } else {
          window.location.href = '/cart';
        }
        return;
      }
      
      setCart(storedCart);
      
      // Try to fetch user profile data
      try {
        const userData = await getUserProfile();
        setUserProfile(userData);
        
        // Parse address info if it exists as a single string
        if (userData && userData.address) {
          let addressParts = {
            address: userData.address,
            city: '',
            zipCode: ''
          };
          
          // Try to parse address if it's in format "street, city, zip"
          const addressString = userData.address;
          const commaMatches = addressString.match(/,/g);
          
          if (commaMatches && commaMatches.length >= 2) {
            const lastCommaIndex = addressString.lastIndexOf(',');
            const secondLastCommaIndex = addressString.lastIndexOf(',', lastCommaIndex - 1);
            
            addressParts = {
              address: addressString.substring(0, secondLastCommaIndex).trim(),
              city: addressString.substring(secondLastCommaIndex + 1, lastCommaIndex).trim(),
              zipCode: addressString.substring(lastCommaIndex + 1).trim()
            };
          }
          
          setFormData(prevData => ({
            ...prevData,
            ...addressParts
          }));
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Continue without profile data
      }
      
      setIsLoading(false);
    };

    fetchUserProfileAndCart();
  }, []);

  // Calculate totals whenever cart or delivery method changes
  useEffect(() => {
    const newSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setSubtotal(newSubtotal);
    
    // Calculate service fee as 5% of subtotal
    const newServiceFee = newSubtotal * 0.05;
    setServiceFee(newServiceFee);
    
    // Set delivery fee based on selected method
    if (deliveryMethod === 'pickup') {
      setDeliveryFee(0);
    } else {
      setDeliveryFee(5.00);
    }
    
    // Calculate new total with service fee
    const newTotal = newSubtotal + newServiceFee + deliveryFee;
    setTotal(newTotal);
  }, [cart, deliveryMethod, deliveryFee]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when user types
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  // Generate time slots for pickup
  const generateTimeSlots = () => {
    const slots = [];
    // Restaurant hours: 11:00 AM to 9:00 PM, 30-minute intervals
    const startHour = 11;
    const endHour = 21; // 9 PM in 24-hour format
    
    for (let hour = startHour; hour < endHour; hour++) {
      // Add half-hour slots
      slots.push(`${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`);
      slots.push(`${hour % 12 || 12}:30 ${hour < 12 ? 'AM' : 'PM'}`);
    }
    
    return slots;
  };
  
  // Available time slots
  const timeSlots = generateTimeSlots();
  
  // Generate available dates for pickup (today + next 7 days)
  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Format date as YYYY-MM-DD for the input value
      const formattedDateValue = date.toISOString().split('T')[0];
      
      // Format date for display (e.g., "Monday, July 15")
      const formattedDateDisplay = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
      
      dates.push({
        value: formattedDateValue,
        display: formattedDateDisplay
      });
    }
    
    return dates;
  };
  
  // Available dates
  const availableDates = generateAvailableDates();

  // Validate form before submission
  const validateForm = () => {
    const errors = {};
    
    // Skip address validation if pickup is selected
    if (deliveryMethod === 'delivery') {
      if (isEditingAddress) {
        // Only validate address fields if user is editing them
        if (!formData.address.trim()) errors.address = 'Address is required';
        if (!formData.city.trim()) errors.city = 'City is required';
        if (!formData.zipCode.trim()) errors.zipCode = 'ZIP code is required';
      } else if (!userProfile || !userProfile.address) {
        // If not editing but no profile address exists
        errors.address = 'Delivery address is required. Please edit your address.';
      }
    } else {
      // Validate pickup date and time
      if (!formData.pickupDate) errors.pickupDate = 'Pickup date is required';
      if (!formData.pickupTime) errors.pickupTime = 'Pickup time is required';
    }
    
    // Payment method validation
    if (formData.paymentMethod === 'credit-card') {
      if (!formData.cardName.trim()) errors.cardName = 'Name on card is required';
      if (!formData.cardNumber.trim()) errors.cardNumber = 'Card number is required';
      else if (!/^\d{16}$/.test(formData.cardNumber.replace(/\s/g, ''))) 
        errors.cardNumber = 'Card number must be 16 digits';
      if (!formData.cardExpiry.trim()) errors.cardExpiry = 'Expiry date is required';
      else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(formData.cardExpiry)) 
        errors.cardExpiry = 'Use MM/YY format';
      if (!formData.cardCVV.trim()) errors.cardCVV = 'CVV is required';
      else if (!/^\d{3,4}$/.test(formData.cardCVV)) errors.cardCVV = 'CVV must be 3 or 4 digits';
    }
    
    return errors;
  };

  // Format price to always show 2 decimal places
  const formatPrice = (price) => {
    return parseFloat(price).toFixed(2);
  };

  // Format card number with spaces
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  // Handle card number formatting
  const handleCardNumberChange = (e) => {
    const formattedValue = formatCardNumber(e.target.value);
    setFormData({
      ...formData,
      cardNumber: formattedValue
    });
    
    if (formErrors.cardNumber) {
      setFormErrors({
        ...formErrors,
        cardNumber: ''
      });
    }
  };

  // Handle delivery method change
  const handleDeliveryMethodChange = (method) => {
    setDeliveryMethod(method);
    
    // Clear address-related errors if switching to pickup
    if (method === 'pickup') {
      setFormErrors(prevErrors => {
        const newErrors = {...prevErrors};
        delete newErrors.address;
        delete newErrors.city;
        delete newErrors.zipCode;
        return newErrors;
      });
    } else {
      // Clear pickup-related errors if switching to delivery
      setFormErrors(prevErrors => {
        const newErrors = {...prevErrors};
        delete newErrors.pickupDate;
        delete newErrors.pickupTime;
        return newErrors;
      });
    }
  };

  // Handle toggling address edit mode
  const toggleAddressEdit = () => {
    setIsEditingAddress(!isEditingAddress);
  };

  // Get formatted address from user profile or form data
  const getFormattedAddress = () => {
    if (userProfile && userProfile.address && !isEditingAddress) {
      return userProfile.address;
    } else {
      return formData.address && formData.city && formData.zipCode 
        ? `${formData.address}, ${formData.city}, ${formData.zipCode}`
        : 'No address provided';
    }
  };

  // Add console logs in the handlePaymentMethodChange function
  const handlePaymentMethodChange = (method) => {
    console.log(`Payment method changed to: ${method}`);
    setPaymentMethod(method);
    
    // After setting, let's immediately verify it updated
    setTimeout(() => {
      console.log(`Current payment method state after update: ${paymentMethod}`);
    }, 0);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setIsSubmitting(true);
    setOrderError('');
    
    try {
      // Get user data from localStorage for contact info
      const userData = JSON.parse(localStorage.getItem('user')) || {};
      const token = localStorage.getItem('token');
      
      if (!token) {
        setOrderError('You must be logged in to place an order');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setIsSubmitting(false);
        return;
      }
      
      // Get the formatted delivery address 
      const deliveryAddressToUse = deliveryMethod === 'delivery' ? 
        (isEditingAddress ? `${formData.address}, ${formData.city}, ${formData.zipCode}` : userProfile.address) : '';
      
      // Prepare order data
      const orderData = {
        user_id: userData.id,
        items: cart.map(item => ({
          menu_id: item.menu_id || item.id, // Use menu_id or fallback to id
          quantity: item.quantity,
          price: item.price,
          name: item.name || item.menu_name, // Include item name for reference
          special_instructions: item.special_instructions || ''
        })),
        order_type: deliveryMethod === 'delivery' ? 'Delivery' : 'Takeaway',
        order_status: 'Pending',
        subtotal: parseFloat(subtotal.toFixed(2)),
        service_fee: parseFloat(serviceFee.toFixed(2)),
        delivery_fee: parseFloat(deliveryFee.toFixed(2)),
        total_amount: parseFloat(total.toFixed(2)),
        payment_method: formData.paymentMethod === 'credit-card' ? 'Credit Card' : 'Cash',
        delivery_address: deliveryAddressToUse, // Use the properly formatted address
        delivery_notes: formData.deliveryNotes || '',
        payment_type: formData.paymentMethod === 'credit-card' ? 'card' : 'cash',
        payment_status: formData.paymentMethod === 'credit-card' ? 'paid' : 'unpaid',
        paid_at: formData.paymentMethod === 'credit-card' ? new Date().toISOString() : null,
      };

      // Check if all required item fields exist before submitting
      const missingFields = orderData.items.filter(item => !item.menu_id);
      if (missingFields.length > 0) {
        throw new Error('Some items are missing required fields. Please refresh and try again.');
      }

      // Check if delivery address is provided for delivery orders
      if (orderData.order_type === 'Delivery' && !orderData.delivery_address) {
        throw new Error('Delivery address is required for delivery orders.');
      }

      // Send order to backend API
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to place order');
      }
      
      const data = await response.json();
      console.log('Order placed successfully:', data);
      
      // Order successful
      setOrderSuccess(true);
      
      // Clear cart
      localStorage.setItem('cart', JSON.stringify([]));
      
      // Dispatch event so navbar can update cart count
      const event = new Event('cartUpdated');
      window.dispatchEvent(event);
      
      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    } catch (error) {
      console.error('Order placement error:', error);
      setOrderError(error.message || 'An error occurred while placing your order. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update the placeOrder function to correctly set payment type and status
  const placeOrder = async () => {
    try {
      setIsProcessing(true);
      
      console.log("Selected payment method:", paymentMethod);
      
      // Create order data with correct payment info
      const orderData = {
        // ...existing order data
        
        // Use correct payment type based on selection
        payment_type: paymentMethod === 'card' ? 'card' : 'cash',
        
        // Set payment status based on payment type
        payment_status: paymentMethod === 'card' ? 'paid' : 'unpaid',
        
        // Set paid_at timestamp only for paid card payments
        paid_at: paymentMethod === 'card' ? new Date().toISOString() : null,
        
        // ...rest of existing orderData properties
      };
      
      console.log("Order data payment info:", {
        type: orderData.payment_type,
        status: orderData.payment_status
      });
      
      // ...existing API call and order submission code
    } catch (error) {
      // ...existing error handling
    }
  };

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <div className="checkout-overlay"></div>
        <div className="checkout-content">
          <h2>Checkout</h2>
          <p>Complete your order details</p>
        </div>
      </div>
      
      <div className="checkout-container">
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading your order details...</p>
          </div>
        ) : orderSuccess ? (
          <div className="order-success">
            <div className="success-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <h3>Order Placed Successfully!</h3>
            <p>Thank you for your order. Your order has been received and is being processed.</p>
            <p className="order-number">Order Reference: #{Math.floor(Math.random() * 1000000)}</p>
            <p>We've sent a confirmation email to <strong>{JSON.parse(localStorage.getItem('user'))?.email || 'your email'}</strong>.</p>
            <div className="success-buttons">
              <button 
                className="back-to-home-btn"
                onClick={() => window.navigateTo ? window.navigateTo('/') : window.location.href = '/'}
              >
                Return to Home
              </button>
              <button 
                className="view-orders-btn"
                onClick={() => window.navigateTo ? window.navigateTo('/profile?tab=orders') : window.location.href = '/profile?tab=orders'}
              >
                View Your Orders
              </button>
            </div>
          </div>
        ) : (
          <div className="checkout-content-wrapper">
            {orderError && (
              <div className="error-message order-error">
                {orderError}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="checkout-form">
              <div className="checkout-form-container">
                
                <div className="form-section">
                  <h3>Delivery Method</h3>
                  <div className="delivery-toggle checkout-delivery-toggle">
                    <button 
                      type="button"
                      className={`delivery-btn ${deliveryMethod === 'delivery' ? 'active' : ''}`}
                      onClick={() => handleDeliveryMethodChange('delivery')}
                    >
                      <i className="fas fa-truck"></i> Delivery
                    </button>
                    <button 
                      type="button"
                      className={`delivery-btn ${deliveryMethod === 'pickup' ? 'active' : ''}`}
                      onClick={() => handleDeliveryMethodChange('pickup')}
                    >
                      <i className="fas fa-shopping-bag"></i> Pickup
                    </button>
                  </div>
                </div>
                
                {deliveryMethod === 'delivery' && (
                  <div className="form-section">
                    <h3>Delivery Address</h3>
                    
                    {!isEditingAddress ? (
                      <div className="saved-address-container">
                        <div className="saved-address">
                          <div className="address-icon">
                            <i className="fas fa-map-marker-alt"></i>
                          </div>
                          <div className="address-details">
                            <p className="address-text">{getFormattedAddress()}</p>
                            {userProfile && userProfile.phone_number && (
                              <p className="address-phone">{userProfile.phone_number}</p>
                            )}
                          </div>
                        </div>
                        <button 
                          type="button" 
                          className="edit-address-btn"
                          onClick={toggleAddressEdit}
                        >
                          <i className="fas fa-edit"></i> Change Address
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="edit-address-header">
                          <p>Enter New Delivery Address</p>
                          <button 
                            type="button" 
                            className="cancel-edit-btn"
                            onClick={toggleAddressEdit}
                          >
                            Cancel
                          </button>
                        </div>
                        
                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor="address">Street Address</label>
                            <input
                              type="text"
                              id="address"
                              name="address"
                              value={formData.address}
                              onChange={handleChange}
                              className={formErrors.address ? 'error' : ''}
                            />
                            {formErrors.address && <span className="error-text">{formErrors.address}</span>}
                          </div>
                        </div>
                        
                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor="city">City</label>
                            <input
                              type="text"
                              id="city"
                              name="city"
                              value={formData.city}
                              onChange={handleChange}
                              className={formErrors.city ? 'error' : ''}
                            />
                            {formErrors.city && <span className="error-text">{formErrors.city}</span>}
                          </div>
                          <div className="form-group">
                            <label htmlFor="zipCode">ZIP Code</label>
                            <input
                              type="text"
                              id="zipCode"
                              name="zipCode"
                              value={formData.zipCode}
                              onChange={handleChange}
                              className={formErrors.zipCode ? 'error' : ''}
                            />
                            {formErrors.zipCode && <span className="error-text">{formErrors.zipCode}</span>}
                          </div>
                        </div>
                      </>
                    )}
                    
                    <div className="form-group">
                      <label htmlFor="deliveryNotes">Delivery Instructions (Optional)</label>
                      <textarea
                        id="deliveryNotes"
                        name="deliveryNotes"
                        value={formData.deliveryNotes}
                        onChange={handleChange}
                        placeholder="e.g., Apartment number, gate code, or special instructions"
                      ></textarea>
                    </div>
                  </div>
                )}
                
                <div className="form-section">
                  <h3>Payment Method</h3>
                  <div className="payment-options">
                    <div className="payment-option">
                      <label className="radio-container">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="credit-card"
                          checked={formData.paymentMethod === 'credit-card'}
                          onChange={handleChange}
                        />
                        <span className="radio-label">Credit/Debit Card</span>
                      </label>
                    </div>
                    
                    <div className="payment-option">
                      <label className="radio-container">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="cash"
                          checked={formData.paymentMethod === 'cash'}
                          onChange={handleChange}
                        />
                        <span className="radio-label">Cash on Delivery</span>
                      </label>
                    </div>
                  </div>

                  {formData.paymentMethod === 'credit-card' && (
                    <div className="card-details">
                      <div className="form-group">
                        <label htmlFor="cardName">Name on Card</label>
                        <input
                          type="text"
                          id="cardName"
                          name="cardName"
                          value={formData.cardName}
                          onChange={handleChange}
                          className={formErrors.cardName ? 'error' : ''}
                        />
                        {formErrors.cardName && <span className="error-text">{formErrors.cardName}</span>}
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="cardNumber">Card Number</label>
                        <input
                          type="text"
                          id="cardNumber"
                          name="cardNumber"
                          value={formData.cardNumber}
                          onChange={handleCardNumberChange}
                          className={formErrors.cardNumber ? 'error' : ''}
                          placeholder="1234 5678 9012 3456"
                          maxLength="19"
                        />
                        {formErrors.cardNumber && <span className="error-text">{formErrors.cardNumber}</span>}
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="cardExpiry">Expiry Date</label>
                          <input
                            type="text"
                            id="cardExpiry"
                            name="cardExpiry"
                            value={formData.cardExpiry}
                            onChange={handleChange}
                            className={formErrors.cardExpiry ? 'error' : ''}
                            placeholder="MM/YY"
                            maxLength="5"
                          />
                          {formErrors.cardExpiry && <span className="error-text">{formErrors.cardExpiry}</span>}
                        </div>
                        <div className="form-group">
                          <label htmlFor="cardCVV">CVV</label>
                          <input
                            type="text"
                            id="cardCVV"
                            name="cardCVV"
                            value={formData.cardCVV}
                            onChange={handleChange}
                            className={formErrors.cardCVV ? 'error' : ''}
                            placeholder="123"
                            maxLength="4"
                          />
                          {formErrors.cardCVV && <span className="error-text">{formErrors.cardCVV}</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* The pickup section was incorrectly nested */}
                {deliveryMethod === 'pickup' && (
                  <div className="form-section">
                    <h3>Pickup Details</h3>
                    <p className="pickup-info">
                      Please select your preferred pickup date and time. Our restaurant is open daily from 11:00 AM to 9:00 PM.
                    </p>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="pickupDate">Pickup Date</label>
                        <select
                          id="pickupDate"
                          name="pickupDate"
                          value={formData.pickupDate}
                          onChange={handleChange}
                          className={formErrors.pickupDate ? 'error' : ''}
                        >
                          <option value="">Select Date</option>
                          {availableDates.map((date, index) => (
                            <option key={index} value={date.value}>
                              {date.display}
                            </option>
                          ))}
                        </select>
                        {formErrors.pickupDate && <span className="error-text">{formErrors.pickupDate}</span>}
                      </div>
                      <div className="form-group">
                        <label htmlFor="pickupTime">Pickup Time</label>
                        <select
                          id="pickupTime"
                          name="pickupTime"
                          value={formData.pickupTime}
                          onChange={handleChange}
                          className={formErrors.pickupTime ? 'error' : ''}
                        >
                          <option value="">Select Time</option>
                          {timeSlots.map((time, index) => (
                            <option key={index} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                        {formErrors.pickupTime && <span className="error-text">{formErrors.pickupTime}</span>}
                      </div>
                    </div>
                  </div>
                )}
                
              </div>
              
              <div className="order-summary-container">
                <div className="order-summary">
                  <h3>Order Summary</h3>
                  <div className="order-items">
                    {cart.map((item, index) => (
                      <div key={index} className="order-item">
                        <div className="item-quantity">{item.quantity}x</div>
                        <div className="item-name">{item.name}</div>
                        <div className="item-price">LKR {formatPrice(item.price * item.quantity)}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="price-summary">
                    <div className="summary-row">
                      <span>Subtotal</span>
                      <span>LKR {formatPrice(subtotal)}</span>
                    </div>
                    <div className="summary-row">
                      <span>Service Fee (5%)</span>
                      <span>LKR {formatPrice(serviceFee)}</span>
                    </div>
                    {deliveryMethod === 'delivery' && (
                      <div className="summary-row">
                        <span>Delivery Fee</span>
                        <span>LKR {formatPrice(deliveryFee)}</span>
                      </div>
                    )}
                    <div className="summary-row total">
                      <span>Total</span>
                      <span>LKR {formatPrice(total)}</span>
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    className="place-order-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Processing...' : 'Place Order'}
                  </button>
                  
                  <div className="back-to-cart">
                    <a href="/cart" onClick={(e) => {
                      e.preventDefault();
                      if (window.navigateTo) {
                        window.navigateTo('/cart');
                      } else {
                        window.location.href = '/cart';
                      }
                    }}>
                      <i className="fas fa-arrow-left"></i> Back to Cart
                    </a>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default CheckoutPage;
