import { useRef, useState } from 'react'
import { Camera, Upload, X } from 'lucide-react'

interface ImageUploadProps {
  value?: string
  onChange: (file: File | null) => void
  preview?: string
  className?: string
}

export default function ImageUpload({ value, onChange, preview, className = '' }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  const currentPreview = localPreview || preview || value || null

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file)
    setLocalPreview(url)
    onChange(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setLocalPreview(null)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />

      {currentPreview ? (
        <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => inputRef.current?.click()}>
          <img src={currentPreview} alt="preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:bg-red-600 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-gold hover:text-gold transition-colors bg-gray-50"
        >
          <Camera size={20} />
          <span className="text-[10px] font-medium">Foto</span>
        </button>
      )}
    </div>
  )
}

export function SmallImageUpload({ value, onChange, preview }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const currentPreview = localPreview || preview || value || null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLocalPreview(URL.createObjectURL(file))
      onChange(file)
    }
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      {currentPreview ? (
        <img
          src={currentPreview}
          alt=""
          className="w-10 h-10 rounded-lg object-cover cursor-pointer hover:opacity-80"
          onClick={() => inputRef.current?.click()}
        />
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-10 h-10 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-gold hover:text-gold transition-colors"
        >
          <Camera size={14} />
        </button>
      )}
    </div>
  )
}
