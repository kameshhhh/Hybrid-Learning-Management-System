import React, { useRef, useState } from 'react';
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { getAssetUrl } from '@/lib/utils';
import { uploadService } from '@/services/upload';
import { Button } from '@/components/ui';
import toast from 'react-hot-toast';

interface ImageBlockProps {
  content: { url: string; caption?: string };
  isEditable?: boolean;
  onUpdate?: (content: any) => void;
}

export const ImageBlock: React.FC<ImageBlockProps> = ({ content, isEditable, onUpdate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const loadingToast = toast.loading("Uploading image...");
      
      const res = await uploadService.uploadImage(file);
      
      if (res.success) {
        onUpdate?.({ 
          ...content, 
          url: res.data.url 
        });
        toast.success("Image uploaded successfully!", { id: loadingToast });
      } else {
        toast.error("Upload failed", { id: loadingToast });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Error uploading image");
    } finally {
      setIsUploading(false);
    }
  };

  const imageUrl = getAssetUrl(content.url);

  if (isEditable) {
    return (
      <div className="space-y-3 p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50/50">
        <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
          {content.url ? (
            <img src={imageUrl} alt="Preview" className="max-h-64 rounded shadow-sm mb-4" />
          ) : (
            <div className="text-slate-400 text-center py-4">
              <ImageIcon size={48} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">Image Preview</p>
            </div>
          )}
          
          <div className="w-full max-w-md flex gap-2 px-3">
            <input 
              type="text" 
              placeholder="Paste image URL here..." 
              value={content.url || ''} 
              onChange={(e) => onUpdate?.({ ...content, url: e.target.value })}
              className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
            
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*"
            />
            
            <Button 
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 bg-white border-slate-200 hover:bg-slate-50 text-slate-500"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            </Button>
          </div>
        </div>
        <input 
          type="text" 
          placeholder="Add a caption..." 
          value={content.caption || ''} 
          onChange={(e) => onUpdate?.({ ...content, caption: e.target.value })}
          className="w-full text-center text-sm text-slate-500 bg-transparent border-none focus:ring-0 outline-none italic"
        />
      </div>
    );
  }

  return (
    <figure className="my-6">
      <img src={imageUrl} alt={content.caption} className="w-full rounded-2xl shadow-md border border-slate-100" />
      {content.caption && (
        <figcaption className="mt-3 text-center text-sm text-slate-500 italic">
          {content.caption}
        </figcaption>
      )}
    </figure>
  );
};
