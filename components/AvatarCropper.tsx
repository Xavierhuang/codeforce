'use client'

import { useState, useCallback, useEffect } from 'react'
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
  initialCrop?: { x: number; y: number; scale: number } | null
}

export function AvatarCropper({ image, open, onClose, onSave, initialCrop }: AvatarCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<any>(null)

  // Initialize crop and zoom from initialCrop when dialog opens
  useEffect(() => {
    if (open && initialCrop) {
      // Convert normalized center point (0-1) back to crop position
      // This is approximate - react-easy-crop uses pixel-based positioning
      // For now, we'll start from center and let user adjust
      setZoom(initialCrop.scale || 1)
      // Note: We can't perfectly restore the exact crop position without image dimensions
      // The user will need to adjust, but zoom will be preserved
    } else if (open) {
      // Reset to defaults when opening without initial crop
      setCrop({ x: 0, y: 0 })
      setZoom(1)
    }
  }, [open, initialCrop])

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedArea(croppedArea)
  }, [])

  const handleSave = () => {
    // react-easy-crop's croppedArea contains x, y, width, height as percentages (0-100)
    // We need to calculate the center point of the crop area, normalized to 0-1
    // Center X = x + (width / 2), normalized to 0-1
    // Center Y = y + (height / 2), normalized to 0-1
    
    if (croppedArea) {
      // croppedArea values are percentages (0-100), convert to 0-1
      const centerX = (croppedArea.x + croppedArea.width / 2) / 100
      const centerY = (croppedArea.y + croppedArea.height / 2) / 100
      
      const cropData = {
        x: centerX,
        y: centerY,
        scale: zoom,
      }
      onSave(cropData)
    } else {
      // Fallback if croppedArea is not available
      const cropData = {
        x: 0.5,
        y: 0.5,
        scale: zoom,
      }
      onSave(cropData)
    }
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

