document.addEventListener('DOMContentLoaded', () => {
  const tbody = document.getElementById('keys-tbody');
  const spinner = document.getElementById('loading-spinner');
  const emptyState = document.getElementById('empty-state');
  const createForm = document.getElementById('create-key-form');
  const newKeyInput = document.getElementById('new-key-name');
  const newKeyLimit = document.getElementById('new-key-limit');
  
  // God Modal Elements
  const godModal = document.getElementById('god-modal');
  const closeGodModalBtn = document.getElementById('close-god-modal');
  const saveGodBtn = document.getElementById('save-god-btn');
  const editRateLimit = document.getElementById('edit-rate-limit');
  let currentGodKeyId = null;
  
  // Modal Elements
  const modal = document.getElementById('code-modal');
  const closeModalBtn = document.getElementById('close-modal');
  const modalTabs = document.getElementById('modal-tabs');
  const modalCode = document.getElementById('modal-code');
  const copyBtn = document.getElementById('copy-btn');
  
  let currentKeys = [];
  let selectedKey = null;
  let activeTab = 'curl';
  
  const languages = ['curl', 'frontend', 'python', 'node', 'dotnet', 'go', 'php', 'java'];
  const langLabels = {
    'dotnet': '.NET (C#)',
    'node': 'Node.js',
    'frontend': 'Browser JS'
  };

  const getSnippets = (apiKey) => ({
    curl: `curl -X POST /api/v1/compress \\
  -H "X-API-Key: ${apiKey}" \\
  -F "file=@image.jpg" \\
  -F "compressionPercentage=80" \\
  --output compressed_image.webp`,
    
    python: `import requests

url = "/api/v1/compress"
headers = {
    "X-API-Key": "${apiKey}"
}
files = {
    "file": open("image.jpg", "rb")
}
data = {
    "compressionPercentage": 80
}

response = requests.post(url, headers=headers, files=files, data=data)

with open("compressed_image.webp", "wb") as f:
    f.write(response.content)`,
    
    node: `const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

const formData = new FormData();
formData.append('file', fs.createReadStream('image.jpg'));
formData.append('compressionPercentage', '80');

fetch('/api/v1/compress', {
  method: 'POST',
  headers: {
    'X-API-Key': '${apiKey}'
  },
  body: formData
})
.then(res => res.buffer())
.then(buffer => fs.writeFileSync('compressed_image.webp', buffer));`,

    dotnet: `using System.Net.Http;
using System.Net.Http.Headers;
using System.IO;
using System.Threading.Tasks;

class Program
{
    static async Task Main()
    {
        var client = new HttpClient();
        using var form = new MultipartFormDataContent();

        using var fileStream = new FileStream("image.jpg", FileMode.Open);
        using var fileContent = new StreamContent(fileStream);
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("image/jpeg");

        form.Add(fileContent, "file", "image.jpg");
        form.Add(new StringContent("80"), "compressionPercentage");

        client.DefaultRequestHeaders.Add("X-API-Key", "${apiKey}");

        var response = await client.PostAsync("/api/v1/compress", form);
        var imageBytes = await response.Content.ReadAsByteArrayAsync();

        await File.WriteAllBytesAsync("compressed_image.webp", imageBytes);
    }
}`,

    frontend: `// In your React, Vue, or Vanilla JS Frontend
async function compressImage(fileInput) {
  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  formData.append('compressionPercentage', '80');

  const response = await fetch('/api/v1/compress', {
    method: 'POST',
    headers: {
      'X-API-Key': '${apiKey}'
    },
    body: formData
  });

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  
  // Download or display the compressed image
  const a = document.createElement('a');
  a.href = url;
  a.download = 'compressed.webp';
  a.click();
}`,

    go: `package main

import (
    "bytes"
    "io"
    "mime/multipart"
    "net/http"
    "os"
)

func main() {
    file, _ := os.Open("image.jpg")
    defer file.Close()

    body := &bytes.Buffer{}
    writer := multipart.NewWriter(body)
    
    part, _ := writer.CreateFormFile("file", "image.jpg")
    io.Copy(part, file)
    writer.WriteField("compressionPercentage", "80")
    writer.Close()

    req, _ := http.NewRequest("POST", "/api/v1/compress", body)
    req.Header.Set("X-API-Key", "${apiKey}")
    req.Header.Set("Content-Type", writer.FormDataContentType())

    client := &http.Client{}
    res, _ := client.Do(req)
    defer res.Body.Close()

    out, _ := os.Create("compressed_image.webp")
    defer out.Close()
    io.Copy(out, res.Body)
}`,

    php: `<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, '/api/v1/compress');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);

$cfile = new CURLFile('image.jpg', 'image/jpeg', 'image.jpg');
$data = array(
    'file' => $cfile,
    'compressionPercentage' => '80'
);

curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'X-API-Key: ${apiKey}'
));

$response = curl_exec($ch);
curl_close($ch);

file_put_contents('compressed_image.webp', $response);
?>`,

    java: `import okhttp3.*;
import java.io.File;
import java.io.IOException;

public class Main {
    public static void main(String[] args) throws IOException {
        OkHttpClient client = new OkHttpClient();

        RequestBody requestBody = new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("compressionPercentage", "80")
                .addFormDataPart("file", "image.jpg",
                        RequestBody.create(MediaType.parse("image/jpeg"), new File("image.jpg")))
                .build();

        Request request = new Request.Builder()
                .url("/api/v1/compress")
                .addHeader("X-API-Key", "${apiKey}")
                .post(requestBody)
                .build();

        try (Response response = client.newCall(request).execute()) {
            java.nio.file.Files.write(
                java.nio.file.Paths.get("compressed_image.webp"), 
                response.body().bytes()
            );
        }
    }
}`
  });

  const renderKeys = () => {
    tbody.innerHTML = '';
    
    if (currentKeys.length === 0) {
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
      
      currentKeys.forEach(k => {
        const tr = document.createElement('tr');
        
        const date = new Date(k.createdAt);
        const statusClass = k.isActive ? 'status-active' : 'status-inactive';
        const statusText = k.isActive ? 'ACTIVE' : 'INACTIVE';
        const toggleBtnClass = k.isActive ? 'btn-disable' : 'btn-enable';
        const toggleBtnText = k.isActive ? 'Disable' : 'Enable';
        
        tr.innerHTML = `
          <td>
            <div class="key-id" title="${k.id}">${k.id.substring(0, 8)}...</div>
          </td>
          <td>
            <div class="key-name">${k.name}</div>
          </td>
          <td>
            <div class="secret-key-box">${k.key}</div>
          </td>
          <td>
            <span style="color: #f59e0b; font-weight: 600;">${k.rate_limit || 60}</span><span style="color: var(--text-muted); font-size: 0.8rem;"> /min</span>
          </td>
          <td>
            <span style="background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: bold;">${k.usage_count || 0}</span>
          </td>
          <td>
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 0.875rem; color: var(--text-main);">${date.toLocaleDateString()}</span>
              <span style="font-size: 0.75rem; color: var(--text-muted);">${date.toLocaleTimeString()}</span>
            </div>
          </td>
          <td>
            <div class="status-badge ${statusClass}">
              <div class="status-dot"></div>
              ${statusText}
            </div>
          </td>
          <td>
            <div class="actions">
              <button class="action-btn btn-code" data-key="${k.key}">Code</button>
              <button class="action-btn btn-god" data-id="${k.id}" data-limit="${k.rate_limit || 60}">Limits</button>
              <button class="action-btn ${toggleBtnClass}" data-id="${k.id}" data-active="${k.isActive}">${toggleBtnText}</button>
              <button class="action-btn btn-delete" data-id="${k.id}">Delete</button>
            </div>
          </td>
        `;
        
        tbody.appendChild(tr);
      });
      
      // Bind events for buttons
      document.querySelectorAll('.btn-code').forEach(btn => {
        btn.addEventListener('click', (e) => {
          openModal(e.target.dataset.key);
        });
      });
      
      document.querySelectorAll('.btn-enable, .btn-disable').forEach(btn => {
        btn.addEventListener('click', (e) => {
          toggleStatus(e.target.dataset.id, e.target.dataset.active === 'true');
        });
      });
      
      document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          deleteKey(e.target.dataset.id);
        });
      });
      
      document.querySelectorAll('.btn-god').forEach(btn => {
        btn.addEventListener('click', (e) => {
          currentGodKeyId = e.target.dataset.id;
          editRateLimit.value = e.target.dataset.limit;
          godModal.classList.add('active');
        });
      });
    }
  };

  const fetchKeys = async () => {
    try {
      spinner.style.display = 'block';
      tbody.style.display = 'none';
      emptyState.style.display = 'none';
      
      const res = await fetch('/api/keys');
      if (res.status === 401 || res.redirected) {
        window.location.href = '/login.html';
        return;
      }
      
      const data = await res.json();
      currentKeys = data.keys || [];
      
      spinner.style.display = 'none';
      tbody.style.display = '';
      renderKeys();
    } catch (err) {
      console.error('Failed to fetch keys', err);
      spinner.style.display = 'none';
    }
  };

  const createKey = async (e) => {
    e.preventDefault();
    const name = newKeyInput.value.trim();
    if (!name) return;
    const limit = parseInt(newKeyLimit.value) || 60;
    
    try {
      await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, rate_limit: limit })
      });
      
      newKeyInput.value = '';
      newKeyLimit.value = '';
      fetchKeys();
    } catch (err) {
      console.error('Failed to create key', err);
    }
  };

  const deleteKey = async (id) => {
    if (!confirm('Delete this key?')) return;
    
    try {
      await fetch(`/api/keys/${id}`, { method: 'DELETE' });
      fetchKeys();
    } catch (err) {
      console.error('Failed to delete key', err);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      await fetch(`/api/keys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      fetchKeys();
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  // Modal logic
  const renderTabs = () => {
    modalTabs.innerHTML = '';
    languages.forEach(lang => {
      const btn = document.createElement('button');
      btn.className = `tab ${lang === activeTab ? 'active' : ''}`;
      btn.textContent = langLabels[lang] || lang;
      btn.addEventListener('click', () => {
        activeTab = lang;
        renderTabs();
        updateModalCode();
      });
      modalTabs.appendChild(btn);
    });
  };

  const updateModalCode = () => {
    if (selectedKey) {
      modalCode.textContent = getSnippets(selectedKey)[activeTab];
    }
  };

  const openModal = (apiKey) => {
    selectedKey = apiKey;
    renderTabs();
    updateModalCode();
    modal.classList.add('active');
  };

  closeModalBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    setTimeout(() => {
      selectedKey = null;
    }, 300);
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModalBtn.click();
    }
  });

  copyBtn.addEventListener('click', () => {
    if (selectedKey) {
      const code = getSnippets(selectedKey)[activeTab];
      navigator.clipboard.writeText(code).then(() => {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = 'Copied!';
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
        }, 2000);
      });
    }
  });

  createForm.addEventListener('submit', createKey);

  closeGodModalBtn.addEventListener('click', () => {
    godModal.classList.remove('active');
  });

  saveGodBtn.addEventListener('click', async () => {
    if (!currentGodKeyId) return;
    const limit = parseInt(editRateLimit.value);
    if (!limit) return;

    try {
      await fetch(`/api/keys/${currentGodKeyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate_limit: limit })
      });
      godModal.classList.remove('active');
      fetchKeys();
    } catch (err) {
      console.error('Failed to update limits', err);
    }
  });

  // Initialize
  fetchKeys();
});
