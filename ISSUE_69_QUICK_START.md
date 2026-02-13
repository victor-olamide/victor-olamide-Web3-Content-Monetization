# Issue #69: Notification System for Purchases - Quick Start Guide

## 5-Minute Setup

Get purchase notifications working in 5 minutes.

## Step 1: Create Notification Model (1 min)

Create `backend/models/Notification.js`:

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

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
```

## Step 2: Add Routes to Backend (1 min)

Update `backend/index.js`:

```javascript
const notificationRoutes = require('./routes/notificationRoutes');

// Add after other route declarations
app.use('/api/notifications', notificationRoutes);
```

## Step 3: Wrap App with Provider (1 min)

Update `frontend/src/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { NotificationProvider } from './context/NotificationContext';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NotificationProvider position="top-right" maxToasts={5}>
      <App />
    </NotificationProvider>
  </React.StrictMode>
);
```

## Step 4: Use in Components (1 min)

In your purchase component:

```typescript
import { useNotificationContext } from '@/context/NotificationContext';
import { usePurchaseFlow } from '@/hooks/usePurchaseNotifications';

export function BuyButton({ contentId, contentTitle, price }) {
  const { processPurchase, isLoading } = usePurchaseFlow();

  const handleBuy = async () => {
    const result = await processPurchase({
      contentId,
      contentTitle,
      price
    });

    if (result.success) {
      // Navigate to library or content page
      navigate('/library');
    }
  };

  return (
    <button onClick={handleBuy} disabled={isLoading}>
      {isLoading ? 'Processing...' : `Buy for ${price} STX`}
    </button>
  );
}
```

## Step 5: Test It! (1 min)

```typescript
// Test in any component
import { useNotificationContext } from '@/context/NotificationContext';

function TestNotifications() {
  const { showSuccess, showError, showInfo, showWarning } = useNotificationContext();

  return (
    <div className="space-y-2">
      <button onClick={() => showSuccess('Success!', 'This is a success message')}>
        Test Success
      </button>
      <button onClick={() => showError('Error!', 'This is an error message')}>
        Test Error
      </button>
      <button onClick={() => showInfo('Info', 'This is an info message')}>
        Test Info
      </button>
      <button onClick={() => showWarning('Warning', 'This is a warning message')}>
        Test Warning
      </button>
    </div>
  );
}
```

## Common Patterns

### Pattern 1: Purchase with Success Notification

```typescript
const { processPurchase } = usePurchaseFlow();

await processPurchase({
  contentId: '123',
  contentTitle: 'My Video',
  price: 100
});
// Automatically shows success notification
```

### Pattern 2: Using Predefined Templates

```typescript
import { useNotificationContext, NotificationTemplates } from '@/context/NotificationContext';

const { showNotification } = useNotificationContext();

// Show purchase success
showNotification(NotificationTemplates.purchaseSuccess('My Video', 100));

// Show wallet not connected
showNotification(NotificationTemplates.walletNotConnected());

// Show insufficient balance
showNotification(NotificationTemplates.insufficientBalance(100, 50));
```

### Pattern 3: Custom Notifications

```typescript
const { showNotification } = useNotificationContext();

showNotification({
  type: 'success',
  title: 'Custom Title',
  message: 'Custom message',
  duration: 5000,
  action: {
    label: 'Undo',
    onClick: () => console.log('Action clicked')
  }
});
```

### Pattern 4: Notifications with Actions

```typescript
const { showNotification } = useNotificationContext();

showNotification({
  type: 'info',
  title: 'Content Ready',
  message: 'Your purchased content is ready to view',
  duration: 0, // Don't auto-dismiss
  action: {
    label: 'View Now',
    onClick: () => navigate('/library/content-id')
  }
});
```

### Pattern 5: Fetch and Display Notification History

```typescript
import { useFetchNotifications } from '@/hooks/useNotification';

function NotificationHistory() {
  const { notifications, loading, fetchNotifications } = useFetchNotifications();

  useEffect(() => {
    fetchNotifications(1, 20, false); // page, limit, unreadOnly
  }, []);

  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {notifications.map(n => (
            <li key={n._id}>
              <h3>{n.title}</h3>
              <p>{n.message}</p>
              <small>{new Date(n.createdAt).toLocaleString()}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Pattern 6: Error Handling

```typescript
const { showError } = useNotificationContext();

try {
  await processPurchase(data);
} catch (error) {
  showError(
    'Purchase Failed',
    error.message || 'Please try again',
    6000
  );
}
```

### Pattern 7: Batch Notification Operations

```typescript
import { batchNotificationOps } from '@/utils/notificationUtils';

// Mark multiple as read
await batchNotificationOps.markMultipleAsRead(['id1', 'id2', 'id3']);

// Delete multiple
await batchNotificationOps.deleteMultiple(['id1', 'id2', 'id3']);
```

## Quick Reference

### Notification Types
```typescript
'success'  | 'error' | 'info' | 'warning'
```

### Toast Positions
```typescript
'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center'
```

### Duration (ms)
```typescript
2000    // Quick notifications (copy, etc.)
4000    // Success notifications
5000    // Info/Warning notifications
6000    // Error notifications
0       // Don't auto-dismiss (manual close only)
```

### API Endpoints
```
GET    /api/notifications                    - Get notifications (paginated)
GET    /api/notifications/stats              - Get statistics
GET    /api/notifications/unread-count       - Get unread count
PUT    /api/notifications/:id/read           - Mark as read
PUT    /api/notifications/mark-all-read      - Mark all as read
PUT    /api/notifications/:id/archive        - Archive notification
DELETE /api/notifications/:id                - Delete notification
```

## Component Reference

### NotificationProvider Props
```typescript
<NotificationProvider
  position="top-right"  // Default position for toasts
  maxToasts={5}         // Max toasts to display
>
  <App />
</NotificationProvider>
```

### Toast Component Props
```typescript
<Toast
  id="unique-id"
  type="success"
  title="Title"
  message="Optional message"
  duration={5000}
  onClose={(id) => {}}
  action={{
    label: "Action Button",
    onClick: () => {}
  }}
/>
```

### Hook Examples

```typescript
// Get notification context
const { showSuccess, showError, dismiss, dismissAll } = useNotificationContext();

// Short form
const { success, error, warning, info } = useToast();

// Purchase notifications
const { processPurchase, notifyRefund } = usePurchaseNotifications();

// Fetch notifications
const { notifications, fetchNotifications, markAsRead } = useFetchNotifications();

// Complete purchase flow
const { processPurchase, processRefund, isLoading, error } = usePurchaseFlow();
```

## Testing Checklist

- [ ] Success notification shows for 4 seconds
- [ ] Error notification shows for 6 seconds
- [ ] Multiple toasts stack properly
- [ ] Toasts can be manually dismissed
- [ ] API endpoints return 200 status
- [ ] Notifications persist in database
- [ ] Mark as read updates UI
- [ ] Delete removes notification
- [ ] Unread count updates correctly
- [ ] Templates work with custom data

## Troubleshooting

### Notifications not showing
1. Ensure NotificationProvider wraps your app
2. Check browser console for errors
3. Verify useNotificationContext is used inside Provider

### Toasts overlapping
```typescript
// Adjust maxToasts or position
<NotificationProvider position="bottom-right" maxToasts={3}>
```

### API errors
1. Check backend is running
2. Verify routes are registered
3. Check browser DevTools Network tab
4. Ensure token is in localStorage

### Template not found
```typescript
// Import templates
import { NotificationTemplates } from '@/context/NotificationContext';

// Use them
showNotification(NotificationTemplates.purchaseSuccess('Title', 100));
```

## Next Steps

1. **Add Notification Center**: Create a page to view all notifications
2. **Add Preferences**: Let users customize notification settings
3. **Add Sound**: Play sound on important notifications
4. **Add Animations**: Custom animations for different types
5. **Add Email**: Send important notifications via email
6. **Add Push**: Add web push notifications

## Support

- Check [Implementation Guide](./ISSUE_69_IMPLEMENTATION_GUIDE.md) for details
- Review component code for prop types
- Test with DevTools in browser

Happy notifying! 🎉
