"""
Comprehensive Load Testing for Concurrent Users
Tests system behavior under high concurrent user load with various scenarios
"""

from locust import HttpUser, task, between, events, TaskSet
import random
import time
import logging
from uuid import uuid4

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ContentViewerUser(TaskSet):
    """Simulates a user viewing and streaming content"""
    
    def on_start(self):
        """Initialize user session and authenticate"""
        self.user_id = str(uuid4())
        self.auth_token = self.login()
        self.content_ids = list(range(1, 101))  # 100 test contents
        
    def login(self):
        """Authenticate user and get JWT token"""
        response = self.client.post(
            "/api/auth/login",
            json={
                "email": f"user_{self.user_id[:8]}@test.com",
                "password": "test-password-123"
            },
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json().get("token", "test-token")
        return "test-token"
    
    @task(5)
    def browse_content(self):
        """Simulate user browsing content catalog"""
        page = random.randint(1, 10)
        limit = random.choice([10, 20, 50])
        with self.client.get(
            f"/api/content/browse?page={page}&limit={limit}",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            catch_response=True
        ) as response:
            if response.status_code != 200:
                response.failure(f"Browse failed: {response.status_code}")
            else:
                response.success()
    
    @task(4)
    def view_content(self):
        """Simulate user viewing content details"""
        content_id = random.choice(self.content_ids)
        with self.client.get(
            f"/api/content/{content_id}",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            catch_response=True
        ) as response:
            if response.status_code != 200:
                response.failure(f"View content {content_id} failed: {response.status_code}")
            else:
                response.success()
    
    @task(3)
    def stream_content(self):
        """Simulate streaming content"""
        content_id = random.choice(self.content_ids)
        with self.client.get(
            f"/api/content/{content_id}/stream",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            catch_response=True,
            timeout=30
        ) as response:
            if response.status_code != 200:
                response.failure(f"Stream content {content_id} failed: {response.status_code}")
            else:
                response.success()
    
    @task(2)
    def like_content(self):
        """Simulate user liking content"""
        content_id = random.choice(self.content_ids)
        with self.client.post(
            f"/api/content/{content_id}/like",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            catch_response=True
        ) as response:
            if response.status_code not in [200, 201]:
                response.failure(f"Like content failed: {response.status_code}")
            else:
                response.success()
    
    @task(1)
    def search_content(self):
        """Simulate searching for content"""
        search_terms = ["tutorial", "music", "video", "live", "exclusive", "trending"]
        query = random.choice(search_terms)
        with self.client.get(
            f"/api/content/search?q={query}",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            catch_response=True
        ) as response:
            if response.status_code != 200:
                response.failure(f"Search failed: {response.status_code}")
            else:
                response.success()


class CreatorUser(TaskSet):
    """Simulates a content creator publishing and managing content"""
    
    def on_start(self):
        """Initialize creator session"""
        self.user_id = str(uuid4())
        self.auth_token = self.login()
        self.created_content_ids = []
    
    def login(self):
        """Authenticate creator and get JWT token"""
        response = self.client.post(
            "/api/auth/login",
            json={
                "email": f"creator_{self.user_id[:8]}@test.com",
                "password": "creator-password-123",
                "role": "creator"
            },
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json().get("token", "test-token")
        return "test-token"
    
    @task(3)
    def publish_content(self):
        """Simulate publishing new content"""
        content_data = {
            "title": f"Content_{int(time.time())}",
            "description": "Test content for load testing",
            "category": random.choice(["music", "video", "tutorial", "podcast"]),
            "price": random.uniform(0.99, 9.99),
            "duration": random.randint(60, 3600)
        }
        with self.client.post(
            "/api/content/create",
            json=content_data,
            headers={"Authorization": f"Bearer {self.auth_token}"},
            catch_response=True
        ) as response:
            if response.status_code == 201:
                content_id = response.json().get("id")
                if content_id:
                    self.created_content_ids.append(content_id)
                response.success()
            else:
                response.failure(f"Publish failed: {response.status_code}")
    
    @task(2)
    def update_content(self):
        """Simulate updating content"""
        if self.created_content_ids:
            content_id = random.choice(self.created_content_ids)
            update_data = {
                "description": f"Updated at {int(time.time())}",
                "price": random.uniform(0.99, 9.99)
            }
            with self.client.put(
                f"/api/content/{content_id}",
                json=update_data,
                headers={"Authorization": f"Bearer {self.auth_token}"},
                catch_response=True
            ) as response:
                if response.status_code != 200:
                    response.failure(f"Update failed: {response.status_code}")
                else:
                    response.success()
    
    @task(2)
    def view_analytics(self):
        """Simulate creator viewing content analytics"""
        if self.created_content_ids:
            content_id = random.choice(self.created_content_ids)
            with self.client.get(
                f"/api/content/{content_id}/analytics",
                headers={"Authorization": f"Bearer {self.auth_token}"},
                catch_response=True
            ) as response:
                if response.status_code != 200:
                    response.failure(f"Analytics fetch failed: {response.status_code}")
                else:
                    response.success()
    
    @task(1)
    def list_content(self):
        """Simulate creator listing their content"""
        with self.client.get(
            "/api/creator/content",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            catch_response=True
        ) as response:
            if response.status_code != 200:
                response.failure(f"List content failed: {response.status_code}")
            else:
                response.success()


class SubscriberUser(TaskSet):
    """Simulates a subscriber with a subscription"""
    
    def on_start(self):
        """Initialize subscriber session"""
        self.user_id = str(uuid4())
        self.auth_token = self.login()
        self.subscriptions = []
    
    def login(self):
        """Authenticate subscriber"""
        response = self.client.post(
            "/api/auth/login",
            json={
                "email": f"subscriber_{self.user_id[:8]}@test.com",
                "password": "subscriber-password-123"
            },
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json().get("token", "test-token")
        return "test-token"
    
    @task(4)
    def view_subscriptions(self):
        """View available subscriptions"""
        with self.client.get(
            "/api/subscriptions",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            catch_response=True
        ) as response:
            if response.status_code != 200:
                response.failure(f"View subscriptions failed: {response.status_code}")
            else:
                response.success()
    
    @task(3)
    def access_premium_content(self):
        """Access premium content as subscriber"""
        content_id = random.randint(1, 100)
        with self.client.get(
            f"/api/content/{content_id}/premium",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            catch_response=True
        ) as response:
            if response.status_code not in [200, 403]:
                response.failure(f"Premium content access failed: {response.status_code}")
            else:
                response.success()
    
    @task(2)
    def manage_payment_methods(self):
        """Manage payment methods"""
        with self.client.get(
            "/api/payments/methods",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            catch_response=True
        ) as response:
            if response.status_code != 200:
                response.failure(f"Get payment methods failed: {response.status_code}")
            else:
                response.success()
    
    @task(1)
    def check_subscription_status(self):
        """Check subscription status"""
        with self.client.get(
            "/api/subscriptions/status",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            catch_response=True
        ) as response:
            if response.status_code != 200:
                response.failure(f"Check subscription status failed: {response.status_code}")
            else:
                response.success()


class ContentViewerLoadTest(HttpUser):
    """Regular content viewer user"""
    tasks = [ContentViewerUser]
    wait_time = between(1, 5)


class CreatorLoadTest(HttpUser):
    """Content creator user"""
    tasks = [CreatorUser]
    wait_time = between(2, 8)


class SubscriberLoadTest(HttpUser):
    """Subscriber user"""
    tasks = [SubscriberUser]
    wait_time = between(1, 4)


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Log test start event"""
    logger.info("=" * 80)
    logger.info("CONCURRENT USERS LOAD TEST STARTED")
    logger.info(f"Target: {environment.host}")
    logger.info(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("=" * 80)


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Log test completion and summary"""
    logger.info("=" * 80)
    logger.info("CONCURRENT USERS LOAD TEST COMPLETED")
    logger.info(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("=" * 80)


@events.request.add_listener
def on_failure(request_type, name, response_time, response_length, exception, **kwargs):
    """Log request failures"""
    if exception:
        logger.error(f"Request failed: {request_type} {name} - {exception}")
