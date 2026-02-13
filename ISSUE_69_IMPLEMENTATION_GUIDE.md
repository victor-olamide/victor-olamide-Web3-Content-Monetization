# Issue #69: Notification System for Purchases - Implementation Guide

## Overview

This implementation provides a comprehensive notification system for purchases, refunds, errors, and system events. It includes toast notifications for real-time user feedback and a persistent notification history API.

## Architecture

### Backend Components

#### 1. **Notification Model**
Backend MongoDB schema (to be created in models/Notification.js):
- `userId`: Reference to user
- `type`: notification type (purchase_success, purchase_error, refund, etc.)
- `title`: notification title
- `message`: notification message
- `icon`: icon type for display
- `actionUrl`: link for action (e.g., /library/content-id)
- `metadata`: additional data (contentId, price, transactionId, etc.)
- `isRead`: read status
- `isArchived`: archived status
- `createdAt`, `updatedAt`: timestamps

#### 2. **notificationService.js** (385 lines)
Backend notification management service.

**Key Functions:**
- `createNotification()`: Create a new notification
- `getUserNotifications()`: Get paginated notifications for user
- `getUnreadCount()`: Get count of unread notifications
- `markAsRead()`: Mark single notification as read
- `markAllAsRead()`: Mark all notifications as read
- `archiveNotification()`: Archive a notification
- `deleteNotification()`: Delete a notification
- `notifyPurchaseSuccess()`: Create purchase success notification
- `notifyPurchaseError()`: Create purchase error notification
- `notifyRefund()`: Create refund notification
- `notifyListingUpdate()`: Create listing update notification
- `notifySystem()`: Create system notification
- `getUserNotificationStats()`: Get notification statistics

**Usage:**
```javascript
const notificationService = require('./services/notificationService');

// Notify purchase success
await notificationService.notifyPurchaseSuccess(userId, {
  contentId: '123',
  contentTitle: 'My Video',
  price: 100,
  transactionId: 'tx-123'
});

// Notify purchase error
await notificationService.notifyPurchaseError(userId, {
  contentId: '123',
  contentTitle: 'My Video',
  message: 'Insufficient balance',
  errorCode: 'INSUFFICIENT_BALANCE'
});
```

#### 3. **notificationRoutes.js** (305 lines)
REST API endpoints for notification management.

**Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get user notifications (paginated) |
| GET | `/api/notifications/stats` | Get notification statistics |
| GET | `/api/notifications/unread-count` | Get unread count |
| GET | `/api/notifications/:id` | Get specific notification |
| PUT | `/api/notifications/:id/read` | Mark as read |
| PUT | `/api/notifications/mark-all-read` | Mark all as read |
| POST | `/api/notifications/mark-multiple-read` | Mark multiple as read |
| PUT | `/api/notifications/:id/archive` | Archive notification |
| DELETE | `/api/notifications/:id` | Delete notification |
| POST | `/api/notifications/delete-multiple` | Delete multiple |
| POST | `/api/notifications/test` | Create test notification (dev only) |

### Frontend Components

#### 1. **Toast Component** (159 lines)
Individual toast notification display.

**Features:**
- Success, error, info, warning types
- Auto-dismiss with customizable duration
- Action buttons support
- Smooth animations
- Icon indicators
- Manual dismiss button

**Props:**
```typescript
interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
  action?: { label: string; onClick: () => void };
}
```

**Usage:**
```typescript
<Toast
  id="toast-1"
  type="success"
  title="Purchase Successful!"
  message="You successfully purchased the content"
  duration={4000}
  onClose={(id) => removeToast(id)}
  action={{
    label: 'View Content',
    onClick: () => navigate('/library')
  }}
/>
```

#### 2. **ToastContainer Component** (110 lines)
Container for managing multiple toast notifications.

**Features:**
- Positioning: top-left, top-right, bottom-left, bottom-right, top-center
- Maximum toast limit (default: 5)
- Queue overflow indicator
- Responsive layout

**Props:**
```typescript
interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center';
  maxToasts?: number;
}
```

**Usage:**
```typescript
<ToastContainer
  toasts={notifications}
  onDismiss={(id) => removeNotification(id)}
  position="top-right"
  maxToasts={5}
/>
```

#### 3. **useNotification Hook** (262 lines)
Hook for managing toast notifications.

**Features:**
- Add/remove notifications
- Convenience methods for each type
- Auto-generate unique IDs
- Fetch notifications from API
- Mark as read/delete from API

**Usage:**
```typescript
const { notifications, showSuccess, showError, dismiss } = useNotification();

showSuccess('Purchase Complete', 'You successfully purchased the content');
showError('Purchase Failed', 'Please try again');
dismiss(notificationId);
```

#### 4. **NotificationProvider Context** (224 lines)
Global notification context and provider.

**Features:**
- Global notification state
- Centralized toast management
- Automatic container rendering
- Predefined notification templates
- useNotificationContext hook
- useToast shorthand hook

**Predefined Templates:**
- `purchaseSuccess(contentTitle, price)`
- `purchaseError(errorMessage)`
- `refundProcessing(contentTitle)`
- `refundSuccess(contentTitle, amount)`
- `networkError()`
- `walletNotConnected()`
- `insufficientBalance(required, available)`
- `transactionPending()`
- `transactionConfirmed()`
- `copied(text)`
- `loading(message)`
- `error(title, message)`
- `warning(title, message)`
- `info(title, message)`

**Usage:**
```typescript
// In App.tsx
<NotificationProvider position="top-right">
  <YourApp />
</NotificationProvider>

// In components
const { showSuccess, showError } = useNotificationContext();
showSuccess('Success', 'Operation completed');

// Using templates
const { showNotification } = useNotificationContext();
showNotification(NotificationTemplates.purchaseSuccess('Content Name', 100));
```

#### 5. **notificationUtils.ts** (356 lines)
Utility functions for notification handling.

**Key Exports:**
- `NOTIFICATION_TYPES`: Enum of notification types
- `getToastType()`: Map notification type to toast type
- `getDefaultDuration()`: Get auto-dismiss duration by type
- `formatNotificationMessage()`: Format message based on type and metadata
- `NotificationApiService`: Class for API operations
- `notificationApi`: Service instance
- `ERROR_MESSAGES`: Error message constants
- `handlePurchaseError()`: Handle and format purchase errors
- `handleWalletError()`: Handle wallet errors
- `batchNotificationOps`: Batch operations (mark multiple, delete multiple)

**Usage:**
```typescript
import { notificationApi, NotificationTemplates } from '@/utils/notificationUtils';

const notifications = await notificationApi.fetchNotifications(1, 20);
await notificationApi.markAsRead(notificationId);
await notificationApi.markAllAsRead();
```

#### 6. **usePurchaseNotifications Hook** (307 lines)
Integration with purchase flow.

**Hooks:**
- `usePurchaseNotifications()`: Basic purchase notifications
- `usePurchaseFlow()`: Complete purchase flow with API

**Features:**
- Process purchase with notifications
- Handle refunds
- Wallet connection notifications
- Balance checking
- Error handling

**Usage:**
```typescript
const { processPurchase, notifyRefund, isProcessing } = usePurchaseNotifications();

const handleBuy = async () => {
  const result = await processPurchase({
    contentId: '123',
    contentTitle: 'My Video',
    price: 100
  }, async (data) => {
    // Custom purchase logic
    await buyContent(data);
  });
};
```

## Integration Guide

### Step 1: Set Up Backend

Create Notification model in `backend/models/Notification.js`:
```javascript
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String },
  icon: { type: String },
  actionUrl: { type: String },
  metadata: { type: Map },
  isRead: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  readAt: { type: Date },
  archivedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
```

Add routes to `backend/index.js`:
```javascript
const notificationRoutes = require('./routes/notificationRoutes');
app.use('/api/notifications', notificationRoutes);
```

### Step 2: Set Up Frontend Provider

Wrap your app with NotificationProvider in `frontend/src/main.tsx` or `App.tsx`:
```typescript
import { NotificationProvider } from './context/NotificationContext';

export function App() {
  return (
    <NotificationProvider position="top-right" maxToasts={5}>
      <Router>
        {/* Your routes */}
      </Router>
    </NotificationProvider>
  );
}
```

### Step 3: Use Notifications in Components

```typescript
import { useNotificationContext } from '@/context/NotificationContext';
import { usePurchaseFlow } from '@/hooks/usePurchaseNotifications';

export function BuyButton({ contentId, contentTitle, price }) {
  const { showSuccess, showError } = useNotificationContext();
  const { processPurchase, isLoading } = usePurchaseFlow();

  const handleBuy = async () => {
    const result = await processPurchase({
      contentId,
      contentTitle,
      price
    });

    if (result.success) {
      // Navigate to library
      navigate('/library');
    }
  };

  return (
    <button
      onClick={handleBuy}
      disabled={isLoading}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      {isLoading ? 'Processing...' : `Buy for ${price} STX`}
    </button>
  );
}
```

### Step 4: Handle Purchase Notifications in API

```javascript
// In purchase endpoint handler
const purchaseService = require('./services/purchaseService');
const notificationService = require('./services/notificationService');

router.post('/api/purchases', async (req, res) => {
  try {
    const purchase = await purchaseService.createPurchase(req.body);
    
    // Notify user of successful purchase
    await notificationService.notifyPurchaseSuccess(userId, {
      contentId: purchase.contentId,
      contentTitle: purchase.contentTitle,
      price: purchase.price,
      transactionId: purchase.transactionId
    });
    
    res.json({ success: true, data: purchase });
  } catch (error) {
    // Notify user of purchase error
    await notificationService.notifyPurchaseError(userId, {
      contentId: req.body.contentId,
      message: error.message,
      errorCode: error.code
    });
    
    res.status(400).json({ success: false, error: error.message });
  }
});
```

## Notification Types

### Purchase Notifications
- **purchase_success**: Successful purchase with content details
- **purchase_error**: Failed purchase with error message
- **refund**: Refund processed notification

### System Notifications
- **listing_update**: Content updated notification
- **system**: General system messages
- **wallet**: Wallet-related events
- **network**: Network error notifications

## Customization

### Custom Toast Types
```typescript
// In components
<Toast
  id="custom"
  type="success"
  title="Custom Notification"
  message="This is a custom message"
  duration={5000}
  onClose={() => dismiss('custom')}
/>
```

### Custom Notification Templates
```typescript
export const MyTemplates = {
  customPurchase: (contentName: string) => ({
    type: 'success' as ToastType,
    title: '✨ Content Acquired',
    message: `You now own "${contentName}"`,
    duration: 4000
  })
};

// Use in component
showNotification(MyTemplates.customPurchase('My Content'));
```

### Custom API Service
```typescript
class MyNotificationService extends NotificationApiService {
  async customFetch() {
    // Custom implementation
  }
}
```

## Best Practices

1. **Use Templates**: Use predefined templates for common notifications
2. **Consistent Durations**: Success (4s), Info (5s), Error (6s), Permanent (0s)
3. **Clear Messages**: Keep messages concise and actionable
4. **Error Details**: Include specific error information for debugging
5. **API Integration**: Store notifications for history
6. **Batch Operations**: Use batch endpoints for performance
7. **Accessibility**: All notifications have ARIA labels

## Performance Considerations

- Toast notifications are lightweight (< 5KB)
- Debounced API calls for batch operations
- Lazy load notification history
- Limit displayed toasts (default: 5)
- Auto-cleanup old notifications (30 days)

## Testing

### Test Purchase Success
```typescript
const { showSuccess } = useNotificationContext();
showSuccess('Test Success', 'This is a test notification', 4000);
```

### Test Purchase Error
```typescript
const { showError } = useNotificationContext();
showError('Test Error', 'This is a test error notification', 6000);
```

### Test API Endpoint
```bash
curl -X GET http://localhost:3000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Accessibility

- ✅ ARIA live regions for toast announcements
- ✅ Keyboard navigation (ESC to dismiss)
- ✅ Color contrast compliance (WCAG AA)
- ✅ Semantic HTML structure
- ✅ Screen reader friendly
- ✅ Focus management

## Future Enhancements

- [ ] Email notifications
- [ ] Push notifications (web/mobile)
- [ ] Notification sound settings
- [ ] Notification preferences page
- [ ] Notification history page
- [ ] Real-time notifications (WebSocket)
- [ ] Notification grouping
- [ ] Smart notification scheduling

