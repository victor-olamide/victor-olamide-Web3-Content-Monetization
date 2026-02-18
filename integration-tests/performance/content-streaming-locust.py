from locust import HttpUser, task, between
import random


class ContentStreamingUser(HttpUser):
    wait_time = between(1, 3)