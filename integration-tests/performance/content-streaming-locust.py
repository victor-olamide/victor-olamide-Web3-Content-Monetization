from locust import HttpUser, task, between
import random


class ContentStreamingUser(HttpUser):
    wait_time = between(1, 3)
    host = "http://localhost:3000"  # Adjust port as needed

    @task(3)
    def stream_content(self):
        content_id = random.randint(1, 100)  # Assume content IDs from 1 to 100
        self.client.get(f"/api/delivery/{content_id}/stream")

    @task(1)
    def get_content_metadata(self):
        content_id = random.randint(1, 100)
        self.client.get(f"/api/delivery/{content_id}/metadata")