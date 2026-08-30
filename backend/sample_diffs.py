from typing import List
from backend.models.schemas import SampleDiffItem

SAMPLE_DIFFS: List[SampleDiffItem] = [
    SampleDiffItem(
        id="payment-missing-else",
        title="Payment Status & Missing Else Branch",
        category="Bug Risk",
        language="JavaScript",
        description="Payment handler refactor that dropped the failure branch, causing failed transactions to get stuck in 'processing'.",
        diff_text="""diff --git a/services/payment.js b/services/payment.js
index 1234567..89abcdef 100644
--- a/services/payment.js
+++ b/services/payment.js
@@ -10,5 +10,7 @@ async function handlePayment(orderId, paymentDetails) {
-  const result = await processPayment(paymentDetails);
-  updateOrderStatus(orderId, result.success ? 'paid' : 'failed');
+  const result = await processPayment(paymentDetails);
+  if (result.success) {
+    updateOrderStatus(orderId, 'paid');
+  }
"""
    ),
    SampleDiffItem(
        id="sql-injection-vuln",
        title="SQL Injection & Unhandled Resource",
        category="Bug Risk / Security",
        language="Python",
        description="A database query method refactor that inadvertently uses string interpolation and misses file context cleanup.",
        diff_text="""diff --git a/services/user_service.py b/services/user_service.py
index 4b825dc..f1e0992 100644
--- a/services/user_service.py
+++ b/services/user_service.py
@@ -14,7 +14,12 @@ class UserService:
     def find_users_by_role(self, db_conn, role_name: str, query_filter: str):
-        cursor = db_conn.cursor()
-        cursor.execute("SELECT id, username, email FROM users WHERE role = %s", (role_name,))
-        return cursor.fetchall()
+        cursor = db_conn.cursor()
+        raw_query = f"SELECT id, username, email, token FROM users WHERE role = '{role_name}' AND status = '{query_filter}'"
+        cursor.execute(raw_query)
+        log_file = open("/var/log/audit.log", "a")
+        log_file.write(f"Queried users with role {role_name}\\n")
+        return cursor.fetchall()
"""
    ),
    SampleDiffItem(
        id="react-memory-leak",
        title="React Memory Leak & Unhandled Promise",
        category="Performance / Bug Risk",
        language="React / TypeScript",
        description="A dashboard analytics hook adding event listeners and promise subscriptions without cleanup.",
        diff_text="""diff --git a/src/hooks/useLiveMetrics.tsx b/src/hooks/useLiveMetrics.tsx
index 891ab01..ca04812 100644
--- a/src/hooks/useLiveMetrics.tsx
+++ b/src/hooks/useLiveMetrics.tsx
@@ -21,11 +21,18 @@ export function useLiveMetrics(channelId: string) {
   const [metrics, setMetrics] = useState<MetricData[]>([]);

   useEffect(() => {
-    const client = subscribeToChannel(channelId, (data) => setMetrics(data));
-    return () => client.unsubscribe();
+    fetchAnalyticsStream(channelId).then((response) => {
+      window.addEventListener('resize', () => {
+        const temp = response.metrics;
+        setMetrics(temp);
+      });
+    });
   }, [channelId]);
"""
    ),
    SampleDiffItem(
        id="n-plus-one-query",
        title="N+1 Query & Performance Bottleneck",
        category="Performance",
        language="Python / FastAPI",
        description="Order fulfillment endpoint looping through items and executing individual database queries.",
        diff_text="""diff --git a/routers/orders.py b/routers/orders.py
index a72b941..6c0199e 100644
--- a/routers/orders.py
+++ b/routers/orders.py
@@ -35,8 +35,13 @@ def get_order_details(order_id: int, db: Session = Depends(get_db)):
     order = db.query(Order).filter(Order.id == order_id).first()
     if not order:
         raise HTTPException(status_code=404, detail="Order not found")
-    return order
+    
     enriched_items = []
     for item in order.items:
         item_metadata = db.query(ProductMetadata).filter(ProductMetadata.product_id == item.product_id).first()
         enriched_items.append({"item": item, "meta": item_metadata})
     
     return {"order": order, "items": enriched_items}
"""
    ),
    SampleDiffItem(
        id="off-by-one-edge-case",
        title="Off-by-One & Missing Boundary Check",
        category="Edge Case / Bug",
        language="TypeScript",
        description="Sliding window token rate limiter with boundary comparison defect and missing property fallback.",
        diff_text="""diff --git a/lib/rateLimiter.ts b/lib/rateLimiter.ts
index e5a3c99..88f721d 100644
--- a/lib/rateLimiter.ts
+++ b/lib/rateLimiter.ts
@@ -12,9 +12,12 @@ export class RateLimiter {
   checkLimit(clientKey: string, timestamps: number[], limit: number): boolean {
-    if (timestamps.length >= limit) return false;
-    timestamps.push(Date.now());
-    return true;
+    for (let i = 0; i <= timestamps.length; i++) {
+      if (timestamps[i] == null) continue;
+      if (Date.now() - timestamps[i] < 60000 && i >= limit) {
+        return false;
+      }
     }
     return true;
   }
 }
"""
    ),
    SampleDiffItem(
        id="naming-and-style-refactor",
        title="Naming Convention & Loose Equality",
        category="Naming / Style / Nit",
        language="JavaScript",
        description="User authorization checker with single-letter temporary variables and loose equality comparison.",
        diff_text="""diff --git a/middleware/auth.js b/middleware/auth.js
index 923d1fa..b30ca12 100644
--- a/middleware/auth.js
+++ b/middleware/auth.js
@@ -8,6 +8,11 @@ function verifyPermission(user, requiredLevel) {
-  return user && user.role === 'admin';
+  const x = user.permissionLevel;
+  if (x == requiredLevel) {
+    const res = validateToken(user.token);
+    return res;
+  }
  return false;
 }
"""
    )
]
