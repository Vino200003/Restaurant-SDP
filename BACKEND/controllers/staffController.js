const bcrypt = require('bcryptjs');
const db = require('../config/db');

/**
 * Get all staff members
 */
exports.getAllStaff = (req, res) => {
  try {
    const query = `
      SELECT staff_id, first_name, last_name, nic, email, phone_number, role, active, created_at, updated_at 
      FROM staff 
      ORDER BY staff_id ASC
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching staff:', err);
        return res.status(500).json({ 
          message: 'Error fetching staff', 
          error: err.message 
        });
      }
      
      res.json(results);
    });
  } catch (error) {
    console.error('Server error in getAllStaff:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get staff member by ID
 */
exports.getStaffById = (req, res) => {
  try {
    const staffId = req.params.id;
    
    const query = `
      SELECT staff_id, first_name, last_name, nic, email, phone_number, role, active, created_at, updated_at 
      FROM staff 
      WHERE staff_id = ?
    `;
    
    db.query(query, [staffId], (err, results) => {
      if (err) {
        console.error('Error fetching staff member:', err);
        return res.status(500).json({ 
          message: 'Error fetching staff member', 
          error: err.message 
        });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: 'Staff member not found' });
      }
      
      res.json(results[0]);
    });
  } catch (error) {
    console.error('Server error in getStaffById:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Create a new staff member
 */
exports.createStaff = async (req, res) => {
  try {
    const { first_name, last_name, nic, email, password, phone_number, role, active } = req.body;
    
    // Validate required fields
    if (!first_name || !last_name || !nic || !email || !password || !role) {
      return res.status(400).json({ 
        message: 'First name, last name, NIC, email, password, and role are required' 
      });
    }
    
    // Check if email already exists
    db.query('SELECT * FROM staff WHERE email = ?', [email], async (err, results) => {
      if (err) {
        console.error('Error checking email uniqueness:', err);
        return res.status(500).json({ 
          message: 'Error creating staff member', 
          error: err.message 
        });
      }
      
      if (results.length > 0) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      
      // Check if NIC already exists
      db.query('SELECT * FROM staff WHERE nic = ?', [nic], async (err, nicResults) => {
        if (err) {
          console.error('Error checking NIC uniqueness:', err);
          return res.status(500).json({ 
            message: 'Error creating staff member', 
            error: err.message 
          });
        }
        
        if (nicResults.length > 0) {
          return res.status(400).json({ message: 'NIC already in use' });
        }
        
        // Hash the password
        try {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
          
          // Create staff object
          const newStaff = {
            first_name,
            last_name,
            nic,
            email,
            password: hashedPassword,
            phone_number: phone_number || null,
            role,
            active: active !== undefined ? active : true
          };
          
          // Insert into database
          db.query('INSERT INTO staff SET ?', newStaff, (err, result) => {
            if (err) {
              console.error('Error creating staff member:', err);
              return res.status(500).json({ 
                message: 'Error creating staff member', 
                error: err.message 
              });
            }
            
            // Get the created staff without password
            const query = `
              SELECT staff_id, first_name, last_name, nic, email, phone_number, role, active, created_at, updated_at 
              FROM staff 
              WHERE staff_id = ?
            `;
            
            db.query(query, [result.insertId], (err, staffResult) => {
              if (err) {
                console.error('Error fetching created staff:', err);
                return res.status(201).json({
                  message: 'Staff member created successfully',
                  staff_id: result.insertId
                });
              }
              
              res.status(201).json(staffResult[0]);
            });
          });
        } catch (hashError) {
          console.error('Error hashing password:', hashError);
          return res.status(500).json({ 
            message: 'Error creating staff member', 
            error: hashError.message 
          });
        }
      });
    });
  } catch (error) {
    console.error('Server error in createStaff:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update a staff member
 */
exports.updateStaff = async (req, res) => {
  try {
    const staffId = req.params.id;
    const { first_name, last_name, nic, email, password, phone_number, role, active } = req.body;
    
    // Validate required fields
    if (!first_name || !last_name || !nic || !email || !role) {
      return res.status(400).json({ 
        message: 'First name, last name, NIC, email, and role are required' 
      });
    }
    
    // Check if staff exists
    db.query('SELECT * FROM staff WHERE staff_id = ?', [staffId], async (err, results) => {
      if (err) {
        console.error('Error checking staff existence:', err);
        return res.status(500).json({ 
          message: 'Error updating staff member', 
          error: err.message 
        });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: 'Staff member not found' });
      }
      
      // Check if email already exists for a different staff member
      db.query('SELECT * FROM staff WHERE email = ? AND staff_id != ?', [email, staffId], async (err, emailResults) => {
        if (err) {
          console.error('Error checking email uniqueness:', err);
          return res.status(500).json({ 
            message: 'Error updating staff member', 
            error: err.message 
          });
        }
        
        if (emailResults.length > 0) {
          return res.status(400).json({ message: 'Email already in use by another staff member' });
        }
        
        // Check if NIC already exists for a different staff member
        db.query('SELECT * FROM staff WHERE nic = ? AND staff_id != ?', [nic, staffId], async (err, nicResults) => {
          if (err) {
            console.error('Error checking NIC uniqueness:', err);
            return res.status(500).json({ 
              message: 'Error updating staff member', 
              error: err.message 
            });
          }
          
          if (nicResults.length > 0) {
            return res.status(400).json({ message: 'NIC already in use by another staff member' });
          }
          
          // Create update object
          const updateData = {
            first_name,
            last_name,
            nic,
            email,
            phone_number: phone_number || null,
            role
          };
          
          // Only include active if it's explicitly defined in the request
          if (active !== undefined) {
            updateData.active = active;
          }
          
          // If password is provided, hash it
          if (password) {
            try {
              const salt = await bcrypt.genSalt(10);
              const hashedPassword = await bcrypt.hash(password, salt);
              updateData.password = hashedPassword;
            } catch (hashError) {
              console.error('Error hashing password:', hashError);
              return res.status(500).json({ 
                message: 'Error updating staff member', 
                error: hashError.message 
              });
            }
          }
          
          // Update in database
          db.query('UPDATE staff SET ? WHERE staff_id = ?', [updateData, staffId], (err, result) => {
            if (err) {
              console.error('Error updating staff member:', err);
              return res.status(500).json({ 
                message: 'Error updating staff member', 
                error: err.message 
              });
            }
            
            // Get the updated staff without password
            const query = `
              SELECT staff_id, first_name, last_name, nic, email, phone_number, role, active, created_at, updated_at 
              FROM staff 
              WHERE staff_id = ?
            `;
            
            db.query(query, [staffId], (err, staffResult) => {
              if (err) {
                console.error('Error fetching updated staff:', err);
                return res.status(200).json({
                  message: 'Staff member updated successfully',
                  staff_id: staffId
                });
              }
              
              res.json(staffResult[0]);
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Server error in updateStaff:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Delete a staff member
 */
exports.deleteStaff = (req, res) => {
  try {
    const staffId = req.params.id;
    
    // Check if staff exists
    db.query('SELECT * FROM staff WHERE staff_id = ?', [staffId], (err, results) => {
      if (err) {
        console.error('Error checking staff existence:', err);
        return res.status(500).json({ 
          message: 'Error deleting staff member', 
          error: err.message 
        });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: 'Staff member not found' });
      }
      
      // Delete staff member
      db.query('DELETE FROM staff WHERE staff_id = ?', [staffId], (err, result) => {
        if (err) {
          console.error('Error deleting staff member:', err);
          return res.status(500).json({ 
            message: 'Error deleting staff member', 
            error: err.message 
          });
        }
        
        res.json({
          message: 'Staff member deleted successfully',
          staff_id: staffId
        });
      });
    });
  } catch (error) {
    console.error('Server error in deleteStaff:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Staff login (optional for future use)
 */
exports.loginStaff = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Check if staff exists
    db.query('SELECT * FROM staff WHERE email = ?', [email], async (err, results) => {
      if (err) {
        console.error('Error fetching staff:', err);
        return res.status(500).json({ 
          message: 'Error during login', 
          error: err.message 
        });
      }
      
      if (results.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const staff = results[0];
      
      // Check password
      try {
        const isMatch = await bcrypt.compare(password, staff.password);
        
        if (!isMatch) {
          return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        // Return staff data without password
        const { password, ...staffData } = staff;
        
        res.json({
          message: 'Login successful',
          staff: staffData
        });
      } catch (compareError) {
        console.error('Error comparing passwords:', compareError);
        return res.status(500).json({ 
          message: 'Error during login', 
          error: compareError.message 
        });
      }
    });
  } catch (error) {
    console.error('Server error in loginStaff:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
