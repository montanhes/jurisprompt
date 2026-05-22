import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from './useToast'

interface UploadState {
  uploading: boolean
  filename: string
  percent: number
}

export function useUpload() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [state, setState] = useState<UploadState>({ uploading: false, filename: '', percent: 0 })
  const xhrRef = useRef<XMLHttpRequest | null>(null)

  function upload(file: File, pageStart?: number, pageEnd?: number) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Apenas arquivos .pdf são aceitos.', 'error')
      return
    }
    if (file.size > 500 * 1024 * 1024) {
      showToast('Arquivo excede o limite de 500 MB.', 'error')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    if (pageStart) formData.append('pageStart', String(pageStart))
    if (pageEnd) formData.append('pageEnd', String(pageEnd))

    setState({ uploading: true, filename: file.name, percent: 0 })

    const xhr = new XMLHttpRequest()
    xhrRef.current = xhr
    xhr.open('POST', '/upload')

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        setState(prev => ({ ...prev, percent: Math.round((e.loaded / e.total) * 100) }))
      }
    })

    xhr.addEventListener('load', () => {
      setState({ uploading: false, filename: '', percent: 0 })
      if (xhr.status === 200) {
        showToast('PDF enviado! Processamento em fila.', 'success')
        queryClient.invalidateQueries({ queryKey: ['jobs'] })
      } else if (xhr.status === 401) {
        queryClient.invalidateQueries({ queryKey: ['auth'] })
      } else {
        let msg = 'Erro ao enviar arquivo.'
        try { msg = JSON.parse(xhr.responseText).error ?? msg } catch { /* noop */ }
        showToast(msg, 'error')
      }
    })

    xhr.addEventListener('error', () => {
      setState({ uploading: false, filename: '', percent: 0 })
      showToast('Falha de conexão ao enviar arquivo.', 'error')
    })

    xhr.send(formData)
  }

  return { ...state, upload }
}
