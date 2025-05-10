const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const authMiddleware = require('../middleware/authMiddleware');

// Add route logging for debugging
router.use((req, res, next) => {
  console.log(`Delivery route accessed: ${req.method} ${req.url}`);
  next();
});

// Public routes (if any)

// Protected routes - require authentication
router.use(authMiddleware.protect);

// Get all deliveries with optional filtering
router.get('/', deliveryController.getAllDeliveries);

// Get delivery statistics
router.get('/stats', deliveryController.getDeliveryStats);

// Get a specific delivery
router.get('/:id', deliveryController.getDeliveryById);

// Create a new delivery
router.post('/', deliveryController.createDelivery);

// Update a delivery
router.put('/:id', deliveryController.updateDelivery);

// Update delivery status
router.patch('/:id/status', deliveryController.updateDeliveryStatus);

// Assign delivery person to a delivery
router.patch('/:id/assign', deliveryController.assignDeliveryPerson);

// Delete a delivery
router.delete('/:id', deliveryController.deleteDelivery);

module.exports = router;
