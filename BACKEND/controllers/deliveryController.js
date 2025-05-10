const db = require('../config/db');

/**
 * Get all deliveries with optional filtering
 */
exports.getAllDeliveries = async (req, res) => {
  try {
    const { 
      status, 
      delivery_person_id, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 10 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build WHERE clause based on filters
    let whereClause = '';
    const params = [];
    
    if (status) {
      whereClause += 'WHERE d.delivery_status = ?';
      params.push(status);
    }
    
    if (delivery_person_id) {
      whereClause += whereClause ? ' AND d.delivery_person_id = ?' : 'WHERE d.delivery_person_id = ?';
      params.push(delivery_person_id);
    }
    
    if (startDate) {
      whereClause += whereClause ? ' AND d.created_at >= ?' : 'WHERE d.created_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      whereClause += whereClause ? ' AND d.created_at <= ?' : 'WHERE d.created_at <= ?';
      params.push(endDate);
    }
    
    // Check if deliveries table exists
    db.query('SHOW TABLES LIKE "deliveries"', (err, tables) => {
      if (err) {
        console.error('Error checking for deliveries table:', err);
        return res.status(500).json({ 
          message: 'Database error', 
          error: err.message 
        });
      }
      
      if (tables.length === 0) {
        return res.status(404).json({ 
          message: 'Deliveries table does not exist. Please run appropriate migrations first.' 
        });
      }
      
      // Count total deliveries for pagination
      const countQuery = `
        SELECT COUNT(*) as total FROM deliveries d
        ${whereClause}
      `;
      
      db.query(countQuery, params, (err, countResult) => {
        if (err) {
          console.error('Error counting deliveries:', err);
          return res.status(500).json({
            message: 'Error counting deliveries',
            error: err.message
          });
        }
        
        const total = countResult[0].total;
        const pages = Math.ceil(total / limit);
        
        // Query for deliveries with pagination
        const queryParams = [...params, parseInt(limit), offset];
        
        const query = `
          SELECT d.*, 
            o.order_id, 
            c.customer_name,
            CONCAT(s.first_name, ' ', s.last_name) AS delivery_person_name,
            s.phone_number AS contact_number
          FROM deliveries d
          LEFT JOIN orders o ON d.order_id = o.order_id
          LEFT JOIN customers c ON o.user_id = c.customer_id
          LEFT JOIN staff s ON d.delivery_person_id = s.staff_id
          ${whereClause}
          ORDER BY d.created_at DESC
          LIMIT ? OFFSET ?
        `;
        
        db.query(query, queryParams, (err, deliveries) => {
          if (err) {
            console.error('Error fetching deliveries:', err);
            return res.status(500).json({
              message: 'Error fetching deliveries',
              error: err.message
            });
          }
          
          // Return deliveries with pagination info
          res.json({
            deliveries,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total,
              pages
            }
          });
        });
      });
    });
  } catch (error) {
    console.error('Server error in getAllDeliveries:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get delivery statistics
 */
exports.getDeliveryStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build WHERE clause if date filters are provided
    let whereClause = '';
    const params = [];
    
    if (startDate) {
      whereClause += 'WHERE created_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      whereClause += whereClause ? ' AND created_at <= ?' : 'WHERE created_at <= ?';
      params.push(endDate);
    }
    
    // Check if deliveries table exists
    db.query('SHOW TABLES LIKE "deliveries"', (err, tables) => {
      if (err) {
        console.error('Error checking for deliveries table:', err);
        return res.status(500).json({
          message: 'Database error',
          error: err.message
        });
      }
      
      if (tables.length === 0) {
        // Return empty stats if table doesn't exist
        return res.json({
          total: 0,
          inTransit: 0,
          delivered: 0,
          canceled: 0
        });
      }
      
      // Query for delivery stats
      const statsQuery = `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN delivery_status = 'In Transit' THEN 1 ELSE 0 END) as inTransit,
          SUM(CASE WHEN delivery_status = 'Delivered' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN delivery_status = 'Canceled' THEN 1 ELSE 0 END) as canceled
        FROM deliveries
        ${whereClause}
      `;
      
      db.query(statsQuery, params, (err, results) => {
        if (err) {
          console.error('Error fetching delivery stats:', err);
          return res.status(500).json({
            message: 'Error fetching delivery stats',
            error: err.message
          });
        }
        
        // Format stats to ensure they are numbers, not null
        const stats = results[0];
        const formattedStats = {
          total: parseInt(stats.total || 0),
          inTransit: parseInt(stats.inTransit || 0),
          delivered: parseInt(stats.delivered || 0),
          canceled: parseInt(stats.canceled || 0)
        };
        
        res.json(formattedStats);
      });
    });
  } catch (error) {
    console.error('Server error in getDeliveryStats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get a specific delivery by ID
 */
exports.getDeliveryById = async (req, res) => {
  try {
    const deliveryId = req.params.id;
    
    const query = `
      SELECT d.*, 
        o.order_id, 
        c.customer_name,
        CONCAT(s.first_name, ' ', s.last_name) AS delivery_person_name,
        s.phone_number AS contact_number
      FROM deliveries d
      LEFT JOIN orders o ON d.order_id = o.order_id
      LEFT JOIN customers c ON o.user_id = c.customer_id
      LEFT JOIN staff s ON d.delivery_person_id = s.staff_id
      WHERE d.delivery_id = ?
    `;
    
    db.query(query, [deliveryId], (err, results) => {
      if (err) {
        console.error(`Error fetching delivery ${deliveryId}:`, err);
        return res.status(500).json({
          message: 'Error fetching delivery',
          error: err.message
        });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: 'Delivery not found' });
      }
      
      res.json(results[0]);
    });
  } catch (error) {
    console.error('Server error in getDeliveryById:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Create a new delivery
 */
exports.createDelivery = async (req, res) => {
  try {
    const {
      order_id,
      delivery_address,
      delivery_status = 'Pending',
      estimated_delivery_time,
      delivery_person_id = null,
      distance,
      delivery_fee,
      special_instructions = null
    } = req.body;
    
    // Validate required fields
    if (!order_id || !delivery_address || !distance || !delivery_fee) {
      return res.status(400).json({
        message: 'Required fields missing: order_id, delivery_address, distance, delivery_fee'
      });
    }
    
    // Check if orders table exists
    db.query('SHOW TABLES LIKE "orders"', (err, tables) => {
      if (err) {
        console.error('Error checking for orders table:', err);
        return res.status(500).json({
          message: 'Database error',
          error: err.message
        });
      }
      
      // Verify the order exists
      db.query('SELECT * FROM orders WHERE order_id = ?', [order_id], (err, orderResults) => {
        if (err) {
          console.error('Error checking order existence:', err);
          return res.status(500).json({
            message: 'Error checking order existence',
            error: err.message
          });
        }
        
        if (orderResults.length === 0) {
          return res.status(404).json({ message: 'Order not found' });
        }
        
        // Create delivery object
        const delivery = {
          order_id,
          delivery_address,
          delivery_status,
          estimated_delivery_time: estimated_delivery_time || new Date(Date.now() + 30*60000), // Default 30 min from now
          delivery_person_id,
          distance,
          delivery_fee,
          special_instructions
        };
        
        // Insert the delivery record
        db.query('INSERT INTO deliveries SET ?', delivery, (err, result) => {
          if (err) {
            console.error('Error creating delivery:', err);
            return res.status(500).json({
              message: 'Error creating delivery',
              error: err.message
            });
          }
          
          // Update the order's delivery_person_id if a delivery person was assigned
          if (delivery_person_id) {
            db.query(
              'UPDATE orders SET delivery_person_id = ? WHERE order_id = ?',
              [delivery_person_id, order_id],
              (err) => {
                if (err) {
                  console.error('Error updating order with delivery person:', err);
                  // Continue despite error
                }
              }
            );
          }
          
          // Return the created delivery
          res.status(201).json({
            message: 'Delivery created successfully',
            delivery_id: result.insertId,
            ...delivery
          });
        });
      });
    });
  } catch (error) {
    console.error('Server error in createDelivery:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update a delivery
 */
exports.updateDelivery = async (req, res) => {
  try {
    const deliveryId = req.params.id;
    const {
      delivery_address,
      delivery_status,
      estimated_delivery_time,
      actual_delivery_time,
      delivery_person_id,
      distance,
      delivery_fee,
      special_instructions
    } = req.body;
    
    // First check if delivery exists
    db.query('SELECT * FROM deliveries WHERE delivery_id = ?', [deliveryId], (err, results) => {
      if (err) {
        console.error(`Error checking delivery ${deliveryId} existence:`, err);
        return res.status(500).json({
          message: 'Error checking delivery existence',
          error: err.message
        });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: 'Delivery not found' });
      }
      
      // Build update object with only the fields that were provided
      const updateData = {};
      if (delivery_address !== undefined) updateData.delivery_address = delivery_address;
      if (delivery_status !== undefined) updateData.delivery_status = delivery_status;
      if (estimated_delivery_time !== undefined) updateData.estimated_delivery_time = estimated_delivery_time;
      if (actual_delivery_time !== undefined) updateData.actual_delivery_time = actual_delivery_time;
      if (delivery_person_id !== undefined) updateData.delivery_person_id = delivery_person_id;
      if (distance !== undefined) updateData.distance = distance;
      if (delivery_fee !== undefined) updateData.delivery_fee = delivery_fee;
      if (special_instructions !== undefined) updateData.special_instructions = special_instructions;
      
      // Add updated_at timestamp
      updateData.updated_at = new Date();
      
      // Update delivery record
      db.query('UPDATE deliveries SET ? WHERE delivery_id = ?', [updateData, deliveryId], (err, result) => {
        if (err) {
          console.error(`Error updating delivery ${deliveryId}:`, err);
          return res.status(500).json({
            message: 'Error updating delivery',
            error: err.message
          });
        }
        
        // If delivery person was updated, also update the associated order
        if (delivery_person_id !== undefined) {
          db.query(
            'UPDATE orders SET delivery_person_id = ? WHERE order_id = (SELECT order_id FROM deliveries WHERE delivery_id = ?)',
            [delivery_person_id, deliveryId],
            (err) => {
              if (err) {
                console.error('Error updating order with delivery person:', err);
                // Continue despite error
              }
            }
          );
        }
        
        res.json({
          message: 'Delivery updated successfully',
          delivery_id: deliveryId
        });
      });
    });
  } catch (error) {
    console.error('Server error in updateDelivery:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update delivery status
 */
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const deliveryId = req.params.id;
    const { status } = req.body;
    
    // Validate status
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    
    const validStatuses = ['Pending', 'Assigned', 'In Transit', 'Delivered', 'Canceled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    // Check if delivery exists
    db.query('SELECT * FROM deliveries WHERE delivery_id = ?', [deliveryId], (err, results) => {
      if (err) {
        console.error(`Error checking delivery ${deliveryId} existence:`, err);
        return res.status(500).json({
          message: 'Error checking delivery existence',
          error: err.message
        });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: 'Delivery not found' });
      }
      
      const delivery = results[0];
      
      // Prepare update data
      const updateData = {
        delivery_status: status,
        updated_at: new Date()
      };
      
      // If status is 'Delivered', set actual_delivery_time to now
      if (status === 'Delivered' && !delivery.actual_delivery_time) {
        updateData.actual_delivery_time = new Date();
      }
      
      // Update delivery status
      db.query('UPDATE deliveries SET ? WHERE delivery_id = ?', [updateData, deliveryId], (err, result) => {
        if (err) {
          console.error(`Error updating delivery ${deliveryId} status:`, err);
          return res.status(500).json({
            message: 'Error updating delivery status',
            error: err.message
          });
        }
        
        // Update associated order status
        let orderStatus;
        switch (status) {
          case 'Delivered':
            orderStatus = 'Completed';
            break;
          case 'Canceled':
            orderStatus = 'Cancelled';
            break;
          case 'In Transit':
            orderStatus = 'In Progress';
            break;
          default:
            orderStatus = delivery.order_status; // Keep current order status
        }
        
        if (orderStatus) {
          db.query(
            'UPDATE orders SET order_status = ? WHERE order_id = (SELECT order_id FROM deliveries WHERE delivery_id = ?)',
            [orderStatus, deliveryId],
            (err) => {
              if (err) {
                console.error('Error updating order status:', err);
                // Continue despite error
              }
            }
          );
        }
        
        res.json({
          message: 'Delivery status updated successfully',
          delivery_id: deliveryId,
          status
        });
      });
    });
  } catch (error) {
    console.error('Server error in updateDeliveryStatus:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Assign delivery person to a delivery
 */
exports.assignDeliveryPerson = async (req, res) => {
  try {
    const deliveryId = req.params.id;
    const { delivery_person_id } = req.body;
    
    // Validate required fields
    if (!delivery_person_id) {
      return res.status(400).json({ message: 'Delivery person ID is required' });
    }
    
    // Check if delivery exists
    db.query('SELECT * FROM deliveries WHERE delivery_id = ?', [deliveryId], (err, results) => {
      if (err) {
        console.error(`Error checking delivery ${deliveryId} existence:`, err);
        return res.status(500).json({
          message: 'Error checking delivery existence',
          error: err.message
        });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: 'Delivery not found' });
      }
      
      const delivery = results[0];
      
      // Check if staff exists and is a delivery person
      db.query(
        'SELECT * FROM staff WHERE staff_id = ? AND role = "delivery"',
        [delivery_person_id],
        (err, staffResults) => {
          if (err) {
            console.error(`Error checking staff ${delivery_person_id} existence:`, err);
            return res.status(500).json({
              message: 'Error checking staff existence',
              error: err.message
            });
          }
          
          if (staffResults.length === 0) {
            return res.status(404).json({ 
              message: 'Staff member not found or is not assigned to delivery role' 
            });
          }
          
          const staffMember = staffResults[0];
          
          // Update delivery with assigned staff
          const updateData = {
            delivery_person_id: delivery_person_id,
            delivery_status: 'Assigned', // Automatically update status to 'Assigned'
            updated_at: new Date()
          };
          
          db.query('UPDATE deliveries SET ? WHERE delivery_id = ?', [updateData, deliveryId], (err) => {
            if (err) {
              console.error(`Error assigning delivery person to delivery ${deliveryId}:`, err);
              return res.status(500).json({
                message: 'Error assigning delivery person',
                error: err.message
              });
            }
            
            // Also update the order's delivery_person_id
            db.query(
              'UPDATE orders SET delivery_person_id = ? WHERE order_id = ?',
              [delivery_person_id, delivery.order_id],
              (err) => {
                if (err) {
                  console.error('Error updating order with delivery person:', err);
                  // Continue despite error
                }
              }
            );
            
            res.json({
              message: 'Delivery person assigned successfully',
              delivery_id: deliveryId,
              delivery_person_id: staffMember.staff_id,
              delivery_person_name: `${staffMember.first_name} ${staffMember.last_name}`
            });
          });
        }
      );
    });
  } catch (error) {
    console.error('Server error in assignDeliveryPerson:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Delete a delivery
 */
exports.deleteDelivery = async (req, res) => {
  try {
    const deliveryId = req.params.id;
    
    // Check if delivery exists
    db.query('SELECT * FROM deliveries WHERE delivery_id = ?', [deliveryId], (err, results) => {
      if (err) {
        console.error(`Error checking delivery ${deliveryId} existence:`, err);
        return res.status(500).json({
          message: 'Error checking delivery existence',
          error: err.message
        });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: 'Delivery not found' });
      }
      
      // Delete the delivery
      db.query('DELETE FROM deliveries WHERE delivery_id = ?', [deliveryId], (err) => {
        if (err) {
          console.error(`Error deleting delivery ${deliveryId}:`, err);
          return res.status(500).json({
            message: 'Error deleting delivery',
            error: err.message
          });
        }
        
        res.json({
          message: 'Delivery deleted successfully',
          delivery_id: deliveryId
        });
      });
    });
  } catch (error) {
    console.error('Server error in deleteDelivery:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
