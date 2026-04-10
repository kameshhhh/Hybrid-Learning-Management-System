import React, { useRef, useState } from 'react';
import { Plus, Trash2, LayoutGrid, Type, Image as ImageIcon, Upload, Loader2, X } from 'lucide-react';
import { getAssetUrl } from '@/lib/utils';
import { uploadService } from '@/services/upload';
import toast from 'react-hot-toast';

interface TableCell {
  type: 'text' | 'image';
  value: string;
}

interface TableBlockProps {
  content: {
    rows: (string | TableCell)[][];
    hasHeader?: boolean;
  };
  isEditable?: boolean;
  onUpdate?: (content: any) => void;
}

export const TableBlock: React.FC<TableBlockProps> = ({ content, isEditable, onUpdate }) => {
  const { hasHeader = true } = content;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCell, setUploadingCell] = useState<{ r: number, c: number } | null>(null);

  // Normalization logic for backward compatibility
  const rows: TableCell[][] = (content.rows || [['', ''], ['', '']]).map(row => 
    row.map(cell => {
      if (typeof cell === 'string') {
        return { type: 'text', value: cell };
      }
      return cell;
    })
  );

  const updateCell = (rowIndex: number, colIndex: number, cell: TableCell) => {
    if (!onUpdate) return;
    const newRows = [...rows];
    newRows[rowIndex] = [...newRows[rowIndex]];
    newRows[rowIndex][colIndex] = cell;
    onUpdate({ ...content, rows: newRows });
  };

  const toggleCellType = (rowIndex: number, colIndex: number) => {
    const current = rows[rowIndex][colIndex];
    const newType = current.type === 'text' ? 'image' : 'text';
    updateCell(rowIndex, colIndex, { type: newType, value: '' });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, r: number, c: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingCell({ r, c });
      const loading = toast.loading("Uploading cell image...");
      const res = await uploadService.uploadImage(file);
      if (res.success) {
        updateCell(r, c, { type: 'image', value: res.data.url });
        toast.success("Image added to cell", { id: loading });
      } else {
        toast.error("Upload failed", { id: loading });
      }
    } catch (err) {
      toast.error("Error uploading image");
    } finally {
      setUploadingCell(null);
    }
  };

  const addRow = () => {
    if (!onUpdate) return;
    const colCount = rows[0]?.length || 2;
    const newRow = Array(colCount).fill(null).map(() => ({ type: 'text', value: '' }));
    onUpdate({ ...content, rows: [...rows, newRow] });
  };

  const addColumn = () => {
    if (!onUpdate) return;
    const newRows = rows.map(row => [...row, { type: 'text', value: '' }]);
    onUpdate({ ...content, rows: newRows });
  };

  const removeRow = (index: number) => {
    if (!onUpdate || rows.length <= 1) return;
    onUpdate({ ...content, rows: rows.filter((_, i) => i !== index) });
  };

  const removeColumn = (index: number) => {
    if (!onUpdate || rows[0]?.length <= 1) return;
    onUpdate({ ...content, rows: rows.map(row => row.filter((_, i) => i !== index)) });
  };

  return (
    <div className="group/table relative py-4">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 group-hover/table:shadow-lg">
        <table className="w-full border-collapse">
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className={rIdx === 0 && hasHeader ? 'bg-slate-50/80 backdrop-blur-sm' : 'bg-transparent'}>
                {row.map((cell, cIdx) => (
                  <td 
                    key={cIdx} 
                    className={`border border-slate-100 p-0 min-w-[140px] relative transition-all ${
                      rIdx === 0 && hasHeader ? 'font-black text-slate-800' : 'text-slate-600'
                    }`}
                  >
                    {isEditable ? (
                      <div className="min-h-[60px] flex flex-col group/cell">
                        {/* Cell Mode Toggle */}
                        <div className="absolute top-1 right-1 opacity-0 group-hover/cell:opacity-100 transition-opacity flex gap-1 z-10">
                          <button 
                            onClick={() => toggleCellType(rIdx, cIdx)}
                            className="p-1 bg-white border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 text-slate-400"
                            title="Switch to Image/Text"
                          >
                            {cell.type === 'text' ? <ImageIcon size={10} /> : <Type size={10} />}
                          </button>
                          {rIdx === 0 && rows[0].length > 1 && (
                            <button 
                              onClick={() => removeColumn(cIdx)}
                              className="p-1 bg-red-500 text-white rounded-md shadow-sm hover:bg-red-600"
                              title="Delete Column"
                            >
                              <X size={10} />
                            </button>
                          )}
                        </div>

                        {cell.type === 'text' ? (
                          <textarea
                            value={cell.value}
                            onChange={(e) => updateCell(rIdx, cIdx, { ...cell, value: e.target.value })}
                            className="w-full bg-transparent p-4 outline-none focus:bg-blue-50/50 transition-colors resize-none overflow-hidden text-sm min-h-[60px]"
                            placeholder="Type..."
                            rows={1}
                          />
                        ) : (
                          <div className="p-2 flex flex-col items-center justify-center min-h-[80px] bg-slate-50/30">
                            {cell.value ? (
                              <div className="relative group/img-cell">
                                <img src={getAssetUrl(cell.value)} className="max-h-24 rounded-lg shadow-sm" alt="Cell" />
                                <button 
                                  onClick={() => updateCell(rIdx, cIdx, { ...cell, value: '' })}
                                  className="absolute -top-2 -right-2 p-1 bg-white shadow-md rounded-full text-slate-400 hover:text-red-500 opacity-0 group-hover/img-cell:opacity-100 transition-opacity"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => {
                                  setUploadingCell({ r: rIdx, c: cIdx });
                                  fileInputRef.current?.click();
                                }}
                                className="flex flex-col items-center gap-1 text-[10px] font-black uppercase text-slate-400 hover:text-blue-500 transition-colors"
                              >
                                {uploadingCell?.r === rIdx && uploadingCell?.c === cIdx ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <>
                                    <Upload size={16} />
                                    <span>Upload</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 text-sm whitespace-pre-wrap">
                        {cell.type === 'text' ? (
                          cell.value
                        ) : cell.value ? (
                          <img src={getAssetUrl(cell.value)} className="max-h-32 mx-auto rounded-lg shadow-sm border border-white" alt="Content" />
                        ) : null}
                      </div>
                    )}
                  </td>
                ))}
                
                {isEditable && rows.length > 1 && (
                  <td className="w-10 border-none p-0 opacity-0 group-hover/table:opacity-100 transition-opacity">
                    <button 
                      onClick={() => removeRow(rIdx)}
                      className="p-2 ml-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={(e) => uploadingCell && handleFileUpload(e, uploadingCell.r, uploadingCell.c)}
      />

      {isEditable && (
        <div className="flex gap-2 mt-4 opacity-0 group-hover/table:opacity-100 transition-all duration-300">
          <button 
            onClick={addRow}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-blue-200 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all"
          >
            <Plus size={14} /> Row
          </button>
          <button 
            onClick={addColumn}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-blue-200 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all"
          >
            <Plus size={14} /> Column
          </button>
          <button 
            onClick={() => onUpdate?.({ ...content, hasHeader: !hasHeader })}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm border ${
              hasHeader 
                ? 'bg-blue-50 border-blue-200 text-blue-600' 
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <LayoutGrid size={14} /> {hasHeader ? 'Body First' : 'Header Row'}
          </button>
        </div>
      )}
    </div>
  );
};
