<script setup>
import { ref, computed } from 'vue'
import { embedWatermark, extractWatermark, loadImage, saveImage } from './steganography.js'
import './styles.css'

const activeTab = ref('encrypt')
const originalImage = ref(null)
const originalImageData = ref(null)
const watermarkedImage = ref(null)
const watermarkText = ref('')
const isProcessing = ref(false)
const imageWidth = ref(0)
const imageHeight = ref(0)

const toasts = ref([])
let toastId = 0

// 计算布局类名
const previewLayoutClass = computed(() => {
  if (!originalImage.value) return 'layout-upload'
  if (activeTab.value === 'decrypt') return 'layout-single'
  if (watermarkedImage.value) return 'layout-double'
  return 'layout-single'
})

function showToast(message, type = 'info', duration = 3000) {
  const id = ++toastId
  toasts.value.push({ id, message, type })
  setTimeout(() => removeToast(id), duration)
}

function removeToast(id) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index > -1) {
    toasts.value[index].hiding = true
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, 200)
  }
}

async function handleImageUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  isProcessing.value = true
  showToast('正在加载图片...', 'info')
  
  try {
    const result = await loadImage(file)
    imageWidth.value = result.width
    imageHeight.value = result.height
    originalImageData.value = result.imageData
    originalImage.value = result.dataUrl
    watermarkedImage.value = null
    showToast('图片已加载', 'success')
  } catch (error) {
    showToast('加载图片失败: ' + error.message, 'error')
  }
  
  isProcessing.value = false
}

function encryptImage() {
  if (!originalImageData.value || !watermarkText.value) {
    showToast('请先上传图片并输入水印文字', 'warning')
    return
  }
  
  isProcessing.value = true
  
  try {
    const imageData = new ImageData(
      new Uint8ClampedArray(originalImageData.value.data),
      imageWidth.value,
      imageHeight.value
    )
    
    embedWatermark(imageData, watermarkText.value)
    
    watermarkedImage.value = saveImage(imageData, imageWidth.value, imageHeight.value)
    
    showToast('加密成功！水印已嵌入图片', 'success')
  } catch (error) {
    showToast('加密失败: ' + error.message, 'error')
  }
  
  isProcessing.value = false
}

function decryptImage() {
  if (!originalImageData.value) {
    showToast('请先上传图片', 'warning')
    return
  }
  
  isProcessing.value = true
  
  try {
    const text = extractWatermark(originalImageData.value)
    
    if (text && text.length > 0) {
      showToast('发现水印: ' + text, 'success', 8000)
    } else {
      showToast('未发现水印', 'warning')
    }
  } catch (error) {
    showToast('解密失败: ' + error.message, 'error')
  }
  
  isProcessing.value = false
}

function downloadImage() {
  if (!watermarkedImage.value) return
  
  const link = document.createElement('a')
  link.download = 'watermarked_image.png'
  link.href = watermarkedImage.value
  link.click()
  showToast('图片已下载', 'success')
}

function reset() {
  originalImage.value = null
  originalImageData.value = null
  watermarkedImage.value = null
  watermarkText.value = ''
  imageWidth.value = 0
  imageHeight.value = 0
}

function getToastIcon(type) {
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }
  return icons[type] || icons.info
}
</script>

<template>
  <div class="container">
    <header>
      <h1>图片隐写术</h1>
      <p>LSB 最低有效位隐写</p>
    </header>

    <div class="card">
      <h3>选择图片</h3>
      <div class="preview-wrapper" :class="previewLayoutClass">
        <div v-if="!originalImage" class="upload-area" @click="$refs.fileInput.click()">
          <input 
            type="file" 
            accept="image/*" 
            @change="handleImageUpload" 
            ref="fileInput" 
            style="display: none"
          />
          <div class="upload-icon">📁</div>
          <p>点击上传图片</p>
          <span>支持 PNG、JPG、BMP 格式</span>
        </div>

        <div v-if="originalImage" class="preview-box original">
          <h4>原始图片</h4>
          <img :src="originalImage" alt="Original" />
          <p>{{ imageWidth }} × {{ imageHeight }}</p>
        </div>

        <div v-if="watermarkedImage && activeTab === 'encrypt'" class="preview-box watermarked">
          <h4>加密后</h4>
          <img :src="watermarkedImage" alt="Watermarked" />
          <p>肉眼不可见</p>
        </div>
      </div>

      <button v-if="originalImage" class="reset-btn" @click="reset">更换图片</button>
    </div>

    <div class="card">
      <div class="tabs">
        <button 
          :class="{ active: activeTab === 'encrypt' }" 
          @click="activeTab = 'encrypt'"
        >
          加密
        </button>
        <button 
          :class="{ active: activeTab === 'decrypt' }" 
          @click="activeTab = 'decrypt'"
        >
          解密
        </button>
      </div>

      <div v-if="activeTab === 'encrypt'">
        <h3>水印内容</h3>
        <textarea 
          v-model="watermarkText" 
          placeholder="输入要隐藏的文字..."
          rows="3"
        ></textarea>
        <p class="hint">水印将完全不可见地嵌入图片中</p>
      </div>

      <div v-else>
        <h3>检测水印</h3>
        <p class="hint">从图片中提取隐藏的水印内容</p>
      </div>
    </div>

    <div class="actions">
      <button 
        v-if="activeTab === 'encrypt'"
        class="btn" 
        @click="encryptImage" 
        :disabled="!watermarkText || !originalImage || isProcessing"
      >
        {{ isProcessing ? '处理中...' : '开始加密' }}
      </button>
      <button 
        v-else
        class="btn" 
        @click="decryptImage" 
        :disabled="!originalImage || isProcessing"
      >
        {{ isProcessing ? '检测中...' : '开始解密' }}
      </button>
      
      <button 
        v-if="watermarkedImage && activeTab === 'encrypt'" 
        class="btn btn-outline" 
        @click="downloadImage"
      >
        下载加密图片
      </button>
    </div>

    <div class="info">
      <h4>技术说明</h4>
      <p>本程序使用 <strong>LSB（最低有效位）隐写术</strong>。将文字转换为二进制后，嵌入到图片每个像素RGB值的最低位。由于只改变最低一位，肉眼完全无法察觉差异。</p>
      <p class="warn">注意：如果图片被严重压缩（如高压缩率JPEG），水印可能会丢失。建议使用PNG格式保存。</p>
    </div>

    <footer class="footer">
      <a href="https://github.com/MoForgt/LSB-Tool" target="_blank" rel="noopener">GitHub</a>
      <span class="divider">|</span>
      <span>Powered by <a href="https://www.xrbk.cn" target="_blank" rel="noopener">Moforgt</a></span>
    </footer>

    <div class="toast-container">
      <div 
        v-for="toast in toasts" 
        :key="toast.id" 
        :class="['toast', toast.type, { hiding: toast.hiding }]"
      >
        <span class="toast-icon">{{ getToastIcon(toast.type) }}</span>
        <span class="toast-message">{{ toast.message }}</span>
        <button class="toast-close" @click="removeToast(toast.id)">×</button>
      </div>
    </div>
  </div>
</template>
