def test_profile_a(client):
    payload = {
        "state": "Maharashtra",
        "district": "Pune",
        "crop": "Cotton",
        "current_season": "Kharif",
        "farmer_category": "Marginal",
        "gender": "Male",
        "age": 35,
        "disability_status": "no",
        "interests": ["irrigation", "insurance"],
        "documents_on_hand": ["aadhaar", "bank_passbook"],
        "land_size": 1.0,
        "annual_income": 200000
    }
    resp = client.post("/api/recommend", json=payload)
    data = resp.get_json()
    print("\n--- Test A ---")
    print(f"Status Code: {resp.status_code}")
    print(f"Result Count: {len(data.get('results', []))}")
    assert resp.status_code == 200

def test_profile_b(client):
    payload = {
        "state": "Maharashtra",
        "district": "Pune",
        "crop": "Cotton",
        "current_season": "Kharif",
        "farmer_category": "Marginal",
        "gender": "Male",
        "age": 35,
        "disability_status": "no",
        "interests": ["irrigation", "insurance"],
        "documents_on_hand": ["aadhaar", "bank_passbook"],
        "land_size": 0.0,
        "annual_income": 200000
    }
    resp = client.post("/api/recommend", json=payload)
    data = resp.get_json()
    print("\n--- Test B ---")
    print(f"Status Code: {resp.status_code}")
    print(f"Result Count: {len(data.get('results', []))}")
    assert resp.status_code == 200

def test_profile_c(client):
    payload = {
        "state": "Maharashtra",
        "district": "Pune",
        "crop": "Cotton",
        "current_season": "Kharif",
        "farmer_category": "Marginal",
        "gender": "Male",
        "age": 35,
        "disability_status": "no",
        "interests": ["irrigation", "insurance"],
        "documents_on_hand": ["aadhaar", "bank_passbook"],
        "land_size": 5.0,
        "annual_income": 500000
    }
    resp = client.post("/api/recommend", json=payload)
    data = resp.get_json()
    print("\n--- Test C ---")
    print(f"Status Code: {resp.status_code}")
    print(f"Result Count: {len(data.get('results', []))}")
    assert resp.status_code == 200
