# Content Moderation System Documentation

## Overview

The Content Moderation Queue System provides a comprehensive solution for reviewing, managing, and moderating user-uploaded content. It enables:

- **User Reporting**: Users can flag content they believe violates guidelines
- **Automated Detection**: System can create flags for automated content analysis
- **Moderation Queue**: A structured workflow for moderators to review flagged content
- **Approval/Removal**: Moderators can approve or remove content with automated refund handling
- **Appeals**: Creators can appeal removal decisions
- **Audit Trail**: Complete logging of all moderation actions for compliance

## Architecture

### Models

#### ModerationQueue
Represents a flagged content item awaiting or under review in the moderation system.

**Key Fields:**
- `queueId`: Unique identifier for the queue entry
- `contentId`: Reference to the flagged content
- `status`: pending | under-review | approved | rejected | removed | appealed
- `severity`: low | medium | high | critical
- `priority`: 1-5 (higher = more urgent)
- `flagCount`: Number of flags for this content
- `assignedModerator`: Address of assigned moderator
- `decision`: Final decision (pending | approved | removed | suspended)
- `removalReason`: Specific reason for removal if applicable
- `flags`: Array of individual flag records
- `reviewHistory`: Timeline of moderation actions
- `contentSnapshot`: Content state at time of flagging
- `metrics`: Engagement metrics at time of flagging

#### ModerationFlag
Represents an individual user report/flag for content.

**Key Fields:**
- `flagId`: Unique identifier
- `contentId`: Referenced content
- `flaggedBy`: Address of reporter
- `flagType`: user-report | automated-detection | creator-removal | system-initiated
- `reason`: Specific violation category
- `description`: Detailed explanation from reporter
- `evidence`: Supporting links, timestamps, details
- `severity`: Calculated based on reason
- `status`: submitted | received | in-review | acted-upon | dismissed | resolved
- `queueId`: Link to related queue entry if created

#### ModerationAuditLog
Complete audit trail of all moderation system actions for compliance and analysis.

**Key Fields:**
- `logId`: Unique identifier
- `action`: Type of action performed
- `actor`: Who performed it (system | moderator | admin | creator | user)
- `actionDetails`: Specific changes and details
- `timestamp`: When it occurred
- `dataSnapshot`: Before/after states for important changes

### Services

#### moderationService.js
Core moderation workflow management.

**Key Methods:**
- `createQueueEntry()`: Create queue entry from flags
- `mergeFlags()`: Merge multiple flags into existing queue
- `getQueue()`: Query queue with filters and pagination
- `assignToModerator()`: Assign content to moderator
- `startReview()`: Mark content as under review
- `approveContent()`: Approve and resolve flags
- `rejectContent()`: Remove content and trigger refunds
- `fileAppeal()`: Handle creator appeals
- `getStats()`: Moderation statistics

#### reportingService.js
User flag/report management and content reporting.

**Key Methods:**
- `submitFlag()`: Submit user report for content
- `getUserFlags()`: Get user's submitted reports
- `getContentFlags()`: Get all flags for specific content
- `getFlagDetails()`: Get detailed flag information
- `dismissFlag()`: Dismiss invalid flag
- `createAutomatedFlag()`: System-generated flags
- `getAnalytics()`: Reporting analytics
- `getMostFlaggedContent()`: Identify trending violations

#### auditLogService.js
Audit log querying and compliance reporting.

**Key Methods:**
- `logAction()`: Create audit log entry
- `getContentLogs()`: Get logs for specific content
- `getQueueLogs()`: Get logs for queue entry
- `getModeratorLogs()`: Get logs by moderator
- `getAuditTrail()`: Complete action sequence
- `getSystemStats()`: System-wide audit stats
- `search()`: Search audit logs
- `exportLogs()`: Compliance export

#### moderationMetrics.js
Performance and efficiency metrics.

**Key Methods:**
- `getMetrics()`: Comprehensive metrics dashboard
- `getQueueMetrics()`: Queue statistics
- `getFlagMetrics()`: Flag analytics
- `getReviewMetrics()`: Review performance
- `getEfficiencyMetrics()`: Throughput and backlog
- `getModeratorMetrics()`: Per-moderator performance
- `getTrendMetrics()`: Trends over time
- `getContentRiskAssessment()`: High-risk content

### Middleware

#### moderationAuth.js
Authentication and authorization for moderation endpoints.

**Functions:**
- `verifyModerator()`: Requires moderator role
- `verifyAdmin()`: Requires admin role
- `verifyQueueAccess()`: Check access to specific queue
- `verifyContentCreator()`: Verify creator ownership

#### contentFlagValidation.js
Input validation for flag and decision submissions.

**Functions:**
- `validateFlagSubmission()`: Validate flag data
- `validateModerationDecision()`: Validate moderator decision
- `validateAppealSubmission()`: Validate appeal content
- `validateQueueFilters()`: Validate query parameters

## API Endpoints

### User Endpoints

#### Submit Flag
```
POST /api/moderation/flag
```

**Request:**
```json
{
  "contentId": 123,
  "reason": "adult-content",
  "description": "This content is inappropriate",
  "evidence": {
    "links": ["https://example.com/context"],
    "timestamps": [45, 120],
    "details": "Specific details about violation"
  },
  "userContact": {
    "email": "user@example.com",
    "preferNotification": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Report submitted successfully",
  "data": {
    "flagId": "flag-abc123",
    "queueId": 42,
    "status": "pending",
    "severity": "medium"
  }
}
```

#### Get User's Flags
```
GET /api/moderation/flags/user?status=submitted&limit=20&skip=0
```

#### Get Flag Details
```
GET /api/moderation/flags/:flagId
```

#### Get Content Flags
```
GET /api/moderation/content/:contentId/flags?limit=50&skip=0
```

#### File Appeal
```
POST /api/moderation/appeal/:contentId
```

**Request:**
```json
{
  "appealNotes": "This content was incorrectly flagged. It is educational material about... [detailed explanation of why removal was wrong]"
}
```

### Moderator Endpoints

#### Get Moderation Queue
```
GET /api/moderation/queue?status=pending&severity=high&limit=50&skip=0
```

**Query Parameters:**
- `status`: pending | under-review | approved | rejected | removed | appealed
- `severity`: low | medium | high | critical
- `contentType`: video | article | image | music
- `assignedModerator`: Filter by moderator
- `limit`: Results per page (max 100)
- `skip`: Pagination offset
- `sort`: Field to sort by

#### Get Queue Entry Details
```
GET /api/moderation/queue/:queueId
```

Returns queue details, related flags, and audit trail.

#### Assign to Moderator
```
POST /api/moderation/queue/:queueId/assign
```

**Request:**
```json
{
  "targetModerator": "moderator.stx",
  "notes": "Assigning for expertise in video content"
}
```

#### Start Review
```
POST /api/moderation/queue/:queueId/review/start
```

**Request:**
```json
{
  "notes": "Beginning detailed review of flagged content"
}
```

#### Approve Content
```
POST /api/moderation/queue/:queueId/review/approve
```

**Request:**
```json
{
  "decisionNotes": "Content reviewed. No violations found."
}
```

#### Reject Content (Remove)
```
POST /api/moderation/queue/:queueId/review/reject
```

**Request:**
```json
{
  "removalReason": "adult-content",
  "decisionNotes": "Content clearly violates adult content policy"
}
```

**Removal Reasons:**
- copyright-violation
- adult-content
- hate-speech
- violence
- misinformation
- spam
- harassment
- illegal-content
- other

### Admin Endpoints

#### Get Moderation Statistics
```
GET /api/moderation/stats
```

Response includes:
- Queue status breakdown
- Severity distribution
- Content type breakdown
- Average flags per item
- Removal rate

#### Get Audit Logs
```
GET /api/moderation/audit/logs?action=content-removed&limit=50&skip=0
```

#### Get Audit Statistics
```
GET /api/moderation/audit/stats?timeRange=30
```

## Flag Reasons

Users can flag content for:
- **copyright-violation**: Intellectual property infringement
- **adult-content**: Explicit sexual material
- **hate-speech**: Content promoting hatred or discrimination
- **violence**: Graphic violence or gore
- **misinformation**: False or misleading information
- **spam**: Repetitive or promotional content
- **harassment**: Targeted harassment or abuse
- **illegal-content**: Content illegal in most jurisdictions
- **low-quality**: Poor quality or low effort
- **misleading-title**: Title doesn't match content
- **other**: Other violations not listed

## Moderation Workflow

### Standard Review Process

1. **Flag Submission** → User reports content
2. **Queue Creation** → Content added to moderation queue
3. **Assignment** → Moderator assigned to review
4. **Review** → Moderator examines content and flags
5. **Decision** → Approve or remove
6. **Action** → Applied immediately with audit log

### Removal Process

When content is removed:
1. Content marked as `isRemoved = true`
2. `removedAt` timestamp recorded
3. `removalReason` stored
4. Removal reason communicated to creator
5. Appeal period started (30 days default)
6. Automatic refunds initiated for purchasers
7. Complete audit trail maintained

### Appeal Process

Creators can appeal removals:
1. Creator files appeal with justification
2. Content restored to "pending-appeal" status
3. Senior moderator reviews appeal
4. Appeal approved → Content restored
5. Appeal denied → Removal upheld
6. Decision communicated with explanation

## Severity Calculation

Severity automatically calculated based on flag reasons:

**Critical:**
- Illegal content
- Adult content

**High:**
- Hate speech
- Violence
- Harassment
- Copyright violation

**Medium:**
- Misinformation
- Spam
- Multiple flags (3+)

**Low:**
- Low quality
- Misleading titles
- Single flag

## Priority Calculation

Priority (1-5) based on:
- Base: Severity level
- +1: If multiple flags (5+)
- Higher priority reviewed first

## Audit Trail

Complete history maintained for every content decision:
- All flag submissions
- Queue creation and merges
- Assignments and reassignments
- Review status changes
- Final decisions with reasons
- Appeals filed
- Appeal outcomes
- Any content restorations

**Retention:** Minimum 7 years for compliance

## Performance Metrics

Track:
- Average review time
- Removal rate by reason
- Moderator productivity
- Flag accuracy
- Appeal success rate
- Content aged in queue
- Daily throughput
- System bottlenecks

## Security & Permissions

### Moderator Requirements
- Authorized wallet address
- Configured in `AUTHORIZED_MODERATORS` env var
- Can view and review assigned content
- Cannot access reports from other moderators unless released

### Admin Requirements
- Authorized wallet address
- Configured in `AUTHORIZED_ADMINS` env var
- Full access to all queues and logs
- Can reassign, override decisions
- Audit log access

### User Protection
- Report anonymity (user address stored, not public)
- No retaliation for valid reports
- Contact email optional
- Preference for notifications

## Configuration

### Environment Variables
```
AUTHORIZED_MODERATORS=moderator1.stx,moderator2.stx
AUTHORIZED_ADMINS=admin1.stx,admin2.stx
MODERATION_APPEAL_DAYS=30
MODERATION_REVIEW_TIMEOUT_HOURS=72
```

### Indexes
Automatically created on:
- `status` + `priority` + `createdAt`
- `assignedModerator` + `status`
- `creator` + `status`
- `severity` + `status`
- `reason` + `status`
- `flaggedBy` + `createdAt`

## Best Practices

### For Moderators
1. Review all flags before deciding
2. Document detailed reasoning
3. Stay consistent with past decisions
4. Use appeal process for edge cases
5. Mark helpful/unhelpful flags
6. Calibrate periodically with team

### For System
1. Monitor moderator agreement rates
2. Flag inconsistent decisions for training
3. Provide decision history context
4. Support moderator workload balancing
5. Track appeal success rate
6. Publish moderation guidelines publicly

## Integration with Refund System

When content is removed:
1. Automatic refund initiation for all purchasers
2. Refund reason: 'content-removed'
3. Auto-approval within refund window
4. Notification to purchasers
5. Revenue impact tracked

## Future Enhancements

- Machine learning content analysis
- Multi-language support
- Bulk actions for related content
- Creator escalation paths
- Community voting options
- Automated tagging integration
- Geographic compliance features
- Moderation policy versioning

## Testing

Run moderation tests:
```bash
npm test -- tests/moderationIntegration.test.js
```

Test coverage includes:
- Flag submission validation
- Queue management workflow
- Approval/removal operations
- Appeal filing and processing
- Audit logging
- Analytics calculations
- Permission verification
- Error handling

## Support

For moderator questions:
- Review moderation guidelines
- Check audit trail for context
- Contact admin for edge cases
- Submit feedback for policy improvements
