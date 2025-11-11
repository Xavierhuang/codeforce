'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import 'react-easy-crop/react-easy-crop.css'
import { ZoomIn, ZoomOut, Move } from 'lucide-react'

interface AvatarCropperProps {
  image: string
  open: boolean
  onClose: () => void
  onSave: (cropData: { x: number; y: number; scale: number }) => void
}

export function AvatarCropper({ image, open, onClose, onSave }: AvatarCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleSave = () => {
    // Normalize crop position to 0-1 range
    // react-easy-crop provides pixel values, but we need normalized values
    // The crop position is relative to the image, so we'll store it as-is
    // and let CSS handle the positioning
    // For a better approach, we calculate the center point relative to image dimensions
    // But since we don't have image dimensions here, we'll use a simplified approach
    // where we store the relative position (will be normalized by the display component)
    
    // Convert crop position to normalized 0-1 range
    // crop.x and crop.y are in pixels, but react-easy-crop handles this internally
    // We need to normalize based on the cropped area
    const normalizedX = croppedAreaPixels ? (croppedAreaPixels.x / (croppedAreaPixels.width || 1)) : 0.5
    const normalizedY = croppedAreaPixels ? (croppedAreaPixels.y / (croppedAreaPixels.height || 1)) : 0.5
    
    const cropData = {
      x: normalizedX,
      y: normalizedY,
      scale: zoom,
    }
    onSave(cropData)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Position Your Profile Picture</DialogTitle>
          <DialogDescription>
            Drag to reposition and use the slider to zoom. The image will be displayed as a circle.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative w-full h-[400px] bg-gray-100 rounded-lg overflow-hidden">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape="round"
            showGrid={false}
            style={{
              containerStyle: {
                width: '100%',
                height: '100%',
                position: 'relative',
              },
            }}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Move className="w-4 h-4" />
              <span>Drag to reposition</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {zoom < 1 ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
              <span>Zoom: {Math.round(zoom * 100)}%</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Zoom</label>
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={1}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Position
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

