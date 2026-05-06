from locust import HttpUser, task, between
import random


class ContentStreamingUser(HttpUser):
    wait_time = between(1, 3)

    @task
    def stream_content(self):
        content_id = random.randint(1, 100)  # Assume content IDs from 1 to 100
        self.client.get(f"/api/delivery/{content_id}/stream")