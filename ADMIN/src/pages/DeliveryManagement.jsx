import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/DeliveryManagement.css';
import * as deliveryService from '../services/deliveryService';

function DeliveryManagement() {
  // State for deliveries and delivery personnel
  const [deliveries, setDeliveries] = useState([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState([]);
  const [deliveryPersonnel, setDeliveryPersonnel] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPersonnel, setIsLoadingPersonnel] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [deliveryStats, setDeliveryStats] = useState({
    total: 0,
    inTransit: 0,
    delivered: 0,
    canceled: 0,
  });

  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    deliveryPerson: '',
    dateRange: {
      startDate: '',
      endDate: '',
    },
    searchTerm: '',
  });

  // Simple notification function (replace with toast notifications in production)
  const notify = (message, type = 'info') => {
    console.log(`[${type}] ${message}`);
    alert(message);
  };

  // Fetch deliveries on component mount
  useEffect(() => {
    fetchDeliveries();
    fetchDeliveryPersonnel();
    fetchDeliveryStats();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [deliveries, filters]);

  const fetchDeliveries = async () => {
    setIsLoading(true);
    try {
      const data = await deliveryService.getAllDeliveries();
      setDeliveries(data);
      setFilteredDeliveries(data);
    } catch (error) {
      notify(`Error fetching deliveries: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDeliveryPersonnel = async () => {
    setIsLoadingPersonnel(true);
    try {
      const personnel = await deliveryService.getDeliveryPersonnel();
      setDeliveryPersonnel(personnel);
    } catch (error) {
      notify(`Error fetching delivery personnel: ${error.message}`, 'error');
    } finally {
      setIsLoadingPersonnel(false);
    }
  };

  const fetchDeliveryStats = async () => {
    try {
      const stats = await deliveryService.getDeliveryStats();
      setDeliveryStats(stats);
    } catch (error) {
      console.error('Error fetching delivery stats:', error);
      // Keep default stats in case of error
    }
  };

  const applyFilters = () => {
    let filtered = [...deliveries];
    
    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(delivery => 
        delivery.delivery_status.toLowerCase() === filters.status.toLowerCase()
      );
    }
    
    // Apply delivery person filter
    if (filters.deliveryPerson) {
      filtered = filtered.filter(delivery => 
        delivery.delivery_person_id === parseInt(filters.deliveryPerson)
      );
    }
    
    // Apply date range filter
    if (filters.dateRange.startDate) {
      const startDate = new Date(filters.dateRange.startDate);
      filtered = filtered.filter(delivery => 
        new Date(delivery.created_at) >= startDate
      );
    }
    
    if (filters.dateRange.endDate) {
      const endDate = new Date(filters.dateRange.endDate);
      endDate.setHours(23, 59, 59); // End of day
      filtered = filtered.filter(delivery => 
        new Date(delivery.created_at) <= endDate
      );
    }
    
    // Apply search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(delivery => 
        delivery.customer_name?.toLowerCase().includes(searchLower) ||
        delivery.delivery_address?.toLowerCase().includes(searchLower) ||
        delivery.order_id?.toString().includes(searchLower) ||
        (delivery.delivery_person_name && 
         delivery.delivery_person_name.toLowerCase().includes(searchLower))
      );
    }
    
    setFilteredDeliveries(filtered);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      // Handle nested objects (e.g., dateRange.startDate)
      const [parent, child] = name.split('.');
      setFilters({
        ...filters,
        [parent]: {
          ...filters[parent],
          [child]: value,
        },
      });
    } else {
      // Handle regular fields
      setFilters({
        ...filters,
        [name]: value,
      });
    }
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      deliveryPerson: '',
      dateRange: {
        startDate: '',
        endDate: '',
      },
      searchTerm: '',
    });
  };

  const handleViewDetails = (delivery) => {
    setSelectedDelivery(delivery);
    setIsDetailsModalOpen(true);
  };

  const handleAssignDelivery = (delivery) => {
    setSelectedDelivery(delivery);
    setIsAssignModalOpen(true);
  };

  const updateDeliveryStatus = async (deliveryId, newStatus) => {
    try {
      // Call the API
      await deliveryService.updateDeliveryStatus(deliveryId, newStatus);
      
      // Update local state
      const updatedDeliveries = deliveries.map(delivery => {
        if (delivery.delivery_id === deliveryId) {
          return { ...delivery, delivery_status: newStatus };
        }
        return delivery;
      });
      
      setDeliveries(updatedDeliveries);
      setFilteredDeliveries(
        filteredDeliveries.map(delivery => {
          if (delivery.delivery_id === deliveryId) {
            return { ...delivery, delivery_status: newStatus };
          }
          return delivery;
        })
      );
      
      // If viewing details of the updated delivery, update that too
      if (selectedDelivery && selectedDelivery.delivery_id === deliveryId) {
        setSelectedDelivery({ ...selectedDelivery, delivery_status: newStatus });
      }
      
      notify(`Delivery status updated to: ${formatDeliveryStatus(newStatus)}`, 'success');
      
      // Update stats
      fetchDeliveryStats();
    } catch (error) {
      notify(`Error updating delivery status: ${error.message}`, 'error');
    }
  };

  const assignDeliveryPerson = async (deliveryId, deliveryPersonId) => {
    try {
      // Call the API
      await deliveryService.assignDeliveryPerson(deliveryId, deliveryPersonId);
      
      // Get delivery person details
      const deliveryPerson = deliveryPersonnel.find(
        person => person.id === parseInt(deliveryPersonId)
      );
      
      if (!deliveryPerson) {
        throw new Error('Selected delivery person not found');
      }
      
      // Update local state
      const updatedDeliveries = deliveries.map(delivery => {
        if (delivery.delivery_id === deliveryId) {
          return { 
            ...delivery, 
            delivery_person_id: deliveryPerson.id,
            delivery_person_name: deliveryPerson.name,
            contact_number: deliveryPerson.contact,
            delivery_status: 'Assigned'
          };
        }
        return delivery;
      });
      
      setDeliveries(updatedDeliveries);
      setFilteredDeliveries(
        filteredDeliveries.map(delivery => {
          if (delivery.delivery_id === deliveryId) {
            return { 
              ...delivery, 
              delivery_person_id: deliveryPerson.id,
              delivery_person_name: deliveryPerson.name,
              contact_number: deliveryPerson.contact,
              delivery_status: 'Assigned'
            };
          }
          return delivery;
        })
      );
      
      setIsAssignModalOpen(false);
      notify(`Delivery assigned to ${deliveryPerson.name}`, 'success');
      
      // Update stats
      fetchDeliveryStats();
    } catch (error) {
      notify(`Error assigning delivery person: ${error.message}`, 'error');
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
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'status-delivered';
      case 'out_for_delivery':
        return 'status-in-transit';
      case 'assigned':
        return 'status-assigned';
      case 'pending':
        return 'status-pending';
      default:
        return '';
    }
  };

  // Add a function to format the delivery status for display
  const formatDeliveryStatus = (status) => {
    if (!status) return 'N/A';
    
    // Convert snake_case to Title Case
    return status.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-content">
        <Header title="Delivery Management" />
        
        <div className="delivery-stats">
          <div className="delivery-stat-card total">
            <h3>Total Deliveries</h3>
            <p className="stat-number">{deliveryStats.total}</p>
          </div>
          <div className="delivery-stat-card in-transit">
            <h3>In Transit</h3>
            <p className="stat-number">{deliveryStats.inTransit}</p>
          </div>
          <div className="delivery-stat-card delivered">
            <h3>Delivered</h3>
            <p className="stat-number">{deliveryStats.delivered}</p>
          </div>
          <div className="delivery-stat-card canceled">
            <h3>Canceled</h3>
            <p className="stat-number">{deliveryStats.canceled}</p>
          </div>
        </div>
        
        <div className="delivery-personnel-section">
          <h3>Delivery Personnel</h3>
          {isLoadingPersonnel ? (
            <div className="loading-personnel">Loading delivery personnel...</div>
          ) : (
            <div className="delivery-personnel">
              {deliveryPersonnel.length > 0 ? (
                deliveryPersonnel.map((person) => (
                  <div 
                    key={person.id} 
                    className={`personnel-card ${person.status.toLowerCase().replace(' ', '-')}`}
                  >
                    <div className="personnel-info">
                      <h4>{person.name}</h4>
                      <p className="personnel-contact">{person.contact}</p>
                      <span className={`personnel-status status-${person.status.toLowerCase().replace(' ', '-')}`}>
                        {person.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-delivery-personnel">
                  <p>No delivery staff found. You need to add staff with the role "delivery" in Staff Management.</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="filters-section">
          <div className="search-bar">
            <input
              type="text"
              name="searchTerm"
              value={filters.searchTerm}
              onChange={handleFilterChange}
              placeholder="Search by customer, address or order ID..."
            />
          </div>
          
          <div className="filter-options">
            <select 
              name="status" 
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="out_for_delivery">Out For Delivery</option>
              <option value="delivered">Delivered</option>
            </select>
            
            <select 
              name="deliveryPerson" 
              value={filters.deliveryPerson}
              onChange={handleFilterChange}
            >
              <option value="">All Delivery Personnel</option>
              {deliveryPersonnel.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
            
            <div className="date-filters">
              <div className="date-filter">
                <label>From</label>
                <input 
                  type="date"
                  name="dateRange.startDate"
                  value={filters.dateRange.startDate}
                  onChange={handleFilterChange}
                />
              </div>
              
              <div className="date-filter">
                <label>To</label>
                <input 
                  type="date"
                  name="dateRange.endDate"
                  value={filters.dateRange.endDate}
                  onChange={handleFilterChange}
                />
              </div>
            </div>
            
            <button className="reset-filters-btn" onClick={resetFilters}>
              Reset Filters
            </button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="loading">Loading deliveries...</div>
        ) : (
          <div className="deliveries-table-container">
            <table className="deliveries-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Delivery Address</th>
                  <th>Status</th>
                  <th>Est. Delivery</th>
                  <th>Delivery Person</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.length > 0 ? (
                  filteredDeliveries.map((delivery) => (
                    <tr key={delivery.delivery_id}>
                      <td>{delivery.delivery_id}</td>
                      <td>{delivery.order_id}</td>
                      <td>{delivery.customer_name}</td>
                      <td className="address-cell">{delivery.delivery_address}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(delivery.delivery_status)}`}>
                          {formatDeliveryStatus(delivery.delivery_status)}
                        </span>
                      </td>
                      <td>{formatDate(delivery.estimated_delivery_time)}</td>
                      <td>
                        {delivery.delivery_person_name || (
                          <span className="not-assigned">Not Assigned</span>
                        )}
                      </td>
                      <td>
                        <div className="delivery-actions">
                          <button 
                            className="view-btn"
                            onClick={() => handleViewDetails(delivery)}
                          >
                            View
                          </button>
                          
                          {!delivery.delivery_person_id && delivery.delivery_status === 'Pending' && (
                            <button 
                              className="assign-btn"
                              onClick={() => handleAssignDelivery(delivery)}
                            >
                              Assign
                            </button>
                          )}
                          
                          {delivery.delivery_person_id && delivery.delivery_status === 'assigned' && (
                            <button 
                              className="transit-btn"
                              onClick={() => updateDeliveryStatus(delivery.delivery_id, 'out_for_delivery')}
                            >
                              Mark Out For Delivery
                            </button>
                          )}
                          
                          {delivery.delivery_status === 'out_for_delivery' && (
                            <button 
                              className="delivered-btn"
                              onClick={() => updateDeliveryStatus(delivery.delivery_id, 'delivered')}
                            >
                              Mark Delivered
                            </button>
                          )}
                          
                          {(delivery.delivery_status === 'Pending' || delivery.delivery_status === 'Assigned') && (
                            <button 
                              className="cancel-btn"
                              onClick={() => updateDeliveryStatus(delivery.delivery_id, 'Canceled')}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="no-deliveries">
                      No deliveries match the current filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Delivery Details Modal */}
        {isDetailsModalOpen && selectedDelivery && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Delivery #{selectedDelivery.delivery_id} Details</h2>
                <button 
                  className="close-modal-btn"
                  onClick={() => setIsDetailsModalOpen(false)}
                >
                  &times;
                </button>
              </div>
              
              <div className="modal-body">
                <div className="delivery-details">
                  <div className="detail-section">
                    <h3>Delivery Information</h3>
                    <div className="detail-row">
                      <span className="detail-label">Status:</span>
                      <span className={`status-text ${getStatusClass(selectedDelivery.delivery_status)}`}>
                        {formatDeliveryStatus(selectedDelivery.delivery_status)}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Order ID:</span>a
                      <span className="detail-value">{selectedDelivery.order_id}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Created:</span>
                      <span className="detail-value">{formatDate(selectedDelivery.created_at)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Est. Delivery:</span>
                      <span className="detail-value">{formatDate(selectedDelivery.estimated_delivery_time)}</span>
                    </div>
                    {selectedDelivery.actual_delivery_time && (
                      <div className="detail-row">
                        <span className="detail-label">Actual Delivery:</span>
                        <span className="detail-value">{formatDate(selectedDelivery.actual_delivery_time)}</span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="detail-label">Distance:</span>
                      <span className="detail-value">{selectedDelivery.distance} km</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Delivery Fee:</span>
                      <span className="detail-value">Rs. {selectedDelivery.delivery_fee.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="detail-section">
                    <h3>Customer Information</h3>
                    <div className="detail-row">
                      <span className="detail-label">Name:</span>
                      <span className="detail-value">{selectedDelivery.customer_name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Address:</span>
                      <span className="detail-value">{selectedDelivery.delivery_address}</span>
                    </div>
                    {selectedDelivery.special_instructions && (
                      <div className="detail-row">
                        <span className="detail-label">Instructions:</span>
                        <span className="detail-value">{selectedDelivery.special_instructions}</span>
                      </div>
                    )}
                  </div>
                  
                  {selectedDelivery.delivery_person_id && (
                    <div className="detail-section">
                      <h3>Delivery Person Information</h3>
                      <div className="detail-row">
                        <span className="detail-label">Name:</span>
                        <span className="detail-value">{selectedDelivery.delivery_person_name}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Contact:</span>
                        <span className="detail-value">{selectedDelivery.contact_number}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="modal-actions">
                  {!selectedDelivery.delivery_person_id && selectedDelivery.delivery_status === 'Pending' && (
                    <button 
                      className="assign-btn"
                      onClick={() => {
                        setIsDetailsModalOpen(false);
                        handleAssignDelivery(selectedDelivery);
                      }}
                    >
                      Assign Delivery Person
                    </button>
                  )}
                  
                  {selectedDelivery.delivery_person_id && selectedDelivery.delivery_status === 'assigned' && (
                    <button 
                      className="transit-btn"
                      onClick={() => {
                        updateDeliveryStatus(selectedDelivery.delivery_id, 'out_for_delivery');
                        setIsDetailsModalOpen(false);
                      }}
                    >
                      Mark Out For Delivery
                    </button>
                  )}
                  
                  {selectedDelivery.delivery_status === 'out_for_delivery' && (
                    <button 
                      className="delivered-btn"
                      onClick={() => {
                        updateDeliveryStatus(selectedDelivery.delivery_id, 'delivered');
                        setIsDetailsModalOpen(false);
                      }}
                    >
                      Mark Delivered
                    </button>
                  )}
                  
                  {(selectedDelivery.delivery_status === 'Pending' || selectedDelivery.delivery_status === 'Assigned') && (
                    <button 
                      className="cancel-btn"
                      onClick={() => {
                        updateDeliveryStatus(selectedDelivery.delivery_id, 'Canceled');
                        setIsDetailsModalOpen(false);
                      }}
                    >
                      Cancel Delivery
                    </button>
                  )}
                  
                  <button 
                    className="close-btn"
                    onClick={() => setIsDetailsModalOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Assign Delivery Person Modal */}
        {isAssignModalOpen && selectedDelivery && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Assign Delivery Person</h2>
                <button 
                  className="close-modal-btn"
                  onClick={() => setIsAssignModalOpen(false)}
                >
                  &times;
                </button>
              </div>
              
              <div className="modal-body">
                <div className="assign-delivery-info">
                  <p><strong>Delivery ID:</strong> {selectedDelivery.delivery_id}</p>
                  <p><strong>Order ID:</strong> {selectedDelivery.order_id}</p>
                  <p><strong>Customer:</strong> {selectedDelivery.customer_name}</p>
                  <p><strong>Address:</strong> {selectedDelivery.delivery_address}</p>
                  <p><strong>Distance:</strong> {selectedDelivery.distance} km</p>
                </div>
                
                <h3 className="available-personnel-title">Available Delivery Personnel</h3>
                
                <div className="assign-personnel-list">
                  {deliveryPersonnel
                    .filter(person => person.status === 'Available')
                    .map(person => (
                      <div 
                        key={person.id} 
                        className="assign-personnel-item"
                        onClick={() => assignDeliveryPerson(selectedDelivery.delivery_id, person.id)}
                      >
                        <div className="personnel-details">
                          <h4>{person.name}</h4>
                          <p className="personnel-contact">{person.contact}</p>
                        </div>
                        <div className="assign-action">
                          <button className="assign-person-btn">Assign</button>
                        </div>
                      </div>
                    ))}
                    
                  {deliveryPersonnel.filter(person => person.status === 'Available').length === 0 && (
                    <div className="no-available-personnel">
                      <p>No delivery personnel are currently available. Please try again later.</p>
                    </div>
                  )}
                </div>
                
                <div className="modal-actions">
                  <button 
                    className="close-btn"
                    onClick={() => setIsAssignModalOpen(false)}
                  >
                    Cancel
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

export default DeliveryManagement;
