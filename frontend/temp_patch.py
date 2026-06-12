from pathlib import Path

p = Path('src/pages/admin/components/analytics/AnalyticsDashboard.tsx')
text = p.read_text(encoding='utf-8')
old = "import { AnalyticsCharts } from './analytics/AnalyticsCharts';\nimport { RealTimeMetrics } from './analytics/RealTimeMetrics';\nimport { UserAnalytics } from './analytics/UserAnalytics';\nimport { ContentAnalytics } from './analytics/ContentAnalytics';\nimport { RevenueAnalytics } from './analytics/RevenueAnalytics';\n"
new = "import { AnalyticsCharts } from './AnalyticsCharts';\nimport { RealTimeMetrics } from './RealTimeMetrics';\nimport { UserAnalytics } from './UserAnalytics';\nimport { ContentAnalytics } from './ContentAnalytics';\nimport { RevenueAnalytics } from './RevenueAnalytics';\n"
if old in text:
    p.write_text(text.replace(old, new), encoding='utf-8')
    print('patched imports')
else:
    print('import block not found')
