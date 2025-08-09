// === Tool Switching ===
function showTool(toolId) {
  document.querySelectorAll('.tool-section').forEach(section => {
    section.style.display = 'none';
  });
  document.getElementById(toolId).style.display = 'block';
}

/* ---------------- Image Compressor (existing) ---------------- */
const fileInput = document.getElementById('fileInput');
const qualitySlider = document.getElementById('quality');
const qualityValue = document.getElementById('qualityValue');
const compressBtn = document.getElementById('compressBtn');
const previewBefore = document.getElementById('previewBefore');
const previewAfter = document.getElementById('previewAfter');
const downloadLink = document.getElementById('downloadLink');

let selectedFile = null;

fileInput.addEventListener('change', (e) => {
  selectedFile = e.target.files[0];
  if (selectedFile) {
    previewBefore.src = URL.createObjectURL(selectedFile);
  }
});

qualitySlider.addEventListener('input', () => {
  qualityValue.textContent = qualitySlider.value;
});

compressBtn.addEventListener('click', async () => {
  if (!selectedFile) {
    alert('Please select an image first.');
    return;
  }

  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: qualitySlider.value / 100
  };

  try {
    const compressedFile = await imageCompression(selectedFile, options);
    previewAfter.src = URL.createObjectURL(compressedFile);

    downloadLink.href = URL.createObjectURL(compressedFile);
    downloadLink.style.display = 'inline-block';
    downloadLink.textContent = 'Download Compressed Image';
  } catch (error) {
    console.error('Compression error:', error);
  }
});

/* ---------------- Image -> PDF (existing) ---------------- */
const { jsPDF } = window.jspdf;
const imgToPdfInput = document.getElementById('imgToPdfInput');
const imgToPdfBtn = document.getElementById('imgToPdfBtn');
const imgToPdfDownload = document.getElementById('imgToPdfDownload');

imgToPdfBtn.addEventListener('click', async () => {
  const files = imgToPdfInput.files;
  if (!files || files.length === 0) {
    alert('Please select one or more images.');
    return;
  }

  const pdf = new jsPDF();
  for (let i = 0; i < files.length; i++) {
    const imgData = await fileToBase64(files[i]);
    if (i > 0) pdf.addPage();
    // Fit image within PDF page while keeping aspect ratio
    pdf.addImage(imgData, 'JPEG', 10, 10, 190, 0);
  }

  const pdfBlob = pdf.output('blob');
  imgToPdfDownload.href = URL.createObjectURL(pdfBlob);
  imgToPdfDownload.style.display = 'inline-block';
  imgToPdfDownload.textContent = 'Download PDF';
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ---------------- PDF -> Image (new) ---------------- */

// pdf.js setup: point workerSrc to CDN worker
if (window['pdfjsLib']) {
  window['pdfjsLib'].GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
}

const pdfToImgInput = document.getElementById('pdfToImgInput');
const pdfToImgBtn = document.getElementById('pdfToImgBtn');
const pdfImagesContainer = document.getElementById('pdfImagesContainer');
const pdfImgQuality = document.getElementById('pdfImgQuality');
const pdfImgQualityValue = document.getElementById('pdfImgQualityValue');

pdfImgQuality.addEventListener('input', () => {
  pdfImgQualityValue.textContent = pdfImgQuality.value;
});

pdfToImgBtn.addEventListener('click', async () => {
  const file = pdfToImgInput.files[0];
  if (!file) {
    alert('Please select a PDF file.');
    return;
  }

  // Clear previous output
  pdfImagesContainer.innerHTML = '';

  // Read file as array buffer
  const arrayBuffer = await file.arrayBuffer();

  try {
    const pdf = await window['pdfjsLib'].getDocument({ data: arrayBuffer }).promise;
    const total = pdf.numPages;

    for (let pageNum = 1; pageNum <= total; pageNum++) {
      const page = await pdf.getPage(pageNum);

      // choose scale so output is reasonably high-res (adjust if needed)
      const viewport = page.getViewport({ scale: 2.0 });

      // create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // render page
      await page.render({ canvasContext: context, viewport }).promise;

      // convert canvas to data URL (JPEG)
      const quality = parseFloat(pdfImgQuality.value) || 0.8;
      const dataUrl = canvas.toDataURL('image/jpeg', quality);

      // create card in UI
      const card = document.createElement('div');
      card.className = 'pdf-image-card';

      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = `Page ${pageNum}`;
      card.appendChild(img);

      const downloadBtn = document.createElement('a');
      downloadBtn.className = 'small-btn';
      downloadBtn.href = dataUrl;
      downloadBtn.download = `${stripExtension(file.name)}-page-${pageNum}.jpg`;
      downloadBtn.textContent = 'Download';
      card.appendChild(downloadBtn);

      const openBtn = document.createElement('a');
      openBtn.className = 'small-btn';
      openBtn.style.marginLeft = '6px';
      openBtn.href = dataUrl;
      openBtn.target = '_blank';
      openBtn.textContent = 'Open';
      card.appendChild(openBtn);

      pdfImagesContainer.appendChild(card);

      // release page resources
      page.cleanup && page.cleanup();
    }
  } catch (err) {
    console.error('PDF -> Image error:', err);
    alert('Failed to process PDF. Is the file valid?');
  }
});

function stripExtension(name) {
  return name.replace(/\.[^/.]+$/, '');
}
