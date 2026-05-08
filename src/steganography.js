export function textToBinary(text) {
  const len = text.length
  const lenBinary = len.toString(2).padStart(16, '0')
  let binary = lenBinary
  for (let i = 0; i < text.length; i++) {
    binary += text.charCodeAt(i).toString(2).padStart(16, '0')
  }
  return binary
}

export function binaryToText(binary) {
  if (binary.length < 16) return ''
  
  const len = parseInt(binary.slice(0, 16), 2)
  if (len <= 0 || len > 100000) return ''
  
  let text = ''
  let pos = 16
  
  for (let i = 0; i < len && pos + 16 <= binary.length; i++) {
    const charCode = parseInt(binary.slice(pos, pos + 16), 2)
    pos += 16
    if (charCode > 0 && charCode < 1114111) {
      text += String.fromCharCode(charCode)
    }
  }
  
  return text
}

// 魔数标记，用于识别是否包含水印
const MAGIC_HEADER = 'LSBWM'

export function embedWatermark(imageData, text) {
  const data = imageData.data
  
  // 在文本前添加魔数标记
  const textWithMagic = MAGIC_HEADER + text
  const binary = textToBinary(textWithMagic)
  
  if (binary.length > (data.length / 4) * 3) {
    throw new Error('文字太长，无法嵌入到该图片中')
  }
  
  let bitIndex = 0
  for (let i = 0; i < data.length && bitIndex < binary.length; i += 4) {
    if (bitIndex < binary.length) {
      data[i] = (data[i] & 0xFE) | parseInt(binary[bitIndex])
      bitIndex++
    }
    if (bitIndex < binary.length) {
      data[i + 1] = (data[i + 1] & 0xFE) | parseInt(binary[bitIndex])
      bitIndex++
    }
    if (bitIndex < binary.length) {
      data[i + 2] = (data[i + 2] & 0xFE) | parseInt(binary[bitIndex])
      bitIndex++
    }
  }
  
  return imageData
}

export function extractWatermark(imageData) {
  const data = imageData.data
  let binary = ''
  
  for (let i = 0; i < data.length; i += 4) {
    binary += (data[i] & 1).toString()
    binary += (data[i + 1] & 1).toString()
    binary += (data[i + 2] & 1).toString()
  }
  
  const text = binaryToText(binary)
  
  // 检查是否包含魔数标记
  if (text && text.startsWith(MAGIC_HEADER)) {
    // 返回去掉标记后的实际水印内容
    return text.slice(MAGIC_HEADER.length)
  }
  
  // 没有找到标记，说明没有水印
  return null
}

export function hasWatermark(imageData) {
  const data = imageData.data
  let binary = ''
  
  // 只需要读取前几个字节来检查魔数
  const checkLength = (MAGIC_HEADER.length * 16 + 16) * 3
  
  for (let i = 0; i < data.length && i < checkLength; i += 4) {
    binary += (data[i] & 1).toString()
    binary += (data[i + 1] & 1).toString()
    binary += (data[i + 2] & 1).toString()
  }
  
  const text = binaryToText(binary)
  return text && text.startsWith(MAGIC_HEADER)
}

export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        
        resolve({
          width: img.width,
          height: img.height,
          imageData: ctx.getImageData(0, 0, img.width, img.height),
          dataUrl: e.target.result
        })
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function saveImage(imageData, width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}
