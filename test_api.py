import requests
from PIL import Image
import io

img = Image.new('RGB', (100, 100), color = 'red')
img_byte_arr = io.BytesIO()
img.save(img_byte_arr, format='JPEG')
img_bytes = img_byte_arr.getvalue()

session = requests.Session()
res = session.post("http://127.0.0.1:8001/api/auth/login", json={"password": "admin"})
res_key = session.post("http://127.0.0.1:8001/api/keys", json={"name": "test2"})
api_key = res_key.json()["key"]

res_comp = session.post("http://127.0.0.1:8001/api/v1/compress", 
    headers={"X-API-Key": api_key},
    data={"compressionPercentage": 50},
    files={"file": ("test.jpg", img_bytes, "image/jpeg")}
)

print(res_comp.status_code)
if res_comp.status_code != 200:
    print(res_comp.text)
