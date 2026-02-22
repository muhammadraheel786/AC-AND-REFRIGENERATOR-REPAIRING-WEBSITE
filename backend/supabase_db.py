"""
Supabase Database Wrapper for Django
Uses Supabase REST API instead of direct PostgreSQL connection
"""
import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

class SupabaseClient:
    def __init__(self):
        self.url = os.getenv('SUPABASE_URL')
        self.key = os.getenv('SUPABASE_KEY')
        self.headers = {
            'apikey': self.key,
            'Authorization': f'Bearer {self.key}',
            'Content-Type': 'application/json'
        }
    
    def execute_query(self, query, params=None):
        """Execute SQL query via Supabase REST API"""
        try:
            response = requests.post(
                f"{self.url}/rest/v1/rpc/execute_sql",
                headers=self.headers,
                json={'query': query, 'params': params},
                timeout=30
            )
            return response.json() if response.status_code == 200 else None
        except Exception as e:
            print(f"Supabase query error: {e}")
            return None
    
    def test_connection(self):
        """Test if Supabase is accessible"""
        try:
            response = requests.get(
                f"{self.url}/rest/v1/",
                headers=self.headers,
                timeout=10
            )
            return response.status_code == 200
        except:
            return False

# Global Supabase client
supabase_client = SupabaseClient()

if __name__ == "__main__":
    print("Testing Supabase connection...")
    if supabase_client.test_connection():
        print("✅ Supabase is accessible!")
    else:
        print("❌ Cannot connect to Supabase")
