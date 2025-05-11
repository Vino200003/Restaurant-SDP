import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/OrdersManagement.css';
import * as orderService from '../services/orderService';
// import { toast } from 'react-toastify'; // Uncomment after installing react-toastify

function OrdersManagement() {
  // State for orders
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [orderStats, setOrderStats] = useState({
    total_orders: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
    in_progress: 0,
    paid: 0,
    unpaid: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    orderType: '',
    paymentStatus: '', // Add payment status filter
    searchTerm: '',
    searchOption: 'all', // Add search option for dropdown
    page: 1,
    limit: 10,
    dateRange: {
      startDate: '',
      endDate: ''
    }
  });

  // Simple notification function until react-toastify is installed
  const notify = (message, type = 'info') => {
    console.log(`[${type}] ${message}`);
    alert(message);
  };

  // Fetch orders and stats on component mount
  useEffect(() => {
    fetchOrders();
    fetchOrderStats();
  }, []);

  // Fetch orders when filters change - explicitly listen for date range changes
  useEffect(() => {
    fetchOrders();
    // If date range changes, also update the stats
    if (filters.dateRange.startDate || filters.dateRange.endDate) {
      fetchOrderStats();
    }
  }, [filters.page, filters.limit, filters.status, filters.orderType, filters.dateRange.startDate, filters.dateRange.endDate]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      // Format dates for API if needed (ISO format is typically best for APIs)
      const startDate = filters.dateRange.startDate ? new Date(filters.dateRange.startDate).toISOString().split('T')[0] : '';
      const endDate = filters.dateRange.endDate ? new Date(filters.dateRange.endDate).toISOString().split('T')[0] : '';
      
      // Explicitly log the filter parameters to debug
      console.log('Fetching orders with filters:', {
        page: filters.page,
        limit: filters.limit, 
        status: filters.status,
        orderType: filters.orderType,
        paymentStatus: filters.paymentStatus, // Log payment status filter
        startDate: startDate,
        endDate: endDate
      });
      
      const data = await orderService.getAllOrders({
        page: filters.page,
        limit: filters.limit,
        status: filters.status,
        orderType: filters.orderType,
        paymentStatus: filters.paymentStatus, // Include payment status in API call
        startDate: startDate,
        endDate: endDate
      });
      
      // Check the structure of the returned data
      if (data.orders) {
        setOrders(data.orders);
        setFilteredOrders(data.orders);
        
        // If pagination info is provided
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        // If orders data is at the root level (depends on your API)
        setOrders(data);
        setFilteredOrders(data);
      }
    } catch (error) {
      notify(`Error fetching orders: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrderStats = async () => {
    try {
      const startDate = filters.dateRange.startDate ? new Date(filters.dateRange.startDate).toISOString().split('T')[0] : '';
      const endDate = filters.dateRange.endDate ? new Date(filters.dateRange.endDate).toISOString().split('T')[0] : '';
      
      const data = await orderService.getOrderStats(startDate, endDate);
      
      // Set stats based on the returned data structure
      setOrderStats({
        total_orders: data.total_orders || 0,
        pending: data.pending_orders || 0,
        completed: data.completed_orders || 0,
        cancelled: data.cancelled_orders || 0,
        in_progress: data.in_progress_orders || data.orders_in_progress || 0,
        paid: data.paid_orders || 0,
        unpaid: data.unpaid_orders || 0
      });
    } catch (error) {
      console.error('Error fetching order stats:', error);
      // Set default values in case of error
      setOrderStats({
        total_orders: 0,
        pending: 0,
        completed: 0,
        cancelled: 0,
        in_progress: 0,
        paid: 0,
        unpaid: 0
      });
    }
  };

  // Apply search filter locally
  useEffect(() => {
    if (filters.searchTerm) {
      applySearchFilter();
    } else {
      setFilteredOrders(orders);
    }
  }, [filters.searchTerm, orders]);

  const applySearchFilter = () => {
    const searchLower = filters.searchTerm.toLowerCase();
    const searchOption = filters.searchOption || 'all';
    
    const result = orders.filter(order => {
      // If empty search term, return all results
      if (!searchLower.trim()) return true;
      
      // Search based on the selected option
      switch (searchOption) {
        case 'id':
          return order.order_id?.toString().toLowerCase().includes(searchLower);
        
        case 'customer':
          return order.customer_name?.toLowerCase().includes(searchLower);
        
        case 'email':
          return order.email?.toLowerCase().includes(searchLower);
        
        case 'phone':
          return order.phone_number?.toLowerCase().includes(searchLower);
        
        case 'all':
        default:
          // Search all fields (original implementation)
          if (order.order_id && 
              order.order_id.toString().toLowerCase().includes(searchLower)) {
            return true;
          }
          
          if (order.user_id && 
              order.user_id.toString().toLowerCase().includes(searchLower)) {
            return true;
          }
          
          if (order.customer_name && 
              order.customer_name.toLowerCase().includes(searchLower)) {
            return true;
          }
          
          if (order.email && 
              order.email.toLowerCase().includes(searchLower)) {
            return true;
          }
          
          if (order.phone_number && 
              order.phone_number.toLowerCase().includes(searchLower)) {
            return true;
          }
          
          return false;
      }
    });
    
    setFilteredOrders(result);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    
    // Remove the conditional for date handling since we're removing the date filters
    setFilters({
      ...filters,
      [name]: value,
      // Reset to page 1 when changing filters
      page: 1
    });
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      orderType: '',
      paymentStatus: '', // Reset payment status
      searchTerm: '',
      searchOption: 'all', // Reset to 'all'
      page: 1,
      limit: 10,
      dateRange: {
        startDate: '',
        endDate: ''
      }
    });
  };

  const handleViewDetails = async (orderId) => {
    try {
      setIsLoading(true);
      const orderDetails = await orderService.getOrderById(orderId);
      setSelectedOrder(orderDetails);
      setIsDetailsModalOpen(true);
    } catch (error) {
      notify(`Error fetching order details: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await orderService.updateOrderStatus(orderId, newStatus);
      
      // Update local state
      const updatedOrders = orders.map(order => 
        order.order_id === orderId 
          ? { ...order, order_status: newStatus } 
          : order
      );
      
      setOrders(updatedOrders);
      setFilteredOrders(updatedOrders.filter(order => 
        !filters.status || order.order_status === filters.status
      ));
      
      // If we're viewing this order in the modal, update it there too
      if (selectedOrder && selectedOrder.order_id === orderId) {
        setSelectedOrder({ ...selectedOrder, order_status: newStatus });
      }
      
      // Refresh order stats
      fetchOrderStats();
      
      notify(`Order #${orderId} status updated to ${newStatus}`, 'success');
    } catch (error) {
      notify(`Error updating order status: ${error.message}`, 'error');
    }
  };

  // Add a function to update payment status
  const handleUpdatePaymentStatus = async (orderId, newStatus) => {
    try {
      await orderService.updatePaymentStatus(orderId, newStatus);
      
      // Update local state
      const updatedOrders = orders.map(order => 
        order.order_id === orderId 
          ? { ...order, payment_status: newStatus } 
          : order
      );
      
      setOrders(updatedOrders);
      setFilteredOrders(updatedOrders.filter(order => 
        !filters.status || order.order_status === filters.status
      ));
      
      // If we're viewing this order in the modal, update it there too
      if (selectedOrder && selectedOrder.order_id === orderId) {
        setSelectedOrder({ ...selectedOrder, payment_status: newStatus });
      }
      
      // Refresh order stats
      fetchOrderStats();
      
      notify(`Order #${orderId} payment status updated to ${newStatus}`, 'success');
    } catch (error) {
      notify(`Error updating payment status: ${error.message}`, 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Completed': return 'status-completed';
      case 'In Progress': return 'status-processing';
      case 'Pending': return 'status-pending';
      case 'Cancelled': return 'status-cancelled';
      default: return '';
    }
  };

  const getPaymentStatusClass = (status) => {
    switch (status) {
      case 'paid': return 'status-completed';
      case 'unpaid': return 'status-pending';
      case 'failed': return 'status-cancelled';
      default: return '';
    }
  };

  const getDeliveryStatusClass = (status) => {
    switch (status) {
      case 'delivered': return 'status-completed';
      case 'out_for_delivery': return 'status-processing';
      case 'assigned': return 'status-processing';
      case 'pending': return 'status-pending';
      default: return '';
    }
  };

  const formatDeliveryStatus = (status) => {
    if (!status) return 'N/A';
    
    // Convert snake_case to Title Case
    return status.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    
    setFilters({
      ...filters,
      page: newPage
    });
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-content">
        <Header title="Orders Management" />
        
        <div className="orders-overview">
          <div className="order-stat-card pending">
            <h3>Pending</h3>
            <p className="stat-number">{orderStats.pending}</p>
          </div>
          <div className="order-stat-card in-progress">
            <h3>In Progress</h3>
            <p className="stat-number">{orderStats.in_progress}</p>
          </div>
          <div className="order-stat-card completed">
            <h3>Completed</h3>
            <p className="stat-number">{orderStats.completed}</p>
          </div>
          <div className="order-stat-card cancelled">
            <h3>Cancelled</h3>
            <p className="stat-number">{orderStats.cancelled}</p>
          </div>
        </div>
        
        <div className="filters-section">
          <div className="search-bar">
            <div className="search-container">
              <select 
                name="searchOption" 
                className="search-option-select"
                value={filters.searchOption}
                onChange={handleFilterChange}
              >
                <option value="all">All Fields</option>
                <option value="id">Order ID</option>
                <option value="customer">Customer Name</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
              </select>
              <input
                type="text"
                name="searchTerm"
                value={filters.searchTerm}
                onChange={handleFilterChange}
                placeholder={`Search orders by ${filters.searchOption === 'all' ? 'any field' : filters.searchOption}...`}
              />
            </div>
          </div>
          
          <div className="filter-options">
            <select 
              name="status" 
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            
            <select 
              name="orderType" 
              value={filters.orderType}
              onChange={handleFilterChange}
            >
              <option value="">All Types</option>
              <option value="Dine-in">Dine-in</option>
              <option value="Takeaway">Takeaway</option>
              <option value="Delivery">Delivery</option>
            </select>
            
            {/* Add payment status filter dropdown */}
            <select 
              name="paymentStatus" 
              value={filters.paymentStatus}
              onChange={handleFilterChange}
            >
              <option value="">All Payment Statuses</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="failed">Failed</option>
            </select>
            
            <button className="reset-filters-btn" onClick={resetFilters}>
              Reset Filters
            </button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="loading">Loading orders...</div>
        ) : (
          <div className="orders-table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <tr key={order.order_id}>
                      <td>{order.order_id}</td>
                      <td>{order.user_id ? `User ${order.user_id}` : 'Guest'}</td>
                      <td>{order.order_type}</td>
                      <td>{formatDate(order.created_at)}</td>
                      <td>Rs. {parseFloat(order.total_amount).toFixed(2)}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(order.order_status)}`}>
                          {order.order_status}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${getPaymentStatusClass(order.payment_status)}`}>
                          {order.payment_status ? order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1) : 'N/A'}
                        </span>
                      </td>
                      <td>
                        <div className="order-actions">
                          <button 
                            className="view-btn"
                            onClick={() => handleViewDetails(order.order_id)}
                          >
                            View Details
                          </button>
                          
                          <select 
                            className="status-update-select"
                            value={order.order_status}
                            onChange={(e) => handleUpdateStatus(order.order_id, e.target.value)}
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="no-orders">
                      No orders match the current filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {/* Add pagination controls */}
            {pagination.pages > 1 && (
              <div className="pagination-controls">
                <button 
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page === 1}
                >
                  Previous
                </button>
                <span>Page {filters.page} of {pagination.pages}</span>
                <button 
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={filters.page === pagination.pages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Order Details Modal */}
        {isDetailsModalOpen && selectedOrder && (
          <div className="modal-overlay">
            <div className="modal-content order-details-modal">
              <div className="modal-header">
                <h2>Order #{selectedOrder.order_id} Details</h2>
                <button 
                  className="close-modal-btn"
                  onClick={() => setIsDetailsModalOpen(false)}
                >
                  &times;
                </button>
              </div>
              
              <div className="order-details-content">
                <div className="order-info-section">
                  <div className="order-info-group">
                    <h3>Order Information</h3>
                    <p><strong>Status:</strong> {selectedOrder.order_status}</p>
                    <p><strong>Type:</strong> {selectedOrder.order_type}</p>
                    <p><strong>Date:</strong> {formatDate(selectedOrder.created_at)}</p>
                    <p><strong>Last Updated:</strong> {formatDate(selectedOrder.updated_at)}</p>
                  </div>
                  
                  <div className="order-info-group">
                    <h3>Customer Information</h3>
                    <p><strong>Name:</strong> {selectedOrder.first_name || selectedOrder.last_name ? 
                      `${selectedOrder.first_name || ''} ${selectedOrder.last_name || ''}`.trim() : 
                      selectedOrder.customer_name || `User ${selectedOrder.user_id}` || 'Guest'}</p>
                    <p><strong>User ID:</strong> {selectedOrder.user_id || 'Guest'}</p>
                    {selectedOrder.email && <p><strong>Email:</strong> {selectedOrder.email}</p>}
                    {selectedOrder.phone_number && <p><strong>Phone:</strong> {selectedOrder.phone_number}</p>}
                  </div>
                </div>
                
                <div className="payment-section">
                  <h3>Payment Information</h3>
                  <div className="payment-info">
                    <p>
                      <strong>Status:</strong> 
                      <span className={`status-badge ${getPaymentStatusClass(selectedOrder.payment_status)}`}>
                        {selectedOrder.payment_status ? selectedOrder.payment_status.charAt(0).toUpperCase() + selectedOrder.payment_status.slice(1) : 'N/A'}
                      </span>
                      
                      {/* Add payment status update dropdown */}
                      <select 
                        className="status-update-select payment-status-select"
                        value={selectedOrder.payment_status || ''}
                        onChange={(e) => handleUpdatePaymentStatus(selectedOrder.order_id, e.target.value)}
                        style={{ marginLeft: '10px' }}
                      >
                        <option value="unpaid">Unpaid</option>
                        <option value="paid">Paid</option>
                        <option value="failed">Failed</option>
                      </select>
                    </p>
                    <p><strong>Method:</strong> {selectedOrder.payment_type ? selectedOrder.payment_type.charAt(0).toUpperCase() + selectedOrder.payment_type.slice(1) : 'N/A'}</p>
                    <p><strong>Amount:</strong> Rs. {selectedOrder.payment_amount ? parseFloat(selectedOrder.payment_amount).toFixed(2) : parseFloat(selectedOrder.total_amount).toFixed(2)}</p>
                    {selectedOrder.paid_at && <p><strong>Paid At:</strong> {formatDate(selectedOrder.paid_at)}</p>}
                  </div>
                </div>
                
                <div className="order-items-section">
                  <h3>Ordered Items</h3>
                  <table className="order-items-table">
                    <thead>
                      <tr>
                        <th>Item ID</th>
                        <th>Item Name</th>
                        <th>Price</th>
                        <th>Quantity</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items && selectedOrder.items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.menu_id}</td>
                          <td>{item.menu_name || 'Unknown Item'}</td>
                          <td>Rs. {parseFloat(item.price).toFixed(2)}</td>
                          <td>{item.quantity}</td>
                          <td>Rs. {(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="order-total">
                        <td colSpan="4" className="summary-label">Total</td>
                        <td>Rs. {parseFloat(selectedOrder.total_amount).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                
                {selectedOrder.order_type === 'Delivery' && (
                  <div className="delivery-section">
                    <h3>Delivery Information</h3>
                    {selectedOrder.delivery_person_id && (
                      <p><strong>Delivery Person ID:</strong> {selectedOrder.delivery_person_id}</p>
                    )}
                    {selectedOrder.delivery_address && (
                      <p><strong>Delivery Address:</strong> {selectedOrder.delivery_address}</p>
                    )}
                    {selectedOrder.delivery_status && (
                      <p>
                        <strong>Delivery Status:</strong> 
                        <span className={`status-badge ${getDeliveryStatusClass(selectedOrder.delivery_status)}`}>
                          {formatDeliveryStatus(selectedOrder.delivery_status)}
                        </span>
                      </p>
                    )}
                  </div>
                )}
                
                <div className="order-actions-footer">
                  <select 
                    value={selectedOrder.order_status}
                    onChange={(e) => {
                      handleUpdateStatus(selectedOrder.order_id, e.target.value);
                      setSelectedOrder({...selectedOrder, order_status: e.target.value});
                    }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  
                  <button className="print-order-btn">
                    Print Order
                  </button>
                  
                  <button 
                    className="close-details-btn"
                    onClick={() => setIsDetailsModalOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default OrdersManagement;
