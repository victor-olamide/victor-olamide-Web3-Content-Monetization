# User Profile Management System - Implementation Guide

## Overview

Issue #64 implements a comprehensive user profile management system that allows users to manage their profiles, track purchases, set preferences, and engage with content. The system spans both backend (Node.js/Express) and frontend (React/TypeScript) with complete CRUD operations, validation, and data export capabilities.

## Architecture

### Backend Stack
- **Framework**: Express.js (Node.js)
- **Database**: MongoDB with Mongoose
- **Authentication**: Wallet-based with session tokens
- **Validation**: Custom middleware with comprehensive validation rules

### Frontend Stack
- **Framework**: React with TypeScript
- **State Management**: React Hooks
- **API Communication**: Fetch API with session-based auth
- **UI Components**: Custom React components with Lucide icons
- **Styling**: Tailwind CSS

## Database Models

### 1. UserProfile Model (`backend/models/UserProfile.js`)

**Purpose**: Stores user profile information including preferences and settings

**Key Fields**:
```
- address (unique, indexed): Wallet address
- displayName: User-friendly name
- avatar: Profile picture URL
- username (sparse, indexed): Unique username
- bio: User biography (max 500 chars)
- preferences: Object containing 6 notification/privacy settings
  - emailNotifications
  - pushNotifications
  - marketingEmails
  - privateProfile
  - showOnlineStatus
  - allowMessages
- settings: Regional and UI settings
  - language
  - theme (light|dark|auto)
  - currency
  - timezone
  - twoFactorEnabled
- socialLinks: Social media connections
  - twitter, discord, website, github
- blockedUsers: Array of blocked user addresses
- profileCompleteness: Virtual field (calculated)
- createdAt, updatedAt: Timestamps
```

**Indexes**:
- `address` (unique)
- `username` (sparse)
- `{status: 1, lastLogin: 1}` (compound)
- `createdAt` (descending)

### 2. PurchaseHistory Model (`backend/models/PurchaseHistory.js`)

**Purpose**: Tracks all purchases, engagement metrics, ratings, and refunds

**Key Fields**:
```
- buyerAddress (indexed): Purchasing user
- contentId (indexed): Content being purchased
- contentTitle: Name of content
- contentType: Type (image|video|audio|document)
- creatorAddress (indexed): Content creator
- purchasePrice: Purchase amount
- transactionHash: Blockchain transaction
- transactionStatus: pending|confirmed|failed
- downloads: { total, lastDate }
- accessStatus: granted|revoked
- rating: { score (0-5), review, date }
- refundInfo: { refunded, date, amount, reason }
- engagement: Detailed usage metrics
  - viewCount
  - watchTimeSeconds
  - completionPercentage
  - lastAccessedAt
- isFavorite: Boolean
- createdAt, updatedAt: Timestamps
```

**Indexes**:
- Compound indexes on `buyerAddress`, `contentId`, `creatorAddress`
- `transactionStatus` for filtering
- `createdAt` for sorting

## Backend Services

### UserProfileService (`backend/services/userProfileService.js`)

**19 Core Methods**:

1. **Profile Management**
   - `getOrCreateProfile(address)`: Retrieve or create profile
   - `getProfile(address)`: Get profile with stats
   - `updateProfile(address, updates)`: Modify profile data

2. **Preferences & Settings**
   - `updatePreferences(address, preferences)`: Notification settings
   - `updateSettings(address, settings)`: Regional/UI settings
   - `updateSocialLinks(address, socialLinks)`: Social connections

3. **Purchase Tracking**
   - `recordPurchase(buyerAddress, purchaseData)`: Log purchase
   - `getPurchaseHistory(address, skip, limit, sortBy)`: Paginated list
   - `getFavorites(address, skip, limit)`: Favorite content
   - `toggleFavorite(address, purchaseId)`: Add/remove from favorites

4. **Engagement Tracking**
   - `recordAccess(address, purchaseId, accessType)`: Track view/download
   - `updateCompletionPercentage(address, purchaseId, percentage)`: Watch progress
   - `addRating(address, purchaseId, rating, review)`: Rate content

5. **User Management**
   - `blockUser(address, blockedAddress)`: Block user
   - `unblockUser(address, blockedAddress)`: Unblock user
   - `updateLastLogin(address)`: Track activity

6. **Analytics**
   - `getProfileStats(address)`: Aggregate statistics

## Backend Routes

### Profile Endpoints (`backend/routes/profileRoutes.js`)

15 endpoints organized by functionality:

**Profile Management**:
- `GET /api/profile/me` - Get authenticated user's profile
- `GET /api/profile/:address` - Get public or full profile
- `PUT /api/profile/me` - Update profile data
- `PUT /api/profile/preferences` - Update notification preferences
- `PUT /api/profile/settings` - Update regional settings
- `PUT /api/profile/social-links` - Update social links

**Purchase & Favorites**:
- `GET /api/profile/purchases` - List purchases (paginated, sortable)
- `GET /api/profile/favorites` - List favorite content
- `POST /api/profile/favorites/:purchaseId` - Toggle favorite

**Engagement**:
- `GET /api/profile/stats` - Profile statistics
- `POST /api/profile/rating/:purchaseId` - Add rating/review
- `POST /api/profile/access/:purchaseId` - Record access (view/download)
- `PUT /api/profile/completion/:purchaseId` - Update completion %

**User Blocking**:
- `POST /api/profile/block/:blockedAddress` - Block user
- `DELETE /api/profile/block/:blockedAddress` - Unblock user

**Response Format**:
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Optional message"
}
```

## Backend Validation

### ProfileValidation Middleware (`backend/middleware/profileValidation.js`)

7 validation functions:

1. **validateProfileData**
   - displayName: string, <100 chars
   - avatar: string (URL)
   - username: string, 3-50 chars
   - bio: string, <500 chars

2. **validatePreferences**
   - All boolean fields:
   - emailNotifications, pushNotifications, marketingEmails
   - privateProfile, showOnlineStatus, allowMessages

3. **validateSettings**
   - language: string (ISO language code)
   - theme: 'light'|'dark'|'auto'
   - currency: string (ISO currency code)
   - timezone: string (IANA timezone)
   - twoFactorEnabled: boolean

4. **validateSocialLinks**
   - All fields optional but validated as URLs
   - twitter, discord, website, github

5. **validateRating**
   - rating: number 0-5 (required)
   - review: string <1000 chars (optional)

6. **validateCompletion**
   - percentage: number 0-100 (required)

7. **validatePaginationParams**
   - skip: non-negative integer
   - limit: 1-100 range

## Frontend Components

### 1. UserProfilePage (`frontend/src/components/UserProfilePage.tsx`)

**Features**:
- Display user profile with avatar, name, bio
- Edit mode for profile updates
- Avatar upload with preview
- Profile statistics (purchases, spent, completeness)
- Profile completeness progress bar
- Auto-fetch on mount with error handling

**Props**: None (uses session ID from localStorage)

**State Management**:
- profile, isEditing, isLoading, error, success
- editData, avatarPreview

### 2. UserSettingsComponent (`frontend/src/components/UserSettingsComponent.tsx`)

**Features**:
- Tabbed interface: Notifications, Privacy, Security, Regional
- Notification preferences (email, push, marketing)
- Privacy settings (profile visibility, online status, messaging)
- Security settings (2FA toggle)
- Regional settings (language, theme, currency, timezone)
- Form validation and error handling
- Success notifications

**Supported Settings**:
- Languages: English, Spanish, French, German, Japanese, Chinese
- Themes: Light, Dark, Auto
- Currencies: USD, EUR, GBP, JPY, CNY
- Timezones: 8 major timezone options

### 3. PurchaseHistoryComponent (`frontend/src/components/PurchaseHistoryComponent.tsx`)

**Features**:
- Filterable purchase list (status, content type)
- Sortable by: date (asc/desc), price (asc/desc)
- Pagination with configurable page size (5, 10, 20, 50)
- Engagement metrics (views, completion %, watch time)
- Action buttons: Favorite, View, Download, Rate
- Rating modal for submitting reviews
- Favorite toggle functionality
- Status badges for transaction state
- Responsive design (mobile-optimized)

**Key Methods**:
- fetchPurchases(): Load with filters
- toggleFavorite(purchaseId): Update favorite status
- addRating(purchaseId, score, review): Submit rating
- recordAccess(purchaseId, accessType): Track interaction

### 4. ProfileCompletionComponent (`frontend/src/components/ProfileCompletionComponent.tsx`)

**Features**:
- Progress bar showing profile completeness %
- Checklist of 8 completion items:
  - Display name, avatar, bio, username
  - Social links, preferences, first purchase, first rating
- Next recommended step highlighted
- Completion statistics
- Benefits section showing value of completing profile
- Mobile-responsive layout

**Items Tracked**:
- All 8 profile elements with icons
- Completion status calculation
- Action buttons for incomplete items
- Dynamic benefits messaging

### 5. BlockedUsersComponent (`frontend/src/components/BlockedUsersComponent.tsx`)

**Features**:
- Display list of blocked users
- Show user avatar and display name
- Table view (desktop) and card view (mobile)
- Unblock functionality
- Empty state messaging
- Blocked user statistics
- Responsive design

**Actions**:
- Fetch blocked users on mount
- Attempt to load basic profile info for each blocked user
- Unblock with confirmation feedback
- Error handling and messaging

## Frontend Hooks

### useProfile Hook (`frontend/src/hooks/useProfile.ts`)

**Purpose**: Comprehensive profile management with caching and auto-refresh

**Features**:
- Profile data fetching and caching (5-min default TTL)
- Auto-refresh capability with configurable interval
- Cache invalidation and manual refresh
- Update methods for all profile aspects

**Methods**:
```typescript
const {
  profile,          // Current profile data
  isLoading,        // Loading state
  error,            // Error message
  fetchProfile,     // Manual fetch (forceRefresh option)
  updateProfile,    // Update basic profile
  updatePreferences,// Update notification/privacy
  updateSettings,   // Update regional/UI
  updateSocialLinks,// Update social connections
  clearCache        // Clear cached data
} = useProfile(options);
```

**Options**:
- cacheTime: milliseconds (default 5 minutes)
- autoRefresh: boolean (default false)
- autoRefreshInterval: milliseconds (default 1 minute)

### usePurchaseHistory Hook (`frontend/src/hooks/usePurchaseHistory.ts`)

**Purpose**: Purchase history management with filtering, sorting, and pagination

**Features**:
- Paginated purchase loading
- Client-side filtering (status, content type)
- Server-side sorting
- Cache management
- Engagement tracking methods
- Favorite and rating functionality

**Methods**:
```typescript
const {
  purchases,        // Array of purchase objects
  isLoading,        // Loading state
  error,            // Error message
  total,            // Total count
  currentPage,      // Current page number
  limit,            // Items per page
  filters,          // Current filter state
  fetchPurchases,   // Refetch data
  toggleFavorite,   // Add/remove favorite
  addRating,        // Submit rating
  recordAccess,     // Track view/download
  updateCompletion, // Update watch %
  updateFilters,    // Change filters
  goToPage,         // Navigate to page
  clearCache        // Clear cache
} = usePurchaseHistory(options);
```

## Frontend Utilities

### profileApi (`frontend/src/utils/profileApi.ts`)

14 API wrapper functions:
- getProfile(), getProfileByAddress()
- updateProfile(), updatePreferences(), updateSettings(), updateSocialLinks()
- getPurchaseHistory(), getFavorites(), toggleFavorite()
- getProfileStats(), addRating(), recordAccess(), updateCompletion()
- blockUser(), unblockUser()

All functions handle:
- Session ID authentication
- Error throwing for HTTP errors
- Consistent response parsing

### profileExportUtils (`frontend/src/utils/profileExportUtils.ts`)

Export capabilities:
- **JSON Export**: Profile data, purchases, or complete archive
- **CSV Export**: Purchase data with 12 columns
- **PDF Export**: Formatted HTML profile report
- **HTML Report**: Beautiful profile summary with statistics

**Export Options**:
```typescript
{
  format: 'json' | 'csv' | 'pdf',
  includeProfile: boolean,
  includePurchases: boolean,
  includePurchaseStats: boolean
}
```

## Authentication

All endpoints require wallet-based authentication via session token:

```typescript
headers: {
  'X-Session-Id': localStorage.getItem('sessionId') || ''
}
```

Endpoints with `verifyWalletAuth` middleware:
- All profile management endpoints
- All purchase-related endpoints
- All engagement tracking endpoints

## Usage Examples

### Fetch and Display Profile

```typescript
import { useProfile } from '@/hooks/useProfile';

function MyProfile() {
  const { profile, isLoading, error, updateProfile } = useProfile({
    autoRefresh: true,
    autoRefreshInterval: 60000 // 1 minute
  });

  return profile ? (
    <div>
      <h1>{profile.displayName}</h1>
      {/* Profile content */}
    </div>
  ) : null;
}
```

### Load Purchase History with Filtering

```typescript
import { usePurchaseHistory } from '@/hooks/usePurchaseHistory';

function PurchaseList() {
  const {
    purchases,
    filters,
    updateFilters,
    toggleFavorite,
    addRating
  } = usePurchaseHistory({ limit: 10 });

  return (
    <>
      <select
        value={filters.status}
        onChange={(e) => updateFilters({ status: e.target.value as any })}
      >
        <option value="all">All</option>
        <option value="confirmed">Confirmed</option>
      </select>
      {/* Purchase list */}
    </>
  );
}
```

### Export User Data

```typescript
import { profileExportUtils } from '@/utils/profileExportUtils';

await profileExportUtils.exportUserData(
  {
    format: 'json',
    includeProfile: true,
    includePurchases: true,
    includePurchaseStats: true
  },
  {
    profile: userData.profile,
    purchases: userData.purchases,
    stats: userData.stats
  }
);
```

## Data Flow

### Profile Update Flow
1. User edits profile in `UserProfilePage`
2. Component calls `updateProfile()` from `useProfile` hook
3. Hook calls `updateProfile()` API function
4. API function sends PUT request to `/api/profile/me`
5. Backend route validates data with `validateProfileData` middleware
6. Service layer updates database
7. Response returned to frontend
8. Hook updates local state and cache
9. Component re-renders with updated data

### Purchase & Engagement Flow
1. User loads purchase history or rates content
2. Component calls methods from `usePurchaseHistory` hook
3. Hook calls appropriate API functions
4. API sends POST/PUT to engagement endpoints
5. Backend records in PurchaseHistory model
6. Engagement metrics updated
7. Response updates local component state
8. User sees immediate feedback

## Security Considerations

1. **Authentication**: Session-based wallet authentication
2. **Validation**: All inputs validated on both frontend and backend
3. **Authorization**: `verifyWalletAuth` middleware ensures users only modify their own data
4. **Data Privacy**: 
   - Users can set profiles to private
   - Can control online status visibility
   - Can disable messaging from others
5. **User Blocking**: Blocked users cannot see profile or interact

## Performance Optimizations

1. **Caching**:
   - useProfile: 5-minute cache with auto-refresh option
   - usePurchaseHistory: 2-minute cache per filter combination

2. **Pagination**:
   - Purchase history: Configurable page size (5-50 items)
   - API limits query with skip/limit parameters
   - Server-side cursor-based pagination ready

3. **Lazy Loading**:
   - Components only fetch data on mount
   - Images loaded with lazy loading ready
   - Modal components prevent initial render

4. **Indexing**:
   - All frequently queried fields indexed in MongoDB
   - Compound indexes for common filter combinations

## Testing Recommendations

1. **Unit Tests**:
   - Service layer methods with mock database
   - Validation middleware with edge cases
   - Hook logic with mock API responses

2. **Integration Tests**:
   - Full profile CRUD operations
   - Purchase tracking across multiple purchases
   - Filter and sorting combinations

3. **E2E Tests**:
   - Complete user profile workflow
   - Purchase history interaction
   - Export functionality

## Future Enhancements

1. **Notifications**: In-app and email notifications for profile actions
2. **Profile Analytics**: Detailed stats on content performance
3. **Bulk Operations**: Export multiple purchases or manage settings in bulk
4. **Profile Sharing**: Shareable public profile links
5. **Advanced Filtering**: Date ranges, content creator filtering
6. **Profile Verification**: Email or social media verification
7. **Account Recovery**: Email-based account recovery
8. **Privacy Controls**: Fine-grained permission controls per content

## Deployment Checklist

- [ ] Database migrations run for UserProfile and PurchaseHistory models
- [ ] Backend environment variables set
- [ ] Frontend API base URL configured
- [ ] Session token handling verified
- [ ] CORS settings updated if needed
- [ ] Email service configured (if using email notifications)
- [ ] File upload service configured (for avatars)
- [ ] Rate limiting applied to profile endpoints
- [ ] Error logging enabled
- [ ] Monitoring configured for profile operations

## Support & Troubleshooting

**Common Issues**:

1. **Profile not loading**: Check session token in localStorage
2. **Updates not saving**: Verify validation middleware passing
3. **Performance slow**: Check MongoDB indexes are created
4. **Export failing**: Ensure browser allows file downloads

**Debug Logging**:
Add to components:
```typescript
console.log('Profile data:', profile);
console.log('Purchase list:', purchases);
```

Check backend logs for:
- Validation errors
- Database connection issues
- Authentication failures
