document.addEventListener('DOMContentLoaded', () => {
  const uploadArea = document.getElementById('upload-area');
  const fileInput = document.getElementById('file-input');
  const browseBtn = document.getElementById('browse-btn');
  const previewArea = document.getElementById('preview-area');
  const originalPreview = document.getElementById('original-preview');
  const clearBtn = document.getElementById('clear-btn');
  const compressBtn = document.getElementById('compress-btn');
  const errorMsg = document.getElementById('error-msg');
  const resultArea = document.getElementById('result-area');
  const qualitySlider = document.getElementById('quality');
  const qualityVal = document.getElementById('quality-val');
  const apiUrlInput = document.getElementById('api-url');
  
  apiUrlInput.value = window.location.origin + '/api/v1/compress';
  
  let currentFile = null;

  qualitySlider.addEventListener('input', (e) => {
    qualityVal.textContent = e.target.value + '%';
  });

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      errorMsg.textContent = 'Please select a valid image file.';
      errorMsg.classList.remove('hidden');
      return;
    }
    errorMsg.classList.add('hidden');
    currentFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      originalPreview.src = e.target.result;
      document.getElementById('res-orig-img').src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    uploadArea.classList.add('hidden');
    previewArea.classList.remove('hidden');
    resultArea.classList.add('hidden');
  };

  browseBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
  });

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });

  clearBtn.addEventListener('click', () => {
    currentFile = null;
    uploadArea.classList.remove('hidden');
    previewArea.classList.add('hidden');
    resultArea.classList.add('hidden');
    fileInput.value = '';
  });

  document.getElementById('reset-btn').addEventListener('click', () => {
    apiUrlInput.value = window.location.origin + '/api/v1/compress';
    document.getElementById('api-key').value = '';
    qualitySlider.value = 80;
    qualityVal.textContent = '80%';
    document.getElementById('output-format').value = 'webp';
    clearBtn.click();
  });

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  compressBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    compressBtn.disabled = true;
    compressBtn.textContent = 'Compressing...';
    errorMsg.classList.add('hidden');
    
    const apiUrl = document.getElementById('api-url').value;
    const apiKey = document.getElementById('api-key').value;
    const quality = qualitySlider.value;
    const format = document.getElementById('output-format').value;
    
    const formData = new FormData();
    formData.append("file", currentFile);
    formData.append("compressionPercentage", quality);
    formData.append("format", format);
    
    const startTime = Date.now();
    
    try {
      const headers = {};
      if (apiKey) {
        headers["X-API-Key"] = apiKey;
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: formData
      });
      
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      
      const blob = await response.blob();
      const endTime = Date.now();
      
      const previewUrl = URL.createObjectURL(blob);
      
      document.getElementById('res-orig').textContent = formatBytes(currentFile.size);
      document.getElementById('res-comp').textContent = formatBytes(blob.size);
      document.getElementById('res-time').textContent = (endTime - startTime) + 'ms';
      
      const savedPercent = Math.round(((currentFile.size - blob.size) / currentFile.size) * 100);
      document.getElementById('res-saved').textContent = savedPercent + '%';
      
      const resCompImg = document.getElementById('res-comp-img');
      resCompImg.src = previewUrl;
      
      const dlBtn = document.getElementById('download-btn');
      dlBtn.href = previewUrl;
      
      const originalName = currentFile.name.substring(0, currentFile.name.lastIndexOf('.')) || currentFile.name;
      dlBtn.download = `compressed_${originalName}.${format}`;
      
      resultArea.classList.remove('hidden');
      previewArea.classList.add('hidden');
      
    } catch (err) {
      errorMsg.textContent = err.message || 'Failed to compress image';
      errorMsg.classList.remove('hidden');
    } finally {
      compressBtn.disabled = false;
      compressBtn.textContent = '⚡ Compress Image';
    }
  });
});
