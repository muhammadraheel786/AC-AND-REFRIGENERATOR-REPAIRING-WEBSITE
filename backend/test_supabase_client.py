from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

print("Testing Supabase Python Client...")
print(f"URL: {os.getenv('SUPABASE_URL')}")
print(f"Key: {os.getenv('SUPABASE_KEY')[:20]}...")

try:
    # Create Supabase client
    supabase: Client = create_client(
        os.getenv('SUPABASE_URL'),
        os.getenv('SUPABASE_KEY')
    )
    
    # Test basic connection
    response = supabase.table('test').select('*').execute()
    print("✅ Supabase client connected successfully!")
    print(f"Response: {response}")
    
except Exception as e:
    print(f"❌ Supabase client error: {e}")
    
    # Try direct API call
    import requests
    try:
        headers = {
            'apikey': os.getenv('SUPABASE_KEY'),
            'Authorization': f'Bearer {os.getenv("SUPABASE_KEY")}'
        }
        response = requests.get(f"{os.getenv('SUPABASE_URL')}/rest/v1/", headers=headers, timeout=10)
        print(f"🌐 API Response: {response.status_code}")
        if response.status_code == 200:
            print("✅ Supabase API is accessible!")
    except Exception as api_e:
        print(f"❌ API Error: {api_e}")

print("\nNext steps:")
print("1. If client works, use Supabase for data storage")
print("2. If API works but not DB, use Supabase as backend API")
print("3. If neither works, check network/credentials")
