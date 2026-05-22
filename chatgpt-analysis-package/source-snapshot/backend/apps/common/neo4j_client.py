from typing import Optional
from neo4j import GraphDatabase, Driver
from django.conf import settings

class Neo4jClient:
    _instance: Optional["Neo4jClient"] = None
    _driver: Optional[Driver] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Neo4jClient, cls).__new__(cls)
            cls._instance._init_driver()
        return cls._instance

    def _init_driver(self):
        uri = getattr(settings, "NEO4J_URI", "bolt://localhost:7687")
        user = getattr(settings, "NEO4J_USER", "neo4j")
        password = getattr(settings, "NEO4J_PASSWORD", "password")
        self._driver = GraphDatabase.driver(uri, auth=(user, password))

    def get_driver(self) -> Driver:
        return self._driver

    def close(self):
        if self._driver is not None:
            self._driver.close()

def get_neo4j_driver() -> Driver:
    """Helper function to get the singleton Neo4j driver instance."""
    return Neo4jClient().get_driver()
