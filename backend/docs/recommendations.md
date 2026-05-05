# Recommendations

Endpoints:

- `GET /api/recommendations/:userId` - returns recommended content for `userId`.
- `GET /api/recommendations?userId=...` - alternative query param form.

Algorithm:

- Uses `UserPreference` to collect `preferredContentTypes`, `preferredCreators`, and `keywords`.
- Fetches a candidate pool of recent `ContentPreview` documents, scores them using a simple heuristic, and returns the top N.

Configuration:

- `RECOMMENDATION_DEFAULT_LIMIT` may be added to `.env` to control default result size.
