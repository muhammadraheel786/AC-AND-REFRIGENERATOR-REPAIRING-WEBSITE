import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

print("Testing Supabase connection...")
print(f"URL: {os.getenv('SUPABASE_URL')}")
print(f"User: {os.getenv('SUPABASE_DB_USER')}")
print(f"DB: {os.getenv('SUPABASE_DB_NAME')}")

# Try different connection methods
methods = [
    {
        'name': 'Direct project URL',
        'host': 'hcbdyzghactztdzsqulf.supabase.co',
        'port': 5432
    },
    {
        'name': 'With db prefix', 
        'host': 'db.hcbdyzghactztdzsqulf.supabase.co',
        'port': 5432
    },
    {
        'name': 'Pooler port',
        'host': 'hcbdyzghactztdzsqulf.supabase.co', 
        'port': 6543
    }
]

for method in methods:
    try:
        print(f"\nTrying {method['name']}: {method['host']}:{method['port']}")
        conn = psycopg2.connect(
            host=method['host'],
            port=method['port'],
            user=os.getenv('SUPABASE_DB_USER'),
            password=os.getenv('SUPABASE_DB_PASSWORD'),
            database=os.getenv('SUPABASE_DB_NAME'),
            sslmode='require',
            connect_timeout=10
        )
        print("✅ SUCCESS: Connected successfully!")
        conn.close()
        break
    except Exception as e:
        print(f"❌ FAILED: {e}")

print("\nIf all failed, check:")
print("1. Supabase project is active")
print("2. Database password is correct") 
print("3. No firewall blocking port 5432/6543")
print("4. Supabase dashboard → Settings → Database → Connection string")
