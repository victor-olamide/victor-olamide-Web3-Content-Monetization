from locust import HttpUser, task, between
import random


# Configuration:
# - Host: Update host variable if backend runs on different port
# - Authentication: Replace test-token with actual auth mechanism
# - Content IDs: Adjust range based on available test data (1-100 default)


class ContentStreamingUser(HttpUser):
    wait_time = between(1, 3)
    host = "http://localhost:3000"  # Adjust port as needed

    def on_start(self):
        # Setup authentication if needed
        self.client.headers = {
            'Authorization': 'Bearer test-token',  # Replace with actual auth
            'Content-Type': 'application/json'
        }

    @task(3)
    def stream_content(self):
        content_id = random.randint(1, 100)  # Assume content IDs from 1 to 100
        with self.client.get(f"/api/delivery/{content_id}/stream", catch_response=True) as response:
            if response.status_code != 200:
                response.failure(f"Failed to stream content {content_id}: {response.status_code}")

    @task(1)
    def get_content_metadata(self):
        content_id = random.randint(1, 100)
        with self.client.get(f"/api/delivery/{content_id}/metadata", catch_response=True) as response:
            if response.status_code != 200:
                response.failure(f"Failed to get metadata for {content_id}: {response.status_code}")